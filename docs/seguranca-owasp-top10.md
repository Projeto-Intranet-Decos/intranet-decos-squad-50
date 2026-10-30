# Auditoria OWASP Top 10 (2025)

Levantamento de 2026-10-30, sobre a `main` em `ba1f43b` (já com o modo visitante, AUT-10).
As sondagens dinâmicas estão em [`backend/tests/test_sondagem_owasp.py`](../backend/tests/test_sondagem_owasp.py):
cada teste afirma o comportamento seguro; os que falham hoje estão marcados `xfail(strict=True)` e
ficam como lista viva de pendências. Quem corrigir uma delas vê o `XPASS`, tira a marca e cria o
requisito no spec do domínio (fluxo spec → teste → código do `CLAUDE.md`).

Rodar: `docker compose up -d banco` e, em `backend/`, `.venv/bin/pytest tests/test_sondagem_owasp.py -rx`.

Legenda: ✅ controle presente · ⚠️ pendência · 🟡 risco aceito/decisão do time.

## A01 — Broken Access Control

| | Item | Como foi verificado |
|---|---|---|
| ✅ | `comum` não escreve; `admin_setor` não acessa `/usuarios` e `/logs` | teste |
| ✅ | `admin_setor` não cria/edita/exclui documento de outro setor | teste |
| ✅ | Visitante não baixa documento/anexo (`401`) | teste |
| ⚠️ | Superadmin consegue desativar a si mesmo (e o último superadmin) — USU-04 ❓ | teste |
| 🟡 | Aniversariantes (nome, dia, setor) e metadados de documentos legíveis sem login — risco aceito no AUT-10 | teste |

## A02 — Security Misconfiguration

| | Item | Como foi verificado |
|---|---|---|
| ✅ | CORS só com a lista de `CORS_ORIGINS`; origem qualquer não é refletida | teste |
| ⚠️ | `/docs`, `/redoc` e `/openapi.json` abertos: mapa completo da API para qualquer um | teste |
| ⚠️ | API sem `X-Frame-Options`, `Referrer-Policy`, `Cache-Control: no-store` nas respostas com dados | teste |
| ⚠️ | nginx sem `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `server_tokens` ligado | leitura do `frontend/nginx.conf.template` |
| ⚠️ | `JWT_SECRET=troque-este-segredo` (o do `.env.example`) é aceito sem reclamar | teste |
| ⚠️ | Compose publica Postgres (5432) e MinIO (9000/9001) em todas as interfaces do host | leitura do `docker-compose.yml` |
| ⚠️ | `uvicorn --forwarded-allow-ips='*'`: qualquer cliente que alcance a porta 8000 forja `X-Forwarded-For` (vira problema quando houver rate limit por IP) | leitura do `backend/Dockerfile` |

## A03 — Software Supply Chain Failures

| | Item | Como foi verificado |
|---|---|---|
| ✅ | Backend com versões fixas; frontend com `package-lock.json` e `npm ci` | leitura |
| ⚠️ | `pip-audit`: 8 CVEs em `certifi 2026.7.22`, `dnspython 2.8.0`, `pyjwt 2.14.0` (só JWKS/OKP, que o app não usa), `urllib3 2.7.0` — todas com correção | `pip-audit -r requirements.txt` |
| ⚠️ | `npm audit`: 6 altas, 1 delas em dependência de produção (`follow-redirects`, via axios); as outras são de build (`vite`, `brace-expansion`, `source-map-js`, `undici`, `zod`) | `npm audit` / `npm audit --omit=dev` |
| ⚠️ | Sem CI nem Dependabot/Renovate: nada roda testes, lint ou auditoria de dependências antes do merge | não existe `.github/` |
| ⚠️ | Imagens base por tag (`python:3.14-slim`, `nginx:1.29-alpine`, `node:24-alpine`), não por digest | leitura dos Dockerfiles |

## A04 — Cryptographic Failures

| | Item | Como foi verificado |
|---|---|---|
| ✅ | Senha com argon2 (`pwdlib`); refresh token e magic link só como SHA-256 | teste + leitura |
| ✅ | JWT com algoritmo fixo: `alg: none` e assinatura com outra chave → `401` | teste |
| 🟡 | Tokens no `localStorage` (dívida já registrada no AUT-07): um XSS leva a sessão. A ausência de CSP (A02) agrava | leitura |
| ⚠️ | HTTPS/HSTS dependem só da plataforma; nada no app ou no nginx força | leitura |

## A05 — Injection

| | Item | Como foi verificado |
|---|---|---|
| ✅ | Só ORM, nenhum SQL montado com texto do usuário; busca com payloads de SQLi responde normal | teste + grep |
| ✅ | Upload de `.html` recusado (`415`); tipo servido vem da extensão, com `nosniff` | teste |
| ✅ | Sem `dangerouslySetInnerHTML`; atalhos só aceitam `http(s)://` (bloqueia `javascript:`) | grep + leitura |
| ✅ | E-mails escapam o HTML (`modelo_email.py`) | leitura |

## A06 — Insecure Design

| | Item | Como foi verificado |
|---|---|---|
| ⚠️ | Login sem rate limit nem bloqueio: 20 senhas erradas seguidas, nenhuma barrada | teste |
| ⚠️ | `POST /auth/redefinicao-senha` sem limite (USU-07 ❓): dá para encher a caixa de alguém | teste |
| ⚠️ | Política de senha só exige 8 caracteres: `12345678`, `password`, `senha123` aceitas | teste |
| ⚠️ | Upload confere só a extensão: HTML com nome `.pdf` é aceito (servido como PDF + `nosniff`, então o risco é baixo; conferir assinatura do arquivo fecha a porta) | teste |

## A07 — Authentication Failures

| | Item | Como foi verificado |
|---|---|---|
| ✅ | Desativar usuário corta o refresh; troca de senha revoga as outras sessões | teste + leitura |
| ✅ | Mensagem única de erro no login e nos magic links; redefinição responde antes de tocar o banco | leitura |
| ⚠️ | Enumeração de contas pelo tempo: senha errada em conta existente ~38 ms, e-mail inexistente ~3 ms (o argon2 só roda quando a conta existe) | teste |
| ⚠️ | Sem logout no backend (AUT-06 ⬜): "Sair" só apaga o `localStorage`, o refresh vale 7 dias | teste |
| ⚠️ | Refresh token sem rotação nem detecção de reuso | teste |
| ⚠️ | Login diferencia maiúsculas no e-mail (`Fulano@x` ≠ `fulano@x`), o que também permite contas duplicadas | teste |

## A08 — Software or Data Integrity Failures

| | Item | Como foi verificado |
|---|---|---|
| ✅ | Sem desserialização insegura; JWT assinado; front sem script de CDN (tudo no bundle) | leitura |
| ⚠️ | Mesmos pontos de A03: sem CI que garanta o que vai para `homolog`, imagens sem digest | leitura |

## A09 — Security Logging & Alerting Failures

| | Item | Como foi verificado |
|---|---|---|
| ✅ | Toda escrita gera auditoria na mesma transação (LOG-02) | teste |
| ⚠️ | Login falho, login com sucesso, pedido de redefinição e `403` não geram nenhum registro (nem log técnico) | teste |
| ⚠️ | Sem alerta algum (ex: muitas falhas de login, muitos `403`) | leitura |

## A10 — Mishandling of Exceptional Conditions

| | Item | Como foi verificado |
|---|---|---|
| ✅ | Token com claims inválidos falha fechado (`401`); JSON malformado vira `422`; MinIO fora vira `503` | teste |
| ✅ | Erro inesperado não vaza detalhe interno | teste |
| ⚠️ | O `500` sai como `text/plain` "Internal Server Error", fora do contrato `{mensagem}` do frontend | teste |

## Pendências priorizadas

Ordem sugerida: impacto × esforço. As marcadas ❓ precisam de decisão do time antes (regra do
`docs/specs/README.md`).

| # | Pendência | OWASP | Esforço | Onde |
|---|---|---|---|---|
| 1 | Atualizar `pyjwt`, `urllib3`, `certifi`, `dnspython` e `npm audit fix` | A03 | baixo | `requirements.txt`, `package-lock.json` |
| 2 | Desligar `/docs`/`/redoc`/`/openapi.json` fora do dev (flag de ambiente) | A02 | baixo | `main.py`, `config.py` |
| 3 | Validar `JWT_SECRET` na subida (≥ 32 bytes e diferente do exemplo) | A02 | baixo | `config.py` |
| 4 | Headers de segurança no nginx (CSP, HSTS, XFO, nosniff, Referrer-Policy) e `server_tokens off` | A02/A04 | baixo | `nginx.conf.template` |
| 5 | Igualar o tempo do login rodando o hash contra um hash fixo quando a conta não existe | A07 | baixo | `autenticacao/service.py` |
| 6 | `POST /auth/logout` revogando o refresh (AUT-06 já especificado) | A07 | baixo | módulo `autenticacao` |
| 7 | Normalizar e-mail para minúsculas no cadastro e no login (+ migration com índice em `lower(email)`) | A07 | médio | `usuarios` |
| 8 | Rate limit em `/auth/login` e `/auth/redefinicao-senha` (por e-mail e IP) — ❓ USU-07 | A06 | médio | `autenticacao` (+ ajustar `forwarded-allow-ips`) |
| 9 | Log técnico de login falho/sucesso, redefinição pedida e `403` | A09 | baixo | `autenticacao/service.py`, `permissions.py` |
| 10 | Handler de `Exception` devolvendo `500 {mensagem}` e logando o traceback | A10 | baixo | `core/erros.py` |
| 11 | Impedir o superadmin de desativar a si mesmo / o último superadmin — ❓ USU-04 | A01 | baixo | `usuarios/service.py` |
| 12 | Lista de senhas comuns na validação de `Senha` | A06 | baixo | `usuarios/schemas.py` |
| 13 | CI no GitHub com pytest, vitest, lint, `pip-audit`, `npm audit` + Dependabot | A03/A08 | médio | `.github/` |
| 14 | Compose: publicar Postgres/MinIO só em `127.0.0.1` (ou não publicar) | A02 | baixo | `docker-compose.yml` |
| 15 | Rotação de refresh token com detecção de reuso | A07 | médio | `autenticacao` |
| 16 | Conferir assinatura (magic bytes) dos uploads | A06 | médio | `core/arquivos.py` |
| 17 | Tirar os tokens do `localStorage` (refresh em cookie `HttpOnly; Secure; SameSite=Strict`) — AUT-07 | A04 | alto | backend + frontend |
