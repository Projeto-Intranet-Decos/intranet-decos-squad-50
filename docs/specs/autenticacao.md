# Autenticação (`AUT`)

Login próprio com tabela interna de usuários `[ESP]`, JWT de acesso + refresh token rastreável no
banco. Ativação de conta e redefinição de senha por magic link enviado por e-mail (AUT-08).

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| AUT-01 | Login com e-mail e senha | ✅ | ✅ | 🟡 |
| AUT-02 | Renovação do access token | ✅ | ✅ | ⬜ |
| AUT-03 | Conteúdo e validade do access token | ✅ | ✅ | 🟡 |
| AUT-04 | Renovação automática no frontend | — | ✅ | ⬜ |
| AUT-05 | Rotas protegidas no frontend | — | ✅ | ⬜ |
| AUT-06 | Logout com revogação do refresh token | ⬜ | 🟡 | ⬜ |
| AUT-07 | Armazenamento seguro de credenciais | ✅ | — | ⬜ |
| AUT-08 | Magic link (token de uso único por e-mail) | ✅ | ✅ | ✅ |
| AUT-09 | Ativação de conta pelo convite | ✅ | ✅ | ✅ |

### AUT-01 — Login com e-mail e senha
Origem: [ESP] [ENT] · Back ✅ · Front ✅ · Teste 🟡

`POST /auth/login` com `{email, senha}`.

- **Dado** credenciais corretas de um usuário ativo, **então** `200` com `access_token`,
  `refresh_token`, `token_type: "bearer"` e `usuario` (mesmo formato de `UsuarioResposta`), e um
  refresh token é gravado no banco.
- **Dado** e-mail inexistente, senha errada **ou** usuário desativado, **então** `401`
  `"Email ou senha invalidos"` — a mesma mensagem nos três casos, pra não revelar qual falhou.
- **Dado** um usuário pendente (convidado que ainda não ativou a conta, USU-02), **então** `401`
  com a mesma mensagem (único critério do AUT-01 com teste até agora).
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
Origem: [COD] · Back ✅ · Front ✅ · Teste 🟡

- Payload: `sub` (id do usuário), `nome`, `role`, `setor_id` (ou `null`), `exp`. Assinatura HS256
  com `JWT_SECRET`. Testados até agora: o payload e o `nome` atualizado na renovação.
- Validade: `ACCESS_TOKEN_MINUTOS` (padrão 30). Refresh: `REFRESH_TOKEN_DIAS` (padrão 7).
- Mudança de papel/setor e desativação só valem para o usuário quando o access token atual expira
  (trade-off aceito, ver `docs/arquitetura-backend.md`).
- O frontend lê `id`, `role` e `setorId` do payload para decidir a UX (GER-12).
- O indicador do usuário logado, no rodapé do menu lateral, mostra o `nome` do payload. O papel
  só aparece, abaixo do nome, para o `superadmin`. Mudança de nome segue a mesma regra de papel e
  setor: aparece quando o access token é renovado.
- **Dado** que o access token é renovado (AUT-04), **então** o indicador e o resto da UX passam a
  usar o token novo sem recarregar a página. 🐞 corrigido: o usuário era lido do token só ao montar
  a tela.
- **Dado** um access token emitido antes de o `nome` entrar no payload, **então** o frontend
  renova a sessão uma vez, na hora, e o indicador mostra o nome. 🐞 corrigido: ficava vazio.

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

### AUT-08 — Magic link (token de uso único por e-mail)
Origem: [CTX] · Back ✅ · Front ✅ · Teste ✅

Mecanismo único para os e-mails que trazem o usuário de volta à aplicação para concluir uma ação
sem estar logado. Finalidades: `convite` (AUT-09) e `redefinicao_senha` (USU-07). Finalidade nova
entra aqui, sem tabela nova. O token não é sessão: só autoriza a ação da sua finalidade.

- Token aleatório (`secrets.token_urlsafe(32)`) guardado só como hash SHA-256, como o refresh token
  (AUT-07), na tabela `tokens_uso_unico` (`usuario_id`, `finalidade`, `expira_em`, `usado_em`,
  `criado_em`). O valor em claro existe só no e-mail.
- Validade por finalidade: convite `CONVITE_HORAS` (padrão 72); redefinição de senha
  `REDEFINICAO_SENHA_MINUTOS` (padrão 60).
- Link: `{URL_FRONTEND}/ativar-conta#token=...` ou `{URL_FRONTEND}/redefinir-senha#token=...`. O
  token vai no fragmento, que o navegador não envia ao servidor (fica fora dos logs do nginx e do
  `Referer`).
- O token trafega no **corpo** das requisições à API, nunca no path nem na query.
- **Dado** token inexistente, expirado, já usado, de outra finalidade ou de usuário desativado,
  **então** `400 {"mensagem": "Link inválido ou expirado"}` — a mesma mensagem em todos os casos.
- **Dado** um token emitido, **quando** outro da mesma finalidade é emitido para o mesmo usuário,
  **então** o anterior deixa de valer.
- **Dado** um usuário com links pendentes, **quando** o e-mail dele muda (USU-03) ou ele é
  desativado (USU-04), **então** todos os links pendentes deixam de valer.
- **Dado** um token, **quando** é só verificado (`.../verificar`), **então** continua válido. Só a
  confirmação grava `usado_em`, na mesma transação da mudança — filtros de e-mail (ex: Safe Links
  do Microsoft 365) abrem os links antes da pessoa, então abrir a página não pode gastar o token.
- **Dado** um token já usado com sucesso, **quando** é reenviado, **então** `400`.
- **Dado** uma confirmação que falha na validação (`422`), **então** o token continua válido.
- Frontend: as páginas do link são públicas (fora de `RotaProtegida`), leem o token do fragmento e
  o tiram da barra de endereço (`history.replaceState`). Ao confirmar, apagam a sessão que estiver
  no navegador antes de gravar a nova (computador compartilhado no posto).

### AUT-09 — Ativação de conta pelo convite
Origem: [CTX] · Back ✅ · Front ✅ · Teste ✅

O colaborador convidado (USU-02) abre o link do e-mail, cria a senha e completa os dados pessoais;
ao terminar já está logado. E-mail, papel e setor vêm do convite e não mudam aqui.

`POST /auth/convite/verificar` com `{token}`, sem login:

- **Dado** token de convite válido, **então** `200` com `email`, `nome` (o provisório do
  superadmin) e `data_nascimento` (ou `null`), sem consumir o token.
- **Dado** token inválido (AUT-08), **então** `400`.

`POST /auth/convite/aceitar` com `{token, senha, nome, data_nascimento?}`, sem login:

| Campo | Regra |
|---|---|
| `senha` | obrigatória, 8–128 caracteres |
| `nome` | obrigatório, 1–200, espaços nas pontas removidos |
| `data_nascimento` | opcional (alimenta os aniversariantes, MUR-13) |

- **Dado** token válido e dados válidos, **então** grava a senha (hash), o nome e a data, marca o
  token como usado e responde `200` no formato de AUT-01 (`access_token`, `refresh_token`,
  `usuario` com `convite_pendente: false`) — sem passar pelo `/auth/login`.
- **Dado** `email`, `role` ou `setor_id` no corpo, **então** são ignorados.
- **Dado** senha curta ou nome vazio, **então** `422` com o campo.
- **Dado** token inválido (AUT-08), **então** `400` e nada muda.
- Frontend: rota `/ativar-conta`. Ao abrir, verifica o token:
  - inválido → "Link inválido ou expirado. Peça um novo convite ao administrador." e link para
    `/login`; falha de rede → mensagem com "Tentar novamente";
  - válido → formulário com e-mail só leitura, nome já preenchido, data de nascimento, senha e
    confirmação de senha (a confirmação é checada só no front). Sucesso → `entrar()` e `/mural`.
- Quando o cargo existir (USU-06), ele entra nesse formulário.
