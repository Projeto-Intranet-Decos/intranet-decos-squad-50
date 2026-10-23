# Plano: registro de atividades (auditoria)

Specs: [`logs.md`](../../specs/logs.md) (LOG-01 a LOG-04).

## Decisões

- Sem FK em `usuario_id`/`entidade_id`; o log guarda `usuario_nome` e `resumo` (sobrevive à exclusão).
- `GET /logs` paginado por `limite`/`deslocamento`, resposta `{ itens, total }`.
- Login/refresh fora da auditoria.
- `registrar()` explícito em cada service (não evento do SQLAlchemy), na mesma transação da escrita.

## Mecanismo

`logs.service.registrar(sessao, ator, acao, modulo, entidade_tipo, entidade_id, resumo)` só faz
`sessao.add(Log(...))`, sem commit. O service chama antes do commit da escrita, então log e ação
vão juntos ou nenhum vai. Hoje os `repository` commitam sozinhos: onde isso impedir, o service
chama `registrar()` antes de `repository.adicionar/salvar/remover`. Para `criar`, o `id` da
entidade precisa existir antes: `sessao.add` + `sessao.flush()` e depois `registrar()`.

Services que ainda não recebem o usuário (atalhos, setores, usuários) passam a recebê-lo do
router (`UsuarioAutenticado`).

## Ordem (um critério por volta)

1. **LOG-01** — model `Log`, migration, `registrar()`.
2. **LOG-03** — `GET /logs` (só superadmin, filtros, paginação, mais recentes primeiro).
3. **LOG-02** — gravação, módulo a módulo: atalhos → setores/ramais → usuários → duvidas →
   documentos → murais (aviso, capa, anexos). Teste por módulo: escrita OK grava 1 registro;
   leitura e falha não gravam.
4. **LOG-04** — trocar o mock de `frontend/src/features/logs/api.ts` pela API.
