import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Setor(Base):
    __tablename__ = "setores"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nome: Mapped[str] = mapped_column(String(200), unique=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # passive_deletes: a remoção dos ramais fica com o ON DELETE CASCADE do banco.
    # Ordena pelo tamanho antes do texto para "20" vir antes de "100".
    ramais: Mapped[list["Ramal"]] = relationship(
        back_populates="setor",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by=lambda: (func.length(Ramal.numero), Ramal.numero),
    )


class Ramal(Base):
    __tablename__ = "ramais"
    __table_args__ = (UniqueConstraint("setor_id", "numero", name="uq_ramais_setor_id_numero"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    numero: Mapped[str] = mapped_column(String(20))
    setor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("setores.id", ondelete="CASCADE"), index=True
    )

    setor: Mapped[Setor] = relationship(back_populates="ramais")
