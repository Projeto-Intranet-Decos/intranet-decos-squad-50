import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import configuracoes
from app.core.limite_tentativas import LimiteDeTentativas
from app.core.log_seguranca import registrar_evento
from app.core.security import (
  criar_access_token,
  gerar_hash_senha,
  gerar_token,
  hash_token,
  verificar_senha,
)
from app.core import correio
from app.modules.autenticacao import emails, repository, schemas
from app.modules.autenticacao.models import FinalidadeToken, TokenAtualizacao, TokenUsoUnico
from app.modules.usuarios import repository as usuarios_repository
from app.modules.usuarios.models import Usuario

LINK_INVALIDO = "Link inválido ou expirado"
MENSAGEM_REDEFINICAO = "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha."
SENHA_ATUAL_INCORRETA = {"campo": "senha_atual", "mensagem": "Senha atual incorreta"}
MUITAS_TENTATIVAS = "Muitas tentativas. Tente de novo em alguns minutos."
MUITOS_PEDIDOS = "Muitos pedidos. Tente de novo em alguns minutos."

# AUT-11 e USU-07: por e-mail, exista a conta ou não.
LIMITE_LOGIN = LimiteDeTentativas(maximo=5, janela_segundos=15 * 60)
LIMITE_REDEFINICAO = LimiteDeTentativas(maximo=1, janela_segundos=5 * 60)

# Conferido quando não há senha para conferir (conta inexistente ou pendente): o login leva o mesmo
# tempo e não revela quais e-mails estão cadastrados (AUT-01). Calculado ao importar para nem a
# primeira tentativa ser diferente.
HASH_FICTICIO = gerar_hash_senha(gerar_token())


def _muitas_tentativas(mensagem: str, segundos: int) -> HTTPException:
  return HTTPException(
    status.HTTP_429_TOO_MANY_REQUESTS, mensagem, headers={"Retry-After": str(segundos)}
  )


@dataclass(frozen=True)
class SessaoAberta:
  """O que o router precisa para responder e gravar o cookie do refresh token (AUT-07)."""

  access_token: str
  refresh_token: str
  refresh_expira_em: datetime
  usuario: Usuario


@dataclass(frozen=True)
class Renovacao:
  """`refresh_token` nulo: o cookie fica como está (token trocado há pouco por outra aba, AUT-02)."""

  access_token: str
  refresh_token: str | None
  refresh_expira_em: datetime


def autenticar(sessao: Session, email: str, senha: str, ip: str) -> SessaoAberta:
  espera = LIMITE_LOGIN.segundos_de_espera(email)
  if espera:
    registrar_evento("login_bloqueado", logging.WARNING, email=email, ip=ip)
    raise _muitas_tentativas(MUITAS_TENTATIVAS, espera)

  usuario = usuarios_repository.buscar_por_email(sessao, email)
  hash_conferido = usuario.senha_hash if usuario and usuario.senha_hash else HASH_FICTICIO
  senha_confere = verificar_senha(senha, hash_conferido)
  if not usuario or not usuario.ativo or usuario.senha_hash is None or not senha_confere:
    LIMITE_LOGIN.registrar(email)
    registrar_evento("login_falhou", logging.WARNING, email=email, ip=ip)
    raise HTTPException(401, "Email ou senha invalidos")

  LIMITE_LOGIN.esquecer(email)
  registrar_evento("login_ok", usuario_id=usuario.id, ip=ip)
  return _abrir_sessao(sessao, usuario)


def _gravar_refresh(
  sessao: Session,
  usuario_id: uuid.UUID,
  expira_em: datetime,
  sessao_id: uuid.UUID | None = None,
) -> str:
  """Grava um refresh token novo (com commit) e devolve o valor em claro, que só vai no cookie.

  Sem `sessao_id` é um login: o banco gera uma sessão nova. Na rotação, o token herda a sessão.
  """
  refresh_token = gerar_token()
  token = TokenAtualizacao(
    usuario_id=usuario_id, token_hash=hash_token(refresh_token), expira_em=expira_em
  )
  if sessao_id is not None:
    token.sessao_id = sessao_id
  repository.criar_token(sessao, token)
  return refresh_token


def _abrir_sessao(sessao: Session, usuario: Usuario) -> SessaoAberta:
  expira_em = datetime.now(timezone.utc) + timedelta(days=configuracoes.refresh_token_dias)
  refresh_token = _gravar_refresh(sessao, usuario.id, expira_em)
  return SessaoAberta(criar_access_token(usuario), refresh_token, expira_em, usuario)


REFRESH_INVALIDO = "Refresh token invalido ou expirado"
# Duas abas abrindo juntas mandam o mesmo cookie: a segunda chega com o token que a primeira acabou
# de trocar. Dentro desta janela isso é concorrência; depois dela, é reuso de token roubado (AUT-02).
JANELA_DE_CONCORRENCIA = timedelta(seconds=30)


def renovar(sessao: Session, refresh_token: str | None, ip: str) -> Renovacao:
  if not refresh_token:
    raise HTTPException(401, REFRESH_INVALIDO)
  # Travado até o commit: duas renovações do mesmo token não trocam o token duas vezes.
  token = repository.buscar_por_hash(sessao, hash_token(refresh_token), travar=True)
  agora = datetime.now(timezone.utc)
  if not token or token.revogado or token.expira_em < agora:
    raise HTTPException(401, REFRESH_INVALIDO)

  if token.substituido_em is not None and agora - token.substituido_em > JANELA_DE_CONCORRENCIA:
    # Token já trocado voltando depois da janela: alguém tem uma cópia. Derruba todas as sessões.
    repository.revogar_tokens_do_usuario(sessao, token.usuario_id)
    sessao.commit()
    registrar_evento("refresh_reutilizado", logging.WARNING, usuario_id=token.usuario_id, ip=ip)
    raise HTTPException(401, REFRESH_INVALIDO)

  usuario = usuarios_repository.buscar_por_id(sessao, token.usuario_id)
  if not usuario or not usuario.ativo:
    raise HTTPException(401, "Usuario nao encontrado ou inativo")

  if token.substituido_em is not None:
    # Outra aba acabou de trocar: o cookie novo já está no navegador.
    return Renovacao(criar_access_token(usuario), None, token.expira_em)

  token.substituido_em = agora
  # O novo herda a expiração: a sessão dura REFRESH_TOKEN_DAYS a partir do login.
  novo = _gravar_refresh(sessao, usuario.id, token.expira_em, token.sessao_id)
  return Renovacao(criar_access_token(usuario), novo, token.expira_em)


def encerrar(sessao: Session, refresh_token: str | None) -> None:
  """Logout (AUT-06): revoga a sessão do cookie inteira, se ela existir. Idempotente."""
  if not refresh_token:
    return
  token = repository.buscar_por_hash(sessao, hash_token(refresh_token))
  if token:
    repository.revogar_sessao(sessao, token.sessao_id)
    sessao.commit()


# Magic link (AUT-08)


def _validade(finalidade: FinalidadeToken) -> timedelta:
  if finalidade == FinalidadeToken.convite:
    return timedelta(hours=configuracoes.convite_horas)
  return timedelta(minutes=configuracoes.redefinicao_senha_minutos)


def emitir_link(
  sessao: Session, usuario: Usuario, finalidade: FinalidadeToken, *, usuario_novo: bool = False
) -> str:
  """Gera um magic link e devolve o token em claro, que só existe no e-mail.

  Invalida os links anteriores da mesma finalidade (`usuario_novo=True` pula essa etapa: quem
  acabou de ser criado não tem nenhum). Não faz commit: o link é gravado na mesma transação de
  quem chama.
  """
  if not usuario_novo:
    repository.apagar_links_pendentes(sessao, usuario.id, finalidade)
  token = gerar_token()
  repository.adicionar_link(
    sessao,
    TokenUsoUnico(
      usuario_id=usuario.id,
      finalidade=finalidade,
      token_hash=hash_token(token),
      expira_em=datetime.now(timezone.utc) + _validade(finalidade),
    ),
  )
  return token


def invalidar_links(sessao: Session, usuario: Usuario) -> None:
  """Para troca de e-mail e desativação. Sem commit, como `emitir_link`."""
  repository.apagar_links_pendentes(sessao, usuario.id)


def _link_valido(
  sessao: Session, token: str, finalidade: FinalidadeToken, *, travar: bool = False
) -> tuple[TokenUsoUnico, Usuario]:
  """`travar=True` bloqueia a linha até o commit: dois aceites simultâneos não passam os dois."""
  link = repository.buscar_link_por_hash(sessao, hash_token(token), travar=travar)
  usuario = usuarios_repository.buscar_por_id(sessao, link.usuario_id) if link else None
  # Uma mensagem só para todos os casos, como no login.
  if (
    not link
    or not usuario
    or link.finalidade != finalidade
    or link.usado_em is not None
    or link.expira_em <= datetime.now(timezone.utc)
    or not usuario.ativo
  ):
    raise HTTPException(status.HTTP_400_BAD_REQUEST, LINK_INVALIDO)
  return link, usuario


def verificar_convite(sessao: Session, token: str) -> Usuario:
  """Só consulta: filtros de e-mail abrem o link antes da pessoa, então não pode gastar o token."""
  _, usuario = _link_valido(sessao, token, FinalidadeToken.convite)
  return usuario


def aceitar_convite(sessao: Session, dados: schemas.ConviteAceitar) -> SessaoAberta:
  link, usuario = _link_valido(sessao, dados.token, FinalidadeToken.convite, travar=True)
  usuario.nome = dados.nome
  if "data_nascimento" in dados.model_fields_set:
    usuario.data_nascimento = dados.data_nascimento
  usuario.senha_hash = gerar_hash_senha(dados.senha)
  link.usado_em = datetime.now(timezone.utc)
  # O commit do refresh token grava tudo junto: senha, dados e link usado.
  return _abrir_sessao(sessao, usuario)


# Troca e redefinição de senha (USU-07)


def _definir_senha(sessao: Session, usuario: Usuario, senha: str) -> SessaoAberta:
  """Grava a senha, encerra as outras sessões, invalida os links pendentes e abre uma sessão nova,
  tudo num commit só."""
  usuario.senha_hash = gerar_hash_senha(senha)
  repository.revogar_tokens_do_usuario(sessao, usuario.id)
  # Um link de redefinição pedido antes da troca não pode redefinir a senha nova (AUT-08).
  repository.apagar_links_pendentes(sessao, usuario.id)
  return _abrir_sessao(sessao, usuario)


def aceitar_pedido_de_redefinicao(email: str, ip: str) -> None:
  """Limite de USU-07, antes de agendar o envio. Só olha a memória, nunca o banco: o tempo da
  resposta continua sem revelar se a conta existe."""
  espera = LIMITE_REDEFINICAO.segundos_de_espera(email)
  if espera:
    registrar_evento("redefinicao_bloqueada", logging.WARNING, email=email, ip=ip)
    raise _muitas_tentativas(MUITOS_PEDIDOS, espera)
  LIMITE_REDEFINICAO.registrar(email)
  registrar_evento("redefinicao_pedida", email=email, ip=ip)


def pedir_redefinicao(abrir_sessao: Callable[[], Session], email: str) -> None:
  """Tarefa em segundo plano (USU-07): procura a conta, gera o link e envia o e-mail.

  Roda depois da resposta, com sessão própria: o tempo de resposta não pode revelar se a conta
  existe.
  """
  with abrir_sessao() as sessao:
    usuario = usuarios_repository.buscar_por_email(sessao, email)
    # Pendente não redefine: precisa de um novo convite (USU-08).
    if not usuario or not usuario.ativo or usuario.convite_pendente:
      return
    token = emitir_link(sessao, usuario, FinalidadeToken.redefinicao_senha)
    sessao.commit()
    correio.enviar_email(emails.redefinicao_senha(usuario, token))


def verificar_redefinicao(sessao: Session, token: str) -> Usuario:
  _, usuario = _link_valido(sessao, token, FinalidadeToken.redefinicao_senha)
  return usuario


def confirmar_redefinicao(sessao: Session, dados: schemas.RedefinicaoConfirmar) -> SessaoAberta:
  link, usuario = _link_valido(
    sessao, dados.token, FinalidadeToken.redefinicao_senha, travar=True
  )
  link.usado_em = datetime.now(timezone.utc)
  # Grava o uso já: `_definir_senha` apaga os links ainda não usados, e este fica como histórico.
  sessao.flush()
  return _definir_senha(sessao, usuario, dados.senha)


def trocar_senha(
  sessao: Session, usuario_id: uuid.UUID, dados: schemas.TrocaSenha
) -> SessaoAberta:
  usuario = usuarios_repository.buscar_por_id(sessao, usuario_id)
  # O access token ainda vale até expirar; a troca, não (AUT-03).
  if not usuario or not usuario.ativo or usuario.senha_hash is None:
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario nao encontrado ou inativo")
  if not verificar_senha(dados.senha_atual, usuario.senha_hash):
    raise HTTPException(status.HTTP_400_BAD_REQUEST, SENHA_ATUAL_INCORRETA)
  return _definir_senha(sessao, usuario, dados.senha_nova)
