"""Histórico de versões dos documentos — docs/specs/documentos.md (DOC-06, DOC-09)."""

from fastapi.testclient import TestClient

from app.modules.usuarios.models import Usuario
from tests.apoio import ArmazenamentoFalso, autenticar


def _enviar(cliente: TestClient, usuario: Usuario, conteudo: bytes = b"v1", nome: str = "pop.txt") -> dict:
    resposta = cliente.post(
        "/documentos",
        data={"titulo": "Higienização das mãos", "categoria": "pop"},
        files={"arquivo": (nome, conteudo, "text/plain")},
        headers=autenticar(usuario),
    )
    assert resposta.status_code == 201, resposta.json()
    return resposta.json()


def _substituir(
    cliente: TestClient, usuario: Usuario, documento_id: str, conteudo: bytes, alteracao: str | None = None
):
    return cliente.put(
        f"/documentos/{documento_id}/arquivo",
        data={"alteracao": alteracao} if alteracao else None,
        files={"arquivo": ("pop.txt", conteudo, "text/plain")},
        headers=autenticar(usuario),
    )


def test_doc09_envio_cria_a_versao_1(cliente: TestClient, admin_setor: Usuario):
    documento = _enviar(cliente, admin_setor)

    assert documento["versao"] == 1
    versoes = cliente.get(f"/documentos/{documento['id']}/versoes", headers=autenticar(admin_setor)).json()
    assert [v["numero"] for v in versoes] == [1]
    assert versoes[0]["autor_nome"] == admin_setor.nome
    assert versoes[0]["nome_arquivo"] == "pop.txt"
    assert versoes[0]["tamanho_bytes"] == 2


def test_doc09_substituir_cria_nova_versao_e_guarda_a_anterior(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    documento = _enviar(cliente, admin_setor, b"v1")

    resposta = _substituir(cliente, admin_setor, documento["id"], b"versao dois", "Revisão anual")

    assert resposta.status_code == 200, resposta.json()
    assert resposta.json()["versao"] == 2
    assert resposta.json()["tamanho_bytes"] == len(b"versao dois")
    versoes = cliente.get(f"/documentos/{documento['id']}/versoes", headers=autenticar(admin_setor)).json()
    assert [v["numero"] for v in versoes] == [2, 1]
    assert versoes[0]["alteracao"] == "Revisão anual"
    assert versoes[1]["alteracao"] is None
    # As duas versões continuam no bucket.
    assert sorted(o.conteudo for o in armazenamento_falso.objetos.values()) == [b"v1", b"versao dois"]


def test_doc09_lista_de_versoes_exige_login(cliente: TestClient, admin_setor: Usuario, comum: Usuario):
    documento = _enviar(cliente, admin_setor)

    url = f"/documentos/{documento['id']}/versoes"
    assert cliente.get(url).status_code == 401
    assert cliente.get(url, headers=autenticar(comum)).status_code == 200


def test_doc09_versoes_de_documento_inexistente_da_404(cliente: TestClient, comum: Usuario):
    resposta = cliente.get(
        "/documentos/00000000-0000-0000-0000-000000000000/versoes", headers=autenticar(comum)
    )

    assert resposta.status_code == 404


def test_doc09_baixa_uma_versao_antiga(cliente: TestClient, admin_setor: Usuario, comum: Usuario):
    documento = _enviar(cliente, admin_setor, b"v1")
    _substituir(cliente, admin_setor, documento["id"], b"versao dois")

    antiga = cliente.get(f"/documentos/{documento['id']}/versoes/1/download", headers=autenticar(comum))
    atual = cliente.get(f"/documentos/{documento['id']}/download", headers=autenticar(comum))

    assert antiga.status_code == 200
    assert antiga.content == b"v1"
    assert atual.content == b"versao dois"


def test_doc09_download_de_versao_exige_login(cliente: TestClient, admin_setor: Usuario):
    documento = _enviar(cliente, admin_setor)

    assert cliente.get(f"/documentos/{documento['id']}/versoes/1/download").status_code == 401


def test_doc09_versao_inexistente_da_404(cliente: TestClient, admin_setor: Usuario):
    documento = _enviar(cliente, admin_setor)

    resposta = cliente.get(f"/documentos/{documento['id']}/versoes/9/download", headers=autenticar(admin_setor))

    assert resposta.status_code == 404


def test_doc09_excluir_remove_todas_as_versoes_do_bucket(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    documento = _enviar(cliente, admin_setor, b"v1")
    _substituir(cliente, admin_setor, documento["id"], b"versao dois")

    resposta = cliente.delete(f"/documentos/{documento['id']}", headers=autenticar(admin_setor))

    assert resposta.status_code == 204
    assert armazenamento_falso.objetos == {}


def test_doc09_mudar_categoria_move_so_a_versao_atual(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    documento = _enviar(cliente, admin_setor, b"v1")
    _substituir(cliente, admin_setor, documento["id"], b"versao dois")

    cliente.put(f"/documentos/{documento['id']}", json={"categoria": "manual"}, headers=autenticar(admin_setor))

    for numero, esperado in ((1, b"v1"), (2, b"versao dois")):
        baixado = cliente.get(f"/documentos/{documento['id']}/versoes/{numero}/download", headers=autenticar(comum))
        assert baixado.content == esperado
