# Plano: o mural absorve o calendário (evento vira aviso)

## Contexto

`Evento` (módulo `calendario`) e `Aviso` (módulo `murais`) eram quase a mesma entidade: criados
por admin, leitura institucional, escopo de edição por setor, título + texto. Só o evento tinha
datas, e só o aviso tinha capa, anexos e fixado. Para separar os dois, a categoria "evento" do
cliente tinha virado `convite` (migration `e5f8b2c3d4a1`).

Specs já atualizados neste PR: [`murais.md`](../../specs/murais.md) (MUR-01, 03, 06, 11 a 15),
[`calendario.md`](../../specs/calendario.md) (CAL-* riscados), `CONTEXT.md`, GER-04 e LOG-01.

**Decisões tomadas com você:**
- Evento é um aviso com `categoria = 'evento'` e datas. Não existe coluna `tipo` separada, e
  `evento` substitui `convite`.
- Evento aparece no feed, no carrossel e nos fixados, como qualquer aviso.
- `conteudo` é opcional em evento e continua obrigatório nas outras categorias.
- Aniversariantes viram rota do mural (`/murais/aniversariantes`).
- A tela de calendário continua existindo, como visão do mural: filtra os eventos, posiciona cada
  um na sua data e, no clique, abre o detalhe do aviso.

## Backend (`backend/app`)

### 1. Modelo (`modules/murais/models.py`)
- `CategoriaAviso`: `COMUNICADO`, `PROMOCAO`, `EVENTO` (sai `CONVITE`).
- `Aviso` ganha `data_inicio: datetime | None` e `data_fim: datetime | None`, ambas
  `DateTime(timezone=True)`, com índice em `data_inicio`.
- `conteudo` passa a ser `Mapped[str | None]`.
- Checks (o prefixo `ck_avisos_` vem da naming convention):
  - `categoria`: `categoria IN ('comunicado', 'promocao', 'evento')`. O nome continua estável,
    como pede GER-11.
  - `evento_tem_data`: `(categoria = 'evento') = (data_inicio IS NOT NULL)`.
  - `data_fim_so_com_inicio`: `data_fim IS NULL OR (data_inicio IS NOT NULL AND data_fim >= data_inicio)`.
  - `conteudo_fora_de_evento`: `categoria = 'evento' OR conteudo IS NOT NULL`.

### 2. Migration (`down_revision = "34d94eb9d1af"`, a head atual)
`upgrade`:
1. Adiciona `data_inicio`/`data_fim` e o índice, e deixa `conteudo` nullable.
2. Remove `ck_avisos_categoria`.
3. `UPDATE avisos SET categoria = 'comunicado' WHERE categoria = 'convite'`: o convite não tem
   data, então não pode virar evento.
4. Copia `eventos` para `avisos`, mantendo o mesmo `id`, `titulo`, `descricao → conteudo`,
   `categoria = 'evento'`, as datas, `autor_id`, `setor_id`, `criado_em`, `fixado = false` e
   `atualizado_em = NULL`.
5. Recria `ck_avisos_categoria` e cria os três checks novos.
6. `DROP TABLE eventos`.

`downgrade`: recria `eventos` e copia de volta os avisos `categoria = 'evento'`, com
`conteudo → descricao`. Os anexos e a capa desses avisos se perdem: apaga primeiro os anexos e
avisa no docstring que os objetos do MinIO ficam órfãos. Depois remove os avisos-evento, restaura
o check com `convite`, remove as colunas e volta `conteudo` a NOT NULL. Comunicado que era convite
não volta a ser convite: a migration é com perda, e isso fica documentado.

### 3. Schemas (`modules/murais/schemas.py`)
- `AvisoCriar`: `conteudo: str | None = None` (vazio vira `None`), `data_inicio`, `data_fim`. Um
  `model_validator(mode="after")` aplica as regras de MUR-03, com as mensagens do spec e `campo`
  correto. Hoje o `campo` sai de `loc`, então o erro precisa ser levantado de um jeito que o
  `core/erros.py` consiga apontar o campo (ver como `calendario/service.py:_validar_periodo` faz,
  e mover essa função para o mural).
- `AvisoAtualizar`: inclui as datas; `rejeitar_nulo` deixa de valer para `conteudo` e `data_fim`.
  A validação do aviso **resultante** fica no service (precisa do estado atual).
- `AvisoResposta`: `conteudo: str | None`, `data_inicio`, `data_fim`.
- Datas sem fuso viram UTC, igual o calendário fazia hoje.

### 4. Service / repository (`modules/murais/`)
- `criar_aviso`: sem mudança além das datas.
- `atualizar_aviso`: aplica as mudanças sobre uma cópia dos valores. Se a categoria final não é
  `evento`, zera as datas. Depois valida com a mesma função de MUR-03 e só então grava.
- `listar_eventos(sessao, de, ate, setor_id)`: filtra por `categoria = 'evento'` com a regra de
  período de MUR-12, já corrigida (`data_inicio <= fim(ate)` e
  `coalesce(data_fim, data_inicio) >= inicio(de)`), ordenada por `data_inicio, titulo`. Reaproveita
  a `_consulta_base` (selectinload de anexos, autor, setor).
- `listar_aniversariantes(sessao, mes)`: copiada de `calendario/service.py` e
  `calendario/repository.py`, sem mudar a regra.

### 5. Router (`modules/murais/router.py`)
- `GET /murais/eventos` (MUR-12, query `de`, `ate`, `setor_id`) e `GET /murais/aniversariantes`
  (MUR-13, query `mes`), ambos com `Depends(usuario_atual)`, respondendo
  `list[AvisoResposta]` e `list[AniversarianteResposta]`.

### 6. Remover o módulo `calendario`
- Apagar `app/modules/calendario/` e o `include_router` em `main.py`.
- Garantir que o `alembic/env.py` (ou quem importa os models) não importe mais `Evento`.

### 7. Testes (`backend/tests/murais/`)
Ciclo vermelho → verde, um critério por vez:
- `test_avisos.py`: os critérios novos de MUR-01, MUR-03 e MUR-06 (evento sem data → 422, data
  em comunicado → 422, `data_fim < data_inicio` → 422, evento sem conteúdo → 201, `convite` → 422,
  troca de categoria apaga as datas, evento aparece em `/murais/avisos`).
- `test_eventos.py` (novo): MUR-12. Leva os dois testes de `tests/calendario/test_eventos.py`
  reescritos como `test_mur12_...`. O do CAL-02 deixa de ser `xfail`, porque nasce verde com a
  regra corrigida.
- `test_aniversariantes.py` (novo): MUR-13.
- Teste da migration: com uma linha em `eventos` antes do upgrade, ela vira um aviso-evento. É
  opcional; a suíte já roda `alembic upgrade head` do zero.
- Apagar `tests/calendario/`. `Fabrica` em `tests/apoio.py` ganha um `evento(...)` (aviso com
  categoria e data) se ajudar.

## Frontend (`frontend/src`)

### 8. Tipos e API (`features/murais/`)
- `types.ts`: `CategoriaAviso` com `evento` no lugar de `convite`; `Aviso` ganha `dataInicio`,
  `dataFim` e `conteudo: string | null`.
- `api.ts`: `listarEventos(de, ate, setorId)` → `/murais/eventos`, e `listarAniversariantes(mes)`
  → `/murais/aniversariantes` (hoje em `api.ts:183` e `:188` apontam para `/calendario/...`).
  O payload de criar/editar leva as datas.

### 9. Mural
- `BadgeCategoria`, `BarraFiltrosMural`: categoria `evento`.
- `ModalAviso`: com `evento` selecionado, mostra data/hora de início (obrigatória) e de fim, e o
  conteúdo vira opcional. Aceita valores iniciais (`categoria`, `dataInicio`) para ser aberto pelo
  calendário.
- `CartaoAviso`, `ModalDetalheAviso`: mostram o período do evento.
- `PainelProximosEventos` mostra os avisos-evento; o clique abre `ModalDetalheAviso`.
- Invalidação: as mutations de aviso invalidam também as queries de eventos.

### 10. Calendário dentro do mural
- Mover `features/calendario/components/{PaginaCalendario,CabecalhoCalendario,Visao*}.tsx` e
  `formatadores.ts` para `features/murais/` (componentes e formatadores do calendário).
- `useEventos` passa a chamar `listarEventos` do mural; evento de vários dias aparece em cada dia
  coberto nas visões.
- O clique no evento abre `ModalDetalheAviso`, e "Novo evento" abre `ModalAviso` com
  `categoria = 'evento'` e a data clicada.
- Apagar `ModalEvento`, `useSalvarEvento`, `useExcluirEvento`, `useSetoresCalendario` e os
  painéis duplicados (`PainelAniversariantes` e `PainelProximosEventos` existem nas duas features:
  ficam os do mural).
- `App.tsx` importa `PaginaCalendario` de `features/murais`; a rota `/calendario` e o item do
  `Layout` continuam.
- Apagar `features/calendario/` e tirar `calendario` de `features/logs/types.ts`.

## Docs (no PR que remove o módulo)
- `docs/arquitetura-backend.md` e `docs/arquitetura-frontend.md`: tirar `calendario/` da árvore.
- `CLAUDE.md`: "mesmo nome dos 7 módulos" vira 6.
- `docs/specs/README.md`: a árvore de testes perde `calendario/test_eventos.py` e o exemplo de
  `xfail` deixa de citar CAL-02.
- Status Back/Front/Teste em `murais.md` conforme cada critério fecha.

## Ordem dos PRs
1. **Specs** (este): murais, calendario, CONTEXT, GER-04, LOG-01 e este plano. Precisa do aval do
   dono do domínio, porque é mudança de regra.
2. **Backend**: passos 1 a 7 num PR (`feature/backend/murais/eventos-no-mural`). Modelo, migration
   e testes andam juntos; o módulo `calendario` sai no mesmo PR, já que a tabela some.
3. **Frontend**: passos 8 a 10 (`feature/frontend/murais/eventos-no-mural`). Entre o merge do
   backend e o do frontend, a tela de calendário e os painéis quebram em `dev`. Para evitar isso,
   os dois PRs entram juntos em `dev`, ou o backend mantém `/calendario/*` como alias até o
   frontend entrar. Mais simples: mergear em sequência no mesmo dia.
4. **Docs** finais (pode ir junto do 3).

## Riscos
- **Perda de `convite`**: avisos `convite` existentes viram `comunicado`. Se algum deles devia ser
  um evento, alguém precisa editá-lo e informar a data.
- **Downgrade com perda** (capa e anexos de eventos e convites), documentado na migration.
- **Trabalho paralelo** em `features/calendario` ou `modules/calendario` conflita com a remoção.
  Avisar o time antes do PR 2.

## Execução (2026-10-09, branch `feature/murais/eventos-no-mural`)

Feito numa branch só, com backend e frontend juntos (a convenção pede isso para tarefa que cruza
as camadas), então o alias `/calendario/*` não foi necessário. Diferenças em relação ao plano:

- As regras de MUR-03 ficaram no service (`_validar_aviso`), e não num `model_validator`: assim o
  erro sai com o `campo` certo, e a mesma função valida o resultado da edição (MUR-06).
- `Fabrica.evento(...)` não foi criada: os testes criam eventos pela API.
- No frontend, as queries de eventos ficam debaixo da chave `['avisos', ...]`, então a
  invalidação que já existia depois de salvar ou excluir aviso também atualiza o calendário e os
  painéis.
- A migration foi testada à mão num banco descartável: upgrade com evento e convite existentes,
  CHECK barrando evento sem data, downgrade e re-upgrade.
