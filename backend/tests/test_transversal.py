"""Regras transversais — docs/specs/transversal.md."""

from fastapi.testclient import TestClient

from app.modules.setores.models import Setor
from app.modules.usuarios.models import Papel, Usuario
from tests.apoio import ArmazenamentoFalso, Fabrica, autenticar


def test_ger02_rota_protegida_sem_token_retorna_401(cliente: TestClient):
    resposta = cliente.get("/setores")

    assert resposta.status_code == 401
    assert resposta.json() == {"mensagem": "Não autenticado"}
    assert resposta.headers["WWW-Authenticate"] == "Bearer"


def test_ger02_token_invalido_retorna_401(cliente: TestClient):
    resposta = cliente.get("/setores", headers={"Authorization": "Bearer nao-e-um-jwt"})

    assert resposta.status_code == 401


def test_ger03_comum_nao_cria_conteudo(cliente: TestClient, comum: Usuario):
    resposta = cliente.post(
        "/duvidas/faq",
        json={"pergunta": "Como peço férias?", "resposta": "Pelo RH."},
        headers=autenticar(comum),
    )

    assert resposta.status_code == 403
    assert resposta.json() == {"mensagem": "Acesso negado"}


def test_ger03_admin_setor_nao_acessa_rota_de_superadmin(cliente: TestClient, admin_setor: Usuario):
    resposta = cliente.get("/usuarios", headers=autenticar(admin_setor))

    assert resposta.status_code == 403


def test_ger04_admin_setor_nao_edita_recurso_de_outro_setor(
    cliente: TestClient, fabrica: Fabrica, admin_setor: Usuario
):
    admin_farmacia = fabrica.usuario(Papel.admin_setor, fabrica.setor("Farmácia"))
    faq = cliente.post(
        "/duvidas/faq",
        json={"pergunta": "Horário da farmácia?", "resposta": "24h."},
        headers=autenticar(admin_farmacia),
    ).json()

    resposta = cliente.put(
        f"/duvidas/faq/{faq['id']}",
        json={"resposta": "Alterada por outro setor"},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 403
    assert resposta.json() == {"mensagem": "Fora do seu setor"}
    atual = cliente.get(f"/duvidas/faq/{faq['id']}", headers=autenticar(admin_setor)).json()
    assert atual["resposta"] == "24h."


def test_ger04_leitura_e_institucional(
    cliente: TestClient, fabrica: Fabrica, setor: Setor, comum: Usuario
):
    admin_farmacia = fabrica.usuario(Papel.admin_setor, fabrica.setor("Farmácia"))
    cliente.post(
        "/duvidas/faq",
        json={"pergunta": "Horário da farmácia?", "resposta": "24h."},
        headers=autenticar(admin_farmacia),
    )

    resposta = cliente.get("/duvidas/faq", headers=autenticar(comum))

    assert resposta.status_code == 200
    assert [faq["setor_nome"] for faq in resposta.json()] == ["Farmácia"]


def test_ger09_saude_ok_com_banco_e_armazenamento(cliente: TestClient):
    resposta = cliente.get("/saude")

    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok", "banco": "ok", "armazenamento": "ok"}


def test_ger09_saude_503_com_armazenamento_fora(
    cliente: TestClient, armazenamento_falso: ArmazenamentoFalso
):
    armazenamento_falso.indisponivel = True

    resposta = cliente.get("/saude")

    assert resposta.status_code == 503
    assert resposta.json()["armazenamento"] == "indisponivel"
