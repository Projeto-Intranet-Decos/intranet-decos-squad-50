import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.armazenamento import ArquivoNaoEncontrado, ErroArmazenamento

logger = logging.getLogger(__name__)


def registrar_tratadores_de_erro(app: FastAPI) -> None:
    """Padroniza os erros no contrato que o frontend espera: `{ campo?, mensagem }`.

    Para erro atrelado a um campo, levante `HTTPException` com
    `detail={"campo": ..., "mensagem": ...}`; ele é repassado como está.
    """

    @app.exception_handler(StarletteHTTPException)
    async def tratar_http(request: Request, erro: StarletteHTTPException) -> JSONResponse:
        corpo = erro.detail if isinstance(erro.detail, dict) else {"mensagem": erro.detail}
        return JSONResponse(corpo, status_code=erro.status_code, headers=erro.headers)

    @app.exception_handler(RequestValidationError)
    async def tratar_validacao(request: Request, erro: RequestValidationError) -> JSONResponse:
        primeiro = erro.errors()[0]
        # loc é algo como ("body", "nome") ou ("path", "setor_id")
        local = primeiro["loc"]
        corpo = {"mensagem": primeiro["msg"]}
        if len(local) > 1:
            corpo = {"campo": str(local[-1]), **corpo}
        return JSONResponse(corpo, status_code=status.HTTP_422_UNPROCESSABLE_CONTENT)

    @app.exception_handler(ArquivoNaoEncontrado)
    async def tratar_arquivo_nao_encontrado(
        request: Request, erro: ArquivoNaoEncontrado
    ) -> JSONResponse:
        return JSONResponse(
            {"mensagem": "Arquivo não encontrado no armazenamento"},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    @app.exception_handler(Exception)
    async def tratar_inesperado(request: Request, erro: Exception) -> JSONResponse:
        # GER-05: o detalhe da exceção fica só no log técnico, nunca na resposta.
        logger.error("Erro inesperado em %s %s", request.method, request.url.path, exc_info=erro)
        return JSONResponse(
            {"mensagem": "Erro interno do servidor"},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @app.exception_handler(ErroArmazenamento)
    async def tratar_armazenamento(request: Request, erro: ErroArmazenamento) -> JSONResponse:
        # Log técnico: vai pro console, não pro banco.
        logger.error("Falha no armazenamento", exc_info=erro)
        return JSONResponse(
            {"mensagem": "Armazenamento de arquivos indisponível"},
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
