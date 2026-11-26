"""Layout dos documentos no bucket compartilhado (ver app/core/armazenamento.py).

documentos/setores/{setor_id}/{categoria}/{documento_id}/v{numero}/{nome-sanitizado}.{ext}

O setor entra pelo id, não pelo nome, porque setor pode ser renomeado. Cada versão (DOC-09) tem a
sua pasta `v{numero}`; a versão 1 dos documentos anteriores ao histórico mantém a chave sem `v1`.
"""

import uuid

from app.core.arquivos import sanitizar_nome

PREFIXO = "documentos/setores"


def montar_chave(
  setor_id: uuid.UUID, categoria: str, documento_id: uuid.UUID, numero: int, nome_arquivo: str
) -> str:
  return f"{PREFIXO}/{setor_id}/{categoria}/{documento_id}/v{numero}/{sanitizar_nome(nome_arquivo)}"
