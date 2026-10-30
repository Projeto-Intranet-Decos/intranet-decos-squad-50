"""Modo visitante (somente leitura) — docs/specs/autenticacao.md (AUT-10)."""

import uuid

import pytest
from fastapi.testclient import TestClient

LEITURAS_PUBLICAS = [
    "/murais/avisos",
    "/murais/eventos",
    "/murais/aniversariantes",
    "/setores",
    "/duvidas/faq",
    "/documentos",
    "/atalhos",
]


@pytest.mark.parametrize("rota", LEITURAS_PUBLICAS)
def test_aut10_visitante_le_listas_sem_token(cliente: TestClient, rota: str):
    assert cliente.get(rota).status_code == 200


def test_aut10_visitante_le_detalhes_sem_token(cliente: TestClient):
    # Recurso inexistente: 404 prova que passou pela autenticação e chegou na busca.
    inexistente = uuid.uuid4()

    assert cliente.get(f"/murais/avisos/{inexistente}").status_code == 404
    assert cliente.get(f"/setores/{inexistente}").status_code == 404
    assert cliente.get(f"/setores/{inexistente}/ramais").status_code == 404
    assert cliente.get(f"/duvidas/faq/{inexistente}").status_code == 404
    assert cliente.get(f"/documentos/{inexistente}").status_code == 404


def test_aut10_visitante_nao_baixa_arquivos(cliente: TestClient):
    inexistente = uuid.uuid4()

    assert cliente.get(f"/documentos/{inexistente}/download").status_code == 401
    assert cliente.get(f"/murais/avisos/{inexistente}/anexos/{inexistente}/download").status_code == 401


@pytest.mark.parametrize(
    ("metodo", "rota"),
    [
        ("post", "/murais/avisos"),
        ("put", f"/murais/avisos/{uuid.uuid4()}"),
        ("delete", f"/murais/avisos/{uuid.uuid4()}"),
        ("post", "/documentos"),
        ("delete", f"/documentos/{uuid.uuid4()}"),
        ("post", "/duvidas/faq"),
        ("post", "/setores"),
        ("post", f"/setores/{uuid.uuid4()}/ramais"),
        ("post", "/atalhos"),
        ("post", "/usuarios"),
    ],
)
def test_aut10_visitante_nao_escreve(cliente: TestClient, metodo: str, rota: str):
    assert getattr(cliente, metodo)(rota).status_code == 401


@pytest.mark.parametrize("rota", ["/usuarios"])
def test_aut10_visitante_nao_le_administracao(cliente: TestClient, rota: str):
    assert cliente.get(rota).status_code == 401


def test_aut10_token_invalido_continua_401_na_escrita(cliente: TestClient):
    resposta = cliente.post("/atalhos", headers={"Authorization": "Bearer nao-e-um-jwt"})

    assert resposta.status_code == 401
