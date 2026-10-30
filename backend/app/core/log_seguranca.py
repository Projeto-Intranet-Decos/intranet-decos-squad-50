"""Log técnico de segurança (GER-25): uma linha `evento=<nome> chave=valor…` por evento.

Vai para o log do container, não para o Registro de atividades. Nunca recebe senha nem token.
"""

import logging
import re

from fastapi import Request

logger = logging.getLogger("app.seguranca")

# Valor vindo do cliente (o e-mail do login é texto livre) não pode quebrar a linha nem criar outro
# campo: espaço e caractere de controle viram "_".
_FORA_DA_LINHA = re.compile(r"[\s\x00-\x1f\x7f]")


def registrar_evento(evento: str, nivel: int = logging.INFO, **campos: object) -> None:
    detalhes = "".join(
        f" {nome}={_FORA_DA_LINHA.sub('_', str(valor))}" for nome, valor in campos.items()
    )
    logger.log(nivel, "evento=%s%s", evento, detalhes)


def ip_do_cliente(request: Request) -> str:
    # O que o proxy informou (uvicorn --proxy-headers). Só informativo: nenhuma regra depende dele.
    return request.client.host if request.client else "desconhecido"
