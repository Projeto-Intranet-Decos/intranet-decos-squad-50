import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.atalhos.models import Atalho


def listar(sessao: Session) -> list[Atalho]:
    return list(sessao.scalars(select(Atalho).order_by(Atalho.criado_em)))


def buscar_por_id(sessao: Session, atalho_id: uuid.UUID) -> Atalho | None:
    return sessao.get(Atalho, atalho_id)


def adicionar(sessao: Session, atalho: Atalho) -> None:
    sessao.add(atalho)
    sessao.commit()


def salvar(sessao: Session) -> None:
    sessao.commit()


def remover(sessao: Session, atalho: Atalho) -> None:
    sessao.delete(atalho)
    sessao.commit()
