"""Convite por magic link (AUT-01, AUT-08, AUT-09) — docs/specs/autenticacao.md."""

from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import hash_token
from app.modules.autenticacao.models import FinalidadeToken, TokenUsoUnico
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Papel, Usuario
from tests.apoio import CorreioFalso, Fabrica, autenticar, refresh_do_cookie, refresh_vale

LINK_INVALIDO = {"mensagem": "Link inválido ou expirado"}
SENHA_NOVA = "senha-nova-123"


def aceitar(cliente: TestClient, token: str, **dados: object):
    return cliente.post(
        "/auth/convite/aceitar",
        json={"token": token, "senha": SENHA_NOVA, "nome": "Maria Silva", **dados},
    )


def verificar(cliente: TestClient, token: str):
    return cliente.post("/auth/convite/verificar", json={"token": token})


def test_aut01_usuario_pendente_nao_faz_login(cliente: TestClient, fabrica: Fabrica):
    pendente = fabrica.usuario(pendente=True)

    resposta = cliente.post("/auth/login", json={"email": pendente.email, "senha": "qualquer-senha"})

    assert resposta.status_code == 401
    assert resposta.json() == {"mensagem": "Email ou senha invalidos"}


def test_aut08_token_guardado_so_como_hash(
    cliente: TestClient, sessao: Session, correio_falso: CorreioFalso, superadmin: Usuario
):
    cliente.post(
        "/usuarios", json={"nome": "Maria", "email": "maria@example.com"}, headers=autenticar(superadmin)
    )
    token = correio_falso.ultimo_token()

    [link] = sessao.query(TokenUsoUnico).all()
    assert link.token_hash == hash_token(token)
    assert token not in link.token_hash


@pytest.mark.parametrize(
    "caso", ["inexistente", "expirado", "usado", "outra_finalidade", "usuario_desativado"]
)
def test_aut08_link_invalido_responde_400_com_a_mesma_mensagem(
    cliente: TestClient, fabrica: Fabrica, caso: str
):
    pendente = fabrica.usuario(pendente=True, ativo=caso != "usuario_desativado")
    token = {
        "inexistente": lambda: "token-que-nao-existe",
        "expirado": lambda: fabrica.link(pendente, expira_em=datetime.now(UTC) - timedelta(seconds=1)),
        "usado": lambda: fabrica.link(pendente, usado=True),
        "outra_finalidade": lambda: fabrica.link(pendente, FinalidadeToken.redefinicao_senha),
        "usuario_desativado": lambda: fabrica.link(pendente),
    }[caso]()

    for resposta in (verificar(cliente, token), aceitar(cliente, token)):
        assert resposta.status_code == 400
        assert resposta.json() == LINK_INVALIDO


def test_aut08_verificar_nao_consome_e_aceitar_consome(cliente: TestClient, fabrica: Fabrica):
    token = fabrica.link(fabrica.usuario(pendente=True))

    assert verificar(cliente, token).status_code == 200
    assert verificar(cliente, token).status_code == 200
    assert aceitar(cliente, token).status_code == 200

    segunda_vez = aceitar(cliente, token)
    assert segunda_vez.status_code == 400
    assert segunda_vez.json() == LINK_INVALIDO
    assert verificar(cliente, token).status_code == 400


def test_aut08_confirmacao_com_422_mantem_o_token(cliente: TestClient, fabrica: Fabrica):
    token = fabrica.link(fabrica.usuario(pendente=True))

    resposta = aceitar(cliente, token, senha="curta")

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == "senha"
    assert aceitar(cliente, token).status_code == 200


def test_aut09_verificar_devolve_os_dados_do_convite(cliente: TestClient, fabrica: Fabrica):
    pendente = fabrica.usuario(
        pendente=True, nome="Nome Provisório", data_nascimento=date(1990, 5, 17)
    )
    token = fabrica.link(pendente)

    resposta = verificar(cliente, token)

    assert resposta.status_code == 200
    assert resposta.json() == {
        "email": pendente.email,
        "nome": "Nome Provisório",
        "data_nascimento": "1990-05-17",
    }


def test_aut09_aceitar_ativa_a_conta_e_ja_entra_logado(
    cliente: TestClient, fabrica: Fabrica, setor: Setor
):
    pendente = fabrica.usuario(Papel.comum, setor, pendente=True)
    token = fabrica.link(pendente)

    resposta = aceitar(
        cliente,
        token,
        nome="  Maria Silva  ",
        data_nascimento="1991-02-03",
        email="outro@example.com",
        role="superadmin",
        setor_id=None,
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["token_type"] == "bearer"
    assert corpo["access_token"] and "refresh_token" not in corpo
    assert corpo["usuario"]["nome"] == "Maria Silva"
    assert corpo["usuario"]["data_nascimento"] == "1991-02-03"
    assert corpo["usuario"]["convite_pendente"] is False
    # E-mail, papel e setor vêm do convite e são ignorados no corpo.
    assert corpo["usuario"]["email"] == pendente.email
    assert corpo["usuario"]["role"] == "comum"
    assert corpo["usuario"]["setor_id"] == str(setor.id)
    assert refresh_vale(cliente, refresh_do_cookie(resposta))
    login = cliente.post("/auth/login", json={"email": pendente.email, "senha": SENHA_NOVA})
    assert login.status_code == 200


@pytest.mark.parametrize(("campo", "valor"), [("senha", "1234567"), ("nome", "   ")])
def test_aut09_dados_invalidos_respondem_422_com_o_campo(
    cliente: TestClient, fabrica: Fabrica, campo: str, valor: str
):
    token = fabrica.link(fabrica.usuario(pendente=True))

    resposta = aceitar(cliente, token, **{campo: valor})

    assert resposta.status_code == 422
    assert resposta.json()["campo"] == campo


def test_aut09_fluxo_completo_do_cadastro_ao_login(
    cliente: TestClient, correio_falso: CorreioFalso, superadmin: Usuario
):
    cliente.post(
        "/usuarios",
        json={"nome": "Maria", "email": "maria@example.com"},
        headers=autenticar(superadmin),
    )
    token = correio_falso.ultimo_token()

    assert verificar(cliente, token).json()["email"] == "maria@example.com"
    assert aceitar(cliente, token).status_code == 200
    login = cliente.post("/auth/login", json={"email": "maria@example.com", "senha": SENHA_NOVA})
    assert login.status_code == 200
