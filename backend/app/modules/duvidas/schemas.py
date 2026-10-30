import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FaqCriar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    pergunta: str = Field(min_length=1, max_length=500)
    resposta: str = Field(min_length=1)
    setor_id: uuid.UUID | None = None


class FaqAtualizar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    pergunta: str | None = Field(default=None, min_length=1, max_length=500)
    resposta: str | None = Field(default=None, min_length=1)

    @field_validator("pergunta", "resposta")
    @classmethod
    def rejeitar_nulo(cls, valor):
        if valor is None:
            raise ValueError("Não pode ser nulo")
        return valor


class FaqResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pergunta: str
    resposta: str
    setor_id: uuid.UUID
    setor_nome: str
    autor_id: uuid.UUID
    autor_nome: str
    criado_em: datetime
    atualizado_em: datetime | None
