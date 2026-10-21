# Usuários (`USU`)

Cadastro dos colaboradores com papel de acesso e setor. Área de Administração, exclusiva de
`superadmin` (GER-03).

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| USU-01 | Listar usuários | ✅ | ✅ | ✅ |
| USU-02 | Cadastrar usuário por convite | ✅ | ✅ | ✅ |
| USU-03 | Editar usuário | ✅ | ✅ | ✅ |
| USU-04 | Desativar usuário (soft delete) | ✅ | ✅ | ✅ |
| USU-05 | Primeiro superadmin | ✅ | — | ⬜ |
| USU-06 | Cargo do colaborador | ⬜ | ⬜ | ⬜ |
| USU-07 | Troca e redefinição de senha | ⬜ | ⬜ | ⬜ |
| USU-08 | Reenviar convite | ✅ | ✅ | ✅ |

### USU-01 — Listar usuários
Origem: [ENT H6] · Back ✅ · Front ✅ · Teste ✅

`GET /usuarios` — só `superadmin` (outros papéis → `403`). Devolve `id`, `nome`, `email`, `role`,
`setor_id`, `data_nascimento`, `ativo`, `criado_em`; nunca a senha nem o hash. Inclui usuários
desativados e pendentes.

- Devolve também `convite_pendente`: `true` enquanto o usuário não ativou a conta (AUT-09).
- Frontend ✅: tabela `/usuarios`, busca por nome/e-mail, filtros de perfil/setor/status e paginação local de 10 registros.
- Frontend ✅: usuário pendente mostra o selo "Convite pendente" e o filtro de status ganha a opção
  "Pendentes". Desativado aparece como "Inativo" mesmo que nunca tenha ativado a conta.

### USU-02 — Cadastrar usuário por convite
Origem: [ESP] [ENT H6] [CTX] · Back ✅ · Front ✅ · Teste ✅

`POST /usuarios` — só `superadmin`. O superadmin **não define a senha**: o usuário é criado
**pendente** e recebe por e-mail um convite (magic link, AUT-08) para criar a própria senha e
completar os dados (AUT-09).

| Campo | Regra |
|---|---|
| `nome` | obrigatório, 1–200, espaços nas pontas removidos — provisório, o colaborador confirma na ativação |
| `email` | obrigatório, e-mail válido, até 200, único |
| ~~`senha`~~ | removido: quem cria a senha é o próprio colaborador (AUT-09) |
| `role` | `comum` (padrão), `admin_setor` ou `superadmin` |
| `setor_id` | opcional, precisa existir |
| `data_nascimento` | opcional (alimenta os aniversariantes, MUR-13) |

- **Dado** dados válidos, **então** `201` com o usuário (`convite_pendente: true`) e
  `email_enviado: true`, e o convite chega no e-mail cadastrado com link válido por 72h.
- **Dado** que o envio do e-mail falha (GER-19), **então** o usuário continua criado: `201` com
  `email_enviado: false`; o reenvio é pela USU-08.
- **Dado** um usuário pendente, **quando** tenta login, **então** `401` (AUT-01).
- O e-mail do convite traz o nome do colaborador, o botão/link de ativação, a validade e uma
  versão em texto puro (GER-19).
- **Dado** e-mail já cadastrado (inclusive de usuário pendente ou desativado), **então** `409
  {"campo": "email", "mensagem": "Já existe um usuário com esse e-mail"}`, nenhuma conta é criada
  e nenhum e-mail é enviado.
- **Dado** `setor_id` inexistente, **então** `409 {"campo": "setor_id", "mensagem": "Setor não
  encontrado"}`.
- **Dado** e-mail inválido ou papel fora da lista, **então** `422` com o campo.
- Frontend ✅: formulário com seleção de papel e setor; erro do backend no campo (GER-05).
- Frontend ✅: formulário sem campo de senha. Sucesso → toast "Convite enviado para {email}";
  `email_enviado: false` → toast de aviso com a ação "Reenviar convite".
- O superadmin criado pelo script (USU-05) não passa por convite.
- ❓ `admin_setor` sem setor é permitido hoje pelo backend, mas esse usuário não consegue criar
  nada (GER-04). Exigir setor para `admin_setor`?

### USU-03 — Editar usuário
Origem: [ENT] · Back ✅ · Front ✅ · Teste ✅

`PUT /usuarios/{id}` — só `superadmin`. Atualização parcial de `nome`, `email`, `role`,
`setor_id`, `data_nascimento`, `ativo` (só os campos enviados mudam). Senha não é alterada por aqui.

- **Dado** id inexistente, **então** `404`.
- 🐞 Campos obrigatórios (`nome`, `email`, `role`, `ativo`) explicitamente nulos retornam `422` com o campo, sem alterar o registro; `setor_id` e `data_nascimento` aceitam nulo.
- Mesmos conflitos de USU-02 (`409` em e-mail duplicado ou setor inexistente).
- A mudança só chega ao token do usuário afetado quando o access token dele expira (AUT-03).
- **Dado** uma mudança de `email`, **então** os links pendentes do usuário (convite ou
  redefinição de senha) deixam de valer (AUT-08). Se ele ainda for pendente, o superadmin reenvia
  o convite para o e-mail novo (USU-08).

### USU-04 — Desativar usuário (soft delete)
Origem: [ENT H6] · Back ✅ · Front ✅ · Teste ✅

`DELETE /usuarios/{id}` — só `superadmin`. Marca `ativo = false` e devolve `200` com o usuário
atualizado; o registro e tudo que ele criou (avisos, documentos, eventos, FAQ) continuam.

- **Dado** um usuário desativado, **quando** tenta login, **então** `401` (AUT-01); **quando** tenta
  refresh, **então** `401` (AUT-02).
- Usuário desativado não aparece nos aniversariantes (MUR-13).
- Reativar: `PUT /usuarios/{id}` com `ativo: true`.
- **Dado** um usuário com links pendentes (convite ou redefinição de senha), **quando** é
  desativado, **então** os links deixam de valer (AUT-08). Desativar um pendente é o jeito de
  cancelar o convite; reativá-lo não reenvia nada automaticamente (USU-08).
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
Origem: [CTX] · Back ⬜ · Front ⬜ · Teste ⬜

Duas entradas: quem esqueceu a senha pede um magic link por e-mail (AUT-08, finalidade
`redefinicao_senha`), e quem está logado troca a própria senha. O superadmin nunca vê nem define a
senha de ninguém; para um colaborador que esqueceu, o caminho é "Esqueci minha senha". Os endpoints
moram em `/auth` (módulo `autenticacao`).

**Esqueci minha senha** — `POST /auth/redefinicao-senha` com `{email}`, sem login:

- **Dado** qualquer e-mail válido, **então** `202 {"mensagem": "Se o e-mail estiver cadastrado,
  enviaremos um link para redefinir a senha."}` — a mesma resposta exista ou não a conta.
- **Dado** e-mail de usuário ativo que já ativou a conta, **então** envia o link (válido por 60
  min) e invalida os links de redefinição anteriores.
- **Dado** e-mail inexistente, de usuário desativado ou de usuário pendente, **então** nada é
  enviado (o pendente precisa de um novo convite, USU-08).
- **Dado** que o envio falha, **então** a resposta é a mesma; a falha fica só no log técnico.
- ❓ Limitar pedidos por e-mail/IP (ex: um a cada 5 minutos) — hoje a aplicação não tem rate limit.

`POST /auth/redefinicao-senha/verificar` com `{token}`, sem login:

- **Dado** token de redefinição válido, **então** `200 {email}`, sem consumir o token.
- **Dado** token inválido (AUT-08), **então** `400`.

`POST /auth/redefinicao-senha/confirmar` com `{token, senha}`, sem login:

- **Dado** token válido e senha de 8–128 caracteres, **então** grava a nova senha, marca o token
  como usado, **revoga todos os refresh tokens** do usuário (encerra as sessões abertas em outros
  computadores) e responde `200` no formato de AUT-01 — já entra logado.
- **Dado** senha curta, **então** `422` com o campo, e o token continua válido.
- **Dado** token inválido (AUT-08), **então** `400`.

**Trocar senha** — `PUT /auth/senha` com `{senha_atual, senha_nova}`, qualquer autenticado:

- **Dado** `senha_atual` correta e `senha_nova` de 8–128 caracteres, **então** grava a nova senha,
  revoga todos os refresh tokens do usuário e responde `200` no formato de AUT-01 (tokens novos
  para a sessão atual).
- **Dado** `senha_atual` errada, **então** `400 {"campo": "senha_atual", "mensagem": "Senha atual
  incorreta"}` e nada muda.
- **Dado** `senha_nova` curta, **então** `422` com o campo.

Frontend:

- Link "Esqueci minha senha" na tela de login → `/esqueci-senha` (campo de e-mail) → depois de
  enviar, mostra a mensagem neutra da API.
- `/redefinir-senha` (link do e-mail): verifica o token; inválido → "Link inválido ou expirado" com
  link para `/esqueci-senha`; válido → nova senha + confirmação. Sucesso → `entrar()` e `/mural`.
- Botão "Alterar senha" ao lado de "Sair", abrindo um modal com senha atual, nova senha e
  confirmação. Sucesso → grava os tokens novos e mostra toast.

### USU-08 — Reenviar convite
Origem: [CTX] · Back ✅ · Front ✅ · Teste ✅

`POST /usuarios/{id}/convite` — só `superadmin`. Gera um novo convite (AUT-08, válido por 72h) e
envia para o e-mail atual do usuário.

- **Dado** um usuário pendente e ativo, **então** `200 {"email_enviado": true}`, um novo e-mail
  chega e o link anterior deixa de valer.
- **Dado** que o envio falha (GER-19), **então** `200 {"email_enviado": false}` e o link anterior
  continua invalidado.
- **Dado** um usuário que já ativou a conta, **então** `409 {"mensagem": "Usuário já ativou a
  conta"}`.
- **Dado** um usuário desativado, **então** `409 {"mensagem": "Usuário desativado"}` — reative
  antes (USU-04).
- **Dado** id inexistente, **então** `404`.
- Frontend: ação "Reenviar convite" na linha de usuário pendente, com toast de sucesso ou de aviso
  conforme `email_enviado`.
