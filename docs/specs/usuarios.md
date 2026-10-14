# Usuários (`USU`)

Cadastro dos colaboradores com papel de acesso e setor. Área de Administração, exclusiva de
`superadmin` (GER-03).

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| USU-01 | Listar usuários | ✅ | ⬜ | ⬜ |
| USU-02 | Cadastrar usuário | ✅ | ⬜ | ⬜ |
| USU-03 | Editar usuário | ✅ | ⬜ | ⬜ |
| USU-04 | Desativar usuário (soft delete) | ✅ | ⬜ | ⬜ |
| USU-05 | Primeiro superadmin | ✅ | — | ⬜ |
| USU-06 | Cargo do colaborador | ⬜ | ⬜ | ⬜ |
| USU-07 | Troca e redefinição de senha | ❓ | ❓ | ⬜ |

### USU-01 — Listar usuários
Origem: [ENT H6] · Back ✅ · Front ⬜ · Teste ⬜

`GET /usuarios` — só `superadmin` (outros papéis → `403`). Devolve `id`, `nome`, `email`, `role`,
`setor_id`, `data_nascimento`, `ativo`, `criado_em`; nunca a senha nem o hash. Inclui usuários
desativados.

- Frontend ⬜: página `/usuarios` com a listagem (hoje é só um placeholder).

### USU-02 — Cadastrar usuário
Origem: [ESP] [ENT H6] · Back ✅ · Front ⬜ · Teste ⬜

`POST /usuarios` — só `superadmin`. Campos:

| Campo | Regra |
|---|---|
| `nome` | obrigatório, 1–200, espaços nas pontas removidos |
| `email` | obrigatório, e-mail válido, até 200, único |
| `senha` | obrigatória, 8–128 caracteres |
| `role` | `comum` (padrão), `admin_setor` ou `superadmin` |
| `setor_id` | opcional, precisa existir |
| `data_nascimento` | opcional (alimenta os aniversariantes, CAL-06) |

- **Dado** dados válidos, **então** `201` com o usuário, que consegue fazer login (AUT-01).
- **Dado** e-mail já cadastrado, **então** `409 {"campo": "email", "mensagem": "Já existe um
  usuário com esse e-mail"}` e nenhuma conta é criada.
- **Dado** `setor_id` inexistente, **então** `409 {"campo": "setor_id", "mensagem": "Setor não
  encontrado"}`.
- **Dado** senha curta, e-mail inválido ou papel fora da lista, **então** `422` com o campo.
- Frontend ⬜: formulário com seleção de papel e setor; erro do backend no campo (GER-05).
- ❓ `admin_setor` sem setor é permitido hoje pelo backend, mas esse usuário não consegue criar
  nada (GER-04). Exigir setor para `admin_setor`?

### USU-03 — Editar usuário
Origem: [ENT] · Back ✅ · Front ⬜ · Teste ⬜

`PUT /usuarios/{id}` — só `superadmin`. Atualização parcial de `nome`, `email`, `role`,
`setor_id`, `data_nascimento`, `ativo` (só os campos enviados mudam). Senha não é alterada por aqui.

- **Dado** id inexistente, **então** `404`.
- Mesmos conflitos de USU-02 (`409` em e-mail duplicado ou setor inexistente).
- A mudança só chega ao token do usuário afetado quando o access token dele expira (AUT-03).

### USU-04 — Desativar usuário (soft delete)
Origem: [ENT H6] · Back ✅ · Front ⬜ · Teste ⬜

`DELETE /usuarios/{id}` — só `superadmin`. Marca `ativo = false` e devolve `200` com o usuário
atualizado; o registro e tudo que ele criou (avisos, documentos, eventos, FAQ) continuam.

- **Dado** um usuário desativado, **quando** tenta login, **então** `401` (AUT-01); **quando** tenta
  refresh, **então** `401` (AUT-02).
- Usuário desativado não aparece nos aniversariantes (CAL-06).
- Reativar: `PUT /usuarios/{id}` com `ativo: true`.
- ❓ Impedir que o superadmin desative a si mesmo / o último superadmin ativo.

### USU-05 — Primeiro superadmin
Origem: [COD] · Back ✅ · Front — · Teste ⬜

Como `POST /usuarios` exige superadmin, o primeiro é criado pelo script
`python -m scripts.criar_superadmin` (lê `SUPERADMIN_NOME/EMAIL/SENHA` do ambiente ou pergunta).
É idempotente: e-mail já existente não é alterado.

### USU-06 — Cargo do colaborador
Origem: [ESP] (coluna `CARGO` da modelagem do cliente) · Back ⬜ · Front ⬜ · Teste ⬜

- ⬜ Usuário tem `cargo` opcional (até 100 caracteres), exibido no guia de contatos (SET-11).

### USU-07 — Troca e redefinição de senha
Origem: — · Back ❓ · Front ❓ · Teste ⬜

Não há fluxo de troca de senha pelo próprio usuário nem redefinição pelo superadmin. A decidir se
entra no MVP.
