# Central de dúvidas / FAQ (`DUV`)

Módulo 2 do MVP: "Central de dúvidas (FAQ) — respostas para perguntas frequentes sobre processos
internos e normas hospitalares" `[ESP]`.

FAQ é cadastrada **diretamente por admin**; não existe envio de pergunta por colaborador `comum`
nem fluxo de ticket `[CTX]`.

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| DUV-01 | Listar perguntas | ✅ | 🟡 | ⬜ |
| DUV-02 | Consultar uma pergunta | ✅ | — | ⬜ |
| DUV-03 | Cadastrar pergunta e resposta | ✅ | 🟡 | ⬜ |
| DUV-04 | Editar pergunta e resposta | ✅ | 🟡 | ⬜ |
| DUV-05 | Excluir pergunta | ✅ | 🟡 | ⬜ |
| DUV-06 | Tela da central de dúvidas | — | 🟡 | ⬜ |

> 🟡 no frontend: a tela existe mas usa dados mockados em `features/duvidas/api.ts`, criados quando
> o modelo de FAQ ainda não estava decidido. Falta trocar o mock pela API real.

### DUV-01 — Listar perguntas
Origem: [ESP] [ENT H4] · Back ✅ · Front 🟡 · Teste ⬜

`GET /duvidas/faq` — qualquer autenticado, sem papel admin; perguntas de todos os setores, em
ordem de criação. Cada item traz `pergunta`, `resposta`, setor e autor com nome, `criado_em`,
`atualizado_em`.

### DUV-02 — Consultar uma pergunta
Origem: [ENT] · Back ✅ · Front — · Teste ⬜

`GET /duvidas/faq/{id}` — qualquer autenticado; `404 "Pergunta não encontrada"`.

### DUV-03 — Cadastrar pergunta e resposta
Origem: [ENT H4] · Back ✅ · Front 🟡 · Teste ⬜

`POST /duvidas/faq` (JSON) — `admin_setor` ou `superadmin`; setor por GER-04.

- `pergunta` obrigatória, 1–500; `resposta` obrigatória, não vazia → senão `422`.
- **Dado** FAQ criada por admin de um setor, **então** ela fica visível para qualquer autenticado.
- **Dado** um `comum`, **então** `403`.

### DUV-04 — Editar pergunta e resposta
Origem: [ENT H4] · Back ✅ · Front 🟡 · Teste ⬜

`PUT /duvidas/faq/{id}` — escopo por setor (GER-04). Atualização parcial; campo `null` → `422`;
corpo vazio não muda nada; mudança atualiza `atualizado_em`.

- **Dado** `admin_setor` de outro setor, **então** `403` e a FAQ não muda.

### DUV-05 — Excluir pergunta
Origem: [ENT H4] · Back ✅ · Front 🟡 · Teste ⬜

`DELETE /duvidas/faq/{id}` → `204`; escopo por setor (`admin_setor` de outro setor → `403`).

### DUV-06 — Tela da central de dúvidas
Origem: [ENT H4] · Back — · Front 🟡 · Teste ⬜

- ⬜ Integração com a API real no lugar do mock (setores vindos de `GET /setores`).
- Busca local em pergunta e resposta.
- Setor de origem visível em cada pergunta.
- `comum` lê mas não vê botões de criar/editar/remover; admin só vê editar/remover nas perguntas do
  próprio setor (`superadmin` em todas) — GER-12.
