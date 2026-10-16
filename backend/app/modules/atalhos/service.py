import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.atalhos import repository
from app.modules.atalhos.models import Atalho
from app.modules.atalhos.schemas import AtalhoAtualizar, AtalhoCriar


def listar_atalhos(sessao: Session) -> list[Atalho]:
    return repository.listar(sessao)


def buscar_atalho(sessao: Session, atalho_id: uuid.UUID) -> Atalho:
    atalho = repository.buscar_por_id(sessao, atalho_id)
    if atalho is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Atalho não encontrado")
    return atalho


def criar_atalho(sessao: Session, dados: AtalhoCriar) -> Atalho:
    atalho = Atalho(titulo=dados.titulo, url=dados.url)
    repository.adicionar(sessao, atalho)
    return atalho


def atualizar_atalho(sessao: Session, atalho_id: uuid.UUID, dados: AtalhoAtualizar) -> Atalho:
    atalho = buscar_atalho(sessao, atalho_id)
    campos = dados.model_dump(exclude_unset=True)
    if not campos:
        return atalho
    for campo, valor in campos.items():
        setattr(atalho, campo, valor)
    atalho.atualizado_em = datetime.now(UTC)
    repository.salvar(sessao)
    return atalho


def deletar_atalho(sessao: Session, atalho_id: uuid.UUID) -> None:
    repository.remover(sessao, buscar_atalho(sessao, atalho_id))
