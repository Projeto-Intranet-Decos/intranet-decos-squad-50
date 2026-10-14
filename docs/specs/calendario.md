# Calendário: eventos e aniversariantes (`CAL`)

Módulo 1 do MVP: "Aniversariantes do mês — listagem automática com busca por data e setor" e
"Mural de eventos — calendário ou lista com próximos eventos, treinamentos e ações internas"
`[ESP]`.

Aniversariante **não é registro próprio**: é derivado de `usuarios.data_nascimento` `[CTX]`.

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| CAL-01 | Listar eventos por período | ✅ | ✅ | 🟡 |
| CAL-02 | Evento de vários dias aparece em todo período que atravessa | 🐞 | ⬜ | 🔴 |
| CAL-03 | Consultar um evento | ✅ | ✅ | ⬜ |
| CAL-04 | Criar evento | ✅ | ✅ | ⬜ |
| CAL-05 | Editar e excluir evento | ✅ | ✅ | ⬜ |
| CAL-06 | Aniversariantes do mês | ✅ | ✅ | ⬜ |
| CAL-07 | Filtrar aniversariantes por setor e data | ⬜ | ⬜ | ⬜ |
| CAL-08 | Tela do calendário | — | ✅ | ⬜ |

### CAL-01 — Listar eventos por período
Origem: [ESP] [ENT H3] · Back ✅ · Front ✅ · Teste 🟡

`GET /calendario/eventos?de=&ate=&setor_id=` — qualquer autenticado; todos os parâmetros
opcionais; `de`/`ate` são datas (`YYYY-MM-DD`) interpretadas em UTC, `ate` inclusivo até o fim do
dia. Ordenado por `data_inicio` e depois `titulo`. Cada evento traz `setor_nome` e `autor_nome`.

- **Dado** evento criado num período, **quando** consulta aquele período, **então** o evento
  aparece.
- **Dado** `setor_id`, **então** só eventos daquele setor ("eventos do meu setor", H3).

### CAL-02 — Evento de vários dias aparece em todo período que atravessa
Origem: [ENT H3 — caso de borda conhecido] · Back 🐞 · Front ⬜ · Teste 🔴

Hoje o filtro só olha `data_inicio`, então um evento de 30/09 a 02/10 some da consulta de outubro.

- **Dado** evento com `data_inicio` antes de `de` e `data_fim` dentro ou depois do período,
  **então** ele aparece na consulta. Regra: `data_inicio <= fim(ate)` **e**
  `coalesce(data_fim, data_inicio) >= início(de)`.
- **Dado** evento sem `data_fim`, **então** o comportamento atual se mantém (só `data_inicio`
  conta).
- Frontend: evento aparece em todos os dias que cobre nas visões de dia/semana/mês.

### CAL-03 — Consultar um evento
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

`GET /calendario/eventos/{id}` — qualquer autenticado; `404 "Evento não encontrado"`.

### CAL-04 — Criar evento
Origem: [ENT H3] · Back ✅ · Front ✅ · Teste ⬜

`POST /calendario/eventos` (JSON) — `admin_setor` ou `superadmin`; setor por GER-04.

| Campo | Regra |
|---|---|
| `titulo` | obrigatório, 1–200 |
| `descricao` | opcional |
| `data_inicio` | obrigatória (data e hora) |
| `data_fim` | opcional, `>= data_inicio` |
| `setor_id` | opcional (GER-04) |

- Data/hora sem fuso é tratada como UTC.
- **Dado** `data_fim` anterior a `data_inicio`, **então** `422 {"campo": "data_fim", "mensagem":
  "Data de fim deve ser posterior à data de início"}`.
- Suporta evento de um único dia e de vários dias.

### CAL-05 — Editar e excluir evento
Origem: [ENT H3] [CTX] · Back ✅ · Front ✅ · Teste ⬜

- `PUT /calendario/eventos/{id}` substitui `titulo`, `descricao`, `data_inicio`, `data_fim`
  (atualização completa, não parcial); mesma validação de CAL-04; setor não muda.
- `DELETE /calendario/eventos/{id}` → `204`.
- Escopo por setor nos dois (GER-04).

### CAL-06 — Aniversariantes do mês
Origem: [ESP] [ENT H3] · Back ✅ · Front ✅ · Teste ⬜

`GET /calendario/aniversariantes?mes=` — qualquer autenticado. `mes` de 1 a 12 (fora disso →
`422`); sem `mes`, usa o mês atual.

- Retorna `id`, `nome`, `dia`, `setor_id`, `setor_nome` (ou `null`), ordenado por dia e nome.
- Só usuários **ativos** com `data_nascimento` preenchida entram.
- Frontend: painel de aniversariantes no calendário e no mural.

### CAL-07 — Filtrar aniversariantes por setor e data
Origem: [ESP] [ENT H3] · Back ⬜ · Front ⬜ · Teste ⬜

O cliente pede busca de aniversariantes "por data e setor"; hoje só existe o filtro por mês.

- ⬜ **Dado** `setor_id`, **então** só aniversariantes daquele setor.
- ⬜ **Dado** um dia (ex: `dia=` junto do `mes`), **então** só quem faz aniversário naquele dia.
- Frontend ⬜: filtros no painel de aniversariantes.

### CAL-08 — Tela do calendário
Origem: [ENT H3] · Back — · Front ✅ · Teste ⬜

- Visões de dia, semana, mês e ano, com navegação para períodos anterior/seguinte; a consulta usa
  o intervalo da visão atual.
- Painéis de próximos eventos e de aniversariantes do mês.
- Criar/editar evento só para `admin_setor`/`superadmin`; o seletor de setor fica travado para
  `admin_setor` e na edição.
