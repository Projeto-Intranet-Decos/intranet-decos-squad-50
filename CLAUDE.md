# Intranet do Hospital

Monorepo com `backend/` (FastAPI) e `frontend/` (React + TypeScript). Glossário de domínio em [`CONTEXT.md`](./CONTEXT.md) — leia antes de nomear entidades novas.

## Docs

- [`docs/specs/`](./docs/specs/README.md) — requisitos por domínio (IDs `GER`, `AUT`, `USU`, `SET`, `MUR`, `CAL`, `DOC`, `DUV`, `LOG`), com origem, status e critérios de aceite. Fonte do **que** o sistema faz.
- [`docs/arquitetura-backend.md`](./docs/arquitetura-backend.md) — stack (FastAPI, SQLAlchemy+Pydantic separados, Postgres, Alembic, MinIO, JWT, pwdlib), organização de módulos, RBAC (dependency vs service), logs.
- [`docs/arquitetura-frontend.md`](./docs/arquitetura-frontend.md) — stack (React+TS, Tailwind, Axios, TanStack Query, React Hook Form, Sonner), estrutura por feature, RBAC no frontend (UX apenas, nunca fonte de verdade), padrão de erro do backend.
- [`docs/convencao-branches-commits.md`](./docs/convencao-branches-commits.md) — branches (`feature/<camada>/<modulo>/<descricao>`), Conventional Commits, fluxo `dev → homolog → main`.

## Regras rápidas

- Autorização real sempre no backend. Checagem no frontend (`ProtectedRoute`, `permissions.ts`) é só UX.
- `admin_setor` opera o dia a dia do próprio setor (avisos, documentos, eventos, ramal). `superadmin` é o único que acessa as páginas de Administração (Usuários, Registro de atividades) e cria setores novos — é um papel de nível sistêmico, não o "admin de conteúdo" mais poderoso.
- Estrutura de módulo/feature é 1:1 entre backend e frontend — mesmo nome dos 6 módulos nos dois lados (o calendário é uma tela do mural, não um módulo).

## Fluxo de desenvolvimento: spec → teste → código

Toda mudança de comportamento segue este ciclo, um critério de aceite por volta (detalhes em [`docs/specs/README.md`](./docs/specs/README.md)):

1. **Spec** — ache o requisito em `docs/specs/<dominio>.md`. Se não existe ou a regra muda, edite o spec primeiro, no mesmo PR. Regra ambígua ou marcada `❓`: pergunte, não invente.
2. **Teste vermelho** — escreva o teste do critério citando o ID (`test_mur03_...` no pytest, `describe('MUR-03 — ...')` no vitest) e confirme que falha pelo motivo certo.
3. **Solução** — esboce a abordagem dentro das regras de `docs/arquitetura-*.md`; mudança grande ganha plano em `docs/superpowers/plans/`.
4. **Implementação** — o mínimo pra passar; mudança de schema sempre com migration Alembic.
5. **Verde** — rode o teste, a suíte do módulo e a suíte toda, mais lint/type-check/build.
6. **Fechamento** — refatore com os testes verdes, atualize o status (Back/Front/Teste) no spec e volte ao passo 2 com o próximo critério.

Bug: registre o comportamento esperado no spec (`🐞`) e escreva o teste que reproduz antes de corrigir. PR lista os IDs cobertos (`Cobre: MUR-03, MUR-04`).

Rodar os testes do backend: `docker compose up -d banco` e, em `backend/`, `.venv/bin/pytest` (ou `-k mur03`). Fixtures, banco de teste e MinIO falso: `backend/tests/conftest.py` e `tests/apoio.py`.

## Convenção de idioma no código

Nomes de arquivos, componentes, funções, variáveis, classes e rotas em **português**, sem acento (ex: `PaginaMural`, `aniversariantes`, `clienteDeConsultas`, `requer_admin`). Isso vale pro código como um todo, frontend e backend.

Exceção: identificadores fixos de bibliotecas/frameworks continuam em inglês, porque não são nossos — imports, hooks (`useState`, `useQuery`), tipos e classes de lib (`QueryClient`, `Route`), nomes de arquivo de convenção da ferramenta (`main.tsx`, `vite.config.ts`). A regra é sobre o que a gente nomeia, não sobre a API externa que a gente consome.
