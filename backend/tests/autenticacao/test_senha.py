"""Troca e redefinição de senha (USU-07) — docs/specs/usuarios.md."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_token
from app.modules.autenticacao.models import FinalidadeToken, TokenUsoUnico
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Papel, Usuario
from tests.apoio import SENHA_PADRAO, CorreioFalso, Fabrica, autenticar

MENSAGEM_NEUTRA = {"mensagem": "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha."}
LINK_INVALIDO = {"mensagem": "Link inválido ou expirado"}
SENHA_NOVA = "senha-nova-123"


def pedir(cliente: TestClient, email: str):
    return cliente.post("/auth/redefinicao-senha", json={"email": email})


def confirmar(cliente: TestClient, token: str, senha: str = SENHA_NOVA):
    return cliente.post("/auth/redefinicao-senha/confirmar", json={"token": token, "senha": senha})


def login(cliente: TestClient, email: str, senha: str):
    return cliente.post("/auth/login", json={"email": email, "senha": senha})


def refresh_vale(cliente: TestClient, refresh_token: str) -> bool:
    return cliente.post("/auth/refresh", json={"refresh_token": refresh_token}).status_code == 200


# Esqueci minha senha


@pytest.fixture
def colaborador(fabrica: Fabrica, setor: Setor) -> Usuario:
    # O pedido valida o e-mail; o `comum` da fábrica usa um domínio .local, que o validador recusa.
    return fabrica.usuario(Papel.comum, setor, email="colaborador@example.com")


def test_usu07_pedido_envia_link_de_redefinicao(
    cliente: TestClient, sessao: Session, correio_falso: CorreioFalso, colaborador: Usuario
):
    resposta = pedir(cliente, colaborador.email)

    assert resposta.status_code == 202
    assert resposta.json() == MENSAGEM_NEUTRA
    [email] = correio_falso.enviados
    assert email.para == colaborador.email
    assert colaborador.nome in email.texto and colaborador.nome in email.html
    assert "/redefinir-senha#token=" in email.texto and "/redefinir-senha#token=" in email.html
    assert "60 minutos" in email.texto
    assert "ignore" in email.texto
    link = sessao.query(TokenUsoUnico).filter_by(token_hash=hash_token(correio_falso.ultimo_token())).one()
    assert link.finalidade == FinalidadeToken.redefinicao_senha
    assert abs(link.expira_em - (datetime.now(UTC) + timedelta(minutes=60))) < timedelta(minutes=1)


@pytest.mark.parametrize("caso", ["inexistente", "desativado", "pendente"])
def test_usu07_pedido_sem_conta_valida_responde_igual_e_nao_envia(
    cliente: TestClient, fabrica: Fabrica, correio_falso: CorreioFalso, caso: str
):
    email = {
        "inexistente": lambda: "ninguem@example.com",
        "desativado": lambda: fabrica.usuario(email="desativado@example.com", ativo=False).email,
        "pendente": lambda: fabrica.usuario(email="pendente@example.com", pendente=True).email,
    }[caso]()

    resposta = pedir(cliente, email)

    assert resposta.status_code == 202
    assert resposta.json() == MENSAGEM_NEUTRA
    assert correio_falso.enviados == []


def test_usu07_pedido_novo_invalida_o_link_anterior(
    cliente: TestClient, correio_falso: CorreioFalso, colaborador: Usuario
):
    pedir(cliente, colaborador.email)
    anterior = correio_falso.ultimo_token()
    pedir(cliente, colaborador.email)
    atual = correio_falso.ultimo_token()

    assert confirmar(cliente, anterior).json() == LINK_INVALIDO
    assert confirmar(cliente, atual).status_code == 200


def test_usu07_falha_no_envio_nao_muda_a_resposta(
    cliente: TestClient, correio_falso: CorreioFalso, colaborador: Usuario
):
    correio_falso.indisponivel = True

    resposta = pedir(cliente, colaborador.email)

    assert resposta.status_code == 202
    assert resposta.json() == MENSAGEM_NEUTRA


def test_usu07_pedido_com_email_invalido_responde_422(cliente: TestClient):
    resposta = pedir(cliente, "nao-e-email")

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "email"


# Verificar e confirmar o link


def test_usu07_verificar_devolve_o_email_sem_consumir(cliente: TestClient, fabrica: Fabrica, comum: Usuario):
    token = fabrica.link(comum, FinalidadeToken.redefinicao_senha)

    for _ in range(2):
        resposta = cliente.post("/auth/redefinicao-senha/verificar", json={"token": token})
        assert resposta.status_code == 200
        assert resposta.json() == {"email": comum.email}


def test_usu07_verificar_com_link_de_convite_responde_400(cliente: TestClient, fabrica: Fabrica):
    token = fabrica.link(fabrica.usuario(pendente=True), FinalidadeToken.convite)

    resposta = cliente.post("/auth/redefinicao-senha/verificar", json={"token": token})

    assert resposta.status_code == 400
    assert resposta.json() == LINK_INVALIDO


def test_usu07_confirmar_troca_a_senha_encerra_sessoes_e_entra(
    cliente: TestClient, fabrica: Fabrica, comum: Usuario
):
    sessao_antiga = login(cliente, comum.email, SENHA_PADRAO).json()["refresh_token"]
    token = fabrica.link(comum, FinalidadeToken.redefinicao_senha)

    resposta = confirmar(cliente, token)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["usuario"]["id"] == str(comum.id)
    assert refresh_vale(cliente, corpo["refresh_token"])
    assert not refresh_vale(cliente, sessao_antiga)
    assert login(cliente, comum.email, SENHA_PADRAO).status_code == 401
    assert login(cliente, comum.email, SENHA_NOVA).status_code == 200
    assert confirmar(cliente, token).json() == LINK_INVALIDO


def test_usu07_confirmar_com_senha_curta_mantem_o_token(cliente: TestClient, fabrica: Fabrica, comum: Usuario):
    token = fabrica.link(comum, FinalidadeToken.redefinicao_senha)

    resposta = confirmar(cliente, token, senha="curta")

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "senha"
    assert confirmar(cliente, token).status_code == 200


def test_usu07_confirmar_com_link_invalido_responde_400(cliente: TestClient):
    resposta = confirmar(cliente, "token-que-nao-existe")

    assert resposta.status_code == 400
    assert resposta.json() == LINK_INVALIDO


# Trocar senha logado


def trocar(cliente: TestClient, usuario: Usuario, senha_atual: str, senha_nova: str = SENHA_NOVA):
    return cliente.put(
        "/auth/senha",
        json={"senha_atual": senha_atual, "senha_nova": senha_nova},
        headers=autenticar(usuario),
    )


def test_usu07_trocar_senha_logado_revoga_sessoes_e_devolve_tokens_novos(
    cliente: TestClient, comum: Usuario
):
    sessao_antiga = login(cliente, comum.email, SENHA_PADRAO).json()["refresh_token"]

    resposta = trocar(cliente, comum, SENHA_PADRAO)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["usuario"]["id"] == str(comum.id)
    assert refresh_vale(cliente, corpo["refresh_token"])
    assert not refresh_vale(cliente, sessao_antiga)
    assert login(cliente, comum.email, SENHA_NOVA).status_code == 200


def test_usu07_trocar_com_senha_atual_errada_responde_400_no_campo(cliente: TestClient, comum: Usuario):
    resposta = trocar(cliente, comum, "senha-errada")

    assert resposta.status_code == 400
    assert resposta.json() == {"campo": "senha_atual", "mensagem": "Senha atual incorreta"}
    assert login(cliente, comum.email, SENHA_PADRAO).status_code == 200


def test_usu07_trocar_com_senha_nova_curta_responde_422(cliente: TestClient, comum: Usuario):
    resposta = trocar(cliente, comum, SENHA_PADRAO, senha_nova="curta")

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "senha_nova"


def test_usu07_trocar_exige_login(cliente: TestClient):
    resposta = cliente.put("/auth/senha", json={"senha_atual": "x", "senha_nova": SENHA_NOVA})

    assert resposta.status_code == 401


def test_usu07_desativado_com_token_ainda_valido_nao_troca(cliente: TestClient, fabrica: Fabrica):
    desativado = fabrica.usuario(email="desativado@example.com", ativo=False)

    resposta = trocar(cliente, desativado, SENHA_PADRAO)

    assert resposta.status_code == 401
    assert login(cliente, desativado.email, SENHA_NOVA).status_code == 401
