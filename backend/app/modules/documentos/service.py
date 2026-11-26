import uuid
from collections.abc import Iterator
from datetime import UTC, datetime

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core import armazenamento
from app.core.arquivos import TIPOS_DOCUMENTO, validar_arquivo
from app.core.config import configuracoes
from app.core.permissions import UsuarioAutenticado, garantir_escopo, resolver_setor
from app.modules.documentos import repository
from app.modules.documentos.models import Documento, DocumentoVersao
from app.modules.documentos.schemas import DocumentoAtualizar, DocumentoCriar, FiltroDocumentos
from app.modules.documentos.storage import montar_chave
from app.modules.logs.models import AcaoLog, ModuloLog
from app.modules.logs.service import registrar
from app.modules.setores.service import buscar_setor

def _validar_arquivo(arquivo: UploadFile) -> tuple[str, str, int]:
  return validar_arquivo(arquivo, TIPOS_DOCUMENTO, configuracoes.tamanho_maximo_upload_mb)


def listar_documentos(sessao: Session, filtro: FiltroDocumentos) -> list[Documento]:
  return repository.listar(sessao, filtro)


def buscar_documento(sessao: Session, documento_id: uuid.UUID) -> Documento:
  documento = repository.buscar_por_id(sessao, documento_id)
  if documento is None:
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento não encontrado")
  return documento


def criar_documento(
  sessao: Session, dados: DocumentoCriar, usuario: UsuarioAutenticado
) -> Documento:
  arquivo = dados.arquivo
  setor_id = resolver_setor(dados.setor_id, usuario, entidade="documento")
  buscar_setor(sessao, setor_id)
  nome_arquivo, tipo_conteudo, tamanho = _validar_arquivo(arquivo)

  # O id nasce aqui para compor a chave antes do insert: o objeto sobe primeiro e, se o
  # banco falhar, é removido — nunca fica linha sem arquivo.
  documento_id = uuid.uuid4()
  chave = montar_chave(setor_id, dados.categoria, documento_id, 1, nome_arquivo)
  armazenamento.enviar_arquivo(chave, arquivo.file, tamanho, tipo_conteudo)

  documento = Documento(
    id=documento_id,
    titulo=dados.titulo,
    descricao=dados.descricao or None,
    categoria=dados.categoria,
    nome_arquivo=nome_arquivo,
    tipo_conteudo=tipo_conteudo,
    tamanho_bytes=tamanho,
    chave_armazenamento=chave,
    autor_id=usuario.id,
    setor_id=setor_id,
    versao=1,
    versoes=[
      DocumentoVersao(
        numero=1,
        nome_arquivo=nome_arquivo,
        tipo_conteudo=tipo_conteudo,
        tamanho_bytes=tamanho,
        chave_armazenamento=chave,
        autor_id=usuario.id,
      )
    ],
  )
  try:
    _registrar(sessao, usuario, AcaoLog.CRIAR, documento)
    repository.adicionar(sessao, documento)
  except SQLAlchemyError as erro:
    sessao.rollback()
    armazenamento.remover_arquivo(chave)
    if isinstance(erro, IntegrityError):
      raise HTTPException(status.HTTP_409_CONFLICT, "Autor do documento não encontrado")
    raise
  return buscar_documento(sessao, documento_id)


def atualizar_documento(
  sessao: Session,
  documento_id: uuid.UUID,
  dados: DocumentoAtualizar,
  usuario: UsuarioAutenticado,
) -> Documento:
  documento = buscar_documento(sessao, documento_id)
  garantir_escopo(usuario, documento.setor_id)
  campos = dados.model_dump(exclude_unset=True)
  if not campos:
    return documento

  chave_antiga = documento.chave_armazenamento
  chave_nova = chave_antiga
  categoria = campos.get("categoria")
  if categoria is not None and categoria != documento.categoria:
    # Mantém o bucket organizado pela categoria atual do documento.
    # Só o objeto da versão atual muda de pasta; as anteriores ficam onde estão (DOC-09).
    chave_nova = montar_chave(
      documento.setor_id, categoria, documento.id, documento.versao, documento.nome_arquivo
    )
    armazenamento.mover_arquivo(chave_antiga, chave_nova)

  for campo, valor in campos.items():
    setattr(documento, campo, valor)
  if "descricao" in campos:
    documento.descricao = documento.descricao or None
  documento.chave_armazenamento = chave_nova
  for versao in documento.versoes:
    if versao.chave_armazenamento == chave_antiga:
      versao.chave_armazenamento = chave_nova
  documento.atualizado_em = datetime.now(UTC)
  try:
    _registrar(sessao, usuario, AcaoLog.EDITAR, documento)
    repository.salvar(sessao)
  except SQLAlchemyError:
    sessao.rollback()
    if chave_nova != chave_antiga:
      armazenamento.mover_arquivo(chave_nova, chave_antiga)
    raise
  return buscar_documento(sessao, documento_id)


def substituir_arquivo(
  sessao: Session,
  documento_id: uuid.UUID,
  arquivo: UploadFile,
  usuario: UsuarioAutenticado,
  alteracao: str | None = None,
) -> Documento:
  documento = buscar_documento(sessao, documento_id)
  garantir_escopo(usuario, documento.setor_id)
  nome_arquivo, tipo_conteudo, tamanho = _validar_arquivo(arquivo)

  # Nova versão (DOC-09): o objeto anterior fica no bucket, a chave da nova tem pasta própria.
  numero = documento.versao + 1
  chave_nova = montar_chave(documento.setor_id, documento.categoria, documento.id, numero, nome_arquivo)
  armazenamento.enviar_arquivo(chave_nova, arquivo.file, tamanho, tipo_conteudo)

  documento.nome_arquivo = nome_arquivo
  documento.tipo_conteudo = tipo_conteudo
  documento.tamanho_bytes = tamanho
  documento.chave_armazenamento = chave_nova
  documento.versao = numero
  documento.atualizado_em = datetime.now(UTC)
  documento.versoes.append(
    DocumentoVersao(
      numero=numero,
      nome_arquivo=nome_arquivo,
      tipo_conteudo=tipo_conteudo,
      tamanho_bytes=tamanho,
      chave_armazenamento=chave_nova,
      alteracao=(alteracao or "").strip() or None,
      autor_id=usuario.id,
    )
  )
  try:
    _registrar(sessao, usuario, AcaoLog.EDITAR, documento)
    repository.salvar(sessao)
  except SQLAlchemyError:
    sessao.rollback()
    armazenamento.remover_arquivo(chave_nova)
    raise
  return buscar_documento(sessao, documento_id)


def listar_versoes(sessao: Session, documento_id: uuid.UUID) -> list[DocumentoVersao]:
  buscar_documento(sessao, documento_id)
  return repository.listar_versoes(sessao, documento_id)


def baixar_versao(
  sessao: Session, documento_id: uuid.UUID, numero: int
) -> tuple[DocumentoVersao, Iterator[bytes]]:
  buscar_documento(sessao, documento_id)
  versao = repository.buscar_versao(sessao, documento_id, numero)
  if versao is None:
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Versão não encontrada")
  return versao, armazenamento.ler_arquivo(versao.chave_armazenamento)


def baixar_documento(
  sessao: Session, documento_id: uuid.UUID
) -> tuple[Documento, Iterator[bytes]]:
  documento = buscar_documento(sessao, documento_id)
  return documento, armazenamento.ler_arquivo(documento.chave_armazenamento)


def deletar_documento(
  sessao: Session, documento_id: uuid.UUID, usuario: UsuarioAutenticado
) -> None:
  documento = buscar_documento(sessao, documento_id)
  garantir_escopo(usuario, documento.setor_id)
  chaves = {documento.chave_armazenamento, *(v.chave_armazenamento for v in documento.versoes)}
  _registrar(sessao, usuario, AcaoLog.EXCLUIR, documento)
  repository.remover(sessao, documento)
  for chave in chaves:
    armazenamento.remover_arquivo(chave)


def _registrar(
  sessao: Session, usuario: UsuarioAutenticado, acao: AcaoLog, documento: Documento
) -> None:
  registrar(sessao, usuario, acao, ModuloLog.DOCUMENTOS, "documento", documento.id, documento.titulo)
