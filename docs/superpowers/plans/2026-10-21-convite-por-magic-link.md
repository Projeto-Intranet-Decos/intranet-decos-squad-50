# Plano: cadastro por convite com magic link (Mailgun)

## Contexto

O superadmin cadastrava o usuário já com senha. Agora o cadastro gera um **convite**: o usuário
nasce **pendente** (sem senha) e recebe um **magic link** por e-mail para criar a senha e completar
os dados. O mesmo mecanismo serve depois para a redefinição de senha (USU-07).

Specs já atualizados: [`autenticacao.md`](../../specs/autenticacao.md) (AUT-01, AUT-08, AUT-09),
[`usuarios.md`](../../specs/usuarios.md) (USU-01 a 04, USU-07, USU-08),
[`transversal.md`](../../specs/transversal.md) (GER-02, GER-19), MUR-13, `CONTEXT.md` e
`arquitetura-*.md`.

**Decisões tomadas com você:** nome "magic link" (não é SSO), convite válido por 72h, USU-07 entra
no escopo, Mailgun como provedor.

## Entregas

1. **Backend do convite** (esta branch, primeira parte): GER-19, AUT-08, AUT-01, USU-01 a 04,
   USU-08, AUT-09, MUR-13.
2. **Backend da USU-07**: redefinição por link e troca de senha logado.
3. **Frontend**: `/ativar-conta`, formulário de usuário sem senha, selo "Convite pendente",
   "Reenviar convite", depois `/esqueci-senha`, `/redefinir-senha` e "Alterar senha".

## Backend

### `core/correio.py` (GER-19)
- `Email(para, assunto, texto, html)` e `enviar_email(email) -> bool`. A falha vira
  `logger.warning` e `False`, nunca exceção: quem chama já fez o commit.
- `_entregar` escolhe o provedor por `EMAIL_PROVEDOR`: `console` (padrão, escreve no log) ou
  `mailgun`.
- O Mailgun é chamado com o `urllib3`, que já está no `requirements.txt` (dependência do MinIO), sem
  dependência nova: `POST {url_base}/v3/{dominio}/messages`, form-urlencoded, basic auth
  `api:<chave>`, timeout de 10 s, sem retry. Status ≥ 300 ou erro de rede viram `ErroEmail`.
- O módulo não se chama `email.py` para não confundir com o módulo `email` da biblioteca padrão nem
  com as variáveis `email` dos services.
- `config.py`: `email_provedor`, `email_remetente`, `url_frontend`, `mailgun_*`, `convite_horas`,
  `redefinicao_senha_minutos`. Um validador barra `mailgun` sem chave ou domínio.
- Testes: a fixture autouse `correio_falso` troca `_entregar` (guarda os e-mails e simula queda com
  `indisponivel = True`), e uma rede de segurança faz o cliente HTTP real quebrar o teste.

### Magic link (`autenticacao`, AUT-08)
- Model `TokenUsoUnico` → tabela `tokens_uso_unico`: `usuario_id`, `finalidade` (check
  `convite | redefinicao_senha`), `token_hash` único, `expira_em`, `usado_em`, `criado_em`.
- `security.py`: `gerar_refresh_token`/`hash_refresh_token` viram `gerar_token`/`hash_token`
  (servem aos dois tokens opacos).
- `service.emitir_link(sessao, usuario, finalidade) -> str`: apaga os links não usados da mesma
  finalidade, adiciona o novo e devolve o token em claro. Não faz commit: quem chama grava o link
  na mesma transação da sua mudança.
- `service.invalidar_links(sessao, usuario_id)`: apaga os links não usados (desativar, trocar
  e-mail).
- `_link_valido(sessao, token, finalidade, travar)`: hash → linha; finalidade, `usado_em`,
  `expira_em` e usuário ativo conferidos, senão `400 "Link inválido ou expirado"`. Com
  `travar=True` faz `SELECT ... FOR UPDATE`, para dois aceites simultâneos não passarem os dois.

### Usuários pendentes
- `usuarios.senha_hash` passa a ser nullable. A property `Usuario.convite_pendente` é
  `senha_hash is None` e sai em `UsuarioResposta`.
- `autenticar` recusa pendente com a mesma mensagem (AUT-01). `listar_aniversariantes` filtra
  `senha_hash IS NOT NULL` (MUR-13).

### Migration (`down_revision = "c9e1f3a5b7d2"`)
- `ALTER usuarios.senha_hash DROP NOT NULL`, `CREATE TABLE tokens_uso_unico` + índice em
  `usuario_id`.
- `downgrade` apaga a tabela e, antes de devolver o `NOT NULL`, apaga os usuários pendentes (não
  têm senha, então não têm o que preservar).

### Endpoints
- `POST /usuarios` sem `senha`: cria pendente + link na mesma transação, commit, envia o convite e
  responde `201` com `email_enviado`.
- `PUT /usuarios/{id}` com e-mail novo e `DELETE /usuarios/{id}` chamam `invalidar_links`.
- `POST /usuarios/{id}/convite` (USU-08): `404`, `409` se já ativou ou se está desativado, senão
  emite um novo link e responde `{email_enviado}`.
- `POST /auth/convite/verificar` e `POST /auth/convite/aceitar` (AUT-09). O aceite grava nome,
  data, senha e `usado_em` e cria o refresh token num commit só, e responde como o login.
- Os textos do e-mail do convite ficam em `usuarios/emails.py`.

### Testes
- `tests/test_correio.py` (GER-19), `tests/autenticacao/test_convite.py` (AUT-01, 08, 09),
  `tests/usuarios/test_usuarios.py` (USU-01 a 04, 08) e `tests/murais/test_aniversariantes.py`
  (MUR-13).
- `Fabrica.usuario(pendente=True)` cria um usuário sem senha, e
  `correio_falso.ultimo_token()` lê o token do link no último e-mail.

### Infra
- `.env.example` (raiz e backend) e o bloco `environment` do backend no `docker-compose.yml`
  ganham as variáveis novas.
