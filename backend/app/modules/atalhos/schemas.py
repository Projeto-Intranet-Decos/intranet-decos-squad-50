import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validar_url(valor: str) -> str:
    # Só http(s): o link vira href na barra lateral, então nada de javascript: e afins.
    if not valor.lower().startswith(("http://", "https://")):
        raise ValueError("A URL deve começar com http:// ou https://")
    return valor


class AtalhoCriar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    titulo: str = Field(min_length=1, max_length=100)
    url: str = Field(min_length=1, max_length=500)

    _url_valida = field_validator("url")(_validar_url)


class AtalhoAtualizar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    titulo: str | None = Field(default=None, min_length=1, max_length=100)
    url: str | None = Field(default=None, min_length=1, max_length=500)

    @field_validator("titulo", "url")
    @classmethod
    def rejeitar_nulo(cls, valor):
        if valor is None:
            raise ValueError("Não pode ser nulo")
        return valor

    _url_valida = field_validator("url")(_validar_url)


class AtalhoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    url: str
    criado_em: datetime
    atualizado_em: datetime | None
