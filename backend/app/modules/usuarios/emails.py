"""Textos dos e-mails do módulo de usuários (o envio é do core/correio.py, GER-19)."""

from html import escape

from app.core.config import configuracoes
from app.core.correio import Email
from app.modules.usuarios.models import Usuario


def convite(usuario: Usuario, token: str) -> Email:
  """Convite com o magic link de ativação da conta (USU-02, AUT-09)."""
  # O token vai no fragmento (#), que o navegador não envia ao servidor (AUT-08).
  link = f"{configuracoes.url_frontend.rstrip('/')}/ativar-conta#token={token}"
  validade = f"{configuracoes.convite_horas} horas"
  texto = (
    f"Olá, {usuario.nome}!\n\n"
    "Você recebeu um convite para acessar a Intranet do Hospital. Para ativar sua conta, "
    "crie sua senha e confira seus dados neste link:\n\n"
    f"{link}\n\n"
    f"O link vale por {validade} e só pode ser usado uma vez. Se você não esperava este "
    "convite, ignore este e-mail.\n"
  )
  html = (
    f"<p>Olá, {escape(usuario.nome)}!</p>"
    "<p>Você recebeu um convite para acessar a Intranet do Hospital. Para ativar sua conta, "
    "crie sua senha e confira seus dados:</p>"
    f'<p><a href="{escape(link)}">Ativar minha conta</a></p>'
    f"<p>O link vale por {validade} e só pode ser usado uma vez. Se você não esperava este "
    "convite, ignore este e-mail.</p>"
  )
  return Email(
    para=usuario.email,
    assunto="Seu acesso à Intranet do Hospital",
    texto=texto,
    html=html,
  )
