# Autenticação (`AUT`)

Login próprio com tabela interna de usuários `[ESP]`, JWT de acesso + refresh token rastreável no
banco. Ativação de conta e redefinição de senha por magic link enviado por e-mail (AUT-08).

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| AUT-01 | Login com e-mail e senha | ✅ | ✅ | ✅ |
| AUT-02 | Renovação do access token | ✅ | ✅ | ✅ |
| AUT-03 | Conteúdo e validade do access token | ✅ | ✅ | 🟡 |
| AUT-04 | Renovação automática no frontend | — | ✅ | 🟡 |
| AUT-05 | Rotas protegidas no frontend | — | ✅ | ⬜ |
| AUT-06 | Logout com revogação do refresh token | ✅ | ✅ | ✅ |
| AUT-07 | Armazenamento seguro de credenciais | ✅ | ✅ | ✅ |
| AUT-08 | Magic link (token de uso único por e-mail) | ✅ | ✅ | ✅ |
| AUT-09 | Ativação de conta pelo convite | ✅ | ✅ | ✅ |
| AUT-10 | Modo visitante (somente leitura) | 🟡 | ✅ | 🟡 |
| AUT-11 | Limite de tentativas de login | ✅ | ✅ | ✅ |

### AUT-01 — Login com e-mail e senha
Origem: [ESP] [ENT] · Back ✅ · Front ✅ · Teste ✅

`POST /auth/login` com `{email, senha}`.

- **Dado** credenciais corretas de um usuário ativo, **então** `200` com `access_token`,
  `token_type: "bearer"` e `usuario` (mesmo formato de `UsuarioResposta`), e o refresh token vai
  só no cookie `intranet_refresh` (AUT-07), nunca no corpo; o hash dele é gravado no banco.
- **Dado** e-mail inexistente, senha errada **ou** usuário desativado, **então** `401`
  `"Email ou senha invalidos"` — a mesma mensagem nos três casos, pra não revelar qual falhou.
- **Dado** um usuário pendente (convidado que ainda não ativou a conta, USU-02), **então** `401`
  com a mesma mensagem.
- **Dado** um e-mail inexistente, **então** a resposta leva o mesmo tempo que uma senha errada: o
  hash da senha é sempre calculado (contra um hash fictício quando não há conta), para o tempo
  não revelar quais e-mails estão cadastrados.
- **Dado** o e-mail com outras maiúsculas ou espaços nas pontas (`  Maria@Hospital.com`), **então**
  o login funciona (o e-mail é comparado em minúsculas, USU-02).
- Cada tentativa vai para o log técnico de segurança (GER-25); o limite de tentativas é o AUT-11.
- Frontend: formulário de login; em sucesso guarda os tokens e vai para `/mural`.

### AUT-02 — Renovação do access token
Origem: [ENT] [COD] · Back ✅ · Front ✅ · Teste ✅

`POST /auth/refresh`, sem corpo: o refresh token vem do cookie `intranet_refresh` (AUT-07).

- **Dado** refresh token existente, não revogado, não expirado e de usuário ativo, **então** `200`
  com novo `access_token`, e o refresh token é **rotacionado**: o cookie recebe um token novo e o
  apresentado fica marcado como substituído. O token novo herda a expiração do anterior: a sessão
  dura `REFRESH_TOKEN_DAYS` a partir do login, renovando ou não.
- **Dado** um token substituído há até 30 s, **então** `200` com novo `access_token`, sem trocar o
  cookie de novo — duas abas abrindo juntas mandam o mesmo cookie, e a segunda não pode derrubar a
  sessão.
- **Dado** um token substituído há mais de 30 s, **então** é tratado como roubado: todas as sessões
  do usuário são revogadas, `401`, e o evento `refresh_reutilizado` vai para o log (GER-25).
- **Dado** cookie ausente, token desconhecido, revogado ou expirado, **então** `401`.
- **Dado** usuário desativado depois do login, **então** `401` — é isso que encerra o acesso dele
  no fim do access token atual.

### AUT-03 — Conteúdo e validade do access token
Origem: [COD] · Back ✅ · Front ✅ · Teste 🟡

- Payload: `sub` (id do usuário), `nome`, `role`, `setor_id` (ou `null`), `exp`. Assinatura HS256
  com `JWT_SECRET`. Testados até agora: o payload e o `nome` atualizado na renovação.
- Validade: `ACCESS_TOKEN_MINUTES` (padrão 30). Refresh: `REFRESH_TOKEN_DAYS` (padrão 7).
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
Origem: [COD] · Back — · Front ✅ · Teste 🟡

- **Dado** uma requisição que volta `401`, **quando** não é `/auth/login` nem `/auth/refresh` e
  ainda não foi repetida, **então** o interceptor chama `/auth/refresh` e repete a requisição com o
  novo token.
- Várias requisições com `401` ao mesmo tempo compartilham **uma** renovação.
- **Dado** que a renovação falha, **então** os tokens são apagados e a página atual recarrega como
  visitante (AUT-10); só as telas de administração levam ao `/login`.
- O access token fica só na memória da aba (AUT-07). **Dado** que a página abre com o marcador de
  sessão no `localStorage`, **então** o frontend renova pelo cookie antes de mostrar a primeira
  tela; se a renovação falha, apaga o marcador e abre como visitante. Sem o marcador, não chama a
  API (visitante).
- **Dado** que outra aba sai da conta (o marcador some), **então** esta aba também esquece o access
  token e volta a visitante. **Dado** que outra aba entra, **então** esta renova e entra também.

### AUT-05 — Rotas protegidas no frontend
Origem: [ENT] [CTX] · Back — · Front ✅ · Teste ⬜

- Sem sessão, `/usuarios` e `/logs` redirecionam para `/login`; as telas de conteúdo ficam abertas
  ao visitante (AUT-10).
- `/usuarios` e `/logs` só para `superadmin`; os outros papéis vão para `/nao-autorizado`.
- `/` redireciona para `/mural`.

### AUT-06 — Logout com revogação do refresh token
Origem: [COD] (coluna `revogado` já existe) · Back ✅ · Front ✅ · Teste ✅

`POST /auth/logout`, sem corpo e sem exigir access token (quem sai com o access token vencido
também tem que conseguir sair).

- **Dado** o cookie de um refresh token válido, **então** `204`, o token é marcado como
  `revogado`, o cookie é apagado e um `/auth/refresh` posterior com ele responde `401`.
- O logout revoga a **sessão inteira** daquele login: o token atual e os que ele substituiu nas
  rotações (AUT-02). 🐞 corrigido (achado no teste ponta a ponta): um token trocado há menos de
  30 s ainda renovava pela janela de concorrência depois do logout. Sessões de outros
  dispositivos (outros logins) continuam valendo.
- **Dado** cookie ausente ou de token desconhecido, **então** `204` do mesmo jeito (sair é
  idempotente).
- Frontend: "Sair" chama o logout e, mesmo se a chamada falhar, esquece o access token e o
  marcador de sessão.
- Desativar o usuário (USU-04) não revoga os refresh tokens: o `/auth/refresh` já recusa usuário
  desativado (AUT-02), então o efeito é o mesmo.

### AUT-07 — Armazenamento seguro de credenciais
Origem: [ESP] [COD] · Back ✅ · Front ✅ · Teste ✅

- Senha guardada só como hash (`pwdlib`, algoritmo recomendado — argon2).
- Refresh token guardado só como hash SHA-256; o valor em claro existe apenas no cookie.
- O refresh token viaja só no cookie `intranet_refresh`: `HttpOnly` (o JavaScript não lê, então um
  XSS não leva a sessão de 7 dias), `SameSite=Strict`, `Path=/`, `Max-Age` igual ao tempo que falta
  para ele expirar, e `Secure` — que pode ser desligado com `COOKIE_SECURE=false` para quem serve a
  intranet em HTTP puro (sem isso, o navegador não guarda o cookie e a sessão cai junto com o
  access token).
- Toda resposta que abre sessão (login, convite aceito, redefinição confirmada, troca de senha)
  grava o cookie; nenhuma traz o refresh token no corpo.
- Frontend: o access token fica só na memória da aba. O `localStorage` guarda apenas o marcador
  `intranet:sessao` (sem segredo), que diz se vale renovar ao abrir a página (AUT-04). As chaves
  antigas (`intranet:token`, `intranet:refresh_token`) são apagadas ao abrir.

### AUT-08 — Magic link (token de uso único por e-mail)
Origem: [CTX] · Back ✅ · Front ✅ · Teste ✅

Mecanismo único para os e-mails que trazem o usuário de volta à aplicação para concluir uma ação
sem estar logado. Finalidades: `convite` (AUT-09) e `redefinicao_senha` (USU-07). Finalidade nova
entra aqui, sem tabela nova. O token não é sessão: só autoriza a ação da sua finalidade.

- Token aleatório (`secrets.token_urlsafe(32)`) guardado só como hash SHA-256, como o refresh token
  (AUT-07), na tabela `tokens_uso_unico` (`usuario_id`, `finalidade`, `expira_em`, `usado_em`,
  `criado_em`). O valor em claro existe só no e-mail — e no log, com `EMAIL_PROVIDER=console`,
  que é só para desenvolvimento (GER-22).
- Validade por finalidade: convite `INVITE_HOURS` (padrão 72); redefinição de senha
  `PASSWORD_RESET_MINUTES` (padrão 60).
- Link: `{FRONTEND_URL}/ativar-conta#token=...` ou `{FRONTEND_URL}/redefinir-senha#token=...`. O
  token vai no fragmento, que o navegador não envia ao servidor (fica fora dos logs do nginx e do
  `Referer`).
- O token trafega no **corpo** das requisições à API, nunca no path nem na query.
- **Dado** token inexistente, expirado, já usado, de outra finalidade ou de usuário desativado,
  **então** `400 {"mensagem": "Link inválido ou expirado"}` — a mesma mensagem em todos os casos.
- **Dado** um token emitido, **quando** outro da mesma finalidade é emitido para o mesmo usuário,
  **então** o anterior deixa de valer.
- **Dado** um usuário com links pendentes, **quando** o e-mail dele muda (USU-03), ele é
  desativado (USU-04) ou a senha muda (USU-07), **então** todos os links pendentes deixam de valer.
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

### AUT-10 — Modo visitante (somente leitura)
Origem: pedido do time (2026-10-29) · Back 🟡 · Front ✅ · Teste 🟡

Quem não fez login pode **ver** o conteúdo do sistema, sem baixar nem alterar nada.

Backend — sem token, respondem `200`:
- `GET /murais/avisos`, `/murais/avisos/{id}`, `/murais/eventos`, `/murais/aniversariantes`;
- `GET /setores`, `/setores/{id}`, `/setores/{id}/ramais`;
- `GET /duvidas/faq`, `/duvidas/faq/{id}`;
- `GET /documentos`, `/documentos/{id}` (só metadados);
- `GET /atalhos`.

Backend — sem token, continuam `401`:
- todo `POST`/`PUT`/`DELETE`;
- `GET /documentos/{id}/download` e `GET /murais/avisos/{id}/anexos/{anexo_id}/download`;
- `GET /usuarios`, `GET /logs` (e o `403` para quem está logado sem ser `superadmin`).

Frontend:
- **Dado** um visitante, **quando** abre `/mural`, `/calendario`, `/documentos`, `/duvidas` ou
  `/setores`, **então** a tela abre, sem redirecionar para `/login`.
- **Dado** um visitante, **então** não aparece nenhum botão de criar, editar, excluir, enviar,
  baixar ou abrir arquivo (documento e anexo), e a barra lateral mostra "Entrar" no lugar do papel
  e do "Sair".
- **Dado** um visitante, **quando** abre `/usuarios` ou `/logs`, **então** vai para `/login`.
- **Dado** que o visitante entra pelo "Entrar", **então** depois do login volta para a página em
  que estava.
- O ponto de entrada é o próprio site: `/` abre `/mural`, e o login só aparece quando a pessoa clica
  em "Entrar" ou abre uma tela de administração. Sair da conta volta para `/mural`.
- Um `401` de visitante (sem token salvo) não muda de página.

- Risco aceito: a lista de aniversariantes (nome, dia, setor) e os metadados de documentos ficam
  legíveis por qualquer pessoa que alcance a API. Se o servidor for exposto fora da rede do
  hospital, rever.

### AUT-11 — Limite de tentativas de login
Origem: [COD] (auditoria OWASP, A06/A07) · Back ✅ · Front ✅ · Teste ✅

Contra adivinhação de senha. O limite é **por e-mail**, não por IP: no hospital todos os postos
saem pelo mesmo NAT, e um limite por IP derrubaria o login de todo mundo por causa de um só.

- **Dado** 5 senhas erradas para o mesmo e-mail (sem diferença de maiúsculas) em 15 minutos,
  **quando** chega a 6ª tentativa, **então** `429 {"mensagem": "Muitas tentativas. Tente de novo em
  alguns minutos."}` com `Retry-After` (segundos) — mesmo com a senha certa — até a mais antiga das
  5 sair da janela de 15 minutos.
- Vale para qualquer e-mail, cadastrado ou não: o `429` não revela se a conta existe.
- **Dado** um login bem-sucedido, **então** as falhas anteriores daquele e-mail são esquecidas.
- O bloqueio vai para o log técnico como alerta (GER-25).
- O contador fica na memória da API (um processo só) e zera quando ela reinicia — trade-off aceito.
- Frontend: a mensagem do `429` aparece no formulário de login.
