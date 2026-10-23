"""GER-19 — envio de e-mail (core/correio.py)."""

import io
import json
import logging
from email.message import Message
from urllib.error import HTTPError, URLError
from urllib.request import Request

import pytest
from pydantic import ValidationError

from app.core import correio
from app.core.config import Configuracoes, configuracoes
from tests.apoio import CorreioFalso

EMAIL = correio.Email(
    para="pessoa@example.com",
    assunto="Assunto",
    texto="Texto com link https://intranet.local/ativar-conta#token=abc",
    html="<p>Texto</p>",
)


class RespostaFalsa(io.BytesIO):
    status = 200


@pytest.fixture
def requisicoes(monkeypatch: pytest.MonkeyPatch) -> list[tuple[Request, float]]:
    """Troca o `urlopen` do correio e devolve as requisições feitas, com o timeout de cada uma."""
    monkeypatch.setattr(configuracoes, "resend_chave_api", "re_chave")
    monkeypatch.setattr(configuracoes, "email_remetente", "Intranet <nao-responda@hospital.com.br>")
    feitas: list[tuple[Request, float]] = []

    def urlopen(requisicao: Request, timeout: float) -> RespostaFalsa:
        feitas.append((requisicao, timeout))
        return RespostaFalsa(b'{"id": "123"}')

    monkeypatch.setattr(correio, "urlopen", urlopen)
    return feitas


def _falhar_com(monkeypatch: pytest.MonkeyPatch, falha: Exception) -> None:
    monkeypatch.setattr(configuracoes, "resend_chave_api", "re_chave")

    def urlopen(requisicao: Request, timeout: float) -> None:
        raise falha

    monkeypatch.setattr(correio, "urlopen", urlopen)


def test_ger19_envio_bem_sucedido_retorna_true(correio_falso: CorreioFalso):
    assert correio.enviar_email(EMAIL) is True
    assert correio_falso.enviados == [EMAIL]


def test_ger19_falha_do_provedor_retorna_false_e_avisa_no_log(
    correio_falso: CorreioFalso, caplog: pytest.LogCaptureFixture
):
    correio_falso.indisponivel = True

    with caplog.at_level(logging.WARNING, logger="app.core.correio"):
        assert correio.enviar_email(EMAIL) is False

    assert "pessoa@example.com" in caplog.text


def test_ger19_console_escreve_o_email_no_log(caplog: pytest.LogCaptureFixture):
    with caplog.at_level(logging.WARNING, logger="app.core.correio"):
        correio._entregar_pelo_console(EMAIL)

    assert EMAIL.para in caplog.text
    assert EMAIL.assunto in caplog.text
    assert EMAIL.texto in caplog.text


def test_ger19_resend_faz_post_autenticado_na_api_com_timeout(requisicoes):
    correio._entregar_pelo_resend(EMAIL)

    [(requisicao, timeout)] = requisicoes
    assert requisicao.get_method() == "POST"
    assert requisicao.full_url == "https://api.resend.com/emails"
    assert requisicao.get_header("Authorization") == "Bearer re_chave"
    assert requisicao.get_header("Content-type") == "application/json"
    assert timeout == 10


def test_ger19_resend_envia_texto_e_html_do_remetente_configurado(requisicoes):
    correio._entregar_pelo_resend(EMAIL)

    [(requisicao, _)] = requisicoes
    assert json.loads(requisicao.data) == {
        "from": "Intranet <nao-responda@hospital.com.br>",
        "to": [EMAIL.para],
        "subject": EMAIL.assunto,
        "text": EMAIL.texto,
        "html": EMAIL.html,
    }


@pytest.mark.parametrize(
    "falha",
    [
        HTTPError(
            "https://api.resend.com/emails", 403, "Forbidden", Message(),
            io.BytesIO(b'{"message": "domain is not verified"}'),
        ),
        URLError("nome não resolvido"),
        TimeoutError("sem resposta"),
    ],
    ids=["recusa-da-api", "erro-de-rede", "timeout"],
)
def test_ger19_resend_falha_vira_erro_email(monkeypatch: pytest.MonkeyPatch, falha: Exception):
    _falhar_com(monkeypatch, falha)

    with pytest.raises(correio.ErroEmail):
        correio._entregar_pelo_resend(EMAIL)


def test_ger19_resend_sem_chave_impede_a_api_de_subir():
    with pytest.raises(ValidationError, match="RESEND_API_KEY"):
        Configuracoes(_env_file=None, postgres_password="x", email_provedor="resend", resend_chave_api="")


def test_ger19_padrao_e_o_console():
    configuracoes_padrao = Configuracoes(_env_file=None, postgres_password="x")

    assert configuracoes_padrao.email_provedor == "console"
