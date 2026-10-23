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

As demais (`POSTGRES_DB`, `POSTGRES_USER`, `MINIO_ROOT_USER`, `MINIO_BUCKET`, `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`, `*_PORT`) têm valor padrão. A API monta a URL do banco a partir de `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD`; no compose, host e porta são sempre `banco:5432`, e os do `.env` (padrão `localhost:5432`) valem para rodar o backend fora do Docker. `POSTGRES_PORT` também é a porta em que o compose publica o banco no host. As credenciais do MinIO (`MINIO_*`) também são repassadas pelo compose. Fora do Docker, o backend lê este `.env` e, por cima dele, o `backend/.env`, que é opcional; `MINIO_USER` e `MINIO_PASSWORD` só servem para esse caso.

**Em produção, use apenas este `.env` da raiz.** O backend roda no container e recebe as credenciais em tempo de execução, pelo bloco `environment` do `docker-compose.yml`. Nenhum `.env` entra na imagem (`backend/.dockerignore`), e o `backend/.env` é só para desenvolvimento local.

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

Se alguma porta já estiver em uso na sua máquina, ajuste no `.env`: `FRONTEND_PORT`, `API_PORT`, `POSTGRES_PORT`, `MINIO_PORT` e `MINIO_CONSOLE_PORT`. Mudando `FRONTEND_PORT`, ajuste também `FRONTEND_URL`, que é a base dos links dos e-mails.

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

## Produção

O `docker-compose.prod.yml` sobe só a API e o frontend. O Postgres e o armazenamento são externos: um Postgres gerenciado ou da infraestrutura do hospital, e qualquer serviço compatível com S3 (AWS S3, Cloudflare R2, um MinIO próprio...).

```bash
cp .env.prod.example .env     # preencha os valores
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend python -m scripts.criar_superadmin
```

| Variável | O que é |
|---|---|
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Conexão com o banco externo. O banco e o usuário já precisam existir. As migrations rodam sozinhas quando o backend sobe. |
| `PGSSLMODE` | `prefer` (padrão) ou `require`, se o banco só aceitar TLS. |
| `MINIO_ENDPOINT` | Só o host do armazenamento, sem `https://` e sem o bucket (ex: `s3.sa-east-1.amazonaws.com`). |
| `MINIO_BUCKET` | Nome do bucket. |
| `MINIO_USER` / `MINIO_PASSWORD` | Access Key ID / Secret Access Key. |
| `MINIO_SECURE` | `true` (padrão) para HTTPS. |
| `FRONTEND_URL` | Endereço público do frontend, usado nos links dos e-mails. |

A chave do armazenamento precisa de `s3:ListBucket` no bucket e de `s3:GetObject`, `s3:PutObject` e `s3:DeleteObject` nos objetos. Se o bucket não existir, o backend tenta criá-lo ao subir, o que exige também `s3:CreateBucket`.

A API não publica porta: o acesso é só pelo nginx do frontend, em `/api` (porta `FRONTEND_PORT`, padrão `80`). O TLS fica a cargo de um proxy na frente. O backend só fica `healthy`, e o frontend só sobe, quando o `GET /saude` responde com banco e armazenamento `ok`. Se travar, veja `docker compose -f docker-compose.prod.yml logs backend`.

### Railway

O Railway não usa o `docker-compose.prod.yml`: cada serviço sobe do próprio Dockerfile.

**Backend** (Root Directory `backend`):

- Custom Start Command vazio. O `CMD` do Dockerfile já roda as migrations e sobe a API na porta do `PORT`, ouvindo em IPv4 e IPv6, como a rede privada do Railway exige.
- Healthcheck Path: `/saude`.
- Variáveis: as do `.env.prod.example`, mais `PORT=8000`. Com o Postgres do Railway, use as referências `${{Postgres.PGHOST}}`, `${{Postgres.PGPORT}}`, `${{Postgres.PGDATABASE}}`, `${{Postgres.PGUSER}}` e `${{Postgres.PGPASSWORD}}` nas `POSTGRES_*`.

**Frontend** (Root Directory `frontend`):

- Start Command vazio.
- Domínio público com target port `80`.
- Variável `API_UPSTREAM=http://<nome-do-serviço-backend>.railway.internal:8000`. A porta tem que ser o `PORT` do backend. Sem essa variável, o nginx procura o backend em `http://backend:8000`, que é o endereço dentro do compose.
