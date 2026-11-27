"""Versão menor da capa (MUR-04): é ela que vai para o bucket, não o arquivo enviado.

O card, o carrossel e o detalhe baixam a capa no feed inteiro; o original de até 5 MB pesava
na página sem ganho visível. Reencodar também descarta o EXIF (GPS, aparelho) da foto.
"""

import io
from typing import BinaryIO

from fastapi import HTTPException, status
from PIL import Image, ImageOps

from app.core.arquivos import erro_arquivo

LADO_MAXIMO_PX = 1920
LIMITE_MEGAPIXELS = 50
QUALIDADE_WEBP = 82
# Só os formatos aceitos na extensão: o Pillow abriria muito mais (EPS chama o Ghostscript).
FORMATOS_ACEITOS = ["PNG", "JPEG", "WEBP"]


def _erro_resolucao(campo: str) -> HTTPException:
  return erro_arquivo(
    status.HTTP_413_CONTENT_TOO_LARGE,
    f"Imagem com resolução acima de {LIMITE_MEGAPIXELS} megapixels",
    campo,
  )


def reduzir_capa(arquivo: BinaryIO, campo: str) -> bytes:
  """Devolve a capa em WebP, com no máximo LADO_MAXIMO_PX no lado maior."""
  try:
    imagem = Image.open(arquivo, formats=FORMATOS_ACEITOS)
    if imagem.width * imagem.height > LIMITE_MEGAPIXELS * 1_000_000:
      raise _erro_resolucao(campo)
    # O thumbnail decodifica JPEG direto numa escala menor (draft): poupa memória com foto grande.
    imagem.thumbnail((LADO_MAXIMO_PX, LADO_MAXIMO_PX), Image.Resampling.LANCZOS)
  except Image.DecompressionBombError:
    raise _erro_resolucao(campo) from None
  except (OSError, ValueError):
    raise erro_arquivo(
      status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Arquivo não é uma imagem válida", campo
    ) from None

  # Depois do thumbnail, para girar a imagem já pequena; o limite é quadrado, o tamanho não muda.
  imagem = ImageOps.exif_transpose(imagem)
  modo = "RGBA" if imagem.has_transparency_data else "RGB"
  if imagem.mode != modo:
    imagem = imagem.convert(modo)

  saida = io.BytesIO()
  # Sem `exif=`: os metadados ficam para trás. O perfil de cor fica, senão foto P3 perde cor.
  imagem.save(
    saida, "WEBP", quality=QUALIDADE_WEBP, icc_profile=imagem.info.get("icc_profile")
  )
  return saida.getvalue()
