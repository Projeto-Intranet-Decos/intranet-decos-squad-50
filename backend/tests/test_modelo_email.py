"""GER-19 — layout HTML comum dos e-mails (core/modelo_email.py)."""

import pytest

from app.core.modelo_email import html_com_botao
from app.modules.autenticacao.emails import redefinicao_senha
from app.modules.usuarios.emails import convite
from app.modules.usuarios.models import Usuario

LINK = "https://intranet.local/ativar-conta#token=abc&x=1"


def _html(**alteracoes: object) -> str:
    argumentos = {
        "titulo": "Ative sua conta",
        "resumo": "Seu convite chegou",
        "paragrafos": ["Olá, Ana!", "Clique no botão."],
        "botao": "Ativar minha conta",
        "link": LINK,
        "observacao": "O link vale por 72 horas.",
    }
    return html_com_botao(**(argumentos | alteracoes))


def test_ger19_layout_traz_marca_titulo_botao_link_por_extenso_e_rodape():
    html = _html()

    assert "Hospital Decós" in html
    assert "Ative sua conta" in html
    assert "Ativar minha conta" in html
    # No href do botão e, por extenso, no href e no texto do link de reserva; sempre escapado.
    assert html.count("https://intranet.local/ativar-conta#token=abc&amp;x=1") == 3
    assert "O link vale por 72 horas." in html
    assert "Uso restrito a colaboradores" in html


def test_ger19_layout_escapa_o_texto():
    html = _html(paragrafos=["Olá, <script>alert(1)</script>!"])

    assert "<script>" not in html
    assert "&lt;script&gt;" in html


def test_ger19_layout_so_tem_estilo_inline_e_nenhuma_imagem():
    html = _html()

    assert "<style" not in html
    assert "<img" not in html


@pytest.mark.parametrize(
    "montar", [convite, redefinicao_senha], ids=["convite", "redefinicao-senha"]
)
def test_ger19_emails_de_acesso_usam_o_layout_e_escapam_o_nome(montar):
    usuario = Usuario(nome="Ana <b>Souza</b>", email="ana@example.com")

    email = montar(usuario, "tok")

    assert "Uso restrito a colaboradores" in email.html
    assert "Ana &lt;b&gt;Souza&lt;/b&gt;" in email.html
    assert email.html.count("#token=tok") == 3
