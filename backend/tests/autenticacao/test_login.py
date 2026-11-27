"""Login (AUT-01), limite de tentativas (AUT-11) e o log técnico deles (GER-25) —
docs/specs/autenticacao.md."""

import logging

import pytest
from fastapi.testclient import TestClient

from app.core import limite_tentativas
from app.modules.autenticacao import service
from app.modules.usuarios.models import Usuario
from tests.apoio import SENHA_PADRAO

SENHA_ERRADA = "senha-errada"


def login(cliente: TestClient, email: str, senha: str):
    return cliente.post("/auth/login", json={"email": email, "senha": senha})


def eventos(caplog: pytest.LogCaptureFixture) -> list[str]:
    return [r.getMessage() for r in caplog.records if r.name == "app.seguranca"]


# AUT-01


def test_aut01_email_inexistente_tambem_calcula_o_hash(
    cliente: TestClient, monkeypatch: pytest.MonkeyPatch
):
    conferidos: list[str] = []
    original = service.verificar_senha

    def espiar(senha: str, hash_armazenado: str) -> bool:
        conferidos.append(senha)
        return original(senha, hash_armazenado)

    monkeypatch.setattr(service, "verificar_senha", espiar)

    resposta = login(cliente, "ninguem@teste.local", SENHA_ERRADA)

    assert resposta.status_code == 401
    assert conferidos == [SENHA_ERRADA]


def test_aut01_pendente_tambem_calcula_o_hash(
    cliente: TestClient, fabrica, monkeypatch: pytest.MonkeyPatch
):
    pendente = fabrica.usuario(pendente=True)
    conferidos: list[str] = []
    monkeypatch.setattr(
        service, "verificar_senha", lambda senha, hash_: conferidos.append(senha) or False
    )

    assert login(cliente, pendente.email, SENHA_ERRADA).status_code == 401
    assert conferidos == [SENHA_ERRADA]


def test_aut01_email_com_maiusculas_e_espacos_entra(cliente: TestClient, comum: Usuario):
    resposta = login(cliente, f"  {comum.email.upper()} ", SENHA_PADRAO)

    assert resposta.status_code == 200


# AUT-11


def test_aut11_sexta_tentativa_em_15_min_e_bloqueada_mesmo_com_a_senha_certa(
    cliente: TestClient, comum: Usuario
):
    for _ in range(5):
        assert login(cliente, comum.email, SENHA_ERRADA).status_code == 401

    resposta = login(cliente, comum.email.upper(), SENHA_PADRAO)

    assert resposta.status_code == 429
    assert resposta.json() == {"mensagem": "Muitas tentativas. Tente de novo em alguns minutos."}
    assert 0 < int(resposta.headers["Retry-After"]) <= 15 * 60


def test_aut11_email_inexistente_bloqueia_igual(cliente: TestClient):
    for _ in range(5):
        assert login(cliente, "ninguem@teste.local", SENHA_ERRADA).status_code == 401

    assert login(cliente, "ninguem@teste.local", SENHA_ERRADA).status_code == 429


def test_aut11_bloqueio_acaba_quando_a_janela_passa(
    cliente: TestClient, comum: Usuario, monkeypatch: pytest.MonkeyPatch
):
    agora = 1000.0
    monkeypatch.setattr(limite_tentativas, "relogio", lambda: agora)
    for _ in range(5):
        login(cliente, comum.email, SENHA_ERRADA)
    assert login(cliente, comum.email, SENHA_PADRAO).status_code == 429

    agora += 15 * 60 + 1

    assert login(cliente, comum.email, SENHA_PADRAO).status_code == 200


def test_aut11_login_certo_esquece_as_falhas(cliente: TestClient, comum: Usuario):
    for _ in range(4):
        login(cliente, comum.email, SENHA_ERRADA)
    assert login(cliente, comum.email, SENHA_PADRAO).status_code == 200

    for _ in range(4):
        assert login(cliente, comum.email, SENHA_ERRADA).status_code == 401
    assert login(cliente, comum.email, SENHA_PADRAO).status_code == 200


def test_aut11_bloqueio_de_um_email_nao_afeta_outro(
    cliente: TestClient, comum: Usuario, admin_setor: Usuario
):
    for _ in range(6):
        login(cliente, comum.email, SENHA_ERRADA)

    assert login(cliente, admin_setor.email, SENHA_PADRAO).status_code == 200


# GER-25


def test_ger25_login_falho_e_bloqueio_vao_para_o_log(
    cliente: TestClient, comum: Usuario, caplog: pytest.LogCaptureFixture
):
    with caplog.at_level(logging.INFO, logger="app.seguranca"):
        for _ in range(6):
            login(cliente, comum.email, SENHA_ERRADA)

    registrados = eventos(caplog)
    assert registrados.count(f"evento=login_falhou email={comum.email} ip=testclient") == 5
    assert registrados[-1] == f"evento=login_bloqueado email={comum.email} ip=testclient"
    assert all(SENHA_ERRADA not in linha for linha in registrados)


def test_ger25_login_ok_vai_para_o_log(
    cliente: TestClient, comum: Usuario, caplog: pytest.LogCaptureFixture
):
    with caplog.at_level(logging.INFO, logger="app.seguranca"):
        login(cliente, comum.email, SENHA_PADRAO)

    assert eventos(caplog) == [f"evento=login_ok usuario_id={comum.id} ip=testclient"]
