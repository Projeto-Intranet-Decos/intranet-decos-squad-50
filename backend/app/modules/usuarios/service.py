import uuid
from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import UsuarioAutenticado
from app.core.security import gerar_hash_senha
from app.modules.logs.models import AcaoLog, ModuloLog
from app.modules.logs.service import registrar
from app.modules.usuarios import repository, schemas
from app.modules.usuarios.models import Usuario

EMAIL_DUPLICADO = {"campo": "email", "mensagem": "Já existe um usuário com esse e-mail"}
SETOR_INEXISTENTE = {"campo": "setor_id", "mensagem": "Setor não encontrado"}

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


def criar_usuario(
  sessao: Session, dados: schemas.UsuarioCriar, ator: UsuarioAutenticado
) -> Usuario:
  usuario = Usuario(
    nome=dados.nome,
    email=dados.email,
    senha_hash=gerar_hash_senha(dados.senha),
    role=dados.role,
    setor_id=dados.setor_id,
    data_nascimento=dados.data_nascimento,
  )
  with _traduzir_conflito(sessao):
    sessao.add(usuario)
    sessao.flush()
    _registrar(sessao, ator, AcaoLog.CRIAR, usuario)
    return repository.criar(sessao, usuario)


def atualizar_usuario(
  sessao: Session, usuario_id: uuid.UUID, dados: schemas.UsuarioAtualizar, ator: UsuarioAutenticado
) -> Usuario:
  usuario = repository.buscar_por_id(sessao, usuario_id)
  if not usuario:
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario nao encontrado")
  for campo, valor in dados.model_dump(exclude_unset=True).items():
    setattr(usuario, campo, valor)
  with _traduzir_conflito(sessao):
    _registrar(sessao, ator, AcaoLog.EDITAR, usuario)
    return repository.salvar(sessao, usuario)


def desativar_usuario(
  sessao: Session, usuario_id: uuid.UUID, ator: UsuarioAutenticado
) -> Usuario:
  usuario = repository.buscar_por_id(sessao, usuario_id)
  if not usuario:
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario nao encontrado")
  usuario.ativo = False
  # Usuário não é apagado, só desativado: para a auditoria isso é a exclusão (USU-04).
  _registrar(sessao, ator, AcaoLog.EXCLUIR, usuario)
  return repository.salvar(sessao, usuario)


def _registrar(
  sessao: Session, ator: UsuarioAutenticado, acao: AcaoLog, usuario: Usuario
) -> None:
  registrar(sessao, ator, acao, ModuloLog.USUARIOS, "usuario", usuario.id, usuario.email)
