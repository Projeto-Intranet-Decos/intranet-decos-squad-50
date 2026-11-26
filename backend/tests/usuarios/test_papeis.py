"""Papéis RH e Marketing — docs/specs/usuarios.md (USU-09), transversal.md (GER-03, GER-04)."""

import uuid

from fastapi.testclient import TestClient

from app.modules.usuarios.models import Papel, Usuario
from tests.apoio import Fabrica, autenticar

NOVO = {"nome": "Ana Souza", "email": "ana@example.com"}


def _aviso(cliente: TestClient, usuario: Usuario, **extra):
    return cliente.post(
        "/murais/avisos",
        data={"titulo": "Campanha de vacinação", "conteudo": "Começa na segunda.", **extra},
        headers=autenticar(usuario),
    )


# RH


def test_usu09_rh_lista_e_convida_usuarios(cliente: TestClient, rh: Usuario):
    assert cliente.get("/usuarios", headers=autenticar(rh)).status_code == 200

    resposta = cliente.post("/usuarios", json={**NOVO, "role": "marketing"}, headers=autenticar(rh))

    assert resposta.status_code == 201, resposta.json()
    assert resposta.json()["role"] == "marketing"
    assert resposta.json()["convite_pendente"] is True


def test_usu09_rh_nao_cria_superadmin(cliente: TestClient, rh: Usuario):
    resposta = cliente.post("/usuarios", json={**NOVO, "role": "superadmin"}, headers=autenticar(rh))

    assert resposta.status_code == 403
    emails = [u["email"] for u in cliente.get("/usuarios", headers=autenticar(rh)).json()]
    assert NOVO["email"] not in emails


def test_usu09_rh_nao_promove_a_superadmin(cliente: TestClient, fabrica: Fabrica, rh: Usuario):
    alvo = fabrica.usuario()

    resposta = cliente.put(f"/usuarios/{alvo.id}", json={"role": "superadmin"}, headers=autenticar(rh))

    assert resposta.status_code == 403


def test_usu09_rh_nao_altera_nem_desativa_superadmin(
    cliente: TestClient, rh: Usuario, superadmin: Usuario
):
    editar = cliente.put(f"/usuarios/{superadmin.id}", json={"nome": "Outro"}, headers=autenticar(rh))
    desativar = cliente.delete(f"/usuarios/{superadmin.id}", headers=autenticar(rh))

    assert editar.status_code == 403
    assert desativar.status_code == 403


def test_usu09_rh_edita_e_desativa_usuario_comum(cliente: TestClient, fabrica: Fabrica, rh: Usuario):
    alvo = fabrica.usuario()

    editar = cliente.put(f"/usuarios/{alvo.id}", json={"role": "admin_setor"}, headers=autenticar(rh))
    desativar = cliente.delete(f"/usuarios/{alvo.id}", headers=autenticar(rh))

    assert editar.status_code == 200
    assert editar.json()["role"] == "admin_setor"
    assert desativar.status_code == 200
    assert desativar.json()["ativo"] is False


def test_usu09_superadmin_continua_criando_superadmin(cliente: TestClient, superadmin: Usuario):
    resposta = cliente.post("/usuarios", json={**NOVO, "role": "superadmin"}, headers=autenticar(superadmin))

    assert resposta.status_code == 201


def test_usu09_marketing_e_comum_nao_acessam_usuarios(
    cliente: TestClient, marketing: Usuario, comum: Usuario
):
    for usuario in (marketing, comum):
        assert cliente.get("/usuarios", headers=autenticar(usuario)).status_code == 403
        assert cliente.post("/usuarios", json=NOVO, headers=autenticar(usuario)).status_code == 403


def test_usu09_rh_e_marketing_nao_veem_logs(cliente: TestClient, rh: Usuario, marketing: Usuario):
    for usuario in (rh, marketing):
        assert cliente.get("/logs", headers=autenticar(usuario)).status_code == 403


def test_usu09_rh_nao_escreve_conteudo(cliente: TestClient, rh: Usuario):
    assert _aviso(cliente, rh).status_code == 403
    assert cliente.post("/documentos", headers=autenticar(rh)).status_code == 403


# Marketing


def test_ger03_marketing_publica_aviso_no_proprio_setor(cliente: TestClient, marketing: Usuario):
    resposta = _aviso(cliente, marketing)

    assert resposta.status_code == 201, resposta.json()
    assert resposta.json()["setor_id"] == str(marketing.setor_id)
    assert resposta.json()["autor_id"] == str(marketing.id)


def test_ger04_marketing_publica_em_qualquer_setor(
    cliente: TestClient, fabrica: Fabrica, marketing: Usuario
):
    outro = fabrica.setor("Farmácia")

    resposta = _aviso(cliente, marketing, setor_id=str(outro.id))

    assert resposta.status_code == 201, resposta.json()
    assert resposta.json()["setor_id"] == str(outro.id)


def test_ger04_marketing_edita_e_exclui_so_os_proprios_avisos(
    cliente: TestClient, marketing: Usuario, admin_setor: Usuario
):
    proprio = _aviso(cliente, marketing).json()["id"]
    alheio = _aviso(cliente, admin_setor).json()["id"]

    assert cliente.put(f"/murais/avisos/{proprio}", json={"titulo": "Novo"}, headers=autenticar(marketing)).status_code == 200
    assert cliente.put(f"/murais/avisos/{alheio}", json={"titulo": "Novo"}, headers=autenticar(marketing)).status_code == 403
    assert cliente.delete(f"/murais/avisos/{alheio}", headers=autenticar(marketing)).status_code == 403
    assert cliente.delete(f"/murais/avisos/{proprio}", headers=autenticar(marketing)).status_code == 204


def test_ger03_marketing_nao_escreve_outros_modulos(cliente: TestClient, marketing: Usuario):
    assert cliente.post("/documentos", headers=autenticar(marketing)).status_code == 403
    assert cliente.post("/duvidas/faq", headers=autenticar(marketing)).status_code == 403
    assert cliente.post("/setores", json={"nome": "X"}, headers=autenticar(marketing)).status_code == 403
    assert cliente.post("/atalhos", headers=autenticar(marketing)).status_code == 403


def test_ger03_admin_setor_nao_edita_aviso_de_marketing_de_outro_setor(
    cliente: TestClient, fabrica: Fabrica, marketing: Usuario
):
    outro_setor = fabrica.setor("Farmácia")
    outro_admin = fabrica.usuario(Papel.admin_setor, outro_setor)
    aviso = _aviso(cliente, marketing).json()["id"]

    resposta = cliente.put(f"/murais/avisos/{aviso}", json={"titulo": "X"}, headers=autenticar(outro_admin))

    assert resposta.status_code == 403
