import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class TokenAtualizacao(Base):
  __tablename__ = "tokens_atualizacao"

  id: Mapped[uuid.UUID] = mapped_column(
    Uuid, primary_key=True, server_default=text("gen_random_uuid()")
  )
  usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("usuarios.id"))
  token_hash: Mapped[str] = mapped_column(String(255), unique=True)
  expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
  revogado: Mapped[bool] = mapped_column(Boolean, default=False)
  criado_em: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), server_default=func.now()
  )


class FinalidadeToken(str, Enum):
  convite = "convite"
  redefinicao_senha = "redefinicao_senha"


class TokenUsoUnico(Base):
  """Magic link (AUT-08): token enviado por e-mail que autoriza uma única ação."""

  __tablename__ = "tokens_uso_unico"
  __table_args__ = (
    CheckConstraint(
      "finalidade IN ('convite', 'redefinicao_senha')", name="ck_tokens_uso_unico_finalidade"
    ),
  )

  id: Mapped[uuid.UUID] = mapped_column(
    Uuid, primary_key=True, server_default=text("gen_random_uuid()")
  )
  usuario_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("usuarios.id"), index=True)
  finalidade: Mapped[FinalidadeToken] = mapped_column(String(30))
  token_hash: Mapped[str] = mapped_column(String(64), unique=True)
  expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
  usado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  criado_em: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), server_default=func.now()
  )
