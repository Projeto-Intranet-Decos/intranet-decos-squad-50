import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
  BigInteger,
  CheckConstraint,
  DateTime,
  ForeignKey,
  Integer,
  String,
  Text,
  UniqueConstraint,
  func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Usuario


class CategoriaDocumento(StrEnum):
  POP = "pop"
  PROTOCOLO = "protocolo"
  MANUAL = "manual"
  FORMULARIO = "formulario"
  OUTRO = "outro"


class Documento(Base):
  """Metadado do documento. O binário mora no MinIO, na chave `chave_armazenamento`."""

  __tablename__ = "documentos"
  __table_args__ = (
    CheckConstraint(
      "categoria IN ('pop', 'protocolo', 'manual', 'formulario', 'outro')",
      name="ck_documentos_categoria",
    ),
  )

  id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
  titulo: Mapped[str] = mapped_column(String(200))
  descricao: Mapped[str | None] = mapped_column(Text)
  categoria: Mapped[CategoriaDocumento] = mapped_column(
    String(20), default=CategoriaDocumento.OUTRO, server_default=CategoriaDocumento.OUTRO.value,
    index=True,
  )
  # Nome original do arquivo, devolvido no download.
  nome_arquivo: Mapped[str] = mapped_column(String(255))
  # Derivado da extensão, nunca do content-type enviado pelo cliente.
  tipo_conteudo: Mapped[str] = mapped_column(String(150))
  tamanho_bytes: Mapped[int] = mapped_column(BigInteger)
  chave_armazenamento: Mapped[str] = mapped_column(String(500), unique=True)
  autor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id"), index=True)
  setor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("setores.id"), index=True)
  criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
  atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
  # Número da versão atual (DOC-09); os campos de arquivo acima espelham essa versão.
  versao: Mapped[int] = mapped_column(Integer, default=1, server_default="1")

  autor: Mapped[Usuario] = relationship()
  setor: Mapped[Setor] = relationship()
  versoes: Mapped[list["DocumentoVersao"]] = relationship(
    back_populates="documento",
    cascade="all, delete-orphan",
    passive_deletes=True,
    order_by="DocumentoVersao.numero.desc()",
  )

  @property
  def autor_nome(self) -> str:
    return self.autor.nome

  @property
  def setor_nome(self) -> str:
    return self.setor.nome


class DocumentoVersao(Base):
  """Um arquivo enviado para o documento (DOC-09). Nunca é alterado: só a versão atual muda de
  chave se a categoria do documento mudar."""

  __tablename__ = "documento_versoes"
  __table_args__ = (UniqueConstraint("documento_id", "numero", name="uq_documento_versoes_numero"),)

  id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
  documento_id: Mapped[uuid.UUID] = mapped_column(
    ForeignKey("documentos.id", ondelete="CASCADE"), index=True
  )
  numero: Mapped[int] = mapped_column(Integer)
  nome_arquivo: Mapped[str] = mapped_column(String(255))
  tipo_conteudo: Mapped[str] = mapped_column(String(150))
  tamanho_bytes: Mapped[int] = mapped_column(BigInteger)
  chave_armazenamento: Mapped[str] = mapped_column(String(500), unique=True)
  alteracao: Mapped[str | None] = mapped_column(String(500))
  autor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id"), index=True)
  criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

  documento: Mapped[Documento] = relationship(back_populates="versoes")
  autor: Mapped[Usuario] = relationship()

  @property
  def autor_nome(self) -> str:
    return self.autor.nome
