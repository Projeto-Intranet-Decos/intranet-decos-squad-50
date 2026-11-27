import uuid

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.modules.documentos.models import Documento, DocumentoVersao
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
  if filtro.desde is not None:
    # A versão 1 nasce com o documento (DOC-09): uma versão recente cobre o envio e a
    # substituição do arquivo, e editar só os metadados não conta.
    consulta = consulta.where(
      select(DocumentoVersao.id)
      .where(
        DocumentoVersao.documento_id == Documento.id,
        DocumentoVersao.criado_em > filtro.desde,
      )
      .exists()
    )
  return list(sessao.scalars(consulta.order_by(Documento.criado_em.desc())))


def buscar_por_id(sessao: Session, documento_id: uuid.UUID) -> Documento | None:
  return sessao.scalars(_consulta_base().where(Documento.id == documento_id)).first()


def listar_versoes(sessao: Session, documento_id: uuid.UUID) -> list[DocumentoVersao]:
  consulta = (
    select(DocumentoVersao)
    .options(selectinload(DocumentoVersao.autor))
    .where(DocumentoVersao.documento_id == documento_id)
    .order_by(DocumentoVersao.numero.desc())
  )
  return list(sessao.scalars(consulta))


def buscar_versao(sessao: Session, documento_id: uuid.UUID, numero: int) -> DocumentoVersao | None:
  return sessao.scalars(
    select(DocumentoVersao).where(
      DocumentoVersao.documento_id == documento_id, DocumentoVersao.numero == numero
    )
  ).first()


def adicionar(sessao: Session, documento: Documento) -> None:
  sessao.add(documento)
  sessao.commit()


def salvar(sessao: Session) -> None:
  sessao.commit()


def remover(sessao: Session, documento: Documento) -> None:
  sessao.delete(documento)
  sessao.commit()
