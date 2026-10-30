# Acesso rápido (`ATA`)

Links externos fixos na barra lateral (ex: prontuário eletrônico, portal do colaborador), iguais
para todo mundo. Não pertencem a setor: são configuração **sistêmica**, mantida só pelo
`superadmin` `[CTX]`.

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| ATA-01 | Listar atalhos | ✅ | ✅ | ✅ |
| ATA-02 | Cadastrar atalho | ✅ | ✅ | ✅ |
| ATA-03 | Editar atalho | ✅ | ✅ | ✅ |
| ATA-04 | Excluir atalho | ✅ | ✅ | ✅ |
| ATA-05 | Gestão na barra lateral | — | ✅ | ✅ |

### ATA-01 — Listar atalhos
Origem: [CTX] · Back ✅ · Front ✅ · Teste ✅

`GET /atalhos` — público, sem login (AUT-10). Devolve todos os atalhos em ordem de criação, cada um com
`id`, `titulo`, `url`, `criado_em`, `atualizado_em`.

- **Dado** um `comum`, **quando** lista, **então** `200` com os atalhos cadastrados.
- Sem token → `401` (GER-02).

### ATA-02 — Cadastrar atalho
Origem: [CTX] · Back ✅ · Front ✅ · Teste ✅

`POST /atalhos` (JSON `{titulo, url}`) — só `superadmin` (GER-03) → `201`.

- `titulo` obrigatório, 1–100 caracteres (espaços nas pontas são removidos) → senão `422`
  `campo: "titulo"`.
- `url` obrigatória, até 500 caracteres, começando com `http://` ou `https://` → senão `422`
  `campo: "url"`.
- **Dado** um `comum` ou `admin_setor`, **então** `403 "Acesso negado"` e nada é criado.

### ATA-03 — Editar atalho
Origem: [CTX] · Back ✅ · Front ✅ · Teste ✅

`PUT /atalhos/{id}` — só `superadmin`. Atualização parcial com as mesmas validações de ATA-02;
campo `null` → `422`; corpo vazio não muda nada; mudança atualiza `atualizado_em`.

- Id inexistente → `404 "Atalho não encontrado"`.
- **Dado** um `admin_setor`, **então** `403` e o atalho não muda.

### ATA-04 — Excluir atalho
Origem: [CTX] · Back ✅ · Front ✅ · Teste ✅

`DELETE /atalhos/{id}` — só `superadmin` → `204`; id inexistente → `404`.

### ATA-05 — Gestão na barra lateral
Origem: [CTX] · Back — · Front ✅ · Teste ✅

- A seção "Acesso rápido" da barra lateral lista os atalhos da API; cada um abre em nova aba.
- Só o `superadmin` vê os botões de adicionar, editar e excluir (só UX, GER-12). Com o menu
  recolhido, os botões somem e ficam só os ícones dos links.
- Criação e edição são **inline** na própria lista (sem modal): nome e URL, `Enter` salva, `Esc`
  cancela. Erro com `campo` vai para o campo e para o toast (GER-05).
- Exclusão pede confirmação inline no próprio item.
