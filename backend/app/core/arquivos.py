"""Validação e nomes de arquivos enviados, compartilhados entre os módulos que fazem upload.

O tipo salvo e servido sai sempre da extensão, nunca do content-type do cliente: assim
ninguém sobe um text/html que depois seria aberto inline no navegador.
"""

import os
import re
import unicodedata
from pathlib import PurePosixPath
from urllib.parse import quote

from fastapi import HTTPException, UploadFile, status

TIPOS_IMAGEM: dict[str, str] = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}

TIPOS_DOCUMENTO: dict[str, str] = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".ods": "application/vnd.oasis.opendocument.spreadsheet",
    ".odp": "application/vnd.oasis.opendocument.presentation",
    ".txt": "text/plain; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}

TAMANHO_MAXIMO_NOME = 100

# GER-06: os primeiros bytes de cada formato. A extensão decide o tipo servido; a assinatura impede
# que um HTML (ou executável) entre com nome de PDF.
_ZIP = (b"PK\x03\x04",)  # docx/xlsx/pptx e os formatos do LibreOffice são zip
_OLE = (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1",)  # doc/xls/ppt antigos
ASSINATURAS: dict[str, tuple[bytes, ...]] = {
    ".pdf": (b"%PDF-",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".docx": _ZIP, ".xlsx": _ZIP, ".pptx": _ZIP, ".odt": _ZIP, ".ods": _ZIP, ".odp": _ZIP,
    ".doc": _OLE, ".xls": _OLE, ".ppt": _OLE,
}
BYTES_CONFERIDOS = 8192


def _conteudo_bate_com_a_extensao(extensao: str, inicio: bytes) -> bool:
    if extensao == ".webp":
        return inicio[:4] == b"RIFF" and inicio[8:12] == b"WEBP"
    if extensao == ".txt":
        # Texto em qualquer codificação (o Bloco de Notas antigo grava em Windows-1252), mas não
        # binário.
        return b"\x00" not in inicio
    return inicio.startswith(ASSINATURAS[extensao])


def erro_arquivo(codigo: int, mensagem: str, campo: str = "arquivo") -> HTTPException:
    return HTTPException(codigo, {"campo": campo, "mensagem": mensagem})


def validar_arquivo(
    arquivo: UploadFile, tipos: dict[str, str], limite_mb: int, campo: str = "arquivo"
) -> tuple[str, str, int]:
    """Devolve (nome_arquivo, tipo_conteudo, tamanho_bytes)."""
    nome = (arquivo.filename or "").strip()
    if not nome:
        raise erro_arquivo(status.HTTP_422_UNPROCESSABLE_CONTENT, "Envie um arquivo", campo)
    extensao = os.path.splitext(nome)[1].lower()
    tipo_conteudo = tipos.get(extensao)
    if tipo_conteudo is None:
        raise erro_arquivo(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Tipo de arquivo não permitido", campo
        )
    tamanho = arquivo.size
    if tamanho is None:
        arquivo.file.seek(0, os.SEEK_END)
        tamanho = arquivo.file.tell()
    arquivo.file.seek(0)
    if tamanho == 0:
        raise erro_arquivo(status.HTTP_422_UNPROCESSABLE_CONTENT, "Arquivo vazio", campo)
    if tamanho > limite_mb * 1024 * 1024:
        raise erro_arquivo(
            status.HTTP_413_CONTENT_TOO_LARGE,
            f"Arquivo maior que o limite de {limite_mb} MB",
            campo,
        )
    inicio = arquivo.file.read(BYTES_CONFERIDOS)
    arquivo.file.seek(0)
    if not _conteudo_bate_com_a_extensao(extensao, inicio):
        raise erro_arquivo(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "O conteúdo do arquivo não corresponde à extensão",
            campo,
        )
    return nome[:255], tipo_conteudo, tamanho


def sanitizar_nome(nome_arquivo: str) -> str:
    """'POP Higienização de Mãos.PDF' -> 'pop-higienizacao-de-maos.pdf'"""
    caminho = PurePosixPath(nome_arquivo.replace("\\", "/")).name
    base, ponto, extensao = caminho.rpartition(".")
    if not ponto:
        base, extensao = extensao, ""

    def limpar(texto: str) -> str:
        ascii_ = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
        return re.sub(r"[^a-z0-9]+", "-", ascii_.lower()).strip("-")

    base = limpar(base)[:TAMANHO_MAXIMO_NOME].strip("-") or "arquivo"
    extensao = limpar(extensao)
    return f"{base}.{extensao}" if extensao else base


def content_disposition(disposicao: str, nome_arquivo: str, nome_padrao: str = "arquivo") -> str:
    # `filename` ASCII para clientes antigos; `filename*` (RFC 5987) preserva acentos.
    ascii_ = unicodedata.normalize("NFKD", nome_arquivo).encode("ascii", "ignore").decode()
    ascii_ = ascii_.replace('"', "").replace("\\", "") or nome_padrao
    return f"{disposicao}; filename=\"{ascii_}\"; filename*=UTF-8''{quote(nome_arquivo)}"
