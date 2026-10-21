from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import configuracoes
from app.core.security import (
  criar_access_token,
  gerar_token,
  hash_token,
  verificar_senha,
)
from app.modules.autenticacao import repository
from app.modules.autenticacao.models import TokenAtualizacao
from app.modules.usuarios import repository as usuarios_repository
from app.modules.usuarios.models import Usuario


def autenticar(sessao: Session, email: str, senha: str) -> tuple[str, str, Usuario]:
  usuario = usuarios_repository.buscar_por_email(sessao, email)
  if not usuario or not usuario.ativo or not verificar_senha(senha, usuario.senha_hash):
    raise HTTPException(401, "Email ou senha invalidos")

  access_token = criar_access_token(usuario)
  refresh_token = gerar_token()

  token = TokenAtualizacao(
    usuario_id=usuario.id,
    token_hash=hash_token(refresh_token),
    expira_em=datetime.now(timezone.utc) + timedelta(days=configuracoes.refresh_token_dias),
  )
  repository.criar_token(sessao, token)

  return access_token, refresh_token, usuario


def renovar(sessao: Session, refresh_token: str) -> str:
  token_hash = hash_token(refresh_token)
  token = repository.buscar_por_hash(sessao, token_hash)

  if not token or token.revogado or token.expira_em < datetime.now(timezone.utc):
    raise HTTPException(401, "Refresh token invalido ou expirado")

  usuario = usuarios_repository.buscar_por_id(sessao, token.usuario_id)
  if not usuario or not usuario.ativo:
    raise HTTPException(401, "Usuario nao encontrado ou inativo")

  return criar_access_token(usuario)
