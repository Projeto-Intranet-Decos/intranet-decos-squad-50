"""GER-19 — envio de e-mail (core/correio.py)."""

import logging
import smtplib
import ssl

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


class SmtpFalso:
    """Faz o papel de smtplib.SMTP / SMTP_SSL: registra o que a entrega fez com a conexão."""

    def __init__(self, host: str, porta: int, timeout: float, context: ssl.SSLContext | None = None):
        self.host, self.porta, self.timeout, self.contexto = host, porta, timeout, context
        self.chamadas: list[str] = []
        self.enviadas: list = []
        self.falha: Exception | None = None

    def starttls(self, context: ssl.SSLContext) -> None:
        self.chamadas.append("starttls")
        self.contexto = context

    def login(self, usuario: str, senha: str) -> None:
        self.chamadas.append(f"login:{usuario}:{senha}")
        if self.falha:
            raise self.falha

    def send_message(self, mensagem) -> None:
        self.chamadas.append("send_message")
        self.enviadas.append(mensagem)

    def close(self) -> None:
        self.chamadas.append("close")

    def __enter__(self) -> "SmtpFalso":
        return self

    def __exit__(self, *erro: object) -> None:
        self.close()


@pytest.fixture
def smtp(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(configuracoes, "smtp_host", "smtp-relay.brevo.com")
    monkeypatch.setattr(configuracoes, "smtp_usuario", "login@smtp-brevo.com")
    monkeypatch.setattr(configuracoes, "smtp_senha", "chave-smtp")
    monkeypatch.setattr(configuracoes, "email_remetente", "Intranet <nao-responda@hospital.com.br>")


@pytest.fixture
def conexoes(monkeypatch: pytest.MonkeyPatch, smtp: None) -> list[SmtpFalso]:
    """Troca as classes do smtplib e devolve as conexões abertas pela entrega."""
    abertas: list[SmtpFalso] = []

    def fabricar(*args, **kwargs) -> SmtpFalso:
        conexao = SmtpFalso(*args, **kwargs)
        abertas.append(conexao)
        return conexao

    monkeypatch.setattr(correio.smtplib, "SMTP", fabricar)
    monkeypatch.setattr(correio.smtplib, "SMTP_SSL", fabricar)
    return abertas


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


def test_ger19_smtp_na_587_sobe_para_tls_antes_do_login(
    conexoes: list[SmtpFalso], monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(configuracoes, "smtp_porta", 587)

    correio._entregar_por_smtp(EMAIL)

    [conexao] = conexoes
    assert (conexao.host, conexao.porta, conexao.timeout) == ("smtp-relay.brevo.com", 587, 10)
    assert conexao.chamadas == [
        "starttls", "login:login@smtp-brevo.com:chave-smtp", "send_message", "close",
    ]
    assert isinstance(conexao.contexto, ssl.SSLContext)


def test_ger19_smtp_na_465_ja_nasce_em_tls(
    conexoes: list[SmtpFalso], monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setattr(configuracoes, "smtp_porta", 465)

    correio._entregar_por_smtp(EMAIL)

    [conexao] = conexoes
    assert conexao.porta == 465
    assert isinstance(conexao.contexto, ssl.SSLContext)
    assert "starttls" not in conexao.chamadas
    assert conexao.chamadas[0] == "login:login@smtp-brevo.com:chave-smtp"


def test_ger19_smtp_envia_texto_e_html_do_remetente_configurado(conexoes: list[SmtpFalso]):
    correio._entregar_por_smtp(EMAIL)

    [mensagem] = conexoes[0].enviadas
    assert mensagem["From"] == "Intranet <nao-responda@hospital.com.br>"
    assert mensagem["To"] == EMAIL.para
    assert mensagem["Subject"] == EMAIL.assunto
    assert mensagem.get_body(("plain",)).get_content().strip() == EMAIL.texto
    assert mensagem.get_body(("html",)).get_content().strip() == EMAIL.html


@pytest.mark.parametrize(
    "falha",
    [smtplib.SMTPAuthenticationError(535, b"auth failed"), TimeoutError("sem resposta")],
    ids=["recusa-do-servidor", "erro-de-rede"],
)
def test_ger19_smtp_falha_vira_erro_email(conexoes: list[SmtpFalso], falha: Exception, monkeypatch):
    original = correio.smtplib.SMTP

    def com_falha(*args, **kwargs) -> SmtpFalso:
        conexao = original(*args, **kwargs)
        conexao.falha = falha
        return conexao

    monkeypatch.setattr(correio.smtplib, "SMTP", com_falha)

    with pytest.raises(correio.ErroEmail):
        correio._entregar_por_smtp(EMAIL)


def test_ger19_smtp_sem_conseguir_conectar_vira_erro_email(smtp: None, monkeypatch: pytest.MonkeyPatch):
    def recusar(*args, **kwargs):
        raise ConnectionRefusedError("porta fechada")

    monkeypatch.setattr(correio.smtplib, "SMTP", recusar)

    with pytest.raises(correio.ErroEmail):
        correio._entregar_por_smtp(EMAIL)


@pytest.mark.parametrize("faltando", ["smtp_host", "smtp_usuario", "smtp_senha"])
def test_ger19_smtp_sem_configuracao_impede_a_api_de_subir(faltando: str):
    valores = {"smtp_host": "smtp-relay.brevo.com", "smtp_usuario": "login", "smtp_senha": "chave"}
    valores[faltando] = ""

    with pytest.raises(ValidationError, match=faltando.upper()):
        Configuracoes(_env_file=None, postgres_password="x", email_provedor="smtp", **valores)


def test_ger19_padrao_aponta_para_a_brevo():
    configuracoes_padrao = Configuracoes(_env_file=None, postgres_password="x")

    assert (configuracoes_padrao.smtp_host, configuracoes_padrao.smtp_porta) == ("smtp-relay.brevo.com", 587)
    assert configuracoes_padrao.email_provedor == "console"
