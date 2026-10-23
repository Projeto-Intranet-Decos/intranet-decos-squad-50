import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import obter_sessao
from app.core.permissions import UsuarioAutenticado, requer_admin, usuario_atual
from app.modules.duvidas import service
from app.modules.duvidas.schemas import FaqAtualizar, FaqCriar, FaqResposta

router = APIRouter(prefix="/duvidas", tags=["duvidas"])


# Leitura institucional (qualquer usuário autenticado). Escrita para admin_setor (do próprio
# setor, checado no service) e superadmin.


@router.get("/faq", response_model=list[FaqResposta], dependencies=[Depends(usuario_atual)])
def listar_faq(sessao: Session = Depends(obter_sessao)):
    return service.listar_faq(sessao)


@router.get("/faq/{faq_id}", response_model=FaqResposta, dependencies=[Depends(usuario_atual)])
def buscar_faq(faq_id: uuid.UUID, sessao: Session = Depends(obter_sessao)):
    return service.buscar_faq(sessao, faq_id)


@router.post("/faq", response_model=FaqResposta, status_code=status.HTTP_201_CREATED)
def criar_faq(
    dados: FaqCriar,
    usuario: UsuarioAutenticado = Depends(requer_admin),
    sessao: Session = Depends(obter_sessao),
):
    return service.criar_faq(sessao, dados, usuario)


@router.put("/faq/{faq_id}", response_model=FaqResposta)
def atualizar_faq(
    faq_id: uuid.UUID,
    dados: FaqAtualizar,
    usuario: UsuarioAutenticado = Depends(requer_admin),
    sessao: Session = Depends(obter_sessao),
):
    return service.atualizar_faq(sessao, faq_id, dados, usuario)


@router.delete("/faq/{faq_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_faq(
    faq_id: uuid.UUID,
    usuario: UsuarioAutenticado = Depends(requer_admin),
    sessao: Session = Depends(obter_sessao),
):
    service.deletar_faq(sessao, faq_id, usuario)
