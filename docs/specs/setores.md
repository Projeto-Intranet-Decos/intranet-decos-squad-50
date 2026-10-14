# Setores, ramais e guia de contatos (`SET`)

Módulo 3 do MVP: "Diretório & ramais — busca de colaboradores e ramais telefônicos organizados por
setor e andar" `[ESP]`.

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| SET-01 | Listar setores com ramais | ✅ | ✅ | ⬜ |
| SET-02 | Consultar um setor | ✅ | — | ⬜ |
| SET-03 | Criar setor | ✅ | ✅ | ⬜ |
| SET-04 | Renomear setor | ✅ | ✅ | ⬜ |
| SET-05 | Remover setor | ✅ | ✅ | ⬜ |
| SET-06 | Listar ramais de um setor | ✅ | — | ⬜ |
| SET-07 | Cadastrar ramal | ✅ | ✅ | ⬜ |
| SET-08 | Editar e remover ramal | ✅ | ✅ | ⬜ |
| SET-09 | Busca e ordenação na tela de setores | — | ✅ | ⬜ |
| SET-10 | Andar do setor | ⬜ | ⬜ | ⬜ |
| SET-11 | Guia de contatos (busca de colaboradores) | ❓ | ❓ | ⬜ |

### SET-01 — Listar setores com ramais
Origem: [ENT H5] · Back ✅ · Front ✅ · Teste ⬜

`GET /setores` — qualquer usuário autenticado. Setores em ordem alfabética, cada um com a lista de
`ramais` ordenada numericamente (mais curtos primeiro: "20" antes de "100").

### SET-02 — Consultar um setor
Origem: [ENT] · Back ✅ · Front — · Teste ⬜

`GET /setores/{id}` — qualquer autenticado; `404 "Setor não encontrado"` se não existe.

### SET-03 — Criar setor
Origem: [ENT H5] [CTX] · Back ✅ · Front ✅ · Teste ⬜

`POST /setores` — só `superadmin` (`admin_setor` → `403`). `nome` obrigatório, 1–200, único.

- **Dado** nome já usado, **então** `409 {"campo": "nome", "mensagem": "Já existe um setor com
  esse nome"}`.
- **Dado** setor criado, **então** ele aparece em `GET /setores`.
- Frontend: botão "Novo setor" só para `superadmin`.

### SET-04 — Renomear setor
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

`PUT /setores/{id}` — só `superadmin`. Mesmas regras de nome de SET-03; `404` se não existe.
Renomear não mexe nos arquivos do MinIO (as chaves usam o id do setor).

### SET-05 — Remover setor
Origem: [ENT H5] [COD] · Back ✅ · Front ✅ · Teste ⬜

`DELETE /setores/{id}` — só `superadmin`, `204`.

- Ramais do setor são removidos junto (`ON DELETE CASCADE`).
- **Dado** setor com usuários, avisos, eventos, documentos ou FAQ vinculados, **então** `409`
  `"Setor possui registros vinculados e não pode ser removido"` e nada é removido.

### SET-06 — Listar ramais de um setor
Origem: [ENT] · Back ✅ · Front — · Teste ⬜

`GET /setores/{id}/ramais` — qualquer autenticado; `404` se o setor não existe.

### SET-07 — Cadastrar ramal
Origem: [ENT H5] · Back ✅ · Front ✅ · Teste ⬜

`POST /setores/{id}/ramais` com `{numero}` — `admin_setor` do próprio setor ou `superadmin`
(GER-04). Um setor pode ter vários ramais `[CTX]`.

- `numero`: 1–20 caracteres, apenas dígitos, parênteses, `+`, `-` e espaço → senão `422`.
- **Dado** número já cadastrado **no mesmo setor**, **então** `409 {"campo": "numero",
  "mensagem": "Esse ramal já está cadastrado no setor"}`. O mesmo número em outro setor é aceito.
- **Dado** `admin_setor` de outro setor, **então** `403`.

### SET-08 — Editar e remover ramal
Origem: [ENT H5] · Back ✅ · Front ✅ · Teste ⬜

`PUT /ramais/{id}` e `DELETE /ramais/{id}` (`204`) — mesmo escopo de SET-07; `404 "Ramal não
encontrado"`. Edição respeita a mesma validação e unicidade.

### SET-09 — Busca e ordenação na tela de setores
Origem: [ESP] [ENT] · Back — · Front ✅ · Teste ⬜

- Campo de busca filtra por nome do setor (sem diferenciar maiúsculas) **ou** por trecho de
  número de ramal.
- Ordenação: nome (A–Z, padrão) ou ramal crescente.
- Edição de ramais aparece só para quem pode editar aquele setor (GER-12).

### SET-10 — Andar do setor
Origem: [ESP] [ENT persona Carla] · Back ⬜ · Front ⬜ · Teste ⬜

- ⬜ Setor tem `andar` opcional (texto curto, ex: "Térreo", "3º andar"), editável por
  `superadmin`, exibido na listagem e usado na busca e como filtro/agrupamento na tela.

### SET-11 — Guia de contatos (busca de colaboradores)
Origem: [ESP] · Back ❓ · Front ❓ · Teste ⬜

O cliente pede busca de **colaboradores** além dos ramais. Hoje `GET /usuarios` é exclusivo de
`superadmin` e não há diretório para os demais.

- ❓ Definir: endpoint de diretório para qualquer autenticado com dados mínimos (nome, setor,
  cargo — USU-06, andar e ramais do setor), sem e-mail/data de nascimento? Usuários desativados
  ficam de fora?
