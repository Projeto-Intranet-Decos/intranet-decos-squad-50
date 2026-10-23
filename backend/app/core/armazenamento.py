"""Cliente S3 (SDK do MinIO) compartilhado entre os módulos.

Não sabe nada de domínio: quem chama monta a chave completa do objeto (ex: o layout de
`app/modules/documentos/storage.py`). Todos os módulos usam o mesmo bucket, separados por
prefixo de primeiro nível com o nome do módulo.
"""

import logging
from collections.abc import Callable, Iterator
from functools import lru_cache
from typing import BinaryIO, TypeVar

from minio import Minio
from minio.commonconfig import CopySource
from minio.error import MinioException, S3Error
from urllib3.exceptions import HTTPError

from app.core.config import Configuracoes, configuracoes

logger = logging.getLogger(__name__)

TAMANHO_BLOCO = 64 * 1024

T = TypeVar("T")


class ErroArmazenamento(Exception):
    """Armazenamento fora do ar ou recusou a operação. Vira 503 em core/erros.py."""


class ArquivoNaoEncontrado(ErroArmazenamento):
    """O objeto não existe no bucket. Vira 404 em core/erros.py."""


def criar_cliente(config: Configuracoes) -> Minio:
    cliente = Minio(
        config.armazenamento_endpoint,
        access_key=config.armazenamento_chave,
        secret_key=config.armazenamento_segredo,
        secure=config.armazenamento_seguro,
        region=config.armazenamento_regiao,
    )
    # Por conta própria, o SDK só usa virtual-hosted com a AWS.
    if config.armazenamento_usa_path_style:
        cliente.disable_virtual_style_endpoint()
    else:
        cliente.enable_virtual_style_endpoint()
    return cliente


@lru_cache
def obter_cliente() -> Minio:
    return criar_cliente(configuracoes)


def _executar(operacao: Callable[[], T]) -> T:
    try:
        return operacao()
    except S3Error as erro:
        if erro.code in ("NoSuchKey", "NoSuchObject"):
            raise ArquivoNaoEncontrado(str(erro)) from erro
        raise ErroArmazenamento(str(erro)) from erro
    except (MinioException, HTTPError) as erro:
        raise ErroArmazenamento(str(erro)) from erro


def garantir_bucket() -> None:
    cliente = obter_cliente()
    bucket = configuracoes.armazenamento_bucket
    if not _executar(lambda: cliente.bucket_exists(bucket)):
        _executar(lambda: cliente.make_bucket(bucket))


def armazenamento_disponivel() -> bool:
    try:
        return _executar(lambda: obter_cliente().bucket_exists(configuracoes.armazenamento_bucket))
    except ErroArmazenamento:
        return False


def enviar_arquivo(chave: str, conteudo: BinaryIO, tamanho: int, tipo_conteudo: str) -> None:
    _executar(
        lambda: obter_cliente().put_object(
            configuracoes.armazenamento_bucket,
            chave,
            conteudo,
            length=tamanho,
            content_type=tipo_conteudo,
        )
    )


def ler_arquivo(chave: str) -> Iterator[bytes]:
    """Abre o objeto já aqui, para 404/503 saírem antes de a resposta começar a ser enviada."""
    resposta = _executar(lambda: obter_cliente().get_object(configuracoes.armazenamento_bucket, chave))

    def blocos() -> Iterator[bytes]:
        try:
            yield from resposta.stream(TAMANHO_BLOCO)
        finally:
            resposta.close()
            resposta.release_conn()

    return blocos()


def mover_arquivo(origem: str, destino: str) -> None:
    bucket = configuracoes.armazenamento_bucket
    _executar(lambda: obter_cliente().copy_object(bucket, destino, CopySource(bucket, origem)))
    remover_arquivo(origem)


def remover_arquivo(chave: str) -> None:
    """Tolerante a falha: é sempre chamado depois do commit, então no pior caso sobra um órfão."""
    try:
        _executar(lambda: obter_cliente().remove_object(configuracoes.armazenamento_bucket, chave))
    except ErroArmazenamento:
        logger.warning("Objeto órfão no armazenamento: %s", chave, exc_info=True)
