"""Layout dos avisos no bucket compartilhado (ver app/core/armazenamento.py).

murais/avisos/{aviso_id}/capa/{uuid}.webp
murais/avisos/{aviso_id}/anexos/{anexo_id}/{nome-sanitizado}.{ext}

A capa ganha um uuid novo a cada troca: a URL pública leva esse uuid como `?v=`, então o
navegador nunca serve a capa antiga do cache. É sempre WebP: o upload é reduzido (ver capa.py);
capas salvas antes disso mantêm a extensão original.
"""

import uuid

from app.core.arquivos import sanitizar_nome

PREFIXO = "murais/avisos"


def montar_chave_capa(aviso_id: uuid.UUID) -> str:
  return f"{PREFIXO}/{aviso_id}/capa/{uuid.uuid4()}.webp"


def montar_chave_anexo(aviso_id: uuid.UUID, anexo_id: uuid.UUID, nome_arquivo: str) -> str:
  return f"{PREFIXO}/{aviso_id}/anexos/{anexo_id}/{sanitizar_nome(nome_arquivo)}"
