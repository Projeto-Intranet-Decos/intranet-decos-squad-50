import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Final

import jwt
from pwdlib import PasswordHash

from app.core.config import configuracoes
from app.modules.usuarios.models import Usuario

hash_de_senha = PasswordHash.recommended()

ALGORITMO: Final = "HS256"


def gerar_hash_senha(senha: str) -> str:
  return hash_de_senha.hash(senha)


def verificar_senha(senha: str, hash_armazenado: str) -> bool:
  return hash_de_senha.verify(senha, hash_armazenado)


def criar_access_token(usuario: Usuario) -> str:
  expira_em = datetime.now(timezone.utc) + timedelta(
    minutes=configuracoes.access_token_minutos
  )
  payload = {
    "sub": str(usuario.id),
    # Para o indicador do usuário logado no frontend (AUT-03).
    "nome": usuario.nome,
    "role": usuario.role,
    "setor_id": str(usuario.setor_id) if usuario.setor_id else None,
    "exp": expira_em,
  }
  return jwt.encode(payload, configuracoes.jwt_secret, algorithm=ALGORITMO)


def gerar_token() -> str:
  """Token opaco (refresh token e magic link): só o hash vai pro banco."""
  return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
  return hashlib.sha256(token.encode()).hexdigest()


def decodificar_token(token: str) -> dict:
  """Valida assinatura e expiração do access token e devolve o payload."""
  return jwt.decode(token, configuracoes.jwt_secret, algorithms=[ALGORITMO])
