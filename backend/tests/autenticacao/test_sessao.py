"""Sessão: refresh token em cookie (AUT-07), renovação com rotação (AUT-02) e logout (AUT-06) —
docs/specs/autenticacao.md."""

import logging
from datetime import UTC, datetime, timedelta

import httpx2 as httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import configuracoes
from app.core.security import hash_token
from app.modules.autenticacao.models import TokenAtualizacao
from app.modules.usuarios.models import Usuario
from tests.apoio import (
    COOKIE_REFRESH as COOKIE,
    SENHA_PADRAO,
    cookie_gravado,
    refresh_do_cookie as valor_do_cookie,
    renovar,
)


def entrar(cliente: TestClient, usuario: Usuario) -> httpx.Response:
    return cliente.post("/auth/login", json={"email": usuario.email, "senha": SENHA_PADRAO})


def token_no_banco(sessao: Session, refresh_token: str) -> TokenAtualizacao:
    sessao.expire_all()
    return sessao.query(TokenAtualizacao).filter_by(token_hash=hash_token(refresh_token)).one()


# AUT-07 / AUT-01


def test_aut07_login_grava_o_refresh_so_no_cookie_httponly(cliente: TestClient, comum: Usuario):
    resposta = entrar(cliente, comum)

    assert resposta.status_code == 200
    assert "refresh_token" not in resposta.json()
    atributos = [a.strip().lower() for a in cookie_gravado(resposta).split(";")]
    assert "httponly" in atributos
    assert "secure" in atributos
    assert "samesite=strict" in atributos
    assert "path=/" in atributos
    assert f"max-age={configuracoes.refresh_token_dias * 24 * 60 * 60}" in atributos


def test_aut07_cookie_sem_secure_quando_desligado(
    cliente: TestClient, comum: Usuario, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(configuracoes, "cookie_seguro", False)

    atributos = [a.strip().lower() for a in cookie_gravado(entrar(cliente, comum)).split(";")]

    assert "secure" not in atributos
    assert "httponly" in atributos


def test_aut07_cookie_seguro_ligado_por_padrao(monkeypatch: pytest.MonkeyPatch):
    from app.core.config import Configuracoes

    monkeypatch.delenv("COOKIE_SECURE", raising=False)
    assert Configuracoes(_env_file=None, postgres_password="x").cookie_seguro is True


# AUT-02


def test_aut02_renova_pelo_cookie_e_rotaciona(
    cliente: TestClient, sessao: Session, comum: Usuario
):
    original = valor_do_cookie(entrar(cliente, comum))

    resposta = renovar(cliente, original)

    assert resposta.status_code == 200
    assert resposta.json()["access_token"]
    assert "refresh_token" not in resposta.json()
    novo = valor_do_cookie(resposta)
    assert novo != original
    antigo, atual = token_no_banco(sessao, original), token_no_banco(sessao, novo)
    assert antigo.substituido_em is not None
    assert atual.expira_em == antigo.expira_em
    assert renovar(cliente, novo).status_code == 200


def test_aut02_sem_cookie_responde_401(cliente: TestClient):
    assert renovar(cliente, None).status_code == 401


def test_aut02_token_trocado_ha_pouco_ainda_renova_sem_trocar_o_cookie(
    cliente: TestClient, comum: Usuario
):
    original = valor_do_cookie(entrar(cliente, comum))
    renovar(cliente, original)

    resposta = renovar(cliente, original)

    assert resposta.status_code == 200
    assert not [c for c in resposta.headers.get_list("set-cookie") if c.startswith(f"{COOKIE}=")]


def test_aut02_reuso_depois_de_30s_derruba_todas_as_sessoes(
    cliente: TestClient, sessao: Session, comum: Usuario, caplog: pytest.LogCaptureFixture
):
    original = valor_do_cookie(entrar(cliente, comum))
    outra_sessao = valor_do_cookie(entrar(cliente, comum))
    novo = valor_do_cookie(renovar(cliente, original))
    token = token_no_banco(sessao, original)
    token.substituido_em = datetime.now(UTC) - timedelta(seconds=31)
    sessao.flush()

    with caplog.at_level(logging.INFO, logger="app.seguranca"):
        resposta = renovar(cliente, original)

    assert resposta.status_code == 401
    assert renovar(cliente, novo).status_code == 401
    assert renovar(cliente, outra_sessao).status_code == 401
    assert f"evento=refresh_reutilizado usuario_id={comum.id} ip=testclient" in [
        r.getMessage() for r in caplog.records if r.name == "app.seguranca"
    ]


def test_aut02_desativado_nao_renova(cliente: TestClient, comum: Usuario, sessao: Session):
    refresh = valor_do_cookie(entrar(cliente, comum))
    comum.ativo = False
    sessao.flush()

    assert renovar(cliente, refresh).status_code == 401


def test_aut02_expirado_nao_renova(cliente: TestClient, comum: Usuario, sessao: Session):
    refresh = valor_do_cookie(entrar(cliente, comum))
    token = token_no_banco(sessao, refresh)
    token.expira_em = datetime.now(UTC) - timedelta(seconds=1)
    sessao.flush()

    assert renovar(cliente, refresh).status_code == 401


# AUT-06


def test_aut06_logout_revoga_e_apaga_o_cookie(cliente: TestClient, comum: Usuario):
    refresh = valor_do_cookie(entrar(cliente, comum))

    resposta = cliente.post("/auth/logout")

    assert resposta.status_code == 204
    apagado = cookie_gravado(resposta).lower()
    assert 'intranet_refresh=""' in apagado or "max-age=0" in apagado
    assert renovar(cliente, refresh).status_code == 401


def test_aut06_logout_revoga_tambem_os_tokens_ja_trocados_da_sessao(
    cliente: TestClient, comum: Usuario
):
    # Achado no E2E: o anterior, trocado há menos de 30 s, renovava pela janela de concorrência.
    original = valor_do_cookie(entrar(cliente, comum))
    atual = valor_do_cookie(renovar(cliente, original))

    cliente.post("/auth/logout", headers={"Cookie": f"{COOKIE}={atual}"})

    assert renovar(cliente, original).status_code == 401
    assert renovar(cliente, atual).status_code == 401


def test_aut06_logout_nao_derruba_a_sessao_de_outro_dispositivo(
    cliente: TestClient, comum: Usuario
):
    deste = valor_do_cookie(entrar(cliente, comum))
    do_outro = valor_do_cookie(entrar(cliente, comum))

    cliente.post("/auth/logout", headers={"Cookie": f"{COOKIE}={deste}"})

    assert renovar(cliente, do_outro).status_code == 200


def test_aut06_logout_sem_cookie_e_idempotente(cliente: TestClient):
    cliente.cookies.clear()

    assert cliente.post("/auth/logout").status_code == 204
    assert cliente.post("/auth/logout", headers={"Cookie": f"{COOKIE}=desconhecido"}).status_code == 204
