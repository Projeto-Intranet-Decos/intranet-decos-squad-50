# Auditoria OWASP Top 10 (2025)

Levantamento de 2026-10-30 sobre a `main` em `ba1f43b`, e correção das pendências na branch
`feature/geral/seguranca-owasp-top10` (plano em
[`superpowers/plans/2026-10-30-endurecimento-owasp.md`](./superpowers/plans/2026-10-30-endurecimento-owasp.md)).

As sondagens ficam em [`backend/tests/test_sondagem_owasp.py`](../backend/tests/test_sondagem_owasp.py):
cada teste afirma o comportamento seguro. Pendência aberta fica marcada `xfail(strict=True)`; quando
alguém corrigir, o `XPASS` avisa para tirar a marca. Hoje não resta nenhuma. Os critérios novos têm ID
e teste no módulo, como manda o fluxo do `CLAUDE.md`.

Rodar: `docker compose up -d banco` e, em `backend/`, `.venv/bin/pytest tests/test_sondagem_owasp.py -rx`.

Legenda: ✅ controle presente · 🟡 risco aceito/decisão registrada.

## Por categoria

| Categoria | Situação | Onde está a regra |
|---|---|---|
| **A01** Controle de acesso | ✅ papéis e escopo por setor; ✅ superadmin não se desativa nem se rebaixa; ✅ aniversariantes visíveis ao visitante por decisão do time; 🟡 metadados de documentos legíveis por visitante | GER-03, GER-04, USU-03, USU-04, AUT-10 |
| **A02** Configuração | ✅ `/docs` só com `API_DOCS=true`; ✅ headers na API e no nginx (CSP, HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy), `server_tokens off`; ✅ `JWT_SECRET` fraco impede a subida; ✅ compose expõe só o nginx | GER-13, GER-23, GER-24 |
| **A03** Cadeia de suprimentos | ✅ `pip-audit` e `npm audit` limpos; ✅ CI com auditoria; ✅ Dependabot; ✅ imagens e Actions fixadas | GER-26 |
| **A04** Criptografia | ✅ argon2; ✅ tokens só como hash; ✅ JWT com algoritmo fixo; ✅ refresh token em cookie HttpOnly, access token só em memória | AUT-03, AUT-07 |
| **A05** Injeção | ✅ só ORM; ✅ tipo servido pela extensão + `nosniff`; ✅ atalhos só `http(s)`; ✅ e-mails escapados; ✅ log técnico não deixa quebrar a linha | GER-06, ATA, GER-22, GER-25 |
| **A06** Design inseguro | ✅ limite de tentativas no login e na redefinição (por e-mail); ✅ lista de senhas comuns; ✅ upload confere a assinatura do arquivo | AUT-11, USU-07, USU-09, GER-06 |
| **A07** Autenticação | ✅ tempo do login igual com ou sem conta; ✅ logout revoga a sessão inteira; ✅ rotação com detecção de reuso; ✅ e-mail sem diferença de maiúsculas | AUT-01, AUT-02, AUT-06, USU-02 |
| **A08** Integridade | ✅ CI obrigatório antes do merge (falta ligar a proteção de branch, abaixo); ✅ imagens por digest | GER-26 |
| **A09** Log e alerta | ✅ auditoria de escrita; ✅ log técnico de login, bloqueio, redefinição, 403 e reuso de refresh | GER-10, GER-25 |
| **A10** Condições excepcionais | ✅ falha fechada no token; ✅ `500` no contrato `{mensagem}`, sem detalhe | GER-02, GER-05 |

## As 17 pendências

| # | Pendência | Feito | Commit |
|---|---|---|---|
| 1 | Dependências com CVE | pyjwt, urllib3, certifi, dnspython; `npm audit fix` | `61391f2` |
| 2 | `/docs` aberto | só com `API_DOCS=true` | `b363401` |
| 3 | `JWT_SECRET` fraco | ≥ 32 bytes e ≠ exemplo, senão a API não sobe | `b363401` |
| 4 | Headers de segurança | middleware na API + snippet no nginx | `b363401` |
| 5 | Enumeração pelo tempo do login | hash fictício quando não há conta | `fe5a876` |
| 6 | Sem logout | `POST /auth/logout` revoga a sessão inteira | `5dea2a5` |
| 7 | E-mail com maiúsculas | minúsculas no schema + migration + `CHECK` | `fe5a876` |
| 8 | Sem rate limit | login 5/15 min e redefinição 1/5 min, por e-mail | `fe5a876` |
| 9 | Sem log de segurança | logger `app.seguranca` | `fe5a876` |
| 10 | `500` fora do contrato | handler de `Exception` | `b363401` |
| 11 | Superadmin se desativa | `409` ao desativar ou rebaixar a si mesmo | `fe5a876` |
| 12 | Senhas triviais | lista de senhas comuns + caractere único | `fe5a876` |
| 13 | Sem CI | workflow + Dependabot | `f241bb0` |
| 14 | Portas do compose | banco, MinIO e API em `127.0.0.1` | `b363401` |
| 15 | Refresh sem rotação | rotação + detecção de reuso (30 s) | `5dea2a5` |
| 16 | Upload só pela extensão | assinatura do formato | `5e99d66` |
| 17 | Tokens no `localStorage` | cookie HttpOnly + access token em memória | `5dea2a5` |

## Decisões tomadas no caminho

- **Limite por e-mail, não por IP.** No hospital todos os postos saem pelo mesmo NAT; um limite por
  IP bloquearia todo mundo por causa de uma pessoa. Por isso o `--forwarded-allow-ips='*'` do
  uvicorn ficou: o IP só aparece no log, nenhuma regra depende dele.
- **Contador em memória.** A API roda com um worker; reiniciar zera os contadores. Se um dia houver
  mais de um processo, o contador precisa ir para o banco.
- **`COOKIE_SECURE`.** Ligado por padrão. Se a intranet for servida em HTTP puro por IP da rede
  interna, o navegador não guarda cookie `Secure`: nesse caso, `COOKIE_SECURE=false` (e o ideal é
  pôr HTTPS).
- **Duas regras que estavam `❓`** foram decididas aqui, a pedido: limite da redefinição (USU-07)
  e autodesativação do superadmin (USU-04). Vale revisar com o time.

## Verificação

- Backend: 321 testes passando. Frontend: 153 testes, lint, type-check e build.
- Ponta a ponta, num Chromium de verdade contra nginx + API: visitante não chama a renovação;
  login com e-mail em maiúsculas; `localStorage` só com o marcador; cookie `HttpOnly`/`Secure`/
  `SameSite=Strict` invisível ao JS; F5 e segunda aba logadas, com rotação; sair numa aba derruba a
  outra; cookie revogado responde `401`; bloqueio de tentativas aparece no login; pré-visualização
  por `blob:` (PDF, texto, imagem) sem violação de CSP; nenhum erro no console. Esse teste achou
  um bug real (o logout deixava renovar um token trocado há menos de 30 s), corrigido no `5dea2a5`.

## O que fica para o time

- **Proteção de branch** na `main` e na `homolog` exigindo o CI verde: é configuração do GitHub,
  não código.
- **Risco aceito do AUT-10**: metadados de documentos legíveis sem login. Rever se a API sair da
  rede interna. Os aniversariantes não entram aqui: o visitante vê a lista por decisão do time.
- **Alerta**: os eventos já saem no log com `evento=…`; falta a regra na plataforma (ex: alertar
  com muitos `login_bloqueado` ou qualquer `refresh_reutilizado`).
- **Credencial root do MinIO** no backend (dívida já registrada na arquitetura).
