# Novidades no sino do menu lateral (GER-28)

O sino do rodapé do menu era um botão sem ação. Ele passa a mostrar o que foi publicado desde a
última vez que o usuário abriu as novidades. Requisito: `docs/specs/transversal.md`, GER-28.

## Decisões

- **Última visita no backend** (`usuarios.novidades_vistas_em`), e não no `localStorage`: a
  técnica que abre a intranet em postos diferentes não vê a mesma novidade em cada um. Começa na
  criação da conta; quem já existia começa no momento da migration (`server_default now()`).
- **Sem módulo novo.** O marcador pertence ao usuário (`GET/PUT /usuarios/eu/novidades`), e cada
  módulo filtra os próprios dados com `?desde=` (`/murais/avisos`, `/documentos`). Quem junta as
  duas listas é o frontend (`lib/novidades/useNovidades.ts`), como a introdução em `lib/introducao`.
- **O que conta como novidade:** aviso criado depois da visita; documento com alguma
  `documento_versoes.criado_em` depois dela (envio = versão 1, substituição = versão nova). Editar
  só os metadados não conta. O que o próprio usuário publicou é filtrado no frontend.
- **Hora da marcação:** `clock_timestamp()` do Postgres, o mesmo relógio dos `criado_em`. O `now()`
  ficaria parado dentro da transação (nos testes, a transação é uma só por teste).
- **`desde` com fuso obrigatório** (`AwareDatetime`): sem fuso → 422. O frontend manda o valor que
  o próprio backend devolveu.
- **Abrir o sino marca tudo como visto.** Não há "lida/não lida" por item: o modal guarda uma
  fotografia da lista até fechar, e a contagem some na hora.
- **Destino de cada item:** `/mural?aviso=<id>` abre o detalhe; `/documentos?documento=<id>` abre a
  prévia. Mesmo padrão do `?data=` do calendário (aplicado uma vez por navegação).
- Contagem refeita a cada 5 minutos e ao voltar para a aba (padrão do TanStack Query).

## Arquivos

- Backend: `usuarios/{models,schemas,service,router}.py`, `murais/{router,service,repository}.py`,
  `documentos/{schemas,repository}.py`, migration `20261127_8c14e81c753b_novidades_vistas_em.py`,
  `tests/test_novidades.py`.
- Frontend: `lib/novidades/{useNovidades.ts,ModalNovidades.tsx,Novidades.test.tsx}`,
  `shared/components/Layout.tsx`, `PaginaMural.tsx`, `PaginaDocumentos.tsx` e as APIs de
  `murais`, `documentos` e `usuarios`.
