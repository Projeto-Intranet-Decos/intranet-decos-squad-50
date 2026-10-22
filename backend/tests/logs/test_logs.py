"""Registro de atividades — docs/specs/logs.md."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import UsuarioAutenticado
from app.modules.logs.models import AcaoLog, Log, ModuloLog
from app.modules.logs.service import registrar
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Usuario


def _ator(usuario: Usuario) -> UsuarioAutenticado:
    return UsuarioAutenticado(id=usuario.id, role=usuario.role, setor_id=usuario.setor_id)


def test_log01_registrar_guarda_ator_acao_modulo_entidade_e_resumo(
    sessao: Session, admin_setor: Usuario, setor: Setor
):
    entidade_id = uuid.uuid4()

    registrar(
        sessao,
        _ator(admin_setor),
        AcaoLog.CRIAR,
        ModuloLog.MURAIS,
        "aviso",
        entidade_id,
        "Nova escala de plantão",
    )
    sessao.commit()

    log = sessao.scalars(select(Log)).one()
    assert log.usuario_id == admin_setor.id
    assert log.usuario_nome == admin_setor.nome
    assert log.setor_id == setor.id
    assert log.acao == AcaoLog.CRIAR
    assert log.modulo == ModuloLog.MURAIS
    assert log.entidade_tipo == "aviso"
    assert log.entidade_id == entidade_id
    assert log.resumo == "Nova escala de plantão"
    assert log.criado_em is not None


def test_log01_superadmin_sem_setor_grava_setor_nulo(sessao: Session, superadmin: Usuario):
    registrar(
        sessao,
        _ator(superadmin),
        AcaoLog.EXCLUIR,
        ModuloLog.USUARIOS,
        "usuario",
        uuid.uuid4(),
        "helena@decos.com.br",
    )
    sessao.commit()

    assert sessao.scalars(select(Log)).one().setor_id is None


def test_log01_registro_nao_depende_da_entidade_nem_do_usuario(
    sessao: Session, superadmin: Usuario
):
    """Sem FK: o log guarda valores simples e continua válido sem a entidade."""
    registrar(
        sessao,
        _ator(superadmin),
        AcaoLog.EXCLUIR,
        ModuloLog.DOCUMENTOS,
        "documento",
        uuid.uuid4(),  # id que não existe em nenhuma tabela
        "POP de higiene das mãos",
    )
    sessao.commit()

    assert sessao.scalars(select(Log)).one().resumo == "POP de higiene das mãos"
