"""Envio de e-mail compartilhado entre os módulos (GER-22).

Não sabe nada de domínio: quem chama monta o `Email` (os textos ficam no módulo dono). O provedor
vem de `EMAIL_PROVIDER`: `console` escreve o e-mail no log, `resend` envia pela API do Resend.

Banco e provedor não compartilham transação: chame `enviar_email` só depois do commit. A falha
não desfaz nada, vira `logger.warning` e o retorno `False`, para quem chamou avisar o usuário.
"""

import json
import logging
from dataclasses import dataclass
from http.client import HTTPException
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app.core.config import configuracoes

logger = logging.getLogger(__name__)

URL_API_RESEND = "https://api.resend.com/emails"
TIMEOUT_SEGUNDOS = 10


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
  if configuracoes.email_provedor == "resend":
    _entregar_pelo_resend(email)
  else:
    _entregar_pelo_console(email)


def _entregar_pelo_console(email: Email) -> None:
  # warning, e não info: o app não configura logging, e só warning aparece no console por padrão.
  logger.warning(
    "EMAIL_PROVIDER=console, e-mail não enviado.\nPara: %s\nAssunto: %s\n\n%s",
    email.para,
    email.assunto,
    email.texto,
  )


def _entregar_pelo_resend(email: Email) -> None:
  corpo = {
    "from": configuracoes.email_remetente,
    "to": [email.para],
    "subject": email.assunto,
    "text": email.texto,
    "html": email.html,
  }
  requisicao = Request(
    URL_API_RESEND,
    data=json.dumps(corpo).encode(),
    method="POST",
    headers={
      "Authorization": f"Bearer {configuracoes.resend_chave_api}",
      "Content-Type": "application/json",
      # O User-Agent padrão do urllib ("Python-urllib/x.y") pode ser bloqueado pela API.
      "User-Agent": "intranet-hospital",
    },
  )
  try:
    with urlopen(requisicao, timeout=TIMEOUT_SEGUNDOS):
      pass
  except HTTPError as erro:
    raise ErroEmail(f"Resend respondeu {erro.code}: {erro.read().decode(errors='replace')}") from erro
  # OSError cobre recusa de conexão, DNS e timeout.
  except (OSError, HTTPException) as erro:
    raise ErroEmail(f"Resend: {erro}") from erro
