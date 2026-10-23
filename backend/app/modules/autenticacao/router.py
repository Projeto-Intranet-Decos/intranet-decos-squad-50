from collections.abc import Callable

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.core.database import obter_fabrica_de_sessoes, obter_sessao
from app.core.permissions import UsuarioAutenticado, usuario_atual
from app.modules.autenticacao import schemas, service
from app.modules.usuarios.schemas import UsuarioResposta

router = APIRouter(prefix="/auth", tags=["autenticacao"])


def _sessao_aberta(access_token: str, refresh_token: str, usuario) -> schemas.TokenResposta:
  return schemas.TokenResposta(
    access_token=access_token,
    refresh_token=refresh_token,
    usuario=UsuarioResposta.model_validate(usuario),
  )


@router.post("/login", response_model=schemas.TokenResposta)
def login(dados: schemas.LoginEntrada, sessao: Session = Depends(obter_sessao)):
  return _sessao_aberta(*service.autenticar(sessao, dados.email, dados.senha))


@router.post("/refresh", response_model=schemas.AccessTokenResposta)
def refresh(dados: schemas.RefreshEntrada, sessao: Session = Depends(obter_sessao)):
  access_token = service.renovar(sessao, dados.refresh_token)
  return schemas.AccessTokenResposta(access_token=access_token)


@router.post("/convite/verificar", response_model=schemas.ConviteResposta)
def verificar_convite(dados: schemas.LinkEntrada, sessao: Session = Depends(obter_sessao)):
  return service.verificar_convite(sessao, dados.token)


@router.post("/convite/aceitar", response_model=schemas.TokenResposta)
def aceitar_convite(dados: schemas.ConviteAceitar, sessao: Session = Depends(obter_sessao)):
  return _sessao_aberta(*service.aceitar_convite(sessao, dados))


@router.post(
  "/redefinicao-senha",
  response_model=schemas.MensagemResposta,
  status_code=status.HTTP_202_ACCEPTED,
)
def pedir_redefinicao_senha(
  dados: schemas.PedidoRedefinicao,
  tarefas: BackgroundTasks,
  abrir_sessao: Callable[[], Session] = Depends(obter_fabrica_de_sessoes),
):
  # Nem a busca da conta roda antes da resposta: o tempo dela não pode revelar se a conta existe.
  tarefas.add_task(service.pedir_redefinicao, abrir_sessao, dados.email)
  return schemas.MensagemResposta(mensagem=service.MENSAGEM_REDEFINICAO)


@router.post("/redefinicao-senha/verificar", response_model=schemas.RedefinicaoResposta)
def verificar_redefinicao_senha(
  dados: schemas.LinkEntrada, sessao: Session = Depends(obter_sessao)
):
  return service.verificar_redefinicao(sessao, dados.token)


@router.post("/redefinicao-senha/confirmar", response_model=schemas.TokenResposta)
def confirmar_redefinicao_senha(
  dados: schemas.RedefinicaoConfirmar, sessao: Session = Depends(obter_sessao)
):
  return _sessao_aberta(*service.confirmar_redefinicao(sessao, dados))


@router.put("/senha", response_model=schemas.TokenResposta)
def trocar_senha(
  dados: schemas.TrocaSenha,
  usuario: UsuarioAutenticado = Depends(usuario_atual),
  sessao: Session = Depends(obter_sessao),
):
  return _sessao_aberta(*service.trocar_senha(sessao, usuario.id, dados))
