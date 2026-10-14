# Convenção de Branches e Commits — Intranet do Hospital

## Contexto

- Monorepo: frontend e backend no mesmo repositório.
- Ambientes: `main` (produção) e `homolog` (homologação/staging).
- Gestão de tarefas: Trello, sem IDs de card referenciados por enquanto (ver seção "Próximos passos").

## Branches

```
main         # produção
homolog      # staging/homologação, validação do hospital
dev          # integração contínua do time
feature/<camada>/<modulo>/<descricao-curta>
fix/<camada>/<modulo>/<descricao-curta>
chore/<camada-ou-geral>/<descricao-curta>
```

- `<camada>`: `frontend` ou `backend`. Omitir quando a mudança for genuinamente transversal (ex: `chore/geral/configura-ci`).
- `<modulo>`: nome do módulo afetado — `usuarios`, `documentos`, `murais`, `setores`, `duvidas`, `logs`.
- `<descricao-curta>`: resumo em poucas palavras, separado por hífen.

### Exemplos

```
feature/frontend/usuarios/criacao-admin-setor
feature/backend/documentos/upload-validacao
fix/frontend/documentos/upload-arquivo-grande
fix/backend/usuarios/permissao-admin-setor
chore/geral/configura-ci
```

### Fluxo

1. `feature/*` e `fix/*` nascem a partir de `dev`.
2. PR de volta para `dev` — é onde o time integra o trabalho continuamente, pode ter código instável.
3. Quando um conjunto de features está estável, `dev` é promovida para `homolog`, para validação do hospital.
4. Validado em `homolog`, é promovida para `main` via PR/release.

### Tarefas que mexem em frontend e backend ao mesmo tempo

Quando uma tarefa exige mudança nas duas camadas (ex: campo novo que muda schema do backend e formulário do frontend), tratar como **uma única branch/PR**, sem prefixo de camada:

```
feature/usuarios/campo-telefone
```

Isso evita quebrar uma tarefa logicamente única em duas PRs artificiais. CI deve ser configurado com path filters para rodar build/testes de frontend e backend de forma independente, mesmo quando ambos mudam na mesma PR.

## Commits — Conventional Commits

Sem automação por trás (sem changelog automático, sem CI disparado por tipo de commit) — o padrão existe por legibilidade e histórico organizado.

```
<tipo>(<escopo>): <descrição curta no imperativo>
```

### Tipos

- `feat` — nova funcionalidade
- `fix` — correção de bug
- `chore` — configuração, dependências, tarefas que não são feature/fix
- `refactor` — mudança de código sem alterar comportamento
- `docs` — documentação
- `test` — testes
- `style` — formatação, sem mudança de lógica

### Escopo

`<camada>/<modulo>` — ex: `frontend/usuarios`, `backend/documentos`. Usar `geral` quando a mudança for transversal e não pertencer a uma camada específica.

### Exemplos

```
feat(frontend/usuarios): adiciona checagem de escopo por setor no delete
fix(backend/documentos): corrige validação de tamanho máximo de arquivo
chore(geral): configura interceptor de token no axios
refactor(backend/usuarios): extrai lógica de permissão para módulo separado
docs(geral): atualiza README com instruções de setup
```

## Próximos passos (revisar quando o Trello ganhar IDs)

Quando os cards do Trello passarem a ter IDs referenciados no fluxo de trabalho, incorporar o ID na branch, no formato:

```
feature/<camada>/<modulo>/<id>-<descricao-curta>
```

Exemplo:
```
feature/frontend/usuarios/123-criacao-admin-setor
```

Definir esse padrão desde já evita inconsistência no meio do projeto com múltiplos devs já commitando sob a convenção antiga.
