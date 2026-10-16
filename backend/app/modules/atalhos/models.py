import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Atalho(Base):
    """Link externo da seção "Acesso rápido" da barra lateral. Global, sem setor."""

    __tablename__ = "atalhos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    titulo: Mapped[str] = mapped_column(String(100))
    url: Mapped[str] = mapped_column(String(500))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
