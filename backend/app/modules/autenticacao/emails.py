"""Textos dos e-mails do módulo de autenticação (o envio é do core/correio.py, GER-19)."""

from html import escape

from app.core.config import configuracoes
from app.core.correio import Email
from app.modules.usuarios.models import Usuario


def redefinicao_senha(usuario: Usuario, token: str) -> Email:
  """Magic link para criar uma senha nova (USU-07)."""
  # O token vai no fragmento (#), que o navegador não envia ao servidor (AUT-08).
  link = f"{configuracoes.url_frontend.rstrip('/')}/redefinir-senha#token={token}"
  validade = f"{configuracoes.redefinicao_senha_minutos} minutos"
  texto = (
    f"Olá, {usuario.nome}!\n\n"
    "Recebemos um pedido para redefinir a sua senha da Intranet do Hospital. Para criar uma "
    "senha nova, use este link:\n\n"
    f"{link}\n\n"
    f"O link vale por {validade} e só pode ser usado uma vez. Se você não pediu, ignore este "
    "e-mail: a sua senha atual continua valendo.\n"
  )
  html = (
    f"<p>Olá, {escape(usuario.nome)}!</p>"
    "<p>Recebemos um pedido para redefinir a sua senha da Intranet do Hospital.</p>"
    f'<p><a href="{escape(link)}">Criar uma senha nova</a></p>'
    f"<p>O link vale por {validade} e só pode ser usado uma vez. Se você não pediu, ignore este "
    "e-mail: a sua senha atual continua valendo.</p>"
  )
  return Email(
    para=usuario.email,
    assunto="Redefinição de senha da Intranet do Hospital",
    texto=texto,
    html=html,
  )
