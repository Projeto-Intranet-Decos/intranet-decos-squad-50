from collections.abc import Callable
from datetime import datetime, timedelta, timezone

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import configuracoes
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


def autenticar(sessao: Session, email: str, senha: str) -> tuple[str, str, Usuario]:
  usuario = usuarios_repository.buscar_por_email(sessao, email)
  if (
    not usuario
    or not usuario.ativo
    or usuario.senha_hash is None
    or not verificar_senha(senha, usuario.senha_hash)
  ):
    raise HTTPException(401, "Email ou senha invalidos")

  access_token, refresh_token = _abrir_sessao(sessao, usuario)
  return access_token, refresh_token, usuario


def _abrir_sessao(sessao: Session, usuario: Usuario) -> tuple[str, str]:
  """Grava um refresh token novo (com commit) e devolve `(access_token, refresh_token)`."""
  refresh_token = gerar_token()
  token = TokenAtualizacao(
    usuario_id=usuario.id,
    token_hash=hash_token(refresh_token),
    expira_em=datetime.now(timezone.utc) + timedelta(days=configuracoes.refresh_token_dias),
  )
  repository.criar_token(sessao, token)
  return criar_access_token(usuario), refresh_token


def renovar(sessao: Session, refresh_token: str) -> str:
  token_hash = hash_token(refresh_token)
  token = repository.buscar_por_hash(sessao, token_hash)

  if not token or token.revogado or token.expira_em < datetime.now(timezone.utc):
    raise HTTPException(401, "Refresh token invalido ou expirado")

  usuario = usuarios_repository.buscar_por_id(sessao, token.usuario_id)
  if not usuario or not usuario.ativo:
    raise HTTPException(401, "Usuario nao encontrado ou inativo")

  return criar_access_token(usuario)


# Magic link (AUT-08)


def _validade(finalidade: FinalidadeToken) -> timedelta:
  if finalidade == FinalidadeToken.convite:
    return timedelta(hours=configuracoes.convite_horas)
  return timedelta(minutes=configuracoes.redefinicao_senha_minutos)


def emitir_link(sessao: Session, usuario: Usuario, finalidade: FinalidadeToken) -> str:
  """Gera um magic link e devolve o token em claro, que só existe no e-mail.

  Invalida os links anteriores da mesma finalidade. Não faz commit: o link é gravado na mesma
  transação de quem chama.
  """
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


def aceitar_convite(
  sessao: Session, dados: schemas.ConviteAceitar
) -> tuple[str, str, Usuario]:
  link, usuario = _link_valido(sessao, dados.token, FinalidadeToken.convite, travar=True)
  usuario.nome = dados.nome
  if "data_nascimento" in dados.model_fields_set:
    usuario.data_nascimento = dados.data_nascimento
  usuario.senha_hash = gerar_hash_senha(dados.senha)
  link.usado_em = datetime.now(timezone.utc)
  # O commit do refresh token grava tudo junto: senha, dados e link usado.
  access_token, refresh_token = _abrir_sessao(sessao, usuario)
  return access_token, refresh_token, usuario


# Troca e redefinição de senha (USU-07)


def _definir_senha(sessao: Session, usuario: Usuario, senha: str) -> tuple[str, str]:
  """Grava a senha, encerra as outras sessões, invalida os links pendentes e abre uma sessão nova,
  tudo num commit só."""
  usuario.senha_hash = gerar_hash_senha(senha)
  repository.revogar_tokens_do_usuario(sessao, usuario.id)
  # Um link de redefinição pedido antes da troca não pode redefinir a senha nova (AUT-08).
  repository.apagar_links_pendentes(sessao, usuario.id)
  return _abrir_sessao(sessao, usuario)


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


def confirmar_redefinicao(
  sessao: Session, dados: schemas.RedefinicaoConfirmar
) -> tuple[str, str, Usuario]:
  link, usuario = _link_valido(
    sessao, dados.token, FinalidadeToken.redefinicao_senha, travar=True
  )
  link.usado_em = datetime.now(timezone.utc)
  # Grava o uso já: `_definir_senha` apaga os links ainda não usados, e este fica como histórico.
  sessao.flush()
  access_token, refresh_token = _definir_senha(sessao, usuario, dados.senha)
  return access_token, refresh_token, usuario


def trocar_senha(
  sessao: Session, usuario_id: uuid.UUID, dados: schemas.TrocaSenha
) -> tuple[str, str, Usuario]:
  usuario = usuarios_repository.buscar_por_id(sessao, usuario_id)
  # O access token ainda vale até expirar; a troca, não (AUT-03).
  if not usuario or not usuario.ativo or usuario.senha_hash is None:
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario nao encontrado ou inativo")
  if not verificar_senha(dados.senha_atual, usuario.senha_hash):
    raise HTTPException(status.HTTP_400_BAD_REQUEST, SENHA_ATUAL_INCORRETA)
  access_token, refresh_token = _definir_senha(sessao, usuario, dados.senha_nova)
  return access_token, refresh_token, usuario
