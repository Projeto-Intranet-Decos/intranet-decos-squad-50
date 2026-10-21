import uuid
from datetime import date, datetime
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.modules.setores.models import Setor

class Papel(str, Enum):
  comum = "comum"
  admin_setor = "admin_setor"
  superadmin = "superadmin"

class Usuario(Base):
  __tablename__ = "usuarios"

  id: Mapped[uuid.UUID] = mapped_column(
      Uuid, primary_key=True, server_default=text("gen_random_uuid()")
  )
  nome: Mapped[str] = mapped_column(String(200))
  email: Mapped[str] = mapped_column(String(200), unique=True)
  # Nulo enquanto o usuário convidado não ativa a conta (AUT-09).
  senha_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
  role: Mapped[Papel] = mapped_column(String(20), default=Papel.comum)
  setor_id: Mapped[uuid.UUID | None] = mapped_column(
      Uuid, ForeignKey("setores.id"), nullable=True
  )
  data_nascimento: Mapped[date | None] = mapped_column(Date, nullable=True)
  ativo: Mapped[bool] = mapped_column(Boolean, default=True)
  criado_em: Mapped[datetime] = mapped_column(
      DateTime(timezone=True), server_default=func.now()
  )

  # Sem back_populates: evita alterar setores/models.py, que é de outro módulo.
  setor: Mapped[Setor | None] = relationship()

  @property
  def convite_pendente(self) -> bool:
    return self.senha_hash is None
