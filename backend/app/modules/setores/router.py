import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import obter_sessao
from app.core.permissions import UsuarioAutenticado, requer_admin, requer_superadmin, usuario_atual
from app.modules.setores import service
from app.modules.setores.schemas import (
    RamalAtualizar,
    RamalCriar,
    RamalResposta,
    SetorAtualizar,
    SetorCriar,
    SetorResposta,
)

router = APIRouter(tags=["setores"])


# Setores: leitura para qualquer usuário autenticado, escrita exclusiva de superadmin.


@router.get("/setores", response_model=list[SetorResposta], dependencies=[Depends(usuario_atual)])
def listar_setores(sessao: Session = Depends(obter_sessao)):
    return service.listar_setores(sessao)


@router.get(
    "/setores/{setor_id}", response_model=SetorResposta, dependencies=[Depends(usuario_atual)]
)
def buscar_setor(setor_id: uuid.UUID, sessao: Session = Depends(obter_sessao)):
    return service.buscar_setor(sessao, setor_id)


@router.post("/setores", response_model=SetorResposta, status_code=status.HTTP_201_CREATED)
def criar_setor(
    dados: SetorCriar,
    usuario: UsuarioAutenticado = Depends(requer_superadmin),
    sessao: Session = Depends(obter_sessao),
):
    return service.criar_setor(sessao, dados, usuario)


@router.put("/setores/{setor_id}", response_model=SetorResposta)
def atualizar_setor(
    setor_id: uuid.UUID,
    dados: SetorAtualizar,
    usuario: UsuarioAutenticado = Depends(requer_superadmin),
    sessao: Session = Depends(obter_sessao),
):
    return service.atualizar_setor(sessao, setor_id, dados, usuario)


@router.delete("/setores/{setor_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_setor(
    setor_id: uuid.UUID,
    usuario: UsuarioAutenticado = Depends(requer_superadmin),
    sessao: Session = Depends(obter_sessao),
):
    service.deletar_setor(sessao, setor_id, usuario)


# Ramais: leitura para qualquer usuário autenticado, escrita para admin_setor (do próprio
# setor, checado no service) e superadmin.


@router.get(
    "/setores/{setor_id}/ramais",
    response_model=list[RamalResposta],
    dependencies=[Depends(usuario_atual)],
)
def listar_ramais(setor_id: uuid.UUID, sessao: Session = Depends(obter_sessao)):
    return service.listar_ramais(sessao, setor_id)


@router.post(
    "/setores/{setor_id}/ramais",
    response_model=RamalResposta,
    status_code=status.HTTP_201_CREATED,
)
def criar_ramal(
    setor_id: uuid.UUID,
    dados: RamalCriar,
    usuario: UsuarioAutenticado = Depends(requer_admin),
    sessao: Session = Depends(obter_sessao),
):
    return service.criar_ramal(sessao, setor_id, dados, usuario)


@router.put("/ramais/{ramal_id}", response_model=RamalResposta)
def atualizar_ramal(
    ramal_id: uuid.UUID,
    dados: RamalAtualizar,
    usuario: UsuarioAutenticado = Depends(requer_admin),
    sessao: Session = Depends(obter_sessao),
):
    return service.atualizar_ramal(sessao, ramal_id, dados, usuario)


@router.delete("/ramais/{ramal_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_ramal(
    ramal_id: uuid.UUID,
    usuario: UsuarioAutenticado = Depends(requer_admin),
    sessao: Session = Depends(obter_sessao),
):
    service.deletar_ramal(sessao, ramal_id, usuario)
