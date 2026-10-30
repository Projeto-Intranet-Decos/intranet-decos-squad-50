"""Layout dos avisos no bucket compartilhado (ver app/core/armazenamento.py).

murais/avisos/{aviso_id}/capa/{uuid}.{ext}
murais/avisos/{aviso_id}/anexos/{anexo_id}/{nome-sanitizado}.{ext}

A capa ganha um uuid novo a cada troca: a URL pública leva esse uuid como `?v=`, então o
navegador nunca serve a capa antiga do cache.
"""

import os
import uuid

from app.core.arquivos import sanitizar_nome

PREFIXO = "murais/avisos"


def montar_chave_capa(aviso_id: uuid.UUID, nome_arquivo: str) -> str:
  extensao = os.path.splitext(nome_arquivo)[1].lower()
  return f"{PREFIXO}/{aviso_id}/capa/{uuid.uuid4()}{extensao}"


def montar_chave_anexo(aviso_id: uuid.UUID, anexo_id: uuid.UUID, nome_arquivo: str) -> str:
  return f"{PREFIXO}/{aviso_id}/anexos/{anexo_id}/{sanitizar_nome(nome_arquivo)}"
