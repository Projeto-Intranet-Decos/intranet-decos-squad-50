# Autenticação (`AUT`)

Login próprio com tabela interna de usuários `[ESP]`, JWT de acesso + refresh token rastreável no
banco.

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| AUT-01 | Login com e-mail e senha | ✅ | ✅ | ⬜ |
| AUT-02 | Renovação do access token | ✅ | ✅ | ⬜ |
| AUT-03 | Conteúdo e validade do access token | ✅ | ✅ | ⬜ |
| AUT-04 | Renovação automática no frontend | — | ✅ | ⬜ |
| AUT-05 | Rotas protegidas no frontend | — | ✅ | ⬜ |
| AUT-06 | Logout com revogação do refresh token | ⬜ | 🟡 | ⬜ |
| AUT-07 | Armazenamento seguro de credenciais | ✅ | — | ⬜ |

### AUT-01 — Login com e-mail e senha
Origem: [ESP] [ENT] · Back ✅ · Front ✅ · Teste ⬜

`POST /auth/login` com `{email, senha}`.

- **Dado** credenciais corretas de um usuário ativo, **então** `200` com `access_token`,
  `refresh_token`, `token_type: "bearer"` e `usuario` (mesmo formato de `UsuarioResposta`), e um
  refresh token é gravado no banco.
- **Dado** e-mail inexistente, senha errada **ou** usuário desativado, **então** `401`
  `"Email ou senha invalidos"` — a mesma mensagem nos três casos, pra não revelar qual falhou.
- Frontend: formulário de login; em sucesso guarda os tokens e vai para `/mural`.

### AUT-02 — Renovação do access token
Origem: [ENT] [COD] · Back ✅ · Front ✅ · Teste ⬜

`POST /auth/refresh` com `{refresh_token}`.

- **Dado** refresh token existente, não revogado, não expirado e de usuário ativo, **então** `200`
  com novo `access_token` (o refresh token não é rotacionado).
- **Dado** refresh token desconhecido, revogado ou expirado, **então** `401`.
- **Dado** usuário desativado depois do login, **então** `401` — é isso que encerra o acesso dele
  no fim do access token atual.

### AUT-03 — Conteúdo e validade do access token
Origem: [COD] · Back ✅ · Front ✅ · Teste ⬜

- Payload: `sub` (id do usuário), `role`, `setor_id` (ou `null`), `exp`. Assinatura HS256 com
  `JWT_SECRET`.
- Validade: `ACCESS_TOKEN_MINUTOS` (padrão 30). Refresh: `REFRESH_TOKEN_DIAS` (padrão 7).
- Mudança de papel/setor e desativação só valem para o usuário quando o access token atual expira
  (trade-off aceito, ver `docs/arquitetura-backend.md`).
- O frontend lê `id`, `role` e `setorId` do payload para decidir a UX (GER-12).

### AUT-04 — Renovação automática no frontend
Origem: [COD] · Back — · Front ✅ · Teste ⬜

- **Dado** uma requisição que volta `401`, **quando** não é `/auth/login` nem `/auth/refresh` e
  ainda não foi repetida, **então** o interceptor chama `/auth/refresh` e repete a requisição com o
  novo token.
- Várias requisições com `401` ao mesmo tempo compartilham **uma** renovação.
- **Dado** que a renovação falha, **então** os tokens são apagados e o usuário vai para `/login`.

### AUT-05 — Rotas protegidas no frontend
Origem: [ENT] [CTX] · Back — · Front ✅ · Teste ⬜

- Sem sessão, qualquer rota interna redireciona para `/login`.
- `/usuarios` e `/logs` só para `superadmin`; os outros papéis vão para `/nao-autorizado`.
- `/` redireciona para `/mural`.

### AUT-06 — Logout com revogação do refresh token
Origem: [COD] (coluna `revogado` já existe) · Back ⬜ · Front 🟡 · Teste ⬜

Hoje o "sair" do frontend só apaga os tokens do `localStorage`; o refresh token continua válido no
banco até expirar.

- ⬜ **Dado** um refresh token válido, **quando** o usuário sai, **então** o token é marcado como
  `revogado` e um `/auth/refresh` posterior com ele responde `401`.
- ❓ Revogar todos os refresh tokens do usuário ao desativá-lo (USU-04) — a decidir.

### AUT-07 — Armazenamento seguro de credenciais
Origem: [ESP] [COD] · Back ✅ · Front — · Teste ⬜

- Senha guardada só como hash (`pwdlib`, algoritmo recomendado — argon2).
- Refresh token guardado só como hash SHA-256; o valor em claro existe apenas na resposta do login.
- Dívida técnica registrada: tokens no `localStorage` (vulnerável a XSS) — rever antes de produção.
