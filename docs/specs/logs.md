# Registro de atividades / auditoria (`LOG`)

Histórico de ações administrativas para o `superadmin` auditar mudanças `[ENT H7]`. É o **log de
auditoria** do `CONTEXT.md` — persistido no Postgres, só ações de escrita. O **log técnico**
(exceptions, 500) vai para o console e não entra aqui.

Status geral: backend não implementado (pasta `backend/app/modules/logs/` com arquivos vazios e
router não registrado em `main.py`); frontend com tela pronta sobre dados mockados.

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| LOG-01 | Registro de auditoria | ⬜ | — | ⬜ |
| LOG-02 | Gravação automática em toda escrita | ⬜ | — | ⬜ |
| LOG-03 | Consultar registro de atividades | ⬜ | 🟡 | ⬜ |
| LOG-04 | Tela de registro de atividades | — | 🟡 | ⬜ |

### LOG-01 — Registro de auditoria
Origem: [ENT H7] [CTX] · Back ⬜ · Front — · Teste ⬜

Tabela `logs` (com migration) guardando, por ação:

- usuário responsável (id; nome resolvido na resposta, GER-08);
- setor do usuário no momento da ação;
- ação: `criar`, `editar` ou `excluir`;
- módulo afetado (`murais`, `calendario`, `documentos`, `duvidas`, `setores`, `usuarios`);
- tipo e id da entidade afetada, e um resumo legível (ex: título do aviso, e-mail do usuário);
- `criado_em`.

- ❓ O registro sobrevive à exclusão do usuário/entidade? (Usuário só é desativado, USU-04; a
  entidade excluída precisa do resumo guardado no próprio log.)

### LOG-02 — Gravação automática em toda escrita
Origem: [ENT H7] · Back ⬜ · Front — · Teste ⬜

- **Dado** qualquer criar/editar/excluir bem-sucedido em qualquer módulo (incluindo capa, anexos,
  ramais e arquivo de documento), **então** existe exatamente um registro correspondente.
- **Dado** uma ação de leitura (listar, buscar, baixar), **então** nenhum registro é criado.
- **Dado** uma escrita que falha (`4xx`/`5xx`), **então** nenhum registro é criado — o log é
  gravado na mesma transação da ação.
- ❓ Login e refresh entram na auditoria? (Não são ação administrativa pela definição atual.)

### LOG-03 — Consultar registro de atividades
Origem: [ENT H7] · Back ⬜ · Front 🟡 · Teste ⬜

`GET /logs?usuario_id=&setor_id=&de=&ate=` — só `superadmin` (`admin_setor` e `comum` → `403`).
Mais recentes primeiro.

- **Dado** filtros, **então** a lista fica restrita a eles (período inclusivo).
- ❓ Paginação — volume cresce sem limite; definir antes de implementar.

### LOG-04 — Tela de registro de atividades
Origem: [ENT H7] · Back — · Front 🟡 · Teste ⬜

Rota `/logs`, só `superadmin` (AUT-05).

- Tabela com data/hora, usuário, ação, detalhe e área (módulo).
- Busca por usuário, ação ou área; filtro por área.
- ⬜ Trocar o mock de `features/logs/api.ts` pela API (LOG-03), com filtros de usuário, setor e
  período.
