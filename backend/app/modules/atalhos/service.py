import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import UsuarioAutenticado
from app.modules.atalhos import repository
from app.modules.atalhos.models import Atalho
from app.modules.atalhos.schemas import AtalhoAtualizar, AtalhoCriar
from app.modules.logs.models import AcaoLog, ModuloLog
from app.modules.logs.service import registrar


def listar_atalhos(sessao: Session) -> list[Atalho]:
    return repository.listar(sessao)


def buscar_atalho(sessao: Session, atalho_id: uuid.UUID) -> Atalho:
    atalho = repository.buscar_por_id(sessao, atalho_id)
    if atalho is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Atalho não encontrado")
    return atalho


def criar_atalho(sessao: Session, dados: AtalhoCriar, usuario: UsuarioAutenticado) -> Atalho:
    atalho = Atalho(titulo=dados.titulo, url=dados.url)
    sessao.add(atalho)
    sessao.flush()
    _registrar(sessao, usuario, AcaoLog.CRIAR, atalho)
    repository.adicionar(sessao, atalho)
    return atalho


def atualizar_atalho(
    sessao: Session, atalho_id: uuid.UUID, dados: AtalhoAtualizar, usuario: UsuarioAutenticado
) -> Atalho:
    atalho = buscar_atalho(sessao, atalho_id)
    campos = dados.model_dump(exclude_unset=True)
    if not campos:
        return atalho
    for campo, valor in campos.items():
        setattr(atalho, campo, valor)
    atalho.atualizado_em = datetime.now(UTC)
    _registrar(sessao, usuario, AcaoLog.EDITAR, atalho)
    repository.salvar(sessao)
    return atalho


def deletar_atalho(sessao: Session, atalho_id: uuid.UUID, usuario: UsuarioAutenticado) -> None:
    atalho = buscar_atalho(sessao, atalho_id)
    _registrar(sessao, usuario, AcaoLog.EXCLUIR, atalho)
    repository.remover(sessao, atalho)


def _registrar(sessao: Session, usuario: UsuarioAutenticado, acao: AcaoLog, atalho: Atalho) -> None:
    registrar(sessao, usuario, acao, ModuloLog.ATALHOS, "atalho", atalho.id, atalho.titulo)
