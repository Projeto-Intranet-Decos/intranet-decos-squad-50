import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import UploadFile
from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field, field_validator

from app.modules.murais.models import CategoriaAviso


def _conteudo_vazio_vira_nulo(valor: str | None) -> str | None:
  # Conteúdo é opcional em evento; "obrigatório fora de evento" é checado no service, que
  # conhece a categoria final (ver docs/specs/murais.md, MUR-03 e MUR-06).
  return valor or None


def _data_em_utc(valor: datetime | None) -> datetime | None:
  if valor is not None and valor.tzinfo is None:
    return valor.replace(tzinfo=UTC)
  return valor


def _texto_vazio_vira_nulo(valor):
  # Formulário manda "" quando o campo existe mas não foi preenchido.
  return None if valor == "" else valor


Conteudo = Annotated[str | None, AfterValidator(_conteudo_vazio_vira_nulo)]
# Data/hora sem fuso é tratada como UTC.
DataHora = Annotated[
  datetime | None, BeforeValidator(_texto_vazio_vira_nulo), AfterValidator(_data_em_utc)
]


class AvisoCriar(BaseModel):
  """Chega como multipart/form-data. Os arquivos ficam dentro do model porque o FastAPI não
  achata um model de Form quando há um UploadFile declarado ao lado dele."""

  model_config = ConfigDict(str_strip_whitespace=True)

  titulo: str = Field(min_length=1, max_length=200)
  conteudo: Conteudo = None
  categoria: CategoriaAviso = CategoriaAviso.COMUNICADO
  data_inicio: DataHora = None
  data_fim: DataHora = None
  fixado: bool = False
  setor_id: uuid.UUID | None = None
  imagem: UploadFile | None = None
  anexos: list[UploadFile] = []


class AvisoAtualizar(BaseModel):
  """Só o texto e as datas. Capa e anexos têm endpoints próprios.

  `conteudo` e `data_fim` aceitam `null` (limpar); se o aviso resultante pode ficar sem eles
  é decidido no service.
  """

  model_config = ConfigDict(str_strip_whitespace=True)

  titulo: str | None = Field(default=None, min_length=1, max_length=200)
  conteudo: Conteudo = None
  categoria: CategoriaAviso | None = None
  data_inicio: DataHora = None
  data_fim: DataHora = None
  fixado: bool | None = None

  @field_validator("titulo", "categoria", "data_inicio", "fixado")
  @classmethod
  def rejeitar_nulo(cls, valor):
    if valor is None:
      raise ValueError("Não pode ser nulo")
    return valor


class AnexoResposta(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: uuid.UUID
  nome_arquivo: str
  tipo_conteudo: str
  tamanho_bytes: int


class AvisoResposta(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: uuid.UUID
  titulo: str
  conteudo: str | None
  categoria: CategoriaAviso
  data_inicio: datetime | None
  data_fim: datetime | None
  fixado: bool
  possui_imagem: bool
  versao_imagem: str | None
  anexos: list[AnexoResposta]
  setor_id: uuid.UUID
  setor_nome: str
  autor_id: uuid.UUID
  autor_nome: str
  criado_em: datetime
  atualizado_em: datetime | None


class AniversarianteResposta(BaseModel):
  id: uuid.UUID
  nome: str
  dia: int
  setor_id: uuid.UUID | None
  setor_nome: str | None
