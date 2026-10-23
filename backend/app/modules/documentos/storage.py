"""Layout dos documentos no bucket compartilhado (ver app/core/armazenamento.py).

documentos/setores/{setor_id}/{categoria}/{documento_id}/{nome-sanitizado}.{ext}

O setor entra pelo id, não pelo nome, porque setor pode ser renomeado.
"""

import uuid

from app.core.arquivos import sanitizar_nome

PREFIXO = "documentos/setores"


def montar_chave(
  setor_id: uuid.UUID, categoria: str, documento_id: uuid.UUID, nome_arquivo: str
) -> str:
  return f"{PREFIXO}/{setor_id}/{categoria}/{documento_id}/{sanitizar_nome(nome_arquivo)}"
