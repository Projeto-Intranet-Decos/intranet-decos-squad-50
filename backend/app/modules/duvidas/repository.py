import uuid

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.modules.duvidas.models import Faq


def _consulta_base() -> Select[tuple[Faq]]:
    return select(Faq).options(selectinload(Faq.autor), selectinload(Faq.setor))


def listar(sessao: Session) -> list[Faq]:
    consulta = _consulta_base().order_by(Faq.criado_em)
    return list(sessao.scalars(consulta))


def buscar_por_id(sessao: Session, faq_id: uuid.UUID) -> Faq | None:
    return sessao.scalars(_consulta_base().where(Faq.id == faq_id)).first()


def adicionar(sessao: Session, faq: Faq) -> None:
    sessao.add(faq)
    sessao.commit()


def salvar(sessao: Session) -> None:
    sessao.commit()


def remover(sessao: Session, faq: Faq) -> None:
    sessao.delete(faq)
    sessao.commit()
