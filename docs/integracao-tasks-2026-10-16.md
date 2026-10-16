# Integração de Acesso Rápido e Usuários — 16/10/2026

Base revisada: `dev`, commit `78618e345b337b742bd1a5f76ad8a416b5654231`.

## Mudanças da equipe preservadas

- PR #30: fluxo spec → testes → código; specs por domínio e infraestrutura pytest com PostgreSQL e MinIO falso.
- PR #31: eventos incorporados a avisos; calendário é uma tela do módulo murais. Não se restaura o módulo calendario antigo.
- PR #33: módulo atalhos (`/atalhos`), leitura por autenticados, escrita só por superadmin, criação/edição e confirmação de exclusão inline na sidebar. Esta implementação já atende a Task 1 e é mantida.
- PR #32: redesign Vidro clínico/Vidro líquido já incorporado à dev e preservado. A página de usuários usa os controles compartilhados, ícones Lucide e estilos surface/tabela dessa versão.

## Integração

A Task 2 adiciona tabela de usuários, busca por nome/e-mail, filtros por perfil/setor/status, paginação local de 10 linhas e formulários de cadastro/edição nos componentes compartilhados. Cadastro aceita senha inicial; edição não altera senha. Exclusão desativa a conta, preservando vínculos e permitindo reativação.

Página e consultas são exclusivas de superadmin; os endpoints existentes mantêm `requer_superadmin` em todas as operações. Dados são tipados sem `any`; formulários usam React Hook Form, requisições usam Axios e TanStack Query, notificações usam Sonner. Mutations invalidam usuários e aniversariantes do mural.

USU-03 recebeu correção de validação: `nome`, `email`, `role` e `ativo` explicitamente nulos geravam violação de NOT NULL no banco; agora retornam 422 com o campo. `setor_id` e `data_nascimento` continuam aceitando nulo.

São seguidos os specs atuais. As decisões marcadas como pendentes (exigir setor para admin_setor; proteção contra autodesativação/último superadmin; auditoria global) continuam pendentes. Por isso esta versão substitui os pacotes antigos: não acrescenta `/duvidas/acessos-rapidos`, escopo de atalhos por setor, tabelas de auditoria paralelas nem as migrações antigas das tasks. Não há nova migration nesta integração.

Cobre: USU-01, USU-02, USU-03, USU-04, ATA-05 e bloqueios de GER-03/GER-12.

## Validação

- Backend: 75 testes passam, incluindo a suíte existente de atalhos e mural e os novos testes de usuários. Executados com o motor PostgreSQL embarcado PGlite, protocolo PostgreSQL via TCP, migrations Alembic e fixtures originais, timezone UTC. Isso não substitui validação no PostgreSQL nativo da equipe, especialmente concorrência. Nenhum código/adaptador PGlite foi adicionado ao projeto.
- Frontend: 60 testes com Vitest/Testing Library, incluindo 13 testes novos (USU e ATA), lint e build TypeScript/Vite. Os testes usam APIs simuladas; não são uma validação visual em navegador.
- Os testes de backend ficam em `backend/tests/usuarios/test_usuarios.py`. No ambiente normal da equipe, execute `docker compose up -d banco` e `pytest` em backend com requirements-dev.txt e variáveis de teste configuradas.
- Frontend: `npm ci`, `npm test`, `npm run lint`, `npm run build`.

## Aplicação

Esta alteração parte da dev atual (78618e3). Não aplique novamente os patches dos pacotes anteriores. Num checkout limpo:

```bash
git switch dev
git pull --ff-only
git switch -c feature/usuarios/integracao-tasks-20261016
git am /caminho/Integracao_Tasks_20261016.patch
```

Se a dev avançou, revise os conflitos; para cancelar a aplicação use `git am --abort`. Instale as dependências do frontend com `npm ci`. As migrations existentes da equipe permanecem; não há nova mudança de schema.

A integração é proposta em branch separada no fork de SamySantosRocha, com PR para a dev do repositório original. O merge e a implantação ficam fora desta alteração.
