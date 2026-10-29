"""Acesso rápido — docs/specs/atalhos.md."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.modules.usuarios.models import Usuario
from tests.apoio import autenticar

PRONTUARIO = {"titulo": "Prontuário eletrônico", "url": "https://prontuario.decos.local"}


def _criar(cliente: TestClient, superadmin: Usuario, dados: dict = PRONTUARIO) -> dict:
    resposta = cliente.post("/atalhos", json=dados, headers=autenticar(superadmin))
    if resposta.status_code != 201:
        pytest.fail(f"Falha ao criar atalho: {resposta.status_code} {resposta.json()}")
    return resposta.json()


def test_ata01_qualquer_autenticado_lista_atalhos_em_ordem_de_criacao(
    cliente: TestClient, superadmin: Usuario, comum: Usuario
):
    _criar(cliente, superadmin)
    _criar(cliente, superadmin, {"titulo": "Portal do colaborador", "url": "http://portal.local"})

    resposta = cliente.get("/atalhos", headers=autenticar(comum))

    assert resposta.status_code == 200
    atalhos = resposta.json()
    assert {a["titulo"] for a in atalhos} == {"Prontuário eletrônico", "Portal do colaborador"}
    assert set(atalhos[0]) == {"id", "titulo", "url", "criado_em", "atualizado_em"}


def test_ata01_visitante_sem_token_lista_atalhos(cliente: TestClient):
    assert cliente.get("/atalhos").status_code == 200


def test_ata02_superadmin_cria_atalho(cliente: TestClient, superadmin: Usuario):
    resposta = cliente.post(
        "/atalhos",
        json={"titulo": "  Prontuário eletrônico  ", "url": "https://prontuario.decos.local"},
        headers=autenticar(superadmin),
    )

    assert resposta.status_code == 201
    atalho = resposta.json()
    assert atalho["titulo"] == "Prontuário eletrônico"
    assert atalho["url"] == "https://prontuario.decos.local"
    assert atalho["atualizado_em"] is None


@pytest.mark.parametrize("fixture_usuario", ["comum", "admin_setor"])
def test_ata02_quem_nao_e_superadmin_recebe_403(
    cliente: TestClient, superadmin: Usuario, fixture_usuario: str, request: pytest.FixtureRequest
):
    usuario = request.getfixturevalue(fixture_usuario)

    resposta = cliente.post("/atalhos", json=PRONTUARIO, headers=autenticar(usuario))

    assert resposta.status_code == 403
    assert resposta.json() == {"mensagem": "Acesso negado"}
    assert cliente.get("/atalhos", headers=autenticar(superadmin)).json() == []


@pytest.mark.parametrize(
    ("dados", "campo"),
    [
        ({"titulo": "   ", "url": "https://a.local"}, "titulo"),
        ({"titulo": "x" * 101, "url": "https://a.local"}, "titulo"),
        ({"url": "https://a.local"}, "titulo"),
        ({"titulo": "Portal", "url": "portal.local"}, "url"),
        ({"titulo": "Portal", "url": "javascript:alert(1)"}, "url"),
        ({"titulo": "Portal", "url": "https://" + "a" * 500}, "url"),
        ({"titulo": "Portal"}, "url"),
    ],
)
def test_ata02_dados_invalidos_retornam_422_com_campo(
    cliente: TestClient, superadmin: Usuario, dados: dict, campo: str
):
    resposta = cliente.post("/atalhos", json=dados, headers=autenticar(superadmin))

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == campo


def test_ata03_superadmin_edita_parcialmente(cliente: TestClient, superadmin: Usuario):
    atalho = _criar(cliente, superadmin)

    resposta = cliente.put(
        f"/atalhos/{atalho['id']}", json={"titulo": "Prontuário"}, headers=autenticar(superadmin)
    )

    assert resposta.status_code == 200
    editado = resposta.json()
    assert editado["titulo"] == "Prontuário"
    assert editado["url"] == PRONTUARIO["url"]
    assert editado["atualizado_em"] is not None


def test_ata03_corpo_vazio_nao_muda_nada(cliente: TestClient, superadmin: Usuario):
    atalho = _criar(cliente, superadmin)

    resposta = cliente.put(f"/atalhos/{atalho['id']}", json={}, headers=autenticar(superadmin))

    assert resposta.status_code == 200
    assert resposta.json() == atalho


@pytest.mark.parametrize(
    ("dados", "campo"),
    [({"titulo": None}, "titulo"), ({"url": None}, "url"), ({"url": "ftp://a.local"}, "url")],
)
def test_ata03_dados_invalidos_retornam_422(
    cliente: TestClient, superadmin: Usuario, dados: dict, campo: str
):
    atalho = _criar(cliente, superadmin)

    resposta = cliente.put(f"/atalhos/{atalho['id']}", json=dados, headers=autenticar(superadmin))

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == campo


def test_ata03_id_inexistente_retorna_404(cliente: TestClient, superadmin: Usuario):
    resposta = cliente.put(
        f"/atalhos/{uuid.uuid4()}", json={"titulo": "X"}, headers=autenticar(superadmin)
    )

    assert resposta.status_code == 404
    assert resposta.json() == {"mensagem": "Atalho não encontrado"}


def test_ata03_admin_setor_recebe_403_e_atalho_nao_muda(
    cliente: TestClient, superadmin: Usuario, admin_setor: Usuario
):
    atalho = _criar(cliente, superadmin)

    resposta = cliente.put(
        f"/atalhos/{atalho['id']}", json={"titulo": "Outro"}, headers=autenticar(admin_setor)
    )

    assert resposta.status_code == 403
    [atual] = cliente.get("/atalhos", headers=autenticar(admin_setor)).json()
    assert atual["titulo"] == PRONTUARIO["titulo"]


def test_ata04_superadmin_exclui_atalho(cliente: TestClient, superadmin: Usuario):
    atalho = _criar(cliente, superadmin)

    resposta = cliente.delete(f"/atalhos/{atalho['id']}", headers=autenticar(superadmin))

    assert resposta.status_code == 204
    assert cliente.get("/atalhos", headers=autenticar(superadmin)).json() == []


def test_ata04_id_inexistente_retorna_404(cliente: TestClient, superadmin: Usuario):
    resposta = cliente.delete(f"/atalhos/{uuid.uuid4()}", headers=autenticar(superadmin))

    assert resposta.status_code == 404


def test_ata04_admin_setor_recebe_403(
    cliente: TestClient, superadmin: Usuario, admin_setor: Usuario
):
    atalho = _criar(cliente, superadmin)

    resposta = cliente.delete(f"/atalhos/{atalho['id']}", headers=autenticar(admin_setor))

    assert resposta.status_code == 403
    assert len(cliente.get("/atalhos", headers=autenticar(superadmin)).json()) == 1
