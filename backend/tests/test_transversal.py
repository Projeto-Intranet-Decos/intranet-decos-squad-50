"""Regras transversais — docs/specs/transversal.md."""

import logging

import pytest
from fastapi.testclient import TestClient

from app.modules.setores import service as setores_service
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Papel, Usuario
from tests.apoio import ArmazenamentoFalso, Fabrica, autenticar

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16


def test_ger02_rota_protegida_sem_token_retorna_401(cliente: TestClient):
    resposta = cliente.get("/usuarios")

    assert resposta.status_code == 401
    assert resposta.json() == {"mensagem": "Não autenticado"}
    assert resposta.headers["WWW-Authenticate"] == "Bearer"


def test_ger02_token_invalido_retorna_401(cliente: TestClient):
    resposta = cliente.get("/usuarios", headers={"Authorization": "Bearer nao-e-um-jwt"})

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


def test_ger05_erro_inesperado_vira_500_no_contrato_sem_detalhe(
    cliente: TestClient, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
):
    def quebrar(*args: object) -> None:
        raise RuntimeError("detalhe interno: postgres://usuario:senha@host")

    monkeypatch.setattr(setores_service, "listar_setores", quebrar)
    sem_repasse = TestClient(cliente.app, raise_server_exceptions=False)

    resposta = sem_repasse.get("/setores")

    assert resposta.status_code == 500
    assert resposta.json() == {"mensagem": "Erro interno do servidor"}
    assert "detalhe interno" in caplog.text


def test_ger25_acesso_negado_vai_para_o_log(
    cliente: TestClient, fabrica: Fabrica, comum: Usuario, admin_setor: Usuario,
    caplog: pytest.LogCaptureFixture,
):
    admin_farmacia = fabrica.usuario(Papel.admin_setor, fabrica.setor("Farmácia"))
    faq = cliente.post(
        "/duvidas/faq", json={"pergunta": "P?", "resposta": "R."}, headers=autenticar(admin_farmacia)
    ).json()

    with caplog.at_level(logging.INFO, logger="app.seguranca"):
        assert cliente.get("/usuarios", headers=autenticar(comum)).status_code == 403
        assert cliente.delete(
            f"/duvidas/faq/{faq['id']}", headers=autenticar(admin_setor)
        ).status_code == 403

    assert [r.getMessage() for r in caplog.records if r.name == "app.seguranca"] == [
        f"evento=acesso_negado usuario_id={comum.id} papel=comum metodo=GET caminho=/usuarios",
        f"evento=acesso_negado usuario_id={admin_setor.id} papel=admin_setor metodo=DELETE "
        f"caminho=/duvidas/faq/{faq['id']}",
    ]


ASSINATURAS_VALIDAS = {
    "pop.pdf": b"%PDF-1.7\n",
    "foto.png": PNG,
    "foto.jpg": b"\xff\xd8\xff\xe0" + b"\x00" * 16,
    "planilha.xlsx": b"PK\x03\x04" + b"\x00" * 16,
    "antigo.doc": b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 16,
    "notas.txt": "Plantão: café às 7h\n".encode("latin-1"),
}


def enviar_documento(cliente: TestClient, usuario: Usuario, nome: str, conteudo: bytes):
    return cliente.post(
        "/documentos",
        data={"titulo": "POP", "categoria": "outro"},
        files={"arquivo": (nome, conteudo, "application/octet-stream")},
        headers=autenticar(usuario),
    )


@pytest.mark.parametrize("nome", ASSINATURAS_VALIDAS)
def test_ger06_aceita_arquivo_com_a_assinatura_da_extensao(
    cliente: TestClient, admin_setor: Usuario, nome: str
):
    assert enviar_documento(cliente, admin_setor, nome, ASSINATURAS_VALIDAS[nome]).status_code == 201


@pytest.mark.parametrize(
    ("nome", "conteudo"),
    [
        ("falso.pdf", b"<html><script>alert(1)</script></html>"),
        ("falso.png", b"GIF89a" + b"\x00" * 16),
        ("falso.docx", b"%PDF-1.7\n"),
        ("falso.doc", b"PK\x03\x04" + b"\x00" * 16),
        ("binario.txt", b"MZ\x90\x00\x03\x00\x00\x00"),
    ],
)
def test_ger06_recusa_conteudo_que_nao_bate_com_a_extensao(
    cliente: TestClient, admin_setor: Usuario, armazenamento_falso: ArmazenamentoFalso,
    nome: str, conteudo: bytes,
):
    resposta = enviar_documento(cliente, admin_setor, nome, conteudo)

    assert resposta.status_code == 415
    assert resposta.json() == {
        "campo": "arquivo", "mensagem": "O conteúdo do arquivo não corresponde à extensão"
    }
    assert cliente.get("/documentos").json() == []


def test_ger06_capa_do_aviso_tambem_confere_a_assinatura(cliente: TestClient, admin_setor: Usuario):
    resposta = cliente.post(
        "/murais/avisos",
        data={"titulo": "Aviso", "conteudo": "Texto"},
        files={"imagem": ("capa.webp", b"<svg onload=alert(1)>", "image/webp")},
        headers=autenticar(admin_setor),
    )

    assert resposta.status_code == 415
    assert resposta.json()["campo"] == "imagem"


@pytest.mark.parametrize("rota", ["/docs", "/redoc", "/openapi.json"])
def test_ger23_documentacao_interativa_fora_do_ar(cliente: TestClient, rota: str):
    assert cliente.get(rota).status_code == 404


def test_ger23_headers_de_seguranca_em_toda_resposta(cliente: TestClient):
    for resposta in (cliente.get("/setores"), cliente.get("/usuarios"), cliente.get("/nao-existe")):
        assert resposta.headers["X-Content-Type-Options"] == "nosniff"
        assert resposta.headers["X-Frame-Options"] == "DENY"
        assert resposta.headers["Referrer-Policy"] == "no-referrer"
        assert resposta.headers["Cache-Control"] == "no-store"


def test_ger23_capa_do_aviso_mantem_o_proprio_cache(cliente: TestClient, admin_setor: Usuario):
    aviso = cliente.post(
        "/murais/avisos",
        data={"titulo": "Aviso", "conteudo": "Texto"},
        files={"imagem": ("capa.png", PNG, "application/octet-stream")},
        headers=autenticar(admin_setor),
    ).json()

    resposta = cliente.get(f"/murais/avisos/{aviso['id']}/imagem")

    assert resposta.headers["Cache-Control"] == "public, max-age=31536000, immutable"
    assert resposta.headers["X-Content-Type-Options"] == "nosniff"
