from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import obter_sessao
from app.modules.autenticacao import schemas, service
from app.modules.usuarios.schemas import UsuarioResposta

router = APIRouter(prefix="/auth", tags=["autenticacao"])


@router.post("/login", response_model=schemas.TokenResposta)
def login(dados: schemas.LoginEntrada, sessao: Session = Depends(obter_sessao)):
  access_token, refresh_token, usuario = service.autenticar(sessao, dados.email, dados.senha)
  return schemas.TokenResposta(
    access_token=access_token,
    refresh_token=refresh_token,
    usuario=UsuarioResposta.model_validate(usuario),
  )


@router.post("/refresh", response_model=schemas.AccessTokenResposta)
def refresh(dados: schemas.RefreshEntrada, sessao: Session = Depends(obter_sessao)):
  access_token = service.renovar(sessao, dados.refresh_token)
  return schemas.AccessTokenResposta(access_token=access_token)


@router.post("/convite/verificar", response_model=schemas.ConviteResposta)
def verificar_convite(dados: schemas.LinkEntrada, sessao: Session = Depends(obter_sessao)):
  return service.verificar_convite(sessao, dados.token)


@router.post("/convite/aceitar", response_model=schemas.TokenResposta)
def aceitar_convite(dados: schemas.ConviteAceitar, sessao: Session = Depends(obter_sessao)):
  access_token, refresh_token, usuario = service.aceitar_convite(sessao, dados)
  return schemas.TokenResposta(
    access_token=access_token,
    refresh_token=refresh_token,
    usuario=UsuarioResposta.model_validate(usuario),
  )
