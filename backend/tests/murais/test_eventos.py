"""Mural: eventos por período (MUR-12) — docs/specs/murais.md."""

from fastapi.testclient import TestClient

from app.modules.usuarios.models import Papel, Usuario
from tests.apoio import Fabrica, autenticar


def _publicar_evento(cliente: TestClient, autor: Usuario, titulo: str, **campos) -> dict:
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": titulo, "categoria": "evento", **campos},
        headers=autenticar(autor),
    )
    assert resposta.status_code == 201, resposta.json()
    return resposta.json()


def _titulos(cliente: TestClient, usuario: Usuario, **filtros) -> list[str]:
    resposta = cliente.get("/murais/eventos", params=filtros, headers=autenticar(usuario))
    assert resposta.status_code == 200, resposta.json()
    return [evento["titulo"] for evento in resposta.json()]


def test_mur12_evento_aparece_na_consulta_do_seu_periodo(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    _publicar_evento(cliente, admin_setor, "Treinamento", data_inicio="2026-10-15T14:00:00Z")
    _publicar_evento(cliente, admin_setor, "Fora do mês", data_inicio="2026-11-03T14:00:00Z")

    assert _titulos(cliente, comum, de="2026-10-01", ate="2026-10-31") == ["Treinamento"]


def test_mur12_ate_inclui_o_dia_inteiro(cliente: TestClient, admin_setor: Usuario, comum: Usuario):
    _publicar_evento(cliente, admin_setor, "Fim do dia", data_inicio="2026-10-31T23:30:00Z")

    assert _titulos(cliente, comum, de="2026-10-01", ate="2026-10-31") == ["Fim do dia"]


def test_mur12_so_lista_avisos_de_categoria_evento(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "Comunicado", "conteudo": "Texto"},
        headers=autenticar(admin_setor),
    )
    assert resposta.status_code == 201
    _publicar_evento(cliente, admin_setor, "Treinamento", data_inicio="2026-10-15T14:00:00Z")

    assert _titulos(cliente, comum) == ["Treinamento"]


def test_mur12_ordena_por_data_inicio_e_titulo(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    _publicar_evento(cliente, admin_setor, "Depois", data_inicio="2026-10-20T08:00:00Z")
    _publicar_evento(cliente, admin_setor, "B mesmo horário", data_inicio="2026-10-10T08:00:00Z")
    _publicar_evento(cliente, admin_setor, "A mesmo horário", data_inicio="2026-10-10T08:00:00Z")

    assert _titulos(cliente, comum) == ["A mesmo horário", "B mesmo horário", "Depois"]


def test_mur12_filtra_por_setor(
    cliente: TestClient, fabrica: Fabrica, admin_setor: Usuario, comum: Usuario
):
    farmacia = fabrica.setor("Farmácia")
    admin_farmacia = fabrica.usuario(Papel.admin_setor, farmacia)
    _publicar_evento(cliente, admin_setor, "Da enfermagem", data_inicio="2026-10-15T14:00:00Z")
    _publicar_evento(cliente, admin_farmacia, "Da farmácia", data_inicio="2026-10-15T14:00:00Z")

    assert _titulos(cliente, comum, setor_id=str(farmacia.id)) == ["Da farmácia"]


def test_mur12_evento_de_varios_dias_aparece_no_mes_seguinte(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    _publicar_evento(
        cliente,
        admin_setor,
        "Semana de enfermagem",
        data_inicio="2026-09-30T08:00:00Z",
        data_fim="2026-10-02T18:00:00Z",
    )

    assert _titulos(cliente, comum, de="2026-10-01", ate="2026-10-31") == ["Semana de enfermagem"]


def test_mur12_evento_sem_fim_usa_so_a_data_de_inicio(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    _publicar_evento(cliente, admin_setor, "Setembro", data_inicio="2026-09-30T08:00:00Z")

    assert _titulos(cliente, comum, de="2026-10-01", ate="2026-10-31") == []


def test_mur12_exige_autenticacao(cliente: TestClient):
    assert cliente.get("/murais/eventos").status_code == 401
