import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AcaoLog(StrEnum):
    CRIAR = "criar"
    EDITAR = "editar"
    EXCLUIR = "excluir"


class ModuloLog(StrEnum):
    MURAIS = "murais"
    DOCUMENTOS = "documentos"
    DUVIDAS = "duvidas"
    SETORES = "setores"
    USUARIOS = "usuarios"
    ATALHOS = "atalhos"


class Log(Base):
    """Registro de auditoria (LOG-01). Imutável e sem FK: sobrevive à exclusão do usuário e da
    entidade, por isso guarda o nome do usuário e o resumo da entidade no momento da ação."""

    __tablename__ = "logs"
    __table_args__ = (
        CheckConstraint("acao IN ('criar', 'editar', 'excluir')", name="ck_logs_acao"),
        CheckConstraint(
            "modulo IN ('murais', 'documentos', 'duvidas', 'setores', 'usuarios', 'atalhos')",
            name="ck_logs_modulo",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    usuario_nome: Mapped[str] = mapped_column(String(200))
    setor_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, index=True)
    acao: Mapped[AcaoLog] = mapped_column(String(20))
    modulo: Mapped[ModuloLog] = mapped_column(String(20))
    entidade_tipo: Mapped[str] = mapped_column(String(50))
    entidade_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    resumo: Mapped[str] = mapped_column(String(500))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
