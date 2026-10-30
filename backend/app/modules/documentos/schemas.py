import uuid
from datetime import datetime

from fastapi import UploadFile
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.documentos.models import CategoriaDocumento


class DocumentoCriar(BaseModel):
  """Chega como multipart/form-data. O arquivo fica dentro do model porque o FastAPI não
  achata um model de Form quando há um UploadFile declarado ao lado dele."""

  model_config = ConfigDict(str_strip_whitespace=True)

  titulo: str = Field(min_length=1, max_length=200)
  descricao: str | None = None
  categoria: CategoriaDocumento = CategoriaDocumento.OUTRO
  setor_id: uuid.UUID | None = None
  arquivo: UploadFile


class DocumentoAtualizar(BaseModel):
  model_config = ConfigDict(str_strip_whitespace=True)

  titulo: str | None = Field(default=None, min_length=1, max_length=200)
  # Aceita null para limpar a descrição.
  descricao: str | None = None
  categoria: CategoriaDocumento | None = None

  @field_validator("titulo", "categoria")
  @classmethod
  def rejeitar_nulo(cls, valor):
    if valor is None:
      raise ValueError("Não pode ser nulo")
    return valor


class FiltroDocumentos(BaseModel):
  setor_id: uuid.UUID | None = None
  categoria: CategoriaDocumento | None = None
  busca: str | None = Field(default=None, max_length=200)


class DocumentoResposta(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: uuid.UUID
  titulo: str
  descricao: str | None
  categoria: CategoriaDocumento
  nome_arquivo: str
  tipo_conteudo: str
  tamanho_bytes: int
  setor_id: uuid.UUID
  setor_nome: str
  autor_id: uuid.UUID
  autor_nome: str
  criado_em: datetime
  atualizado_em: datetime | None
