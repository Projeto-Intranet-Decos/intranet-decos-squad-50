# Produção no Cloudflare

Um Worker só (`intranet`) atende tudo:

- **Frontend:** o build de `frontend/dist` é servido como assets estáticos. Rota desconhecida cai no `index.html`.
- **Backend:** `/api/*` vai para um Cloudflare Container gerado do `backend/Dockerfile`, sem o prefixo `/api`, como o nginx fazia. O container dorme após 15 min sem tráfego.
- **Arquivos:** ficam no bucket R2 `intranet`, acessado pela API S3 (variáveis `AWS_*`).
- **Banco:** Postgres no Supabase, pelo *session pooler* (IPv4).

O nginx do frontend e o MinIO continuam só para o `docker compose` local.

## Primeira configuração

Pré-requisitos: Docker rodando (`docker info`) e Node. Em `cloudflare/`:

```sh
npm install
npx wrangler login
npx wrangler whoami                  # anote o Account ID
npx wrangler r2 bucket create intranet
```

No painel do Cloudflare, vá em **R2 → Manage API tokens → Create API token** e crie o token com *Object Read & Write*, restrito ao bucket `intranet`. Guarde o Access Key ID e o Secret Access Key.

No `wrangler.jsonc`, troque:

- `<ACCOUNT_ID>` em `AWS_ENDPOINT_URL`
- `<SUBDOMINIO>` em `FRONTEND_URL`, pelo subdomínio workers.dev da conta. Ele aparece em **Workers & Pages** ou no primeiro deploy.

Depois cadastre os segredos (cada comando pede o valor):

```sh
npx wrangler secret put POSTGRES_HOST       # Supabase → Connect → Session pooler, ex: aws-0-sa-east-1.pooler.supabase.com
npx wrangler secret put POSTGRES_USER       # no pooler é postgres.<project-ref>
npx wrangler secret put POSTGRES_PASSWORD
npx wrangler secret put JWT_SECRET          # python -c "import secrets; print(secrets.token_urlsafe(64))"
npx wrangler secret put AWS_ACCESS_KEY_ID   # do token R2
npx wrangler secret put AWS_SECRET_ACCESS_KEY
npx wrangler secret put RESEND_API_KEY
```

> Use o *session pooler*, não o host direto `db.<ref>.supabase.co`, que só tem IPv6. Também não use o *transaction pooler* (porta 6543): o SQLAlchemy mantém conexões e o Alembic usa transações longas.

## Deploy

Cada push na `main` dispara o deploy pelo GitHub Actions (`.github/workflows/deploy-cloudflare.yml`). Para refazer sem commit novo, use **Actions → Deploy Cloudflare → Run workflow**.

O workflow precisa de dois segredos no repositório (**Settings → Secrets and variables → Actions**):

- `CLOUDFLARE_API_TOKEN`: token da conta, não do usuário, para não depender do acesso de ninguém. Em **Manage Account → Account API Tokens → Create Token**, modelo *Edit Cloudflare Workers*, restrito a esta conta e à zona `projetodecos.online` (os custom domains precisam dela).
- `CLOUDFLARE_ACCOUNT_ID`: o mesmo que aparece em `AWS_ENDPOINT_URL` no `wrangler.jsonc`.

Deploy manual a partir da sua máquina, se precisar:

```sh
npm run deploy    # build do frontend + wrangler deploy (build e push da imagem pelo Docker)
```

No primeiro deploy, o container leva alguns minutos para ficar disponível. Enquanto isso, `/api` pode responder erro. As migrations rodam sozinhas a cada partida do container (`alembic upgrade head` no `CMD`).

Para conferir: `curl https://intranet.<SUBDOMINIO>.workers.dev/api/saude` deve trazer banco e armazenamento ok. Os logs ficam em `npx wrangler tail` ou no painel (Workers → intranet → Logs).

## Primeiro superadmin (banco vazio)

Depois que o container subir e as migrations criarem as tabelas, crie o primeiro superadmin a partir da sua máquina, apontando para o Supabase. As variáveis de ambiente vencem o `.env`; as do armazenamento só precisam existir para a configuração carregar.

```sh
cd backend
POSTGRES_HOST=<host do session pooler> POSTGRES_PORT=5432 POSTGRES_DB=postgres \
POSTGRES_USER=postgres.<project-ref> POSTGRES_PASSWORD='<senha>' \
.venv/bin/python -m scripts.criar_superadmin
```

O script pergunta nome, e-mail e senha, se não estiverem no ambiente.

## Domínio

A intranet atende em `projetodecos.online` e `www.projetodecos.online`, como custom domains do Worker (`routes` no `wrangler.jsonc`). A zona está no Cloudflare, e o deploy cria os registros e o certificado; por isso esses dois nomes não podem ter registro A/CNAME próprio na zona. `intranet.davignascimento.workers.dev` continua respondendo.

O e-mail sai pelo Resend em `contato.projetodecos.online`. Estes registros têm que existir na zona, todos sem proxy (nuvem cinza):

| Tipo | Nome | Conteúdo |
|---|---|---|
| MX | `contato` | `receive-sae1.forge.rmta.net` (prioridade 10) |
| CNAME | `send.contato` | `send.forge.rmta.net` |
| TXT | `resend._domainkey.contato` | chave DKIM do painel do Resend |
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

## Qual branch vai para produção

`main` é a produção. Faça o deploy a partir dela, depois que o PR da feature for mesclado. Deploy de outra branch publica código que ainda não foi revisado, no mesmo container e no banco de produção.
