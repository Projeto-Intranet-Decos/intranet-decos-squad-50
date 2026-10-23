import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

LIMITE_MAXIMO = 200


class FiltroLogs(BaseModel):
    usuario_id: uuid.UUID | None = None
    setor_id: uuid.UUID | None = None
    de: date | None = None
    ate: date | None = None
    limite: int = Field(default=50, ge=1, le=LIMITE_MAXIMO)
    deslocamento: int = Field(default=0, ge=0)


class LogResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    usuario_id: uuid.UUID
    usuario_nome: str
    setor_id: uuid.UUID | None
    acao: str
    modulo: str
    entidade_tipo: str
    entidade_id: uuid.UUID
    resumo: str
    criado_em: datetime


class ListaLogs(BaseModel):
    itens: list[LogResposta]
    total: int
