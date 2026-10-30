"""Troca e redefinição de senha (USU-07) — docs/specs/usuarios.md."""

import logging
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

import app.main
from app.core import limite_tentativas
from app.core.database import obter_sessao
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
    cliente: TestClient, correio_falso: CorreioFalso, colaborador: Usuario,
    monkeypatch: pytest.MonkeyPatch,
):
    agora = 1000.0
    monkeypatch.setattr(limite_tentativas, "relogio", lambda: agora)
    pedir(cliente, colaborador.email)
    anterior = correio_falso.ultimo_token()
    agora += 5 * 60 + 1  # passa o limite de um pedido a cada 5 min
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


def test_usu07_pedido_nao_toca_o_banco_antes_de_responder(
    cliente: TestClient, correio_falso: CorreioFalso, colaborador: Usuario
):
    # Sem consulta na requisição, o tempo de resposta não depende de a conta existir.
    def sessao_da_requisicao():
        pytest.fail("O pedido usou a sessão da requisição: a conta é procurada antes da resposta")

    app.main.app.dependency_overrides[obter_sessao] = sessao_da_requisicao

    resposta = pedir(cliente, colaborador.email)

    assert resposta.status_code == 202
    assert resposta.json() == MENSAGEM_NEUTRA
    [email] = correio_falso.enviados
    assert email.para == colaborador.email


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


def test_usu07_trocar_senha_invalida_o_link_de_redefinicao_pendente(
    cliente: TestClient, fabrica: Fabrica, comum: Usuario
):
    token = fabrica.link(comum, FinalidadeToken.redefinicao_senha)

    assert trocar(cliente, comum, SENHA_PADRAO).status_code == 200

    assert confirmar(cliente, token, senha="senha-de-quem-pediu").json() == LINK_INVALIDO
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


# Limite de pedidos (USU-07)


def test_usu07_segundo_pedido_em_5_min_e_barrado_sem_enviar(
    cliente: TestClient, correio_falso: CorreioFalso, colaborador: Usuario
):
    assert pedir(cliente, colaborador.email).status_code == 202

    resposta = pedir(cliente, colaborador.email.upper())

    assert resposta.status_code == 429
    assert resposta.json() == {"mensagem": "Muitos pedidos. Tente de novo em alguns minutos."}
    assert 0 < int(resposta.headers["Retry-After"]) <= 5 * 60
    assert len(correio_falso.enviados) == 1


def test_usu07_limite_vale_para_email_sem_conta(cliente: TestClient):
    assert pedir(cliente, "ninguem@example.com").status_code == 202
    assert pedir(cliente, "ninguem@example.com").status_code == 429


def test_usu07_pedido_volta_a_valer_depois_de_5_min(
    cliente: TestClient, correio_falso: CorreioFalso, colaborador: Usuario,
    monkeypatch: pytest.MonkeyPatch,
):
    agora = 1000.0
    monkeypatch.setattr(limite_tentativas, "relogio", lambda: agora)
    pedir(cliente, colaborador.email)

    agora += 5 * 60 + 1

    assert pedir(cliente, colaborador.email).status_code == 202
    assert len(correio_falso.enviados) == 2


def test_ger25_pedido_e_bloqueio_de_redefinicao_vao_para_o_log(
    cliente: TestClient, colaborador: Usuario, caplog: pytest.LogCaptureFixture
):
    with caplog.at_level(logging.INFO, logger="app.seguranca"):
        pedir(cliente, colaborador.email)
        pedir(cliente, colaborador.email)

    assert [r.getMessage() for r in caplog.records if r.name == "app.seguranca"] == [
        f"evento=redefinicao_pedida email={colaborador.email} ip=testclient",
        f"evento=redefinicao_bloqueada email={colaborador.email} ip=testclient",
    ]


# Política de senha (USU-09)

SENHA_COMUM = {"mensagem": "Senha muito comum. Escolha outra."}


@pytest.mark.parametrize("senha", ["12345678", "Password", "senha123", "aaaaaaaa", "HOSPITAL123"])
def test_usu09_troca_recusa_senha_comum(cliente: TestClient, comum: Usuario, senha: str):
    resposta = trocar(cliente, comum, SENHA_PADRAO, senha)

    assert resposta.status_code == 422
    assert resposta.json() == {"campo": "senha_nova", **SENHA_COMUM}
    assert login(cliente, comum.email, SENHA_PADRAO).status_code == 200


def test_usu09_redefinicao_recusa_senha_comum_sem_gastar_o_link(
    cliente: TestClient, fabrica: Fabrica, comum: Usuario
):
    token = fabrica.link(comum, FinalidadeToken.redefinicao_senha)

    resposta = confirmar(cliente, token, "12345678")

    assert resposta.status_code == 422
    assert resposta.json() == {"campo": "senha", **SENHA_COMUM}
    assert confirmar(cliente, token).status_code == 200


def test_usu09_ativacao_recusa_senha_comum(cliente: TestClient, fabrica: Fabrica):
    pendente = fabrica.usuario(pendente=True)
    token = fabrica.link(pendente, FinalidadeToken.convite)

    resposta = cliente.post(
        "/auth/convite/aceitar", json={"token": token, "nome": "Maria", "senha": "senha123"}
    )

    assert resposta.status_code == 422
    assert resposta.json() == {"campo": "senha", **SENHA_COMUM}
