# Documentos — Armazenamento no MinIO: Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development ou superpowers:executing-plans
> para implementar task a task. Steps usam checkbox (`- [ ]`).

## Context

O módulo `documentos` existe só como arquivos vazios (`backend/app/modules/documentos/*.py`). O
CONTEXT.md define **Documento** como arquivo pertencente a um setor (ex: POP): o metadado vive no
Postgres e o binário no MinIO. O MinIO já sobe no `docker-compose.yml` (serviço `armazenamento`) e o
pacote `minio==7.2.20` já está em `requirements.txt`, mas o backend não recebe credenciais nem tem
cliente configurado. Esta entrega:

1. Configura o MinIO no backend num lugar **comum** (`app/core/armazenamento.py`), para ser
   reaproveitado por outros módulos no futuro (ex: `chave_imagem` dos avisos em `murais`).
2. Implementa o CRUD de documentos com upload/download, organizando o bucket em diretórios por setor.

**Decisões do usuário:**
- Escopo: **só backend** (frontend fica para outro plano).
- Leitura **institucional**: todo usuário autenticado lista e baixa qualquer documento. O escopo por
  setor vale só para criar/editar/excluir (mesma regra de Aviso/Evento/FAQ).
- Download por **stream pelo backend**: o MinIO não fica exposto ao navegador e a permissão é
  checada a cada download.
- Tipos aceitos: **documentos de escritório** (PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, ODT/ODS/ODP, TXT,
  PNG/JPG/JPEG). Limite: **50 MB**, o mesmo `client_max_body_size` do `frontend/nginx.conf`.

**Goal:** Configuração compartilhada do MinIO + endpoints `/documentos` (listar, buscar, baixar,
enviar, editar metadados, substituir arquivo, excluir).

**Tech Stack:** Python 3.14, FastAPI 0.141, SQLAlchemy 2.0, Pydantic 2.13, Alembic 1.20,
PostgreSQL 16, MinIO (SDK `minio` 7.2.20), Docker Compose.

## Global Constraints

- **Idioma:** tudo que a gente nomeia em português, sem acento (`enviar_arquivo`,
  `chave_armazenamento`, `/documentos/{documento_id}/download`). A API do SDK (`Minio`,
  `put_object`, `S3Error`) continua como é.
- **Módulo de referência:** `app/modules/murais` (model → schemas → repository → service → router,
  com indentação de 2 espaços). Copiar o padrão dele.
- **RBAC:** permissão genérica por dependency (`usuario_atual`, `requer_admin` de
  `app/core/permissions.py`); escopo por setor no service (`resolver_setor`, `garantir_escopo`).
  Não criar `dependencies.py`.
- **Erros:** `{campo?, mensagem}` via `app/core/erros.py`. Erro de campo usa
  `HTTPException(status, {"campo": ..., "mensagem": ...})`.
- **Sem testes automatizados** (decisão já registrada do time); a validação é manual (seção
  Verificação).
- **Branch:** `feature/backend/documentos/upload-e-download-minio` (já criada a partir de `dev`).
- **Commits:** Conventional Commits, escopo `backend/geral` (infra/core) ou `backend/documentos`.
- **Auditoria:** o módulo `logs` ainda está vazio, então não registramos log de auditoria aqui.
  Quando o módulo `logs` existir, criar/editar/excluir documento devem entrar nele.

## Organização do bucket

Um bucket só (`MINIO_BUCKET`, padrão `intranet`), com o **módulo** como prefixo de primeiro nível.
Assim os outros módulos usam o mesmo bucket sem colisão (ex: `murais/...` no futuro):

```
intranet/                                    ← bucket
  documentos/
    setores/
      {setor_id}/                            ← setor dono do documento
        {categoria}/                         ← pop | protocolo | manual | formulario | outro
          {documento_id}/
            {nome-sanitizado}.{ext}          ← ex: pop-higienizacao-de-maos.pdf
```

- **Setor por `setor_id`, não pelo nome:** setor pode ser renomeado (`PUT /setores/{id}`) e a chave
  do objeto não pode depender disso. O setor é o do documento, resolvido por `resolver_setor`:
  para `admin_setor` é sempre o setor de quem criou; `superadmin` pode escolher.
- **Categoria** é um campo novo do documento (`CategoriaDocumento`), útil para filtrar no frontend e
  para organizar o bucket.
- **`{documento_id}/` como pasta:** o nome original do arquivo fica legível no console do MinIO e
  não há colisão entre dois uploads com o mesmo nome.
- A chave completa fica salva em `documentos.chave_armazenamento`. Se a categoria mudar na edição, o
  objeto é **movido** (copy + remove no servidor) para a pasta nova, para o bucket continuar
  refletindo os metadados.

## Consistência Postgres ↔ MinIO

Os dois não compartilham transação, então a ordem das operações é escolhida para que a falha deixe,
no pior caso, um **objeto órfão** no bucket (inofensivo), e nunca uma **linha sem arquivo**:

| Operação | Ordem |
|---|---|
| Criar | gera `id` em Python → envia objeto → insere linha; se o commit falhar, remove o objeto |
| Substituir arquivo | envia objeto novo → atualiza linha → commit → remove objeto antigo |
| Mudar categoria | copia objeto para a chave nova → atualiza linha → commit → remove o antigo |
| Excluir | remove linha → commit → remove objeto (falha só vira `logger.warning`) |

## Estrutura de arquivos

| Arquivo | Ação |
|---|---|
| `docker-compose.yml` | Modificar: env `MINIO_*` no serviço `backend` |
| `.env.example`, `backend/.env.example` | Modificar: variáveis `MINIO_*` |
| `backend/app/core/config.py` | Modificar: campos `minio_*` e `tamanho_maximo_upload_mb` |
| `backend/app/core/armazenamento.py` | **Criar**: cliente MinIO compartilhado + `ErroArmazenamento` |
| `backend/app/core/erros.py` | Modificar: handler `ErroArmazenamento` → 503 |
| `backend/app/main.py` | Modificar: `lifespan` garante o bucket, `/saude` checa o MinIO, inclui o router |
| `backend/app/modules/documentos/models.py` | Criar: `Documento`, `CategoriaDocumento` |
| `backend/app/modules/documentos/storage.py` | Criar: layout das chaves do módulo no bucket |
| `backend/app/modules/documentos/schemas.py` | Criar |
| `backend/app/modules/documentos/repository.py` | Criar |
| `backend/app/modules/documentos/service.py` | Criar |
| `backend/app/modules/documentos/router.py` | Criar |
| `backend/alembic/versions/20260924_e5a7c9d2f4b6_cria_documentos.py` | Criar |
| `backend/alembic/env.py` | Modificar: importar `app.modules.documentos.models` |
| `CONTEXT.md`, `docs/arquitetura-backend.md`, `README.md` | Modificar: registrar as decisões |

**Ondas:** A = Task 1 → B = Tasks 2, 3 (paralelas) → C = Task 4 → D = Task 5 → E = Task 6 → F = Task 7.

---

### Task 1: Configuração do MinIO (Docker + settings)

- [x] **`docker-compose.yml`**, no `environment` do serviço `backend`:
  ```yaml
      MINIO_ENDPOINT: armazenamento:9000
      MINIO_USUARIO: ${MINIO_ROOT_USER:-intranet}
      MINIO_SENHA: ${MINIO_ROOT_PASSWORD:?defina MINIO_ROOT_PASSWORD no .env}
      MINIO_BUCKET: ${MINIO_BUCKET:-intranet}
  ```
  O `depends_on: armazenamento: service_healthy` já existe. No MVP o backend usa a credencial root;
  trocar por um usuário/policy restrito ao bucket fica registrado como dívida técnica na doc.
- [x] **`.env.example` (raiz):** adicionar `MINIO_BUCKET=intranet` logo abaixo de `MINIO_ROOT_PASSWORD`.
- [x] **`backend/.env.example`** (para rodar fora do Docker):
  ```
  MINIO_ENDPOINT=localhost:9000
  MINIO_USUARIO=intranet
  MINIO_SENHA=troque-esta-senha
  MINIO_BUCKET=intranet
  # true só se o MinIO estiver atrás de HTTPS
  MINIO_SEGURO=false
  TAMANHO_MAXIMO_UPLOAD_MB=50
  ```
- [x] **`backend/app/core/config.py`**, em `Configuracoes`:
  ```python
  minio_endpoint: str = "localhost:9000"
  minio_usuario: str
  minio_senha: str
  minio_bucket: str = "intranet"
  minio_seguro: bool = False

  # Tem que bater com o client_max_body_size do frontend/nginx.conf.
  tamanho_maximo_upload_mb: int = 50
  ```
  `minio_usuario`/`minio_senha` ficam obrigatórios, igual `jwt_secret`. Quem roda fora do Docker
  precisa adicioná-los ao `backend/.env` local (avisar no PR).
- [x] Commit: `chore(backend/geral): configura credenciais do minio no backend`

### Task 2: Cliente compartilhado — `app/core/armazenamento.py`

Módulo genérico, sem conhecimento de documentos. Qualquer módulo passa a chave completa.

```python
import logging
from collections.abc import Iterator
from functools import lru_cache
from typing import BinaryIO

from minio import Minio
from minio.commonconfig import CopySource
from minio.error import MinioException, S3Error
from urllib3.exceptions import HTTPError

from app.core.config import configuracoes

logger = logging.getLogger(__name__)

TAMANHO_BLOCO = 64 * 1024


class ErroArmazenamento(Exception):
    """MinIO fora do ar ou recusou a operação. Vira 503 em core/erros.py."""


class ArquivoNaoEncontrado(ErroArmazenamento):
    pass


@lru_cache
def obter_cliente() -> Minio:
    return Minio(
        configuracoes.minio_endpoint,
        access_key=configuracoes.minio_usuario,
        secret_key=configuracoes.minio_senha,
        secure=configuracoes.minio_seguro,
    )
```

Funções (todas convertem `S3Error`/`MinioException`/`urllib3 HTTPError` em `ErroArmazenamento`
com `raise ... from erro`; `S3Error` com `code == "NoSuchKey"` vira `ArquivoNaoEncontrado`):

- `garantir_bucket() -> None`: `bucket_exists` e, se não existir, `make_bucket`. Idempotente.
- `armazenamento_disponivel() -> bool`: `bucket_exists` sem levantar erro (para o `/saude`).
- `enviar_arquivo(chave: str, conteudo: BinaryIO, tamanho: int, tipo_conteudo: str) -> None`:
  `put_object(bucket, chave, conteudo, length=tamanho, content_type=tipo_conteudo)`.
- `ler_arquivo(chave: str) -> Iterator[bytes]`: `get_object` e um **gerador** que faz
  `yield from resposta.stream(TAMANHO_BLOCO)` e fecha no `finally`
  (`resposta.close(); resposta.release_conn()`). O `get_object` é chamado **antes** de devolver o
  gerador, para o 404/503 sair antes de o StreamingResponse começar a enviar bytes:
  ```python
  def ler_arquivo(chave: str) -> Iterator[bytes]:
      resposta = _executar(lambda: obter_cliente().get_object(configuracoes.minio_bucket, chave))
      def blocos() -> Iterator[bytes]:
          try:
              yield from resposta.stream(TAMANHO_BLOCO)
          finally:
              resposta.close()
              resposta.release_conn()
      return blocos()
  ```
- `mover_arquivo(origem: str, destino: str) -> None`: `copy_object(bucket, destino,
  CopySource(bucket, origem))`, depois `remover_arquivo(origem)`.
- `remover_arquivo(chave: str) -> None`: `remove_object`. É tolerante: em erro só faz
  `logger.warning("Objeto órfão no armazenamento: %s", chave)` e não levanta, porque é sempre
  chamado depois do commit (ver a tabela de consistência).
- `_executar(operacao)` é um helper privado que concentra o `try/except` e a conversão de erro.

- [x] Escrever o arquivo.
- [x] **`app/core/erros.py`:** dentro de `registrar_tratadores_de_erro`:
  ```python
  @app.exception_handler(ArquivoNaoEncontrado)
  async def tratar_arquivo_nao_encontrado(request, erro) -> JSONResponse:
      return JSONResponse({"mensagem": "Arquivo não encontrado no armazenamento"}, status_code=404)

  @app.exception_handler(ErroArmazenamento)
  async def tratar_armazenamento(request, erro) -> JSONResponse:
      logger.exception("Falha no armazenamento")  # log técnico, não vai pro banco
      return JSONResponse({"mensagem": "Armazenamento de arquivos indisponível"}, status_code=503)
  ```
- [x] Commit: `feat(backend/geral): adiciona cliente minio compartilhado no core`

### Task 3: Model, migration e layout do bucket

- [x] **`documentos/models.py`**, seguindo `murais/models.py`:
  ```python
  class CategoriaDocumento(StrEnum):
    POP = "pop"
    PROTOCOLO = "protocolo"
    MANUAL = "manual"
    FORMULARIO = "formulario"
    OUTRO = "outro"


  class Documento(Base):
    __tablename__ = "documentos"
    __table_args__ = (
      CheckConstraint(
        "categoria IN ('pop', 'protocolo', 'manual', 'formulario', 'outro')",
        name="ck_documentos_categoria",
      ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    titulo: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str | None] = mapped_column(Text)
    categoria: Mapped[CategoriaDocumento] = mapped_column(
      String(20), default=CategoriaDocumento.OUTRO, server_default=CategoriaDocumento.OUTRO.value
    )
    nome_arquivo: Mapped[str] = mapped_column(String(255))       # nome original, p/ o download
    tipo_conteudo: Mapped[str] = mapped_column(String(150))      # derivado da extensão
    tamanho_bytes: Mapped[int] = mapped_column(BigInteger)
    chave_armazenamento: Mapped[str] = mapped_column(String(500), unique=True)
    autor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id"), index=True)
    setor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("setores.id"), index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    autor: Mapped[Usuario] = relationship()
    setor: Mapped[Setor] = relationship()
    # + @property autor_nome / setor_nome, igual Aviso
  ```
- [x] **Migration** `20260924_e5a7c9d2f4b6_cria_documentos.py`, `down_revision = 'c3d8e5f1a2b7'`
  (a de avisos; conferir com `alembic heads` antes). Mesmo estilo de `..._cria_avisos.py`: `op.f(...)`
  para pk/fk/índices, `uq_documentos_chave_armazenamento`, índices em `autor_id`, `setor_id` e
  `categoria`. `downgrade` remove índices e tabela.
- [x] **`alembic/env.py`:** `import app.modules.documentos.models  # noqa: F401`.
- [x] **`documentos/storage.py`:** só o layout das chaves deste módulo, sem falar com o SDK:
  ```python
  PREFIXO = "documentos/setores"

  def sanitizar_nome(nome_arquivo: str) -> str:
    """'POP Higienização de Mãos.PDF' -> 'pop-higienizacao-de-maos.pdf'"""
    # unicodedata NFKD + remove não-ASCII, minúsculas, [^a-z0-9.]+ -> '-', strip '-',
    # corta a base em 100 caracteres, mantém a extensão; base vazia vira 'arquivo'

  def montar_chave(setor_id, categoria, documento_id, nome_arquivo) -> str:
    return f"{PREFIXO}/{setor_id}/{categoria}/{documento_id}/{sanitizar_nome(nome_arquivo)}"
  ```
- [x] Verificar: `docker compose up -d --build backend`, depois
  `docker compose exec banco psql -U intranet -d intranet -c '\d documentos'`.
- [x] Commits: `feat(backend/documentos): cria tabela de documentos` e
  `feat(backend/documentos): define organizacao dos documentos no bucket`

### Task 4: Schemas e repository

- [x] **`schemas.py`:**
  - `DocumentoCriar` (vem via `Form`): `titulo` (1–200), `descricao: str | None`,
    `categoria: CategoriaDocumento = OUTRO`, `setor_id: uuid.UUID | None = None`,
    `arquivo: UploadFile`; `ConfigDict(str_strip_whitespace=True)`. O arquivo fica **dentro** do
    model porque o FastAPI não achata um model de `Form` quando há um `UploadFile` ao lado dele
    (descoberto na implementação).
  - `DocumentoAtualizar` (JSON): `titulo`, `descricao`, `categoria`, todos opcionais, com o
    `rejeitar_nulo` de `AvisoAtualizar` para `titulo`/`categoria` (`descricao` aceita `null`
    para limpar).
  - `DocumentoResposta`: `id, titulo, descricao, categoria, nome_arquivo, tipo_conteudo,
    tamanho_bytes, setor_id, setor_nome, autor_id, autor_nome, criado_em, atualizado_em`.
    **Não** expõe `chave_armazenamento`, que é detalhe interno.
  - `FiltroDocumentos` (query): `setor_id`, `categoria`, `busca` (ilike em `titulo`), todos opcionais.
- [x] **`repository.py`:** mesmo formato de `murais/repository.py` (`_consulta_base` com
  `selectinload` de autor/setor, `listar(sessao, filtro)` ordenado por `criado_em desc`,
  `buscar_por_id`, `adicionar`, `salvar`, `remover`).
- [x] Commit: `feat(backend/documentos): adiciona schemas e repository de documentos`

### Task 5: Service

`service.py`. Validação de arquivo e toda a coordenação Postgres↔MinIO ficam aqui:

- **Tipos aceitos**: `TIPOS_PERMITIDOS: dict[str, str]` de extensão → MIME (`.pdf`, `.doc`, `.docx`,
  `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.odt`, `.ods`, `.odp`, `.txt`, `.png`, `.jpg`, `.jpeg`). O
  `tipo_conteudo` salvo e servido vem **deste mapa**, não do `content_type` enviado pelo cliente.
  Assim ninguém consegue subir um `text/html` que depois seria servido inline (risco de XSS,
  já apontado em `docs/arquitetura-frontend.md`).
- `_validar_arquivo(arquivo: UploadFile) -> tuple[str, int]`: devolve `(tipo_conteudo, tamanho)`.
  Extensão fora do mapa → 415 `{"campo": "arquivo", "mensagem": "Tipo de arquivo não permitido"}`.
  Tamanho: `arquivo.size` (com fallback `seek(0, 2)/tell()/seek(0)`); `0` → 422 "Arquivo vazio";
  acima de `configuracoes.tamanho_maximo_upload_mb` → 413 com `campo: "arquivo"`.
- `listar_documentos(sessao, filtro)` / `buscar_documento(sessao, id)` (404 "Documento não encontrado").
- `criar_documento(sessao, dados, arquivo, usuario)`:
  `resolver_setor(dados.setor_id, usuario, entidade="documento")` → `buscar_setor` (de
  `setores/service.py`) → `_validar_arquivo` → `documento_id = uuid.uuid4()` → `montar_chave` →
  `armazenamento.enviar_arquivo(chave, arquivo.file, ...)` → `repository.adicionar`; em
  `IntegrityError`: `rollback`, `remover_arquivo(chave)`, 409 (mesma mensagem de murais para autor
  inexistente).
- `atualizar_documento(sessao, id, dados, usuario)`: `garantir_escopo`; se `categoria` mudou,
  calcula a chave nova, `mover_arquivo`, atualiza `chave_armazenamento`; aplica os campos;
  `atualizado_em = now(UTC)`; commit. Se o commit falhar depois do move, devolve o objeto para a
  chave antiga (`mover_arquivo(nova, antiga)`) antes de relançar.
- `substituir_arquivo(sessao, id, arquivo, usuario)`: `garantir_escopo` → valida → envia na chave
  nova (mesma pasta `{documento_id}/`; se o nome sanitizado for igual ao atual, sobrescreve a mesma
  chave e não remove nada) → atualiza `nome_arquivo`, `tipo_conteudo`, `tamanho_bytes`,
  `chave_armazenamento`, `atualizado_em` → commit → `remover_arquivo(antiga)`.
- `baixar_documento(sessao, id) -> tuple[Documento, Iterator[bytes]]`: busca e chama `ler_arquivo`.
- `deletar_documento(sessao, id, usuario)`: `garantir_escopo` → `repository.remover` →
  `remover_arquivo(chave)`.

- [x] Commit: `feat(backend/documentos): adiciona service de upload e download`

### Task 6: Router + `main.py`

- [x] **`router.py`**, `APIRouter(prefix="/documentos", tags=["documentos"])`:

| Método | Rota | Dependency | Corpo | Resposta |
|---|---|---|---|---|
| GET | `/documentos` | `usuario_atual` | query `FiltroDocumentos` (`Annotated[..., Query()]`) | `list[DocumentoResposta]` |
| GET | `/documentos/{documento_id}` | `usuario_atual` | – | `DocumentoResposta` |
| GET | `/documentos/{documento_id}/download` | `usuario_atual` | query `inline: bool = False` | `StreamingResponse` |
| POST | `/documentos` | `requer_admin` | multipart: `dados: Annotated[DocumentoCriar, Form()]` (arquivo incluso) | 201 `DocumentoResposta` |
| PUT | `/documentos/{documento_id}` | `requer_admin` | JSON `DocumentoAtualizar` | `DocumentoResposta` |
| PUT | `/documentos/{documento_id}/arquivo` | `requer_admin` | multipart `arquivo: UploadFile` | `DocumentoResposta` |
| DELETE | `/documentos/{documento_id}` | `requer_admin` | – | 204 |

  Download:
  ```python
  documento, blocos = service.baixar_documento(sessao, documento_id)
  disposicao = "inline" if inline else "attachment"
  return StreamingResponse(
    blocos,
    media_type=documento.tipo_conteudo,
    headers={
      "Content-Disposition": f"{disposicao}; filename*=UTF-8''{quote(documento.nome_arquivo)}",
      "Content-Length": str(documento.tamanho_bytes),
      "X-Content-Type-Options": "nosniff",
    },
  )
  ```
  As rotas são `def` síncronas, como no resto do projeto. O SDK do MinIO é síncrono e o FastAPI roda
  essas rotas no threadpool; o gerador síncrono também é consumido via threadpool pelo
  `StreamingResponse`.
- [x] **`main.py`:**
  - `lifespan` com `garantir_bucket()`. Se falhar, só `logger.warning` e segue, para a API subir mesmo
    com o MinIO fora (o `/saude` denuncia). `app = FastAPI(title=..., lifespan=lifespan)`.
  - `/saude` passa a devolver `{"status", "banco", "armazenamento"}` e responde 503 se qualquer um
    estiver indisponível.
  - `app.include_router(roteador_documentos)`.
- [x] Commit: `feat(backend/documentos): expoe endpoints de documentos`

### Task 7: Documentação

- [x] **`CONTEXT.md`:** trocar a nota "escopo de leitura ... ainda não foi discutido" pela decisão:
  leitura institucional, e a edição segue a Regra de escopo de edição. Adicionar Documento na lista
  "Vale pra Aviso, Evento e FAQ".
- [x] **`docs/arquitetura-backend.md`:** na árvore de pastas, adicionar `core/armazenamento.py`
  (cliente compartilhado) e ajustar o comentário de `documentos/storage.py` (layout das chaves).
  Nova seção "Armazenamento (MinIO)" com o layout do bucket, a tabela de consistência e a dívida
  técnica (credencial root, limpeza de órfãos). Marcar como resolvida a decisão "MinIO
  self-hosted" (container próprio no compose) só se o time confirmar; se não, deixar como está.
- [x] **`README.md`:** incluir `MINIO_BUCKET` na lista de variáveis com valor padrão.
- [x] Commit: `docs(backend/documentos): registra organizacao do armazenamento de documentos`

---

## Verificação (end-to-end, manual)

```bash
docker compose up -d --build && docker compose ps     # backend/armazenamento "healthy"
curl -s localhost:8000/saude                           # {"status":"ok","banco":"ok","armazenamento":"ok"}
docker compose exec backend python -m scripts.criar_superadmin
TOKEN=$(curl -s -X POST localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"...","senha":"..."}' | jq -r .access_token)
# criar setor (POST /setores) e pegar SETOR_ID
curl -s -X POST localhost:8000/documentos -H "Authorization: Bearer $TOKEN" \
  -F titulo='POP Higienização' -F categoria=pop -F setor_id=$SETOR_ID \
  -F 'arquivo=@/caminho/POP Higienização de Mãos.pdf'
```
Conferir, nesta ordem:
1. **Bucket:** `docker compose exec armazenamento sh -c 'mc alias set local http://localhost:9000
   $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD && mc ls -r local/intranet'` mostra
   `documentos/setores/<setor_id>/pop/<documento_id>/pop-higienizacao-de-maos.pdf` (ou olhar no
   console em http://localhost:9001).
2. **Listagem/filtros:** `GET /documentos?categoria=pop&busca=higien` traz o documento. Um usuário
   `comum` (criado via `POST /usuarios`) também consegue listar e baixar.
3. **Download:** `curl -OJ .../documentos/{id}/download` devolve o arquivo com o nome original e ele
   bate byte a byte (`cmp`). Com `?inline=true`, o header vem `inline`.
4. **Editar categoria** para `manual` → o objeto passa para `.../manual/...` e a pasta `pop/` fica vazia.
5. **Substituir arquivo** → nome/tamanho novos na resposta e o objeto antigo some do bucket.
6. **Permissões:** `comum` recebe 403 no POST; `admin_setor` de outro setor recebe 403 "Fora do seu
   setor" no PUT/DELETE; `admin_setor` que manda outro `setor_id` no POST recebe 403; sem token, 401.
7. **Validação:** `.exe` → 415 `{campo:"arquivo"}`; arquivo vazio → 422; arquivo de 51 MB → 413
   (direto no backend, porta 8000; pelo nginx, na 8080, quem barra é o próprio nginx).
8. **Excluir** → 204, a linha some e o objeto some do bucket.
9. **MinIO fora:** `docker compose stop armazenamento` → `/saude` responde 503, download responde 503
   `{mensagem:"Armazenamento de arquivos indisponível"}` e a listagem (só Postgres) continua
   funcionando. Depois, `docker compose start armazenamento`.
10. `docker compose exec backend alembic downgrade -1 && alembic upgrade head` roda sem erro.
