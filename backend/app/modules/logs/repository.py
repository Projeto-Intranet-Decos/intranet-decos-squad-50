from datetime import UTC, datetime, time, timedelta

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.modules.logs.models import Log
from app.modules.logs.schemas import FiltroLogs


def _filtrar(consulta: Select, filtro: FiltroLogs) -> Select:
    if filtro.usuario_id is not None:
        consulta = consulta.where(Log.usuario_id == filtro.usuario_id)
    if filtro.setor_id is not None:
        consulta = consulta.where(Log.setor_id == filtro.setor_id)
    # Período inclusivo, em UTC: `ate` vale até o último instante daquele dia.
    if filtro.de is not None:
        consulta = consulta.where(Log.criado_em >= datetime.combine(filtro.de, time.min, UTC))
    if filtro.ate is not None:
        fim = datetime.combine(filtro.ate + timedelta(days=1), time.min, UTC)
        consulta = consulta.where(Log.criado_em < fim)
    return consulta


def listar(sessao: Session, filtro: FiltroLogs) -> tuple[list[Log], int]:
    total = sessao.scalar(_filtrar(select(func.count()).select_from(Log), filtro)) or 0
    consulta = (
        _filtrar(select(Log), filtro)
        .order_by(Log.criado_em.desc(), Log.id)
        .limit(filtro.limite)
        .offset(filtro.deslocamento)
    )
    return list(sessao.scalars(consulta)), total
