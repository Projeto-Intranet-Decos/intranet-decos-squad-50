# Intranet do Hospital

Monorepo com `backend/` (FastAPI) e `frontend/` (React + TypeScript). Visão geral e convenções em [`CLAUDE.md`](./CLAUDE.md) e [`docs/`](./docs).

## Rodando com Docker

Pré-requisito: Docker com Compose instalado e em execução.

### 1. Configurar o `.env`

```bash
cp .env.example .env
```

O `.env` fica na **raiz** do repositório (é o que o `docker-compose.yml` lê) e não é versionado. Preencha, no mínimo:

| Variável | O que é |
|---|---|
| `POSTGRES_PASSWORD` | Senha do banco. Vale só na criação do volume: depois de o banco existir, trocar aqui não muda a senha dele (use `ALTER USER` ou recrie o volume). **Não** cole uma URL aqui. |
| `MINIO_ROOT_PASSWORD` | Senha do administrador do MinIO (mínimo 8 caracteres). |
| `JWT_SECRET` | Segredo de assinatura dos tokens. Gere com `python -c "import secrets; print(secrets.token_urlsafe(64))"`. |

As demais (`POSTGRES_DB`, `POSTGRES_USER`, `MINIO_ROOT_USER`, `AWS_S3_BUCKET_NAME`, `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`, `*_PORT`) têm valor padrão. A API monta a URL do banco a partir de `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD`; no compose, o padrão é `banco:5432`, o serviço do próprio compose, e um `POSTGRES_HOST`/`POSTGRES_PORT` no `.env` aponta para um Postgres externo. `POSTGRES_PORT` também é a porta em que o compose publica o banco no host, e o backend do compose usa a mesma: com o `banco` local, deixe `5432`. Para rodar o backend fora do Docker, o `backend/.env` (ver `backend/.env.example`) troca o host por `localhost`. O compose repassa ao backend as credenciais do MinIO (`MINIO_ROOT_*`) como `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`, as variáveis S3 que o backend lê. Fora do Docker, o backend lê este `.env` e, por cima dele, o `backend/.env`, que é opcional; os `AWS_*` deste arquivo só servem para esse caso.

O backend roda no container e recebe as credenciais em tempo de execução, pelo bloco `environment` do `docker-compose.yml`. Nenhum `.env` entra na imagem (`backend/.dockerignore`), e o `backend/.env` é só para desenvolvimento local. A produção roda no Railway (ver [Produção](#produção-railway)).

### 2. Subir os containers

```bash
docker compose up -d --build
docker compose ps        # os serviços devem ficar "healthy"
```

`-d` roda em segundo plano (os containers continuam de pé mesmo fechando o terminal). A primeira subida demora, porque baixa as imagens e instala as dependências. As migrations do Alembic rodam automaticamente quando o backend sobe.

| Serviço | Endereço padrão |
|---|---|
| Frontend (nginx, repassa `/api` ao backend) | http://localhost:8080 |
| Backend (docs interativas em `/docs`) | http://localhost:8000 |
| Postgres | `localhost:5432` |
| MinIO (API / console) | http://localhost:9000 / http://localhost:9001 |

Se alguma porta já estiver em uso na sua máquina, ajuste no `.env`: `FRONTEND_PORT`, `API_PORT`, `MINIO_PORT` e `MINIO_CONSOLE_PORT`. `POSTGRES_PORT` não serve para isso, porque o backend do compose usa a mesma porta para achar o `banco`. Mudando `FRONTEND_PORT`, ajuste também `FRONTEND_URL`, que é a base dos links dos e-mails.

### 3. Criar o primeiro superadmin

O banco nasce vazio e a API só cria usuários para quem já é superadmin, então o primeiro é criado por script:

```bash
docker compose exec backend python -m scripts.criar_superadmin
```

Ele pergunta nome, e-mail e senha no terminal (a senha não aparece ao digitar). Regras: e-mail válido (domínios como `.local` e `localhost` são recusados) e senha com no mínimo 8 caracteres. O script é idempotente: se o e-mail já existir, não altera nada. Depois é só entrar em http://localhost:8080.

### Rodando comandos dentro dos containers

```bash
docker compose exec backend sh                          # shell dentro do backend
docker compose exec backend alembic current             # versão atual das migrations
docker compose exec banco psql -U intranet -d intranet  # console do Postgres
```

O código do backend e do frontend é copiado para a imagem no `build`: depois de editar arquivos, rode `docker compose up -d --build <serviço>` para a mudança valer.

### Problemas comuns

- **Backend `unhealthy` / `Connection refused` em `localhost:5432`**: o `POSTGRES_PASSWORD` está com caracteres especiais ou com uma URL. Corrija no `.env` e recrie o volume, pois o Postgres só aplica a senha na primeira criação: `docker compose down -v && docker compose up -d --build`.
- **Porta já em uso**: mude a `PORTA_*` correspondente no `.env`.
- **Ver o erro de um serviço**: `docker compose logs --tail 100 <serviço>`.

Para desenvolver com hot reload, suba só a infraestrutura e rode backend/frontend localmente:

```bash
docker compose up -d banco armazenamento
```

(ver [`backend/README.md`](./backend/README.md) para o backend).

Comandos úteis:

```bash
docker compose logs -f backend       # acompanhar logs
docker compose up -d --build backend # rebuild após mudar código/dependências
docker compose down                  # parar (dados ficam nos volumes)
docker compose down -v               # parar e apagar banco e arquivos
```

## Produção (Railway)

Em produção, cada serviço sobe do próprio Dockerfile no Railway. O Postgres e o armazenamento são serviços à parte: o Postgres do Railway e um Railway Bucket, ou qualquer armazenamento compatível com S3.

### Backend

- **Root Directory:** `/backend`. Sem isso, o Railway não acha o Dockerfile e tenta detectar a linguagem.
- **Watch Paths:** `/backend/**`.
- **Custom Start Command:** vazio. O `CMD` do Dockerfile já roda as migrations e sobe a API na porta do `PORT`, ouvindo em IPv4 e IPv6, como a rede privada do Railway exige.
- **Healthcheck Path:** `/saude`. Responde 200 só quando o banco e o armazenamento estão `ok`.
- **Rede:** só a privada. O acesso público é pelo frontend, em `/api`.

| Variável | O que é |
|---|---|
| `PORT` | `8000`. Tem que bater com a porta do `API_URL` do frontend. |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Com o Postgres do Railway: `${{Postgres.PGHOST}}`, `${{Postgres.PGPORT}}`, `${{Postgres.PGDATABASE}}`, `${{Postgres.PGUSER}}` e `${{Postgres.PGPASSWORD}}`. |
| `PGSSLMODE` | Opcional, lido direto pelo driver do Postgres. Use `require` se o banco só aceitar TLS. |
| `AWS_ENDPOINT_URL` | URL do armazenamento, com esquema e sem o bucket (ex: `https://t3.storageapi.dev`). O `https://` liga o TLS. |
| `AWS_S3_BUCKET_NAME` | Nome do bucket. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credenciais de acesso. |
| `AWS_DEFAULT_REGION` | Região do bucket (`auto` no Railway). Em branco, o SDK descobre sozinho. |
| `AWS_S3_FORCE_PATH_STYLE` | Em branco, usa virtual-hosted (`bucket.host`), como o Railway e a AWS. `true` para um MinIO próprio atrás de um domínio, que só aceita path style (`host/bucket`). |
| `JWT_SECRET` | Gere com `python -c "import secrets; print(secrets.token_urlsafe(64))"`. |
| `FRONTEND_URL` | Endereço público do frontend, usado nos links dos e-mails. |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` | `EMAIL_PROVIDER=resend` para enviar de verdade. Exige `RESEND_API_KEY`. |

Num Railway Bucket, as `AWS_*` vêm da aba *Credentials* do bucket. O bucket só é acessível pela rede pública, então o endpoint é o `https://` que aparece lá. A chave precisa de `s3:ListBucket` no bucket e de `s3:GetObject`, `s3:PutObject` e `s3:DeleteObject` nos objetos. Se o bucket não existir, o backend tenta criá-lo ao subir.

### Frontend

- **Root Directory:** `/frontend`. **Watch Paths:** `/frontend/**`.
- **Start Command:** vazio.
- **Rede:** domínio público com target port igual ao `PORT` que o Railway injeta (normalmente `8080`). O nginx ouve nessa porta; sem `PORT`, como no compose, ouve na `80`. Porta errada no domínio dá 502 sem nada nos logs, porque a requisição nem chega ao nginx.
- **Variável:** `API_URL=http://<nome-do-serviço-backend>.railway.internal:8000`. A porta é o `PORT` do backend. A URL pública do backend (`https://...up.railway.app`, sem porta) também funciona, mas passa pela internet e exige o backend com domínio público. Sem essa variável, o nginx procura o backend em `http://backend:8000`, que é o endereço dentro do compose de desenvolvimento.

### Primeiro superadmin

Com o backend no ar, abra um shell no container dele (`railway ssh`, com o serviço do backend selecionado) e rode:

```bash
python -m scripts.criar_superadmin
```
