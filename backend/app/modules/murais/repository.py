import uuid
from datetime import UTC, date, datetime, time

from sqlalchemy import Select, extract, func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.murais.models import AnexoAviso, Aviso, CategoriaAviso
from app.modules.usuarios.models import Usuario


def _consulta_base() -> Select[tuple[Aviso]]:
  return select(Aviso).options(
    selectinload(Aviso.autor), selectinload(Aviso.setor), selectinload(Aviso.anexos)
  )


def listar(sessao: Session) -> list[Aviso]:
  consulta = _consulta_base().order_by(Aviso.criado_em.desc())
  return list(sessao.scalars(consulta))


def listar_eventos(
  sessao: Session,
  de: date | None = None,
  ate: date | None = None,
  setor_id: uuid.UUID | None = None,
) -> list[Aviso]:
  consulta = (
    _consulta_base()
    .where(Aviso.categoria == CategoriaAviso.EVENTO)
    .order_by(Aviso.data_inicio, Aviso.titulo)
  )
  # Evento de vários dias entra em todo período que atravessa; sem fim, só o início conta.
  if de is not None:
    inicio_do_periodo = datetime.combine(de, time.min, tzinfo=UTC)
    consulta = consulta.where(func.coalesce(Aviso.data_fim, Aviso.data_inicio) >= inicio_do_periodo)
  if ate is not None:
    consulta = consulta.where(Aviso.data_inicio <= datetime.combine(ate, time.max, tzinfo=UTC))
  if setor_id is not None:
    consulta = consulta.where(Aviso.setor_id == setor_id)
  return list(sessao.scalars(consulta))


def listar_aniversariantes(sessao: Session, mes: int) -> list[Usuario]:
  consulta = (
    select(Usuario)
    .options(selectinload(Usuario.setor))
    .where(
      Usuario.ativo.is_(True),
      Usuario.data_nascimento.is_not(None),
      extract("month", Usuario.data_nascimento) == mes,
    )
    .order_by(extract("day", Usuario.data_nascimento), Usuario.nome)
  )
  return list(sessao.scalars(consulta))


def buscar_por_id(sessao: Session, aviso_id: uuid.UUID) -> Aviso | None:
  return sessao.scalars(_consulta_base().where(Aviso.id == aviso_id)).first()


def buscar_anexo(
  sessao: Session, aviso_id: uuid.UUID, anexo_id: uuid.UUID
) -> AnexoAviso | None:
  consulta = select(AnexoAviso).where(AnexoAviso.id == anexo_id, AnexoAviso.aviso_id == aviso_id)
  return sessao.scalars(consulta).first()


def adicionar(sessao: Session, aviso: Aviso) -> None:
  sessao.add(aviso)
  sessao.commit()


def salvar(sessao: Session) -> None:
  sessao.commit()


def remover(sessao: Session, aviso: Aviso) -> None:
  sessao.delete(aviso)
  sessao.commit()
