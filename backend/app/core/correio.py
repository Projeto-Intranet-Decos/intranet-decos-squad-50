"""Envio de e-mail compartilhado entre os módulos (GER-19).

Não sabe nada de domínio: quem chama monta o `Email` (os textos ficam no módulo dono). O provedor
vem de `EMAIL_PROVEDOR`: `console` escreve o e-mail no log, `smtp` envia por SMTP com TLS (Brevo,
ou qualquer servidor configurado em `SMTP_*`).

Banco e provedor não compartilham transação: chame `enviar_email` só depois do commit. A falha
não desfaz nada, vira `logger.warning` e o retorno `False`, para quem chamou avisar o usuário.
"""

import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage

from app.core.config import configuracoes

logger = logging.getLogger(__name__)

TIMEOUT_SEGUNDOS = 10
# Na 465 a conexão já nasce em TLS; nas outras (587) sobe para TLS com STARTTLS.
PORTA_TLS_DIRETO = 465


@dataclass(frozen=True)
class Email:
  para: str
  assunto: str
  texto: str
  html: str


class ErroEmail(Exception):
  """O provedor recusou o e-mail ou não respondeu."""


def enviar_email(email: Email) -> bool:
  """Devolve se o e-mail saiu; nunca levanta."""
  try:
    _entregar(email)
  except ErroEmail:
    logger.warning("E-mail não enviado para %s: %s", email.para, email.assunto, exc_info=True)
    return False
  return True


def _entregar(email: Email) -> None:
  if configuracoes.email_provedor == "smtp":
    _entregar_por_smtp(email)
  else:
    _entregar_pelo_console(email)


def _entregar_pelo_console(email: Email) -> None:
  # warning, e não info: o app não configura logging, e só warning aparece no console por padrão.
  logger.warning(
    "EMAIL_PROVEDOR=console, e-mail não enviado.\nPara: %s\nAssunto: %s\n\n%s",
    email.para,
    email.assunto,
    email.texto,
  )


def _montar_mensagem(email: Email) -> EmailMessage:
  mensagem = EmailMessage()
  mensagem["From"] = configuracoes.email_remetente
  mensagem["To"] = email.para
  mensagem["Subject"] = email.assunto
  # Texto puro primeiro: é o que aparece em cliente que não mostra HTML.
  mensagem.set_content(email.texto)
  mensagem.add_alternative(email.html, subtype="html")
  return mensagem


def _conectar_smtp() -> smtplib.SMTP:
  """Abre a conexão já em TLS: nunca há login em texto aberto."""
  contexto = ssl.create_default_context()
  host, porta = configuracoes.smtp_host, configuracoes.smtp_porta
  if porta == PORTA_TLS_DIRETO:
    return smtplib.SMTP_SSL(host, porta, timeout=TIMEOUT_SEGUNDOS, context=contexto)
  conexao = smtplib.SMTP(host, porta, timeout=TIMEOUT_SEGUNDOS)
  try:
    conexao.starttls(context=contexto)
  except BaseException:
    conexao.close()
    raise
  return conexao


def _entregar_por_smtp(email: Email) -> None:
  try:
    with _conectar_smtp() as conexao:
      conexao.login(configuracoes.smtp_usuario, configuracoes.smtp_senha)
      conexao.send_message(_montar_mensagem(email))
  # OSError cobre recusa de conexão, DNS e timeout; SMTPException, as recusas do servidor.
  except (smtplib.SMTPException, OSError) as erro:
    raise ErroEmail(f"SMTP {configuracoes.smtp_host}:{configuracoes.smtp_porta}: {erro}") from erro
