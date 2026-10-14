"""Calendário: eventos — docs/specs/calendario.md."""

import pytest
from fastapi.testclient import TestClient

from app.modules.usuarios.models import Usuario
from tests.apoio import autenticar


# Os helpers falham com pytest.fail, não assert: num teste xfail(raises=AssertionError), um erro na
# preparação aparece como falha de verdade, e não como o bug conhecido.


def _criar_evento(cliente: TestClient, autor: Usuario, **campos) -> dict:
    resposta = cliente.post("/calendario/eventos", json=campos, headers=autenticar(autor))
    if resposta.status_code != 201:
        pytest.fail(f"Criar evento devolveu {resposta.status_code}: {resposta.json()}")
    return resposta.json()


def _titulos_no_periodo(cliente: TestClient, usuario: Usuario, de: str, ate: str) -> list[str]:
    resposta = cliente.get(
        "/calendario/eventos", params={"de": de, "ate": ate}, headers=autenticar(usuario)
    )
    if resposta.status_code != 200:
        pytest.fail(f"Listar eventos devolveu {resposta.status_code}: {resposta.json()}")
    return [evento["titulo"] for evento in resposta.json()]


def test_cal01_evento_aparece_na_consulta_do_seu_periodo(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    _criar_evento(cliente, admin_setor, titulo="Treinamento", data_inicio="2026-10-15T14:00:00Z")
    _criar_evento(cliente, admin_setor, titulo="Fora do mês", data_inicio="2026-11-03T14:00:00Z")

    assert _titulos_no_periodo(cliente, comum, "2026-10-01", "2026-10-31") == ["Treinamento"]


@pytest.mark.xfail(
    reason="CAL-02 🐞: o filtro só considera data_inicio (bug conhecido, ainda não corrigido)",
    raises=AssertionError,
)
def test_cal02_evento_de_varios_dias_aparece_no_mes_seguinte(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    _criar_evento(
        cliente,
        admin_setor,
        titulo="Semana de enfermagem",
        data_inicio="2026-09-30T08:00:00Z",
        data_fim="2026-10-02T18:00:00Z",
    )

    assert _titulos_no_periodo(cliente, comum, "2026-10-01", "2026-10-31") == [
        "Semana de enfermagem"
    ]
