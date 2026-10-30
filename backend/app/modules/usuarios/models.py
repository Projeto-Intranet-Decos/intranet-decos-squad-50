import uuid
from datetime import date, datetime
from enum import Enum

from sqlalchemy import (
  Boolean,
  CheckConstraint,
  ColumnElement,
  Date,
  DateTime,
  ForeignKey,
  String,
  Uuid,
  text,
)
from sqlalchemy.ext.hybrid import hybrid_property
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
  # O schema já grava em minúsculas (USU-02); a constraint impede que um caminho por fora (script,
  # SQL direto) crie Maria@x ao lado de maria@x.
  __table_args__ = (
    CheckConstraint("email = lower(email)", name="ck_usuarios_email_minusculo"),
  )

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

  # Híbrida: a mesma regra vale no objeto e nas consultas (ex: `~Usuario.convite_pendente`).
  @hybrid_property
  def convite_pendente(self) -> bool:
    return self.senha_hash is None

  @convite_pendente.inplace.expression
  @classmethod
  def _convite_pendente_sql(cls) -> ColumnElement[bool]:
    return cls.senha_hash.is_(None)
