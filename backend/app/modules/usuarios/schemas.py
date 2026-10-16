import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.modules.usuarios.models import Papel

# Os limites acompanham as colunas da tabela usuarios, pra estourar em 422 no
# schema em vez de 500 no banco.
SENHA_MINIMA = 8


class UsuarioCriar(BaseModel):
  model_config = ConfigDict(str_strip_whitespace=True)

  nome: str = Field(min_length=1, max_length=200)
  email: EmailStr = Field(max_length=200)
  senha: str = Field(min_length=SENHA_MINIMA, max_length=128)
  role: Papel = Papel.comum
  setor_id: uuid.UUID | None = None
  data_nascimento: date | None = None


class UsuarioAtualizar(BaseModel):
  model_config = ConfigDict(str_strip_whitespace=True)

  nome: str | None = Field(default=None, min_length=1, max_length=200)
  email: EmailStr | None = Field(default=None, max_length=200)
  role: Papel | None = None
  setor_id: uuid.UUID | None = None
  data_nascimento: date | None = None
  ativo: bool | None = None


  @field_validator("nome", "email", "role", "ativo")
  @classmethod
  def rejeitar_nulo(cls, valor):
    if valor is None:
      raise ValueError("Não pode ser nulo")
    return valor


class UsuarioResposta(BaseModel):
  # `email` é str, e não EmailStr: validar na saída faria um registro já gravado
  # virar 500 em vez de ser devolvido.
  model_config = ConfigDict(from_attributes=True)

  id: uuid.UUID
  nome: str
  email: str
  role: Papel
  setor_id: uuid.UUID | None
  data_nascimento: date | None
  ativo: bool
  criado_em: datetime
