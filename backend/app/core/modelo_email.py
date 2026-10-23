"""Layout HTML comum dos e-mails (GER-19), com a identidade da tela de login.

Cliente de e-mail ignora boa parte do CSS: o Gmail descarta `<style>` em vários casos e o Outlook
renderiza com o motor do Word. Por isso é tudo tabela com estilo inline, e o gradiente bordeaux tem
cor sólida de reserva. Sem imagem: muitos clientes bloqueiam imagem externa por padrão.

Quem chama passa texto puro; o escape é feito aqui.
"""

from html import escape

BORDEAUX = "#800020"
BORDEAUX_ESCURO = "#3b000e"
TEXTO = "#0f172a"
TEXTO_SUAVE = "#64748b"
FONTE = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif"


def html_com_botao(
  *,
  titulo: str,
  resumo: str,
  paragrafos: list[str],
  botao: str,
  link: str,
  observacao: str,
) -> str:
  """E-mail de uma ação só: título, parágrafos, botão para `link` e uma observação em letra menor.

  `resumo` é a prévia que a caixa de entrada mostra ao lado do assunto (não aparece no corpo).
  """
  link = escape(link)
  corpo = "".join(
    f'<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:{TEXTO};">{escape(p)}</p>'
    for p in paragrafos
  )
  return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{escape(titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(resumo)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-collapse:separate;font-family:{FONTE};">
<tr><td style="background-color:{BORDEAUX};background-image:linear-gradient(135deg,#b33951 0%,{BORDEAUX} 45%,{BORDEAUX_ESCURO} 100%);border-radius:16px 16px 0 0;padding:28px 32px;">
<p style="margin:0;font-size:20px;line-height:28px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">Hospital Decós</p>
<p style="margin:2px 0 0;font-size:13px;line-height:20px;color:#f4e1e6;">Intranet</p>
</td></tr>
<tr><td style="background-color:#ffffff;border-radius:0 0 16px 16px;padding:32px;border:1px solid #e2e8f0;border-top:0;">
<h1 style="margin:0 0 20px;font-size:22px;line-height:30px;font-weight:600;color:{TEXTO};">{escape(titulo)}</h1>
{corpo}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td style="background-color:{BORDEAUX};border-radius:10px;">
<a href="{link}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">{escape(botao)}</a>
</td></tr>
</table>
<p style="margin:0 0 24px;font-size:14px;line-height:22px;color:{TEXTO_SUAVE};">{escape(observacao)}</p>
<p style="margin:0;padding-top:20px;border-top:1px solid #e2e8f0;font-size:13px;line-height:20px;color:{TEXTO_SUAVE};">Se o botão não funcionar, copie e cole este endereço no navegador:<br>
<a href="{link}" target="_blank" style="color:{BORDEAUX};word-break:break-all;">{link}</a></p>
</td></tr>
<tr><td align="center" style="padding:20px 16px 0;font-size:12px;line-height:18px;color:{TEXTO_SUAVE};">
Hospital Decós · Uso restrito a colaboradores<br>Este e-mail foi enviado automaticamente; não é preciso respondê-lo.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
"""
