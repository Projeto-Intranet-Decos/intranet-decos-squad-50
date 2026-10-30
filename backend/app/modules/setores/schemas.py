import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RamalCriar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    numero: str = Field(min_length=1, max_length=20, pattern=r"^[0-9()+\- ]+$")


class RamalAtualizar(RamalCriar):
    pass


class RamalResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    numero: str
    setor_id: uuid.UUID


class SetorCriar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nome: str = Field(min_length=1, max_length=200)


class SetorAtualizar(SetorCriar):
    pass


class SetorResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome: str
    criado_em: datetime
    ramais: list[RamalResposta]
