"""Envio de e-mail compartilhado entre os módulos (GER-19).

Não sabe nada de domínio: quem chama monta o `Email` (os textos ficam no módulo dono). O provedor
vem de `EMAIL_PROVEDOR`: `console` escreve o e-mail no log, `mailgun` envia pela API HTTP.

Banco e provedor não compartilham transação: chame `enviar_email` só depois do commit. A falha
não desfaz nada, vira `logger.warning` e o retorno `False`, para quem chamou avisar o usuário.
"""

import logging
from dataclasses import dataclass

import urllib3

from app.core.config import configuracoes

logger = logging.getLogger(__name__)

TIMEOUT_SEGUNDOS = 10

# Sem retry: um reenvio automático depois de timeout pode duplicar o e-mail.
_http = urllib3.PoolManager(timeout=urllib3.Timeout(total=TIMEOUT_SEGUNDOS), retries=False)


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
  if configuracoes.email_provedor == "mailgun":
    _entregar_pelo_mailgun(email)
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


def _entregar_pelo_mailgun(email: Email) -> None:
  url = (
    f"{configuracoes.mailgun_url_base.rstrip('/')}/v3/{configuracoes.mailgun_dominio}/messages"
  )
  try:
    resposta = _http.request(
      "POST",
      url,
      fields={
        "from": configuracoes.email_remetente,
        "to": email.para,
        "subject": email.assunto,
        "text": email.texto,
        "html": email.html,
      },
      encode_multipart=False,
      headers=urllib3.make_headers(basic_auth=f"api:{configuracoes.mailgun_api_key}"),
    )
  except urllib3.exceptions.HTTPError as erro:
    raise ErroEmail(f"Mailgun não respondeu: {erro}") from erro
  if resposta.status >= 300:
    raise ErroEmail(f"Mailgun respondeu {resposta.status}: {resposta.data[:200]!r}")
