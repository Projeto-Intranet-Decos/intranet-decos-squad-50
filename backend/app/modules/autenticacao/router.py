import math
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import configuracoes
from app.core.database import obter_fabrica_de_sessoes, obter_sessao
from app.core.log_seguranca import ip_do_cliente
from app.core.permissions import UsuarioAutenticado, usuario_atual
from app.modules.autenticacao import schemas, service
from app.modules.usuarios.schemas import UsuarioResposta

router = APIRouter(prefix="/auth", tags=["autenticacao"])

# AUT-07: o refresh token só existe neste cookie, que o JavaScript não lê.
COOKIE_REFRESH = "intranet_refresh"
CookieRefresh = Annotated[str | None, Cookie(alias=COOKIE_REFRESH)]


def _atributos_do_cookie() -> dict:
  # SameSite=Strict: o navegador não manda o cookie em requisição vinda de outro site (CSRF).
  return {
    "httponly": True,
    "secure": configuracoes.cookie_seguro,
    "samesite": "strict",
    "path": "/",
  }


def _gravar_refresh(resposta: Response, refresh_token: str, expira_em: datetime) -> None:
  restante = (expira_em - datetime.now(timezone.utc)).total_seconds()
  resposta.set_cookie(
    COOKIE_REFRESH, refresh_token, max_age=max(0, math.ceil(restante)), **_atributos_do_cookie()
  )


def _sessao_aberta(resposta: Response, sessao: service.SessaoAberta) -> schemas.TokenResposta:
  _gravar_refresh(resposta, sessao.refresh_token, sessao.refresh_expira_em)
  return schemas.TokenResposta(
    access_token=sessao.access_token,
    usuario=UsuarioResposta.model_validate(sessao.usuario),
  )


@router.post("/login", response_model=schemas.TokenResposta)
def login(
  dados: schemas.LoginEntrada,
  request: Request,
  resposta: Response,
  sessao: Session = Depends(obter_sessao),
):
  return _sessao_aberta(
    resposta, service.autenticar(sessao, dados.email, dados.senha, ip_do_cliente(request))
  )


@router.post("/refresh", response_model=schemas.AccessTokenResposta)
def refresh(
  request: Request,
  resposta: Response,
  refresh_token: CookieRefresh = None,
  sessao: Session = Depends(obter_sessao),
):
  renovacao = service.renovar(sessao, refresh_token, ip_do_cliente(request))
  if renovacao.refresh_token:
    _gravar_refresh(resposta, renovacao.refresh_token, renovacao.refresh_expira_em)
  return schemas.AccessTokenResposta(access_token=renovacao.access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(refresh_token: CookieRefresh = None, sessao: Session = Depends(obter_sessao)):
  # Sem exigir access token: quem sai com ele vencido também precisa sair (AUT-06).
  service.encerrar(sessao, refresh_token)
  resposta = Response(status_code=status.HTTP_204_NO_CONTENT)
  resposta.delete_cookie(COOKIE_REFRESH, **_atributos_do_cookie())
  return resposta


@router.post("/convite/verificar", response_model=schemas.ConviteResposta)
def verificar_convite(dados: schemas.LinkEntrada, sessao: Session = Depends(obter_sessao)):
  return service.verificar_convite(sessao, dados.token)


@router.post("/convite/aceitar", response_model=schemas.TokenResposta)
def aceitar_convite(
  dados: schemas.ConviteAceitar, resposta: Response, sessao: Session = Depends(obter_sessao)
):
  return _sessao_aberta(resposta, service.aceitar_convite(sessao, dados))


@router.post(
  "/redefinicao-senha",
  response_model=schemas.MensagemResposta,
  status_code=status.HTTP_202_ACCEPTED,
)
def pedir_redefinicao_senha(
  dados: schemas.PedidoRedefinicao,
  request: Request,
  tarefas: BackgroundTasks,
  abrir_sessao: Callable[[], Session] = Depends(obter_fabrica_de_sessoes),
):
  service.aceitar_pedido_de_redefinicao(dados.email, ip_do_cliente(request))
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
  dados: schemas.RedefinicaoConfirmar, resposta: Response, sessao: Session = Depends(obter_sessao)
):
  return _sessao_aberta(resposta, service.confirmar_redefinicao(sessao, dados))


@router.put("/senha", response_model=schemas.TokenResposta)
def trocar_senha(
  dados: schemas.TrocaSenha,
  resposta: Response,
  usuario: UsuarioAutenticado = Depends(usuario_atual),
  sessao: Session = Depends(obter_sessao),
):
  return _sessao_aberta(resposta, service.trocar_senha(sessao, usuario.id, dados))
