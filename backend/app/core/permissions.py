import uuid
from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decodificar_token


class Papel(StrEnum):
    COMUM = "comum"
    ADMIN_SETOR = "admin_setor"
    SUPERADMIN = "superadmin"


@dataclass(frozen=True)
class UsuarioAutenticado:
    """Usuário montado a partir do access token, sem consulta ao banco.

    Unica fonte de usuario autenticado da API. Desativacao e troca de papel so valem
    quando o access token expira; ver "Fonte do usuario autenticado" em
    docs/arquitetura-backend.md.
    """

    id: uuid.UUID
    role: Papel
    setor_id: uuid.UUID | None


esquema_bearer = HTTPBearer(auto_error=False)


def usuario_atual(
    credenciais: HTTPAuthorizationCredentials | None = Depends(esquema_bearer),
) -> UsuarioAutenticado:
    nao_autenticado = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credenciais is None:
        raise nao_autenticado
    try:
        payload = decodificar_token(credenciais.credentials)
        setor_id = payload.get("setor_id")
        return UsuarioAutenticado(
            id=uuid.UUID(payload["sub"]),
            role=Papel(payload["role"]),
            setor_id=uuid.UUID(setor_id) if setor_id else None,
        )
    except (jwt.PyJWTError, KeyError, ValueError):
        raise nao_autenticado


def requer_roles(*roles: Papel) -> Callable[[UsuarioAutenticado], UsuarioAutenticado]:
    def dependencia(usuario: UsuarioAutenticado = Depends(usuario_atual)) -> UsuarioAutenticado:
        if usuario.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso negado")
        return usuario

    return dependencia


requer_admin = requer_roles(Papel.ADMIN_SETOR, Papel.SUPERADMIN)
requer_superadmin = requer_roles(Papel.SUPERADMIN)


def pode_gerenciar_setor(usuario: UsuarioAutenticado, setor_id: uuid.UUID) -> bool:
    """Escopo por setor: superadmin gerencia qualquer setor, admin_setor só o próprio."""
    if usuario.role == Papel.SUPERADMIN:
        return True
    return usuario.role == Papel.ADMIN_SETOR and usuario.setor_id == setor_id


def garantir_escopo(usuario: UsuarioAutenticado, setor_id: uuid.UUID) -> None:
    if not pode_gerenciar_setor(usuario, setor_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Fora do seu setor")


def resolver_setor(
    setor_id: uuid.UUID | None, usuario: UsuarioAutenticado, entidade: str
) -> uuid.UUID:
    if usuario.role == Papel.ADMIN_SETOR:
        if usuario.setor_id is None or (setor_id is not None and setor_id != usuario.setor_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Fora do seu setor")
        return usuario.setor_id
    escolhido = setor_id or usuario.setor_id
    if escolhido is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            {"campo": "setor_id", "mensagem": f"Informe o setor do {entidade}"},
        )
    return escolhido
