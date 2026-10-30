# Central de dúvidas / FAQ (`DUV`)

Módulo 2 do MVP: "Central de dúvidas (FAQ) — respostas para perguntas frequentes sobre processos
internos e normas hospitalares" `[ESP]`.

FAQ é cadastrada **diretamente por admin**; não existe envio de pergunta por colaborador `comum`
nem fluxo de ticket `[CTX]`.

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| DUV-01 | Listar perguntas | ✅ | ✅ | 🟡 |
| DUV-02 | Consultar uma pergunta | ✅ | — | ⬜ |
| DUV-03 | Cadastrar pergunta e resposta | ✅ | ✅ | 🟡 |
| DUV-04 | Editar pergunta e resposta | ✅ | ✅ | 🟡 |
| DUV-05 | Excluir pergunta | ✅ | ✅ | 🟡 |
| DUV-06 | Tela da central de dúvidas | — | ✅ | 🟡 |

> 🟡 em Teste (DUV-01, 03–05): só o frontend tem teste (`features/duvidas/api.test.ts`, contrato da
> chamada); falta o pytest dos endpoints.

### DUV-01 — Listar perguntas
Origem: [ESP] [ENT H4] · Back ✅ · Front ✅ · Teste 🟡

`GET /duvidas/faq` — qualquer autenticado, sem papel admin; perguntas de todos os setores, em
ordem de criação. Cada item traz `pergunta`, `resposta`, setor e autor com nome, `criado_em`,
`atualizado_em`.

### DUV-02 — Consultar uma pergunta
Origem: [ENT] · Back ✅ · Front — · Teste ⬜

`GET /duvidas/faq/{id}` — qualquer autenticado; `404 "Pergunta não encontrada"`.

### DUV-03 — Cadastrar pergunta e resposta
Origem: [ENT H4] · Back ✅ · Front ✅ · Teste 🟡

`POST /duvidas/faq` (JSON) — `admin_setor` ou `superadmin`; setor por GER-04.

- `pergunta` obrigatória, 1–500; `resposta` obrigatória, não vazia → senão `422`.
- **Dado** FAQ criada por admin de um setor, **então** ela fica visível para qualquer autenticado.
- **Dado** um `comum`, **então** `403`.

### DUV-04 — Editar pergunta e resposta
Origem: [ENT H4] · Back ✅ · Front ✅ · Teste 🟡

`PUT /duvidas/faq/{id}` — escopo por setor (GER-04). Atualização parcial; campo `null` → `422`;
corpo vazio não muda nada; mudança atualiza `atualizado_em`.

- **Dado** `admin_setor` de outro setor, **então** `403` e a FAQ não muda.

### DUV-05 — Excluir pergunta
Origem: [ENT H4] · Back ✅ · Front ✅ · Teste 🟡

`DELETE /duvidas/faq/{id}` → `204`; escopo por setor (`admin_setor` de outro setor → `403`).

### DUV-06 — Tela da central de dúvidas
Origem: [ENT H4] · Back — · Front ✅ · Teste 🟡 (integração, setor e erro em `PaginaDuvidas.test.tsx`;
animação em `ItemFaq.test.tsx`; busca e visibilidade dos botões sem teste)

- Lista, cadastro, edição e exclusão pela API real (DUV-01, DUV-03 a DUV-05); setores do
  formulário vêm de `GET /setores`.
- Setor no formulário só ao cadastrar e só para `superadmin` (GER-04): `admin_setor` publica
  sempre no próprio setor, sem seletor; na edição o setor não muda (o `PUT` não recebe `setor_id`).
- Erro da API mostra a `mensagem` do backend (GER-05) em toast.
- Busca local em pergunta e resposta.
- Setor de origem visível em cada pergunta.
- Abrir uma pergunta anima a resposta (altura + opacidade); fechar anima de volta. Sem animação
  com "Reduzir animações" (GER-14) ou `prefers-reduced-motion`.
- `comum` lê mas não vê botões de criar/editar/remover; admin só vê editar/remover nas perguntas do
  próprio setor (`superadmin` em todas) — GER-12.
