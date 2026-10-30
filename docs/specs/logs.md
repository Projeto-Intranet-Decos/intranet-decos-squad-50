# Registro de atividades / auditoria (`LOG`)

Histórico de ações administrativas para o `superadmin` auditar mudanças `[ENT H7]`. É o **log de
auditoria** do `CONTEXT.md` — persistido no Postgres, só ações de escrita. O **log técnico**
(exceptions, 500) vai para o console e não entra aqui.

Status geral: backend implementado (`backend/app/modules/logs/`, router em `main.py`, `registrar()`
ligado em todos os módulos) mas **os testes de backend ainda não foram executados** (banco de
testes indisponível na máquina de desenvolvimento) — por isso Back 🟡. Frontend integrado à API.

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| LOG-01 | Registro de auditoria | 🟡 | — | 🟡 |
| LOG-02 | Gravação automática em toda escrita | 🟡 | — | ⬜ |
| LOG-03 | Consultar registro de atividades | 🟡 | ✅ | 🟡 |
| LOG-04 | Tela de registro de atividades | — | 🟡 | ✅ |

### LOG-01 — Registro de auditoria
Origem: [ENT H7] [CTX] · Back 🟡 · Front — · Teste 🟡

Tabela `logs` (com migration) guardando, por ação:

- usuário responsável (id; nome resolvido na resposta, GER-08);
- setor do usuário no momento da ação;
- ação: `criar`, `editar` ou `excluir`;
- módulo afetado (`murais`, `documentos`, `duvidas`, `setores`, `usuarios`, `atalhos`; eventos e
  aniversariantes contam como `murais`, ramais como `setores`);
- tipo e id da entidade afetada, e um resumo legível (ex: título do aviso, e-mail do usuário);
- `criado_em`.

- O registro **sobrevive** à exclusão da entidade e do usuário: `usuario_id` e `entidade_id` são
  valores simples, **sem FK**, e o log guarda o nome do usuário e o resumo da entidade no momento
  da ação. Nada no log muda depois de gravado.

### LOG-02 — Gravação automática em toda escrita
Origem: [ENT H7] · Back 🟡 · Front — · Teste ⬜

- **Dado** qualquer criar/editar/excluir bem-sucedido em qualquer módulo (incluindo capa, anexos,
  ramais e arquivo de documento), **então** existe exatamente um registro correspondente.
- **Dado** uma ação de leitura (listar, buscar, baixar), **então** nenhum registro é criado.
- **Dado** uma escrita que falha (`4xx`/`5xx`), **então** nenhum registro é criado — o log é
  gravado na mesma transação da ação.
- Login e refresh **não** entram na auditoria (não são ação administrativa).
- O log é gravado por `registrar()` (`modules/logs/service.py`), chamado explicitamente pelo
  service de cada módulo, antes do `commit` da escrita.

### LOG-03 — Consultar registro de atividades
Origem: [ENT H7] · Back 🟡 · Front ✅ · Teste 🟡

`GET /logs?usuario_id=&setor_id=&de=&ate=&limite=&deslocamento=` — só `superadmin` (`admin_setor` e `comum` → `403`).
Mais recentes primeiro.

- **Dado** filtros, **então** a lista fica restrita a eles (período inclusivo).
- Paginação por `limite` (padrão 50, máx. 200) e `deslocamento` (padrão 0). A resposta é
  `{ itens, total }`.

### LOG-04 — Tela de registro de atividades
Origem: [ENT H7] · Back — · Front 🟡 · Teste ✅

Rota `/logs`, só `superadmin` (AUT-05).

- Tabela com data/hora, usuário, ação, detalhe e área (módulo).
- Busca por usuário, ação ou área; filtro por área.
- ✅ `features/logs/api.ts` usa `GET /logs` (LOG-03), sem mock.
- ⬜ A tela busca só os 200 registros mais recentes (limite máximo) e filtra/ordena/busca no
  navegador; falta paginar de verdade e mandar `usuario_id`, `setor_id`, `de`/`ate` para a API.
- ⬜ Falta a gravação (LOG-02) ter teste por módulo; sem isso a tela só mostra o que já foi gravado.
