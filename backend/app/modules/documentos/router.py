import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Form, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.arquivos import content_disposition
from app.core.database import obter_sessao
from app.core.permissions import UsuarioAutenticado, requer_admin, usuario_atual
from app.modules.documentos import service
from app.modules.documentos.schemas import (
  DocumentoAtualizar,
  DocumentoCriar,
  DocumentoResposta,
  FiltroDocumentos,
)

router = APIRouter(prefix="/documentos", tags=["documentos"])


@router.get("", response_model=list[DocumentoResposta], dependencies=[Depends(usuario_atual)])
def listar_documentos(
  filtro: Annotated[FiltroDocumentos, Query()], sessao: Session = Depends(obter_sessao)
):
  return service.listar_documentos(sessao, filtro)


@router.get(
  "/{documento_id}", response_model=DocumentoResposta, dependencies=[Depends(usuario_atual)]
)
def buscar_documento(documento_id: uuid.UUID, sessao: Session = Depends(obter_sessao)):
  return service.buscar_documento(sessao, documento_id)


@router.get("/{documento_id}/download", dependencies=[Depends(usuario_atual)])
def baixar_documento(
  documento_id: uuid.UUID, inline: bool = False, sessao: Session = Depends(obter_sessao)
) -> StreamingResponse:
  documento, blocos = service.baixar_documento(sessao, documento_id)
  return StreamingResponse(
    blocos,
    media_type=documento.tipo_conteudo,
    headers={
      "Content-Disposition": content_disposition(
        "inline" if inline else "attachment", documento.nome_arquivo, "documento"
      ),
      "Content-Length": str(documento.tamanho_bytes),
      "X-Content-Type-Options": "nosniff",
    },
  )


@router.post("", response_model=DocumentoResposta, status_code=status.HTTP_201_CREATED)
def criar_documento(
  dados: Annotated[DocumentoCriar, Form()],
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  return service.criar_documento(sessao, dados, usuario)


@router.put("/{documento_id}", response_model=DocumentoResposta)
def atualizar_documento(
  documento_id: uuid.UUID,
  dados: DocumentoAtualizar,
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  return service.atualizar_documento(sessao, documento_id, dados, usuario)


@router.put("/{documento_id}/arquivo", response_model=DocumentoResposta)
def substituir_arquivo(
  documento_id: uuid.UUID,
  arquivo: UploadFile,
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  return service.substituir_arquivo(sessao, documento_id, arquivo, usuario)


@router.delete("/{documento_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_documento(
  documento_id: uuid.UUID,
  usuario: UsuarioAutenticado = Depends(requer_admin),
  sessao: Session = Depends(obter_sessao),
):
  service.deletar_documento(sessao, documento_id, usuario)
