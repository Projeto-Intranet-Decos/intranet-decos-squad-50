# Design — CRUD de Eventos + Aniversariantes do Mês

Data: 2026-09-17
Módulo: `calendario` (backend)
Branch: `feature/backend/calendario/crud-eventos-e-aniversariantes`, a partir de `dev`

## Objetivo

Entregar o módulo `calendario` do backend: CRUD de eventos (criados por `admin_setor` e
`superadmin`, visíveis a todos) e um endpoint de aniversariantes do mês derivado da data de
nascimento do usuário.

Escopo desta entrega: **backend apenas**. Frontend, testes automatizados e o módulo de
autenticação ficam fora.

## Estado do repositório

`dev` tem apenas o módulo `setores` implementado. As demais pastas de módulo existem vazias.
Consequências que o design precisa absorver:

- Não existe model nem migration de `usuarios`. `eventos.autor_id` referencia `usuarios.id`,
  e aniversariantes lê `usuarios.data_nascimento` — a tabela precisa nascer aqui.
- `sql/schema.sql` já descreve `usuarios` (com `data_nascimento DATE`) e `eventos`. O DDL
  criado aqui segue esse arquivo; ele não precisa ser alterado.
- A branch remota `feature/backend/autenticacao/jwt-e-login` (não mergeada) cria o módulo de
  autenticação e seu próprio `Usuario`. Para não colidir, esta entrega cria **só o model** de
  `usuarios`, sem router nem service — o merge da branch de auth adiciona a camada HTTP por cima.
- `app/core/permissions.py` já entrega `usuario_atual`, `requer_admin`, `requer_superadmin` e
  `pode_gerenciar_setor`. Nada de RBAC novo é necessário.

## Regras de domínio (de `CONTEXT.md`)

- Evento é criado por `admin_setor` ou `superadmin`.
- Leitura é **institucional**: todo usuário autenticado vê todos os eventos.
- Edição e exclusão seguem escopo por setor: o evento guarda o setor de quem criou;
  `admin_setor` só mexe no que é do próprio setor, `superadmin` mexe em qualquer um.
- Aniversariante **não é registro próprio** — é derivado de `usuarios.data_nascimento`.

## Modelo de dados

### `usuarios` (novo, model apenas)

`app/modules/usuarios/models.py`, espelhando `sql/schema.sql`:

| coluna | tipo | notas |
|---|---|---|
| `id` | UUID | PK, default `uuid4` |
| `nome` | VARCHAR(200) | not null |
| `email` | VARCHAR(200) | not null, unique |
| `senha_hash` | VARCHAR(255) | not null |
| `role` | VARCHAR(20) | default `comum`, CHECK em (`comum`, `admin_setor`, `superadmin`) |
| `setor_id` | UUID | FK `setores.id`, nullable, indexado |
| `data_nascimento` | DATE | nullable — é o campo novo que alimenta aniversariantes |
| `ativo` | BOOLEAN | default `true`, not null |
| `criado_em` | TIMESTAMPTZ | `server_default now()` |

Relationship `setor` para `Setor` (sem `back_populates`, para não tocar em `setores/models.py`
e evitar conflito de merge).

`data_nascimento` é nullable porque usuários já cadastrados podem não ter a data; quem não tem
simplesmente não aparece na lista de aniversariantes.

### `eventos` (novo)

`app/modules/calendario/models.py`:

| coluna | tipo | notas |
|---|---|---|
| `id` | UUID | PK, default `uuid4` |
| `titulo` | VARCHAR(200) | not null |
| `descricao` | TEXT | nullable |
| `data_inicio` | TIMESTAMPTZ | not null |
| `data_fim` | TIMESTAMPTZ | nullable |
| `autor_id` | UUID | FK `usuarios.id`, not null, indexado |
| `setor_id` | UUID | FK `setores.id`, not null, indexado |
| `criado_em` | TIMESTAMPTZ | `server_default now()` |

Relationships `autor` (Usuario) e `setor` (Setor), carregados com `selectinload` na listagem
para expor `autor_nome` e `setor_nome` sem N+1.

### Migration

Uma única revision, `down_revision = '7c41ba823b98'` (a de setores/ramais), descrição
`cria usuarios e eventos`. Cria as duas tabelas e os índices
`ix_usuarios_setor_id`, `ix_eventos_autor_id`, `ix_eventos_setor_id`.
`downgrade` derruba na ordem inversa. Import dos dois models novos em `alembic/env.py`.

## API

Router com `prefix="/calendario"`, `tags=["calendario"]`, incluído em `app/main.py`.

| método | rota | permissão |
|---|---|---|
| GET | `/calendario/eventos` | qualquer autenticado |
| GET | `/calendario/eventos/{evento_id}` | qualquer autenticado |
| POST | `/calendario/eventos` | `requer_admin` (+ escopo no service) |
| PUT | `/calendario/eventos/{evento_id}` | `requer_admin` + escopo no service |
| DELETE | `/calendario/eventos/{evento_id}` | `requer_admin` + escopo no service |
| GET | `/calendario/aniversariantes` | qualquer autenticado |

### `GET /calendario/eventos`

Query params, todos opcionais: `de` (date), `ate` (date), `setor_id` (UUID). Filtram por
`data_inicio` (`>= de`, `<= ate` considerando o dia inteiro de `ate`). Sem filtro, retorna
todos. Ordenação: `data_inicio` ascendente, `titulo` como desempate.

`setor_id` aqui é filtro de conveniência da tela, **não** restrição de visibilidade.

### `POST /calendario/eventos`

Corpo (`EventoCriar`): `titulo` (1–200), `descricao` (opcional), `data_inicio`, `data_fim`
(opcional), `setor_id` (opcional).

Resolução do setor do evento:

- `admin_setor`: o evento é sempre do setor dele. Se o payload trouxer `setor_id` diferente do
  próprio, responde **403** — melhor que ignorar em silêncio.
- `superadmin`: usa `setor_id` do payload. Se omitido, cai no `setor_id` do próprio token;
  se ele também for nulo, responde **422** com `{campo: "setor_id", mensagem: ...}`.
- Setor inexistente → **404**.

`autor_id` vem sempre do token, nunca do payload.

Validação: se `data_fim` for informada e for anterior a `data_inicio` → **422** com
`{campo: "data_fim", mensagem: "Data de fim deve ser posterior à data de início"}`.

### `PUT /calendario/eventos/{evento_id}`

Substituição completa dos campos editáveis: `titulo`, `descricao`, `data_inicio`, `data_fim`.
`setor_id` e `autor_id` **não** são editáveis — trocar o setor do evento mudaria quem pode
editá-lo, e não há caso de uso para isso. Escopo verificado contra o `setor_id` atual do evento.

### `DELETE /calendario/eventos/{evento_id}`

204, sem corpo. Mesma checagem de escopo.

### `GET /calendario/aniversariantes`

Query param `mes` (int 1–12, opcional; default = mês corrente do servidor).

Filtro: `ativo = true` **e** `data_nascimento IS NOT NULL` **e**
`EXTRACT(MONTH FROM data_nascimento) = mes`.

Resposta: lista de `{id, nome, dia, setor_id, setor_nome}`, ordenada por `dia` e depois `nome`.
O **ano de nascimento nunca é exposto** — a API devolve só o dia, para não revelar idade.
`setor_nome` é `null` quando o usuário não tem setor.

### Contrato de resposta de evento

`EventoResposta`: `id, titulo, descricao, data_inicio, data_fim, setor_id, setor_nome,
autor_id, autor_nome, criado_em`.

## Estrutura de arquivos

```
backend/app/modules/usuarios/models.py       # novo: Usuario
backend/app/modules/calendario/models.py     # novo: Evento
backend/app/modules/calendario/schemas.py    # novo: Pydantic
backend/app/modules/calendario/service.py    # novo: regra de negócio + escopo
backend/app/modules/calendario/router.py     # novo: endpoints
backend/app/modules/calendario/dependencies.py  # segue vazio (regras genéricas vêm do core)
backend/alembic/versions/<rev>_cria_usuarios_e_eventos.py  # novo
backend/alembic/env.py                       # editado: imports dos models novos
backend/app/main.py                          # editado: include_router
```

`dependencies.py` fica vazio de propósito, igual a `setores`: `arquitetura-backend.md` manda
usar dependency para regra genérica (já coberta por `requer_admin` no core) e checagem no
service para regra que depende do recurso buscado.

## Erros

Formato do handler já existente (`app/core/erros.py`): `{campo?, mensagem}`.

| situação | status | corpo |
|---|---|---|
| sem token / token inválido | 401 | `{mensagem: "Não autenticado"}` |
| `comum` tentando escrever | 403 | `{mensagem: "Acesso negado"}` |
| `admin_setor` fora do setor | 403 | `{mensagem: "Fora do seu setor"}` |
| evento inexistente | 404 | `{mensagem: "Evento não encontrado"}` |
| setor inexistente | 404 | `{mensagem: "Setor não encontrado"}` |
| `data_fim` < `data_inicio` | 422 | `{campo: "data_fim", mensagem: ...}` |
| `superadmin` sem setor e sem `setor_id` | 422 | `{campo: "setor_id", mensagem: ...}` |
| `mes` fora de 1–12 | 422 | `{campo: "mes", mensagem: ...}` |

## Validação

Testes automatizados estão fora do escopo por decisão do time. A validação desta entrega é:

1. `docker compose up -d postgres`; `alembic upgrade head` roda limpo sobre banco vazio, e
   `alembic downgrade base` volta sem erro.
2. Boot da API sem erro de import (`/saude` responde `ok`).
3. Smoke manual roteirizado (script httpx descartável, fora do commit): seed de 2 setores e 3
   usuários (superadmin, admin do setor A, comum) com datas de nascimento; tokens gerados com o
   segredo local; então — `comum` lê e recebe 403 ao criar; `admin_setor` cria no próprio setor,
   edita e deleta; `admin_setor` recebe 403 ao editar evento do setor B; `superadmin` cria em
   qualquer setor; filtros `de`/`ate`/`setor_id` retornam o esperado; aniversariantes do mês
   corrente e de um mês explícito trazem só os ativos com data preenchida, sem ano.

## Fora de escopo

- Frontend (`features/calendario`).
- Router/service de `usuarios` e módulo de autenticação — vêm da branch de auth.
- Log de auditoria das ações de evento (módulo `logs` ainda não existe em `dev`).
- Eventos recorrentes, anexos e convites.
- Testes automatizados.
