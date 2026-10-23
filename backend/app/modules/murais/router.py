import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Form, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.arquivos import content_disposition
from app.core.database import obter_sessao
from app.core.permissions import UsuarioAutenticado, requer_admin, usuario_atual
from app.modules.murais import service
from app.modules.murais.schemas import (
  AniversarianteResposta,
  AvisoAtualizar,
  AvisoCriar,
  AvisoResposta,
)

router = APIRouter(prefix="/murais", tags=["murais"])


@router.get(
  "/avisos", response_model=list[AvisoResposta], dependencies=[Depends(usuario_atual)]
)
def listar_avisos(sessao: Session = Depends(obter_sessao)):
  return service.listar_avisos(sessao)


@router.get(
  "/eventos", response_model=list[AvisoResposta], dependencies=[Depends(usuario_atual)]
)
def listar_eventos(
  de: date | None = None,
  ate: date | None = None,
  setor_id: uuid.UUID | None = None,
  sessao: Session = Depends(obter_sessao),
):
  return service.listar_eventos(sessao, de, ate, setor_id)


@router.get(
  "/aniversariantes",
  response_model=list[AniversarianteResposta],
  dependencies=[Depends(usuario_atual)],
)
def listar_aniversariantes(
  mes: int | None = Query(default=None, ge=1, le=12),
  sessao: Session = Depends(obter_sessao),
):
  return service.listar_aniversariantes(sessao, mes)


@router.get(
  "/avisos/{aviso_id}", response_model=AvisoResposta, dependencies=[Depends(usuario_atual)]
)
def buscar_aviso(aviso_id: uuid.UUID, sessao: Session = Depends(obter_sessao)):
  return service.buscar_aviso(sessao, aviso_id)


@router.post("/avisos", response_model=AvisoResposta, status_code=status.HTTP_201_CREATED)
def criar_aviso(
  dados: Annotated[AvisoCriar, Form()],
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  return service.criar_aviso(sessao, dados, usuario)


@router.put("/avisos/{aviso_id}", response_model=AvisoResposta)
def atualizar_aviso(
  aviso_id: uuid.UUID,
  dados: AvisoAtualizar,
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  return service.atualizar_aviso(sessao, aviso_id, dados, usuario)


@router.delete("/avisos/{aviso_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_aviso(
  aviso_id: uuid.UUID,
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  service.deletar_aviso(sessao, aviso_id, usuario)


# Público de propósito: `<img>` não manda o Bearer. Ver "Armazenamento (MinIO)" em
# docs/arquitetura-backend.md.
@router.get("/avisos/{aviso_id}/imagem")
def abrir_imagem(
  aviso_id: uuid.UUID, sessao: Session = Depends(obter_sessao)
) -> StreamingResponse:
  tipo_conteudo, blocos = service.abrir_imagem(sessao, aviso_id)
  return StreamingResponse(
    blocos,
    media_type=tipo_conteudo,
    headers={
      # A URL leva `?v=` com o uuid da capa, então uma capa nova é sempre uma URL nova.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  )


@router.put("/avisos/{aviso_id}/imagem", response_model=AvisoResposta)
def substituir_imagem(
  aviso_id: uuid.UUID,
  arquivo: UploadFile,
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  return service.substituir_imagem(sessao, aviso_id, arquivo, usuario)


@router.delete("/avisos/{aviso_id}/imagem", status_code=status.HTTP_204_NO_CONTENT)
def remover_imagem(
  aviso_id: uuid.UUID,
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  service.remover_imagem(sessao, aviso_id, usuario)


@router.post("/avisos/{aviso_id}/anexos", response_model=AvisoResposta)
def adicionar_anexos(
  aviso_id: uuid.UUID,
  arquivos: list[UploadFile],
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  return service.adicionar_anexos(sessao, aviso_id, arquivos, usuario)


@router.delete(
  "/avisos/{aviso_id}/anexos/{anexo_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remover_anexo(
  aviso_id: uuid.UUID,
  anexo_id: uuid.UUID,
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  service.remover_anexo(sessao, aviso_id, anexo_id, usuario)


@router.get(
  "/avisos/{aviso_id}/anexos/{anexo_id}/download", dependencies=[Depends(usuario_atual)]
)
def baixar_anexo(
  aviso_id: uuid.UUID, anexo_id: uuid.UUID, sessao: Session = Depends(obter_sessao)
) -> StreamingResponse:
  anexo, blocos = service.abrir_anexo(sessao, aviso_id, anexo_id)
  return StreamingResponse(
    blocos,
    media_type=anexo.tipo_conteudo,
    headers={
      "Content-Disposition": content_disposition("attachment", anexo.nome_arquivo, "anexo"),
      "Content-Length": str(anexo.tamanho_bytes),
      "X-Content-Type-Options": "nosniff",
    },
  )
