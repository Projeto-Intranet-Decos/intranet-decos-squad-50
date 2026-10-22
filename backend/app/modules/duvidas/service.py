import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import UsuarioAutenticado, garantir_escopo, resolver_setor
from app.modules.duvidas import repository
from app.modules.duvidas.models import Faq
from app.modules.duvidas.schemas import FaqAtualizar, FaqCriar
from app.modules.logs.models import AcaoLog, ModuloLog
from app.modules.logs.service import registrar
from app.modules.setores.service import buscar_setor


def listar_faq(sessao: Session) -> list[Faq]:
    return repository.listar(sessao)


def buscar_faq(sessao: Session, faq_id: uuid.UUID) -> Faq:
    faq = repository.buscar_por_id(sessao, faq_id)
    if faq is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pergunta não encontrada")
    return faq


def criar_faq(sessao: Session, dados: FaqCriar, usuario: UsuarioAutenticado) -> Faq:
    setor_id = resolver_setor(dados.setor_id, usuario, entidade="pergunta")
    buscar_setor(sessao, setor_id)
    faq = Faq(
        pergunta=dados.pergunta,
        resposta=dados.resposta,
        autor_id=usuario.id,
        setor_id=setor_id,
    )
    try:
        sessao.add(faq)
        sessao.flush()
        _registrar(sessao, usuario, AcaoLog.CRIAR, faq)
        repository.adicionar(sessao, faq)
    except IntegrityError:
        sessao.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Autor da pergunta não encontrado")
    return buscar_faq(sessao, faq.id)


def atualizar_faq(
    sessao: Session, faq_id: uuid.UUID, dados: FaqAtualizar, usuario: UsuarioAutenticado
) -> Faq:
    faq = buscar_faq(sessao, faq_id)
    garantir_escopo(usuario, faq.setor_id)
    campos = dados.model_dump(exclude_unset=True)
    if not campos:
        return faq
    for campo, valor in campos.items():
        setattr(faq, campo, valor)
    faq.atualizado_em = datetime.now(UTC)
    _registrar(sessao, usuario, AcaoLog.EDITAR, faq)
    repository.salvar(sessao)
    return buscar_faq(sessao, faq.id)


def deletar_faq(sessao: Session, faq_id: uuid.UUID, usuario: UsuarioAutenticado) -> None:
    faq = buscar_faq(sessao, faq_id)
    garantir_escopo(usuario, faq.setor_id)
    _registrar(sessao, usuario, AcaoLog.EXCLUIR, faq)
    repository.remover(sessao, faq)


def _registrar(sessao: Session, usuario: UsuarioAutenticado, acao: AcaoLog, faq: Faq) -> None:
    registrar(sessao, usuario, acao, ModuloLog.DUVIDAS, "faq", faq.id, faq.pergunta)
