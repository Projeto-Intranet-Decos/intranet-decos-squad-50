import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.armazenamento import (
    ErroArmazenamento,
    armazenamento_disponivel,
    garantir_bucket,
)
from app.core.config import configuracoes
from app.core.database import obter_sessao
from app.core.erros import registrar_tratadores_de_erro
from app.modules.autenticacao.router import router as roteador_autenticacao
from app.modules.documentos.router import router as roteador_documentos
from app.modules.duvidas.router import router as roteador_duvidas
from app.modules.murais.router import router as roteador_murais
from app.modules.setores.router import router as roteador_setores
from app.modules.usuarios.router import router as roteador_usuarios

logger = logging.getLogger(__name__)


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI) -> AsyncIterator[None]:
    # A API sobe mesmo com o MinIO fora; o /saude denuncia a indisponibilidade.
    try:
        garantir_bucket()
    except ErroArmazenamento:
        logger.warning("Não foi possível garantir o bucket do MinIO", exc_info=True)
    yield


app = FastAPI(title="Intranet do Hospital", lifespan=ciclo_de_vida)

if configuracoes.origens_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=configuracoes.origens_cors,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

registrar_tratadores_de_erro(app)

app.include_router(roteador_autenticacao)
app.include_router(roteador_setores)
app.include_router(roteador_usuarios)
app.include_router(roteador_murais)
app.include_router(roteador_documentos)
app.include_router(roteador_duvidas)


@app.get("/saude", tags=["saude"])
def verificar_saude(sessao: Session = Depends(obter_sessao)) -> JSONResponse:
    try:
        sessao.execute(text("SELECT 1"))
        banco_ok = True
    except SQLAlchemyError:
        banco_ok = False
    armazenamento_ok = armazenamento_disponivel()
    tudo_ok = banco_ok and armazenamento_ok
    return JSONResponse(
        {
            "status": "ok" if tudo_ok else "indisponivel",
            "banco": "ok" if banco_ok else "indisponivel",
            "armazenamento": "ok" if armazenamento_ok else "indisponivel",
        },
        status_code=status.HTTP_200_OK if tudo_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
    )
