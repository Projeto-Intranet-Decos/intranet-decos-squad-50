"""Mural de avisos — docs/specs/murais.md."""

from fastapi.testclient import TestClient

from app.modules.usuarios.models import Usuario
from tests.apoio import ArmazenamentoFalso, autenticar

# Assinatura de PNG: o backend decide o tipo pela extensão, o conteúdo só precisa não ser vazio.
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16


def test_mur03_admin_publica_aviso_com_capa(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "Nova escala", "conteudo": "Vale a partir de segunda.", "categoria": "comunicado"},
        # O tipo informado pelo cliente é ignorado: o backend grava o que corresponde à extensão.
        files={"imagem": ("capa.png", PNG, "application/octet-stream")},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 201
    aviso = resposta.json()
    assert aviso["possui_imagem"] is True
    assert aviso["setor_id"] == str(admin_setor.setor_id)
    assert aviso["autor_nome"] == admin_setor.nome
    [objeto] = armazenamento_falso.objetos.values()
    assert objeto.conteudo == PNG
    assert objeto.tipo_conteudo == "image/png"


def test_mur03_aviso_aparece_para_outros_colaboradores(
    cliente: TestClient, admin_setor: Usuario, comum: Usuario
):
    criacao = cliente.post(
        "/murais/avisos",
        data={"titulo": "Nova escala", "conteudo": "Vale a partir de segunda."},
        headers=autenticar(admin_setor),
    )
    assert criacao.status_code == 201, criacao.json()

    resposta = cliente.get("/murais/avisos", headers=autenticar(comum))

    assert resposta.status_code == 200
    assert [aviso["titulo"] for aviso in resposta.json()] == ["Nova escala"]


def test_mur03_titulo_vazio_retorna_422(cliente: TestClient, admin_setor: Usuario):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "   ", "conteudo": "Texto"},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "titulo"


def test_mur04_capa_de_tipo_nao_permitido_retorna_415_e_nao_cria_aviso(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso
):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "Nova escala", "conteudo": "Texto"},
        files={"imagem": ("capa.gif", b"GIF89a", "image/gif")},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 415
    assert resposta.json() == {"campo": "imagem", "mensagem": "Tipo de arquivo não permitido"}
    assert cliente.get("/murais/avisos", headers=autenticar(admin_setor)).json() == []
    assert armazenamento_falso.objetos == {}
