import uuid

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.modules.documentos.models import Documento
from app.modules.documentos.schemas import FiltroDocumentos


def _consulta_base() -> Select[tuple[Documento]]:
  return select(Documento).options(selectinload(Documento.autor), selectinload(Documento.setor))


def listar(sessao: Session, filtro: FiltroDocumentos) -> list[Documento]:
  consulta = _consulta_base()
  if filtro.setor_id is not None:
    consulta = consulta.where(Documento.setor_id == filtro.setor_id)
  if filtro.categoria is not None:
    consulta = consulta.where(Documento.categoria == filtro.categoria)
  if filtro.busca:
    consulta = consulta.where(Documento.titulo.icontains(filtro.busca, autoescape=True))
  return list(sessao.scalars(consulta.order_by(Documento.criado_em.desc())))


def buscar_por_id(sessao: Session, documento_id: uuid.UUID) -> Documento | None:
  return sessao.scalars(_consulta_base().where(Documento.id == documento_id)).first()


def adicionar(sessao: Session, documento: Documento) -> None:
  sessao.add(documento)
  sessao.commit()


def salvar(sessao: Session) -> None:
  sessao.commit()


def remover(sessao: Session, documento: Documento) -> None:
  sessao.delete(documento)
  sessao.commit()
