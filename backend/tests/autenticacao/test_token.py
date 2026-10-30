"""Conteúdo do access token (AUT-03) — docs/specs/autenticacao.md."""

from fastapi.testclient import TestClient

from app.core.security import decodificar_token
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Papel
from tests.apoio import SENHA_PADRAO, Fabrica, refresh_do_cookie, renovar


def test_aut03_access_token_traz_id_nome_papel_e_setor(cliente: TestClient, fabrica: Fabrica, setor: Setor):
    usuario = fabrica.usuario(Papel.admin_setor, setor, nome="Maria Silva", email="maria@example.com")

    resposta = cliente.post("/auth/login", json={"email": usuario.email, "senha": SENHA_PADRAO})

    carga = decodificar_token(resposta.json()["access_token"])
    assert carga["sub"] == str(usuario.id)
    assert carga["nome"] == "Maria Silva"
    assert carga["role"] == "admin_setor"
    assert carga["setor_id"] == str(setor.id)
    assert "exp" in carga


def test_aut03_token_renovado_traz_o_nome_atual(cliente: TestClient, fabrica: Fabrica, sessao):
    usuario = fabrica.usuario(nome="Nome Antigo", email="nome@example.com")
    refresh_token = refresh_do_cookie(
        cliente.post("/auth/login", json={"email": usuario.email, "senha": SENHA_PADRAO})
    )
    usuario.nome = "Nome Novo"
    sessao.flush()

    resposta = renovar(cliente, refresh_token)

    assert decodificar_token(resposta.json()["access_token"])["nome"] == "Nome Novo"
