# Mural: avisos, eventos e aniversariantes (`MUR`)

Módulo 1 do MVP `[ESP]`:

- "Mural de avisos & destaques — notícias corporativas, mudanças de setores, promoções de
  colaboradores e comunicados institucionais";
- "Mural de eventos — calendário ou lista com próximos eventos, treinamentos e ações internas";
- "Aniversariantes do mês — listagem automática com busca por data e setor".

Categorias de aviso: `comunicado`, `promocao`, `evento` `[CTX]`. **Evento é um aviso** de
categoria `evento`, com data de início (e fim opcional): aparece no feed do mural como qualquer
aviso e também na tela de calendário, posicionado na sua data. Não existe mais registro de evento
separado; o antigo módulo `calendario` foi absorvido aqui (ver [`calendario.md`](./calendario.md)).
A categoria `convite` deixou de existir, porque o evento cumpre o papel dela.

Aniversariante **não é registro próprio**: é derivado de `usuarios.data_nascimento` `[CTX]`.

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| MUR-01 | Listar avisos | ✅ | ✅ | ✅ |
| MUR-02 | Consultar um aviso | ✅ | ✅ | ⬜ |
| MUR-03 | Publicar aviso | ✅ | ✅ | 🟡 |
| MUR-04 | Capa do aviso no envio | ✅ | ✅ | 🟡 |
| MUR-05 | Anexos do aviso no envio | ✅ | ✅ | ⬜ |
| MUR-06 | Editar texto do aviso | ✅ | ✅ | 🟡 |
| MUR-07 | Trocar e remover capa | ✅ | ✅ | ⬜ |
| MUR-08 | Adicionar, remover e baixar anexos | ✅ | ✅ | ⬜ |
| MUR-09 | Capa pública com cache | ✅ | ✅ | ⬜ |
| MUR-10 | Excluir aviso | ✅ | ✅ | ⬜ |
| MUR-11 | Tela do mural | — | ✅ | ⬜ |
| MUR-12 | Listar eventos por período | ✅ | ✅ | ✅ |
| MUR-13 | Aniversariantes do mês | ✅ | ✅ | ✅ |
| MUR-14 | Filtrar aniversariantes por setor e data | ⬜ | ⬜ | ⬜ |
| MUR-15 | Tela do calendário | — | ✅ | ⬜ |

### MUR-01 — Listar avisos
Origem: [ESP] [ENT H1] [CTX] · Back ✅ · Front ✅ · Teste ✅

`GET /murais/avisos` — qualquer autenticado; avisos de todos os setores (GER-04), **inclusive
eventos**, mais recentes primeiro (por `criado_em`). Cada aviso traz `titulo`, `conteudo`,
`categoria`, `data_inicio`, `data_fim`, `fixado`, `possui_imagem`, `versao_imagem`, `anexos` (id,
nome, tipo, tamanho), `setor_id/nome`, `autor_id/nome`, `criado_em`, `atualizado_em`.

- **Dado** aviso publicado por um admin, **quando** outro usuário (inclusive `comum` de outro
  setor) lista, **então** o aviso aparece.
- **Dado** um evento publicado, **então** ele aparece na lista junto dos demais avisos, com
  `data_inicio` e `data_fim`; nos outros avisos as duas vêm `null`.

### MUR-02 — Consultar um aviso
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

`GET /murais/avisos/{id}` — qualquer autenticado; `404 "Aviso não encontrado"`. Serve também para
eventos (mesmo corpo de MUR-01).

### MUR-03 — Publicar aviso
Origem: [ESP] [ENT H1] [ENT H3] [CTX] · Back ✅ · Front ✅ · Teste 🟡

`POST /murais/avisos`, `multipart/form-data` — `admin_setor` ou `superadmin`; setor por GER-04.

| Campo | Regra |
|---|---|
| `titulo` | obrigatório, 1–200 (sem espaços nas pontas) |
| `conteudo` | obrigatório e não vazio, **exceto** em `evento`, onde é opcional (vazio vira `null`) |
| `categoria` | `comunicado` (padrão), `promocao` ou `evento` |
| `data_inicio` | data e hora; obrigatória em `evento`, proibida nas demais categorias |
| `data_fim` | data e hora, opcional, só em `evento`, `>= data_inicio` |
| `fixado` | booleano, padrão `false` |
| `setor_id` | opcional (GER-04) |
| `imagem` | opcional (MUR-04) |
| `anexos` | opcional, lista (MUR-05) |

Teste: falta cobrir os `403` (comum; `admin_setor` com setor de outro).

- Data/hora sem fuso é tratada como UTC.
- **Dado** dados válidos, **então** `201` com o aviso completo (nomes resolvidos, GER-08).
- **Dado** título vazio, conteúdo vazio fora de `evento`, ou categoria fora da lista (inclusive
  `convite`), **então** `422` e nada é criado.
- **Dado** `categoria=evento` sem `data_inicio`, **então** `422 {"campo": "data_inicio",
  "mensagem": "Evento precisa de data de início"}`.
- **Dado** `data_inicio` ou `data_fim` numa categoria que não é `evento`, **então** `422 {"campo":
  "data_inicio" | "data_fim", "mensagem": "Só eventos têm data"}`.
- **Dado** `data_fim` anterior a `data_inicio`, **então** `422 {"campo": "data_fim", "mensagem":
  "Data de fim deve ser posterior à data de início"}`.
- **Dado** evento sem `conteudo`, **então** `201` com `conteudo: null`.
- Suporta evento de um único dia (sem `data_fim`) e de vários dias.
- **Dado** um `comum`, **então** `403`; **dado** `admin_setor` com `setor_id` de outro setor,
  **então** `403`.

### MUR-04 — Capa do aviso no envio
Origem: [ENT H1] · Back ✅ · Front ✅ · Teste 🟡

Uma capa por aviso `[CTX]`: png, jpg, jpeg ou webp, até **5 MB**.

- **Dado** imagem de tipo não suportado, **então** `415 {"campo": "imagem", ...}` e o aviso **não**
  é criado (nem sem capa).
- **Dado** imagem acima de 5 MB, **então** `413`.
- Frontend: pré-visualização da imagem escolhida antes de enviar.

### MUR-05 — Anexos do aviso no envio
Origem: [CTX] [COD] · Back ✅ · Front ✅ · Teste ⬜

Anexos usam os tipos e o limite de tamanho dos documentos (GER-06). No máximo **10 por aviso**.
Pertencem ao aviso e somem com ele; não são Documentos do setor.

- **Dado** mais de 10 anexos, **então** `422 {"campo": "anexos", "mensagem": "O aviso pode ter no
  máximo 10 anexos"}`.
- **Dado** um anexo inválido entre vários, **então** o aviso inteiro é rejeitado e nenhum arquivo
  fica no bucket (GER-07).

### MUR-06 — Editar texto do aviso
Origem: [ENT] [ENT H3] [CTX] · Back ✅ · Front ✅ · Teste 🟡

`PUT /murais/avisos/{id}` (JSON) — escopo por setor (GER-04). Atualização parcial de `titulo`,
`conteudo`, `categoria`, `data_inicio`, `data_fim`, `fixado`.

Teste: regras de evento e de `null` cobertas; falta corpo vazio, `atualizado_em` e escopo por setor.

- Corpo vazio → nada muda, `200`. Qualquer mudança atualiza `atualizado_em`.
- `null` só é aceito em `conteudo` (se o aviso resultante for `evento`) e em `data_fim`; nos
  demais campos → `422`.
- O aviso **resultante** (o atual com as mudanças aplicadas) segue as regras de MUR-03; se violar,
  `422` com o mesmo `campo`/`mensagem` e nada muda.
- **Dado** um evento que muda para outra categoria, **então** `data_inicio` e `data_fim` são
  apagadas automaticamente (não precisa mandar `null`).
- **Dado** um aviso que muda para `evento`, **então** `data_inicio` precisa vir no corpo.
- Capa e anexos não mudam por aqui (MUR-07, MUR-08).

### MUR-07 — Trocar e remover capa
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

- `PUT /murais/avisos/{id}/imagem` (campo `arquivo`) — mesmas regras de MUR-04; devolve o aviso
  com nova `versao_imagem`; a capa antiga é removida do bucket depois do commit.
- `DELETE /murais/avisos/{id}/imagem` → `204`; aviso sem capa também responde `204`.
- Escopo por setor (GER-04) nos dois.

### MUR-08 — Adicionar, remover e baixar anexos
Origem: [ENT] [COD] · Back ✅ · Front ✅ · Teste ⬜

- `POST /murais/avisos/{id}/anexos` (campo `arquivos`) — escopo por setor; o total (existentes +
  novos) não passa de 10 → `422 {"campo": "arquivos", ...}`.
- `DELETE /murais/avisos/{id}/anexos/{anexo_id}` → `204`; escopo por setor; `404` se o anexo não é
  desse aviso.
- `GET /murais/avisos/{id}/anexos/{anexo_id}/download` — qualquer autenticado; sempre
  `attachment` com o nome original (GER-06).

### MUR-09 — Capa pública com cache
Origem: [ENT H1] [COD] · Back ✅ · Front ✅ · Teste ⬜

`GET /murais/avisos/{id}/imagem` é o **único** arquivo servido sem login (`<img>` não envia o
Bearer; o id é um UUID não adivinhável).

- Resposta com `Cache-Control: public, max-age=31536000, immutable` e `nosniff`; tipo derivado da
  extensão.
- O frontend monta a URL com `?v={versao_imagem}`, que muda a cada troca de capa.
- **Dado** aviso sem capa ou inexistente, **então** `404`.

### MUR-10 — Excluir aviso
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

`DELETE /murais/avisos/{id}` → `204`; escopo por setor. Remove o aviso, os anexos (cascade) e,
depois do commit, todos os objetos do aviso no bucket. Vale igual para eventos.

### MUR-11 — Tela do mural
Origem: [ESP] [ENT H1] [CTX] · Back — · Front ✅ · Teste ⬜

- Busca local por título, autor ou conteúdo; filtros por categoria (inclusive `evento`) e setor.
- Eventos aparecem no feed, no carrossel e nos fixados como qualquer aviso; o card e o detalhe de
  um evento mostram a data (e o fim, se houver).
- Carrossel de destaques com os 5 avisos mais recentes e painel de fixados — ambos **ignoram** os
  filtros da busca.
- Painéis laterais: próximos eventos (a partir de agora, MUR-12) e aniversariantes do mês
  (MUR-13). Clicar num próximo evento abre o detalhe do aviso.
- "Novo aviso" só para `admin_setor`/`superadmin`; editar/excluir só nos avisos que o usuário pode
  gerenciar (GER-12).
- Formulário: escolher `evento` mostra os campos de data de início (obrigatória) e fim (opcional)
  e deixa o conteúdo opcional; valida tipo/tamanho de capa e anexos antes do envio; erro do backend
  no campo (GER-05); lista, carrossel, painéis e calendário atualizam sozinhos depois de
  publicar/editar/excluir (invalidação de cache).
- Detalhe do aviso em modal, com capa e anexos baixáveis.

### MUR-12 — Listar eventos por período
Origem: [ESP] [ENT H3] [CTX] · Back ✅ · Front ✅ · Teste ✅

`GET /murais/eventos?de=&ate=&setor_id=` — qualquer autenticado; devolve só avisos de categoria
`evento`, com o mesmo corpo de MUR-01. Todos os parâmetros opcionais; `de`/`ate` são datas
(`YYYY-MM-DD`) interpretadas em UTC, `ate` inclusivo até o fim do dia. Ordenado por `data_inicio` e
depois `titulo`. Substitui o antigo `GET /calendario/eventos` (CAL-01, CAL-02).

- **Dado** evento criado num período, **quando** consulta aquele período, **então** o evento
  aparece.
- **Dado** aviso de outra categoria, **então** ele nunca aparece aqui.
- **Dado** `setor_id`, **então** só eventos daquele setor ("eventos do meu setor", H3).
- **Dado** evento de vários dias que começa antes de `de` e termina dentro ou depois do período,
  **então** ele aparece. Regra: `data_inicio <= fim(ate)` **e**
  `coalesce(data_fim, data_inicio) >= início(de)`.
- **Dado** evento sem `data_fim`, **então** só `data_inicio` conta.

### MUR-13 — Aniversariantes do mês
Origem: [ESP] [ENT H3] · Back ✅ · Front ✅ · Teste ✅

`GET /murais/aniversariantes?mes=` — qualquer autenticado. `mes` de 1 a 12 (fora disso → `422`);
sem `mes`, usa o mês atual. Substitui o antigo `GET /calendario/aniversariantes` (CAL-06).

- Retorna `id`, `nome`, `dia`, `setor_id`, `setor_nome` (ou `null`), ordenado por dia e nome.
- Só usuários **ativos** com `data_nascimento` preenchida entram.
- Frontend: painel de aniversariantes no mural e no calendário.

### MUR-14 — Filtrar aniversariantes por setor e data
Origem: [ESP] [ENT H3] · Back ⬜ · Front ⬜ · Teste ⬜

O cliente pede busca de aniversariantes "por data e setor"; hoje só existe o filtro por mês.
Substitui CAL-07.

- ⬜ **Dado** `setor_id`, **então** só aniversariantes daquele setor.
- ⬜ **Dado** um dia (ex: `dia=` junto do `mes`), **então** só quem faz aniversário naquele dia.
- Frontend ⬜: filtros no painel de aniversariantes.

### MUR-15 — Tela do calendário
Origem: [ESP] [ENT H3] [CTX] · Back — · Front ✅ · Teste ⬜

Visão do mural que posiciona os eventos nas suas datas. Página "Calendário", rota `/calendario`,
feature `murais`. Substitui CAL-08.

- Visões de dia, semana, mês e ano, com navegação para períodos anterior/seguinte; a consulta usa
  MUR-12 com o intervalo da visão atual.
- Evento de vários dias aparece em todos os dias que cobre.
- Clicar num evento abre o **mesmo detalhe do aviso** do mural (capa, conteúdo, anexos), com
  editar/excluir para quem pode gerenciar (GER-12).
- Painéis de próximos eventos e de aniversariantes do mês (MUR-13).
- A tela só exibe: **não há botão de criar evento**. Evento é criado no mural, como qualquer aviso
  (MUR-03, MUR-11); não existe formulário de evento separado.
