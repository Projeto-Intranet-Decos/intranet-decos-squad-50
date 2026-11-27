"""Novidades desde a última visita — docs/specs/transversal.md (GER-28).

Cada teste roda numa transação só, onde o `now()` do Postgres não anda: as datas que importam
para o `desde` são gravadas explicitamente.
"""

from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.modules.documentos.models import Documento, DocumentoVersao
from app.modules.logs.models import Log
from app.modules.murais.models import Aviso
from app.modules.usuarios.models import Usuario
from tests.apoio import autenticar

ANTIGO = datetime(2020, 1, 1, tzinfo=UTC)
DESDE = datetime(2021, 1, 1, tzinfo=UTC)


def _publicar_aviso(cliente: TestClient, autor: Usuario, titulo: str) -> str:
    resposta = cliente.post(
        "/murais/avisos", data={"titulo": titulo, "conteudo": "Texto."}, headers=autenticar(autor)
    )
    assert resposta.status_code == 201, resposta.json()
    return resposta.json()["id"]


def _enviar_documento(cliente: TestClient, autor: Usuario, titulo: str) -> str:
    resposta = cliente.post(
        "/documentos",
        data={"titulo": titulo, "categoria": "pop"},
        files={"arquivo": ("pop.txt", b"v1", "text/plain")},
        headers=autenticar(autor),
    )
    assert resposta.status_code == 201, resposta.json()
    return resposta.json()["id"]


def _envelhecer_aviso(sessao: Session, aviso_id: str) -> None:
    sessao.execute(update(Aviso).where(Aviso.id == aviso_id).values(criado_em=ANTIGO))
    sessao.commit()


def _envelhecer_documento(sessao: Session, documento_id: str) -> None:
    sessao.execute(update(Documento).where(Documento.id == documento_id).values(criado_em=ANTIGO))
    sessao.execute(
        update(DocumentoVersao)
        .where(DocumentoVersao.documento_id == documento_id)
        .values(criado_em=ANTIGO)
    )
    sessao.commit()


# Última visita


def test_ger28_novidades_exigem_login(cliente: TestClient):
    assert cliente.get("/usuarios/eu/novidades").status_code == 401
    assert cliente.put("/usuarios/eu/novidades").status_code == 401


def test_ger28_usuario_novo_comeca_com_a_data_de_criacao(
    cliente: TestClient, sessao: Session, comum: Usuario
):
    resposta = cliente.get("/usuarios/eu/novidades", headers=autenticar(comum))

    assert resposta.status_code == 200
    sessao.refresh(comum)
    assert datetime.fromisoformat(resposta.json()["vistas_em"]) == comum.criado_em


def test_ger28_marcar_como_vistas_avanca_a_ultima_visita(cliente: TestClient, comum: Usuario):
    antes = datetime.fromisoformat(
        cliente.get("/usuarios/eu/novidades", headers=autenticar(comum)).json()["vistas_em"]
    )

    marcada = cliente.put("/usuarios/eu/novidades", headers=autenticar(comum))

    assert marcada.status_code == 200
    depois = datetime.fromisoformat(marcada.json()["vistas_em"])
    assert depois > antes
    consultada = cliente.get("/usuarios/eu/novidades", headers=autenticar(comum)).json()
    assert datetime.fromisoformat(consultada["vistas_em"]) == depois


def test_ger28_ultima_visita_e_de_cada_usuario(
    cliente: TestClient, comum: Usuario, admin_setor: Usuario
):
    do_admin = cliente.get("/usuarios/eu/novidades", headers=autenticar(admin_setor)).json()

    cliente.put("/usuarios/eu/novidades", headers=autenticar(comum))

    assert cliente.get("/usuarios/eu/novidades", headers=autenticar(admin_setor)).json() == do_admin


def test_ger28_marcar_como_vistas_nao_entra_no_registro_de_atividades(
    cliente: TestClient, sessao: Session, comum: Usuario
):
    cliente.put("/usuarios/eu/novidades", headers=autenticar(comum))

    assert sessao.scalar(select(func.count()).select_from(Log)) == 0


# Filtro `desde` das listagens


def test_ger28_avisos_desde_trazem_so_os_publicados_depois(
    cliente: TestClient, sessao: Session, admin_setor: Usuario
):
    antigo = _publicar_aviso(cliente, admin_setor, "Aviso antigo")
    _envelhecer_aviso(sessao, antigo)
    novo = _publicar_aviso(cliente, admin_setor, "Aviso novo")

    resposta = cliente.get("/murais/avisos", params={"desde": DESDE.isoformat()})

    assert resposta.status_code == 200
    assert [aviso["id"] for aviso in resposta.json()] == [novo]
    # Sem `desde`, a lista continua completa (MUR-01).
    assert len(cliente.get("/murais/avisos").json()) == 2


def test_ger28_documentos_desde_trazem_os_criados_depois(
    cliente: TestClient, sessao: Session, admin_setor: Usuario
):
    antigo = _enviar_documento(cliente, admin_setor, "POP antigo")
    _envelhecer_documento(sessao, antigo)
    novo = _enviar_documento(cliente, admin_setor, "POP novo")

    resposta = cliente.get("/documentos", params={"desde": DESDE.isoformat()}, headers=autenticar(admin_setor))

    assert resposta.status_code == 200
    assert [documento["id"] for documento in resposta.json()] == [novo]


def test_ger28_documento_com_versao_nova_volta_a_ser_novidade(
    cliente: TestClient, sessao: Session, admin_setor: Usuario
):
    documento_id = _enviar_documento(cliente, admin_setor, "POP revisado")
    _envelhecer_documento(sessao, documento_id)

    substituicao = cliente.put(
        f"/documentos/{documento_id}/arquivo",
        files={"arquivo": ("pop.txt", b"v2", "text/plain")},
        headers=autenticar(admin_setor),
    )
    assert substituicao.status_code == 200, substituicao.json()

    resposta = cliente.get("/documentos", params={"desde": DESDE.isoformat()}, headers=autenticar(admin_setor))
    assert [(d["id"], d["versao"]) for d in resposta.json()] == [(documento_id, 2)]


def test_ger28_editar_so_metadados_do_documento_nao_e_novidade(
    cliente: TestClient, sessao: Session, admin_setor: Usuario
):
    documento_id = _enviar_documento(cliente, admin_setor, "POP antigo")
    _envelhecer_documento(sessao, documento_id)

    edicao = cliente.put(
        f"/documentos/{documento_id}", json={"titulo": "POP renomeado"}, headers=autenticar(admin_setor)
    )
    assert edicao.status_code == 200, edicao.json()

    assert cliente.get("/documentos", params={"desde": DESDE.isoformat()}, headers=autenticar(admin_setor)).json() == []
