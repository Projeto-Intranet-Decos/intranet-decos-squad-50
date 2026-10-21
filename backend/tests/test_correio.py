"""GER-19 — envio de e-mail (core/correio.py)."""

import logging

import pytest
import urllib3
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


class RespostaFalsa:
    def __init__(self, status: int) -> None:
        self.status = status
        self.data = b"resposta do provedor"


class HttpFalso:
    def __init__(self, status: int = 200, erro: Exception | None = None) -> None:
        self.status = status
        self.erro = erro
        self.chamadas: list[dict] = []

    def request(self, metodo: str, url: str, **kwargs: object) -> RespostaFalsa:
        self.chamadas.append({"metodo": metodo, "url": url, **kwargs})
        if self.erro:
            raise self.erro
        return RespostaFalsa(self.status)


@pytest.fixture
def mailgun(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(configuracoes, "mailgun_api_key", "chave-de-envio")
    monkeypatch.setattr(configuracoes, "mailgun_dominio", "mg.hospital.local")
    monkeypatch.setattr(configuracoes, "mailgun_url_base", "https://api.eu.mailgun.net/")
    monkeypatch.setattr(configuracoes, "email_remetente", "Intranet <nao-responda@mg.hospital.local>")


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


def test_ger19_mailgun_envia_html_e_texto_com_chave_de_envio(
    mailgun: None, monkeypatch: pytest.MonkeyPatch
):
    http = HttpFalso()
    monkeypatch.setattr(correio, "_http", http)

    correio._entregar_pelo_mailgun(EMAIL)

    [chamada] = http.chamadas
    assert chamada["metodo"] == "POST"
    assert chamada["url"] == "https://api.eu.mailgun.net/v3/mg.hospital.local/messages"
    assert chamada["headers"] == urllib3.make_headers(basic_auth="api:chave-de-envio")
    assert chamada["encode_multipart"] is False
    assert chamada["fields"] == {
        "from": "Intranet <nao-responda@mg.hospital.local>",
        "to": EMAIL.para,
        "subject": EMAIL.assunto,
        "text": EMAIL.texto,
        "html": EMAIL.html,
    }


@pytest.mark.parametrize(
    "http",
    [HttpFalso(status=401), HttpFalso(erro=urllib3.exceptions.HTTPError("sem rede"))],
    ids=["status-de-erro", "erro-de-rede"],
)
def test_ger19_mailgun_falha_vira_erro_email(
    mailgun: None, monkeypatch: pytest.MonkeyPatch, http: HttpFalso
):
    monkeypatch.setattr(correio, "_http", http)

    with pytest.raises(correio.ErroEmail):
        correio._entregar_pelo_mailgun(EMAIL)


@pytest.mark.parametrize("faltando", ["mailgun_api_key", "mailgun_dominio"])
def test_ger19_mailgun_sem_configuracao_impede_a_api_de_subir(faltando: str):
    valores = {"mailgun_api_key": "chave", "mailgun_dominio": "mg.hospital.local", faltando: ""}

    with pytest.raises(ValidationError, match=faltando.upper()):
        Configuracoes(_env_file=None, email_provedor="mailgun", **valores)

