import uuid
from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import correio
from app.core.permissions import UsuarioAutenticado
from app.modules.autenticacao import service as autenticacao_service
from app.modules.autenticacao.models import FinalidadeToken
from app.modules.logs.models import AcaoLog, ModuloLog
from app.modules.logs.service import registrar
from app.modules.usuarios import emails, repository, schemas
from app.modules.usuarios.models import Papel, Usuario

EMAIL_DUPLICADO = {"campo": "email", "mensagem": "Já existe um usuário com esse e-mail"}
SETOR_INEXISTENTE = {"campo": "setor_id", "mensagem": "Setor não encontrado"}
PROPRIA_CONTA_NA_DESATIVACAO = "Você não pode desativar a própria conta"
PROPRIA_CONTA_NA_EDICAO = "Você não pode desativar nem rebaixar a própria conta"

CONFLITOS = {
  "uq_usuarios_email": EMAIL_DUPLICADO,
  "fk_usuarios_setor_id_setores": SETOR_INEXISTENTE,
}


@contextmanager
def _traduzir_conflito(sessao: Session) -> Iterator[None]:
  """Converte violação de constraint no contrato `{campo, mensagem}` que o front espera."""
  try:
    yield
  except IntegrityError as erro:
    sessao.rollback()
    restricao = getattr(getattr(erro.orig, "diag", None), "constraint_name", None) or ""
    conflito = CONFLITOS.get(restricao)
    if conflito is None:
      raise
    raise HTTPException(status.HTTP_409_CONFLICT, conflito) from erro


def listar_usuarios(sessao: Session) -> list[Usuario]:
  return repository.listar(sessao)


def _buscar(sessao: Session, usuario_id: uuid.UUID) -> Usuario:
  usuario = repository.buscar_por_id(sessao, usuario_id)
  if not usuario:
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario nao encontrado")
  return usuario


def criar_usuario(
  sessao: Session, dados: schemas.UsuarioCriar, ator: UsuarioAutenticado
) -> tuple[Usuario, bool]:
  """Cria o usuário pendente e envia o convite (USU-02). Devolve `(usuario, email_enviado)`."""
  usuario = Usuario(
    nome=dados.nome,
    email=dados.email,
    role=dados.role,
    setor_id=dados.setor_id,
    data_nascimento=dados.data_nascimento,
  )
  with _traduzir_conflito(sessao):
    repository.adicionar(sessao, usuario)
    token = autenticacao_service.emitir_link(
      sessao, usuario, FinalidadeToken.convite, usuario_novo=True
    )
    _registrar(sessao, ator, AcaoLog.CRIAR, usuario)
    repository.salvar(sessao, usuario)
  # Depois do commit (GER-22): se o e-mail falhar, o usuário fica e o superadmin reenvia.
  return usuario, correio.enviar_email(emails.convite(usuario, token))


def reenviar_convite(
  sessao: Session, usuario_id: uuid.UUID, ator: UsuarioAutenticado
) -> bool:
  """Novo convite para um pendente (USU-08). Devolve se o e-mail saiu."""
  usuario = _buscar(sessao, usuario_id)
  if not usuario.convite_pendente:
    raise HTTPException(status.HTTP_409_CONFLICT, "Usuário já ativou a conta")
  if not usuario.ativo:
    raise HTTPException(status.HTTP_409_CONFLICT, "Usuário desativado")
  token = autenticacao_service.emitir_link(sessao, usuario, FinalidadeToken.convite)
  _registrar(sessao, ator, AcaoLog.EDITAR, usuario, f"Convite reenviado: {usuario.email}")
  repository.salvar(sessao, usuario)
  return correio.enviar_email(emails.convite(usuario, token))


def atualizar_usuario(
  sessao: Session, usuario_id: uuid.UUID, dados: schemas.UsuarioAtualizar, ator: UsuarioAutenticado
) -> Usuario:
  usuario = _buscar(sessao, usuario_id)
  campos = dados.model_dump(exclude_unset=True)
  # Quem se rebaixa ou se desativa pode ser o último superadmin (USU-03, USU-04).
  if usuario.id == ator.id and (
    campos.get("ativo") is False or campos.get("role", Papel.superadmin) != Papel.superadmin
  ):
    raise HTTPException(status.HTTP_409_CONFLICT, PROPRIA_CONTA_NA_EDICAO)
  # Link mandado pro e-mail antigo não pode ativar/redefinir a conta do novo (AUT-08).
  if "email" in campos and campos["email"] != usuario.email:
    autenticacao_service.invalidar_links(sessao, usuario)
  for campo, valor in campos.items():
    setattr(usuario, campo, valor)
  with _traduzir_conflito(sessao):
    _registrar(sessao, ator, AcaoLog.EDITAR, usuario)
    return repository.salvar(sessao, usuario)


def desativar_usuario(
  sessao: Session, usuario_id: uuid.UUID, ator: UsuarioAutenticado
) -> Usuario:
  usuario = _buscar(sessao, usuario_id)
  if usuario.id == ator.id:
    raise HTTPException(status.HTTP_409_CONFLICT, PROPRIA_CONTA_NA_DESATIVACAO)
  usuario.ativo = False
  autenticacao_service.invalidar_links(sessao, usuario)
  # Usuário não é apagado, só desativado: para a auditoria isso é a exclusão (USU-04).
  _registrar(sessao, ator, AcaoLog.EXCLUIR, usuario)
  return repository.salvar(sessao, usuario)


def _registrar(
  sessao: Session,
  ator: UsuarioAutenticado,
  acao: AcaoLog,
  usuario: Usuario,
  resumo: str | None = None,
) -> None:
  registrar(
    sessao, ator, acao, ModuloLog.USUARIOS, "usuario", usuario.id, resumo or usuario.email
  )
