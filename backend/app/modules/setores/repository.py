import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.setores.models import Ramal, Setor


def listar_setores(sessao: Session) -> list[Setor]:
    consulta = select(Setor).options(selectinload(Setor.ramais)).order_by(Setor.nome)
    return list(sessao.scalars(consulta))


def buscar_setor_por_id(sessao: Session, setor_id: uuid.UUID) -> Setor | None:
    return sessao.get(Setor, setor_id)


def buscar_ramal_por_id(sessao: Session, ramal_id: uuid.UUID) -> Ramal | None:
    return sessao.get(Ramal, ramal_id)


def adicionar(sessao: Session, entidade: Setor | Ramal) -> None:
    sessao.add(entidade)
    sessao.commit()


def salvar(sessao: Session) -> None:
    sessao.commit()


def remover(sessao: Session, entidade: Setor | Ramal) -> None:
    sessao.delete(entidade)
    sessao.commit()
