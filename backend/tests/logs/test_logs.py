"""Registro de atividades — docs/specs/logs.md."""

import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import UsuarioAutenticado
from app.modules.logs.models import AcaoLog, Log, ModuloLog
from app.modules.logs.service import registrar
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Usuario
from tests.apoio import autenticar


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


# LOG-03


def _gravar(sessao: Session, usuario: Usuario, criado_em: datetime, resumo: str = "x") -> Log:
    log = Log(
        usuario_id=usuario.id,
        usuario_nome=usuario.nome,
        setor_id=usuario.setor_id,
        acao=AcaoLog.CRIAR,
        modulo=ModuloLog.ATALHOS,
        entidade_tipo="atalho",
        entidade_id=uuid.uuid4(),
        resumo=resumo,
        criado_em=criado_em,
    )
    sessao.add(log)
    sessao.flush()
    return log


def _em(dia: int, hora: int = 12) -> datetime:
    return datetime(2026, 10, dia, hora, tzinfo=UTC)


def test_log03_superadmin_lista_do_mais_recente_para_o_mais_antigo(
    cliente: TestClient, sessao: Session, superadmin: Usuario
):
    _gravar(sessao, superadmin, _em(1), "antigo")
    _gravar(sessao, superadmin, _em(3), "recente")
    _gravar(sessao, superadmin, _em(2), "meio")

    resposta = cliente.get("/logs", headers=autenticar(superadmin))

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert [i["resumo"] for i in corpo["itens"]] == ["recente", "meio", "antigo"]
    assert corpo["total"] == 3
    assert set(corpo["itens"][0]) == {
        "id", "usuario_id", "usuario_nome", "setor_id", "acao", "modulo",
        "entidade_tipo", "entidade_id", "resumo", "criado_em",
    }  # fmt: skip


@pytest.mark.parametrize("fixture_usuario", ["comum", "admin_setor"])
def test_log03_quem_nao_e_superadmin_recebe_403(
    cliente: TestClient, fixture_usuario: str, request: pytest.FixtureRequest
):
    usuario = request.getfixturevalue(fixture_usuario)

    assert cliente.get("/logs", headers=autenticar(usuario)).status_code == 403


def test_log03_sem_token_retorna_401(cliente: TestClient):
    assert cliente.get("/logs").status_code == 401


def test_log03_filtra_por_usuario_e_por_setor(
    cliente: TestClient, sessao: Session, superadmin: Usuario, admin_setor: Usuario, setor: Setor
):
    _gravar(sessao, superadmin, _em(1), "do superadmin")
    _gravar(sessao, admin_setor, _em(2), "do admin")
    cabecalho = autenticar(superadmin)

    por_usuario = cliente.get("/logs", params={"usuario_id": str(admin_setor.id)}, headers=cabecalho)
    por_setor = cliente.get("/logs", params={"setor_id": str(setor.id)}, headers=cabecalho)

    assert [i["resumo"] for i in por_usuario.json()["itens"]] == ["do admin"]
    assert [i["resumo"] for i in por_setor.json()["itens"]] == ["do admin"]


def test_log03_periodo_e_inclusivo_nos_dois_extremos(
    cliente: TestClient, sessao: Session, superadmin: Usuario
):
    _gravar(sessao, superadmin, _em(1, 23), "antes")
    _gravar(sessao, superadmin, _em(2, 0), "primeiro instante")
    _gravar(sessao, superadmin, _em(3, 23), "ultimo dia")
    _gravar(sessao, superadmin, _em(4, 0), "depois")

    resposta = cliente.get(
        "/logs", params={"de": "2026-10-02", "ate": "2026-10-03"}, headers=autenticar(superadmin)
    )

    assert [i["resumo"] for i in resposta.json()["itens"]] == ["ultimo dia", "primeiro instante"]


def test_log03_pagina_com_limite_e_deslocamento_e_informa_o_total(
    cliente: TestClient, sessao: Session, superadmin: Usuario
):
    for dia in range(1, 6):
        _gravar(sessao, superadmin, _em(dia), f"log {dia}")

    resposta = cliente.get(
        "/logs", params={"limite": 2, "deslocamento": 1}, headers=autenticar(superadmin)
    )

    corpo = resposta.json()
    assert [i["resumo"] for i in corpo["itens"]] == ["log 4", "log 3"]
    assert corpo["total"] == 5


def test_log03_limite_acima_do_maximo_retorna_422(cliente: TestClient, superadmin: Usuario):
    resposta = cliente.get("/logs", params={"limite": 201}, headers=autenticar(superadmin))

    assert resposta.status_code == 422
