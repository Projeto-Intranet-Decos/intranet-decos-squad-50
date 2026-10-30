import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import obter_sessao
from app.core.permissions import UsuarioAutenticado, requer_superadmin
from app.modules.atalhos import service
from app.modules.atalhos.schemas import AtalhoAtualizar, AtalhoCriar, AtalhoResposta

router = APIRouter(prefix="/atalhos", tags=["atalhos"])


# Leitura para qualquer usuário autenticado. Escrita só do superadmin: os atalhos são globais,
# não pertencem a setor.


@router.get("", response_model=list[AtalhoResposta])
def listar_atalhos(sessao: Session = Depends(obter_sessao)):
    return service.listar_atalhos(sessao)


@router.post("", response_model=AtalhoResposta, status_code=status.HTTP_201_CREATED)
def criar_atalho(
    dados: AtalhoCriar,
    usuario: UsuarioAutenticado = Depends(requer_superadmin),
    sessao: Session = Depends(obter_sessao),
):
    return service.criar_atalho(sessao, dados, usuario)


@router.put("/{atalho_id}", response_model=AtalhoResposta)
def atualizar_atalho(
    atalho_id: uuid.UUID,
    dados: AtalhoAtualizar,
    usuario: UsuarioAutenticado = Depends(requer_superadmin),
    sessao: Session = Depends(obter_sessao),
):
    return service.atualizar_atalho(sessao, atalho_id, dados, usuario)


@router.delete("/{atalho_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_atalho(
    atalho_id: uuid.UUID,
    usuario: UsuarioAutenticado = Depends(requer_superadmin),
    sessao: Session = Depends(obter_sessao),
):
    service.deletar_atalho(sessao, atalho_id, usuario)
