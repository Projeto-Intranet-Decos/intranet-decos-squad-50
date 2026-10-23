import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import obter_sessao
from app.core.permissions import UsuarioAutenticado, requer_superadmin
from app.modules.usuarios import schemas, service

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

@router.get(
  "",
  response_model=list[schemas.UsuarioResposta],
  dependencies=[Depends(requer_superadmin)],
)
def listar_usuarios(sessao: Session = Depends(obter_sessao)):
  return service.listar_usuarios(sessao)


@router.post(
  "", response_model=schemas.UsuarioCriadoResposta, status_code=status.HTTP_201_CREATED
)
def criar_usuario(
  dados: schemas.UsuarioCriar,
  ator: UsuarioAutenticado = Depends(requer_superadmin),
  sessao: Session = Depends(obter_sessao),
):
  usuario, email_enviado = service.criar_usuario(sessao, dados, ator)
  return schemas.UsuarioCriadoResposta(
    **schemas.UsuarioResposta.model_validate(usuario).model_dump(),
    email_enviado=email_enviado,
  )


@router.post("/{usuario_id}/convite", response_model=schemas.ConviteEnviadoResposta)
def reenviar_convite(
  usuario_id: uuid.UUID,
  ator: UsuarioAutenticado = Depends(requer_superadmin),
  sessao: Session = Depends(obter_sessao),
):
  return schemas.ConviteEnviadoResposta(
    email_enviado=service.reenviar_convite(sessao, usuario_id, ator)
  )


@router.put("/{usuario_id}", response_model=schemas.UsuarioResposta)
def atualizar_usuario(
  usuario_id: uuid.UUID,
  dados: schemas.UsuarioAtualizar,
  ator: UsuarioAutenticado = Depends(requer_superadmin),
  sessao: Session = Depends(obter_sessao),
):
  return service.atualizar_usuario(sessao, usuario_id, dados, ator)


@router.delete("/{usuario_id}", response_model=schemas.UsuarioResposta)
def desativar_usuario(
  usuario_id: uuid.UUID,
  ator: UsuarioAutenticado = Depends(requer_superadmin),
  sessao: Session = Depends(obter_sessao),
):
  return service.desativar_usuario(sessao, usuario_id, ator)
