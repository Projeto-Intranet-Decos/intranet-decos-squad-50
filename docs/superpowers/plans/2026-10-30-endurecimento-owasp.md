# Endurecimento OWASP Top 10

Fecha as 17 pendências de [`docs/seguranca-owasp-top10.md`](../../seguranca-owasp-top10.md). As
sondagens de `backend/tests/test_sondagem_owasp.py` perdem a marca `xfail` conforme cada item
fecha; os critérios novos ganham ID no spec e teste no módulo.

## Decisões

- **Sessão (AUT-02, AUT-06, AUT-07).** O refresh token sai do corpo das respostas e vai para um
  cookie `HttpOnly; SameSite=Strict; Secure` (o `Secure` pode ser desligado por `COOKIE_SECURE`
  para quem servir a intranet em HTTP puro). O access token fica só na memória da aba; na abertura
  da página o frontend renova pelo cookie. No `localStorage` sobra só um marcador sem segredo, que
  diz se vale tentar a renovação (visitante não chama a API à toa).
- **Rotação.** Cada `/auth/refresh` troca o refresh token. Um token já trocado, reapresentado
  depois de 30 s, é tratado como roubo: todas as sessões do usuário são revogadas. Dentro dos 30 s
  ele ainda devolve um access token (duas abas abrindo juntas mandam o mesmo cookie).
- **Limite de tentativas (AUT-11, USU-07).** Por e-mail, não por IP: no hospital todo mundo sai pelo
  mesmo NAT, e um limite por IP derrubaria o login de todos. 5 senhas erradas em 15 min bloqueiam
  aquele e-mail por 15 min (`429` com `Retry-After`), exista a conta ou não. Redefinição: 1 pedido
  por e-mail a cada 5 min. Contador em memória do processo (a API roda com um worker); reiniciar
  zera — trade-off aceito.
- **`--forwarded-allow-ips='*'`** fica: o IP do cliente só vai para o log técnico, nenhuma decisão
  depende dele.
- **Log técnico de segurança (GER-25).** Logger `app.seguranca`, em formato chave=valor, para o log
  do container. Não vai para o Registro de atividades (LOG), que é auditoria de escrita.
- **Senha (USU-09).** 8–128 caracteres e fora de uma lista de senhas comuns.
- **Upload (GER-06).** Além da extensão, os primeiros bytes têm que bater com o formato.

## Fases

1. Dependências atualizadas (`pip-audit` e `npm audit --omit=dev` limpos).
2. Configuração: `/docs` desligado por padrão, `JWT_SECRET` forte, headers na API e no nginx,
   `500` no contrato, portas do compose em `127.0.0.1`.
3. Login: tempo constante, e-mail sem diferença de maiúsculas, limite de tentativas, log técnico,
   política de senha, superadmin não se desativa.
4. Sessão: cookie, rotação com detecção de reuso, logout — backend e frontend.
5. Upload confere a assinatura do arquivo.
6. CI no GitHub, Dependabot e imagens por digest.
