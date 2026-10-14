"""Mural: aniversariantes (MUR-13) — docs/specs/murais.md."""

from datetime import date

from fastapi.testclient import TestClient

from app.modules.setores.models import Setor
from app.modules.usuarios.models import Papel, Usuario
from tests.apoio import Fabrica, autenticar


def test_mur13_lista_ativos_do_mes_ordenados_por_dia_e_nome(
    cliente: TestClient, fabrica: Fabrica, setor: Setor, comum: Usuario
):
    fabrica.usuario(Papel.comum, setor, nome="Bruna", data_nascimento=date(1990, 3, 12))
    fabrica.usuario(Papel.comum, setor, nome="Ana", data_nascimento=date(1985, 3, 12))
    fabrica.usuario(Papel.comum, None, nome="Caio", data_nascimento=date(1992, 3, 2))
    fabrica.usuario(Papel.comum, setor, nome="Inativo", data_nascimento=date(1990, 3, 5), ativo=False)
    fabrica.usuario(Papel.comum, setor, nome="Abril", data_nascimento=date(1990, 4, 5))

    resposta = cliente.get("/murais/aniversariantes", params={"mes": 3}, headers=autenticar(comum))

    assert resposta.status_code == 200
    assert [(a["nome"], a["dia"], a["setor_nome"]) for a in resposta.json()] == [
        ("Caio", 2, None),
        ("Ana", 12, setor.nome),
        ("Bruna", 12, setor.nome),
    ]


def test_mur13_mes_fora_do_intervalo_retorna_422(cliente: TestClient, comum: Usuario):
    resposta = cliente.get("/murais/aniversariantes", params={"mes": 13}, headers=autenticar(comum))

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "mes"


def test_mur13_sem_mes_usa_o_mes_atual(cliente: TestClient, fabrica: Fabrica, comum: Usuario):
    hoje = date.today()
    fabrica.usuario(Papel.comum, None, nome="Hoje", data_nascimento=date(1990, hoje.month, 1))

    resposta = cliente.get("/murais/aniversariantes", headers=autenticar(comum))

    assert resposta.status_code == 200
    assert "Hoje" in [a["nome"] for a in resposta.json()]
