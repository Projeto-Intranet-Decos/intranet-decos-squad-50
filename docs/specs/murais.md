# Mural de avisos (`MUR`)

Módulo 1 do MVP: "Mural de avisos & destaques — notícias corporativas, mudanças de setores,
promoções de colaboradores e comunicados institucionais" `[ESP]`.

Categorias de aviso: `comunicado`, `promocao`, `convite` `[CTX]`. `convite` chama as pessoas para
algo e **não** é um Evento do calendário (a categoria "Evento" da modelagem do cliente virou
`convite`).

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| MUR-01 | Listar avisos | ✅ | ✅ | ⬜ |
| MUR-02 | Consultar um aviso | ✅ | ✅ | ⬜ |
| MUR-03 | Publicar aviso | ✅ | ✅ | 🟡 |
| MUR-04 | Capa do aviso no envio | ✅ | ✅ | 🟡 |
| MUR-05 | Anexos do aviso no envio | ✅ | ✅ | ⬜ |
| MUR-06 | Editar texto do aviso | ✅ | ✅ | ⬜ |
| MUR-07 | Trocar e remover capa | ✅ | ✅ | ⬜ |
| MUR-08 | Adicionar, remover e baixar anexos | ✅ | ✅ | ⬜ |
| MUR-09 | Capa pública com cache | ✅ | ✅ | ⬜ |
| MUR-10 | Excluir aviso | ✅ | ✅ | ⬜ |
| MUR-11 | Tela do mural | — | ✅ | ⬜ |

### MUR-01 — Listar avisos
Origem: [ESP] [ENT H1] · Back ✅ · Front ✅ · Teste ⬜

`GET /murais/avisos` — qualquer autenticado; avisos de todos os setores (GER-04), mais recentes
primeiro. Cada aviso traz `titulo`, `conteudo`, `categoria`, `fixado`, `possui_imagem`,
`versao_imagem`, `anexos` (id, nome, tipo, tamanho), `setor_id/nome`, `autor_id/nome`, `criado_em`,
`atualizado_em`.

- **Dado** aviso publicado por um admin, **quando** outro usuário (inclusive `comum` de outro
  setor) lista, **então** o aviso aparece.

### MUR-02 — Consultar um aviso
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

`GET /murais/avisos/{id}` — qualquer autenticado; `404 "Aviso não encontrado"`.

### MUR-03 — Publicar aviso
Origem: [ESP] [ENT H1] · Back ✅ · Front ✅ · Teste 🟡

`POST /murais/avisos`, `multipart/form-data` — `admin_setor` ou `superadmin`; setor por GER-04.

| Campo | Regra |
|---|---|
| `titulo` | obrigatório, 1–200 (sem espaços nas pontas) |
| `conteudo` | obrigatório, não vazio |
| `categoria` | `comunicado` (padrão), `promocao` ou `convite` |
| `fixado` | booleano, padrão `false` |
| `setor_id` | opcional (GER-04) |
| `imagem` | opcional (MUR-04) |
| `anexos` | opcional, lista (MUR-05) |

- **Dado** dados válidos, **então** `201` com o aviso completo (nomes resolvidos, GER-08).
- **Dado** título ou conteúdo vazio, ou categoria fora da lista, **então** `422` e nada é criado.
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
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

`PUT /murais/avisos/{id}` (JSON) — escopo por setor (GER-04). Atualização parcial de `titulo`,
`conteudo`, `categoria`, `fixado`.

- Campo enviado como `null` → `422`. Corpo vazio → nada muda, `200`.
- Qualquer mudança atualiza `atualizado_em`.
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
depois do commit, todos os objetos do aviso no bucket.

### MUR-11 — Tela do mural
Origem: [ESP] [ENT H1] · Back — · Front ✅ · Teste ⬜

- Busca local por título, autor ou conteúdo; filtros por categoria e setor.
- Carrossel de destaques com os 5 avisos mais recentes e painel de fixados — ambos **ignoram** os
  filtros da busca.
- Painéis laterais: próximos eventos (a partir de agora, CAL-01) e aniversariantes do mês (CAL-06).
- "Novo aviso" só para `admin_setor`/`superadmin`; editar/excluir só nos avisos que o usuário pode
  gerenciar (GER-12).
- Formulário valida tipo/tamanho de capa e anexos antes do envio; erro do backend no campo
  (GER-05); lista e carrossel atualizam sozinhos depois de publicar/editar/excluir (invalidação de
  cache).
- Detalhe do aviso em modal, com capa e anexos baixáveis.
