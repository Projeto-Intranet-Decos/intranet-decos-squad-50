# Central de documentos / POPs (`DOC`)

Módulo 2 do MVP: "Repositório de POPs/documentos — busca rápida de Procedimentos Operacionais
Padrão por categoria ou palavra-chave" `[ESP]`.

Documento pertence a um setor; o metadado mora no Postgres e o binário no MinIO `[CTX]`.
Categorias: `pop`, `protocolo`, `manual`, `formulario`, `outro`.

| ID | Requisito | Back | Front | Teste |
|---|---|---|---|---|
| DOC-01 | Listar e filtrar documentos | ✅ | ✅ | ⬜ |
| DOC-02 | Consultar um documento | ✅ | ✅ | ⬜ |
| DOC-03 | Baixar e pré-visualizar documento | ✅ | ✅ | ⬜ |
| DOC-04 | Enviar documento | ✅ | ✅ | ⬜ |
| DOC-05 | Editar metadados | ✅ | ✅ | ⬜ |
| DOC-06 | Substituir o arquivo | ✅ | ✅ | ⬜ |
| DOC-07 | Excluir documento | ✅ | ✅ | ⬜ |
| DOC-08 | Tela de documentos | — | ✅ | ⬜ |
| DOC-09 | Histórico de versões | ❓ | ❓ | ⬜ |

### DOC-01 — Listar e filtrar documentos
Origem: [ESP] [ENT H2] · Back ✅ · Front ✅ · Teste ⬜

`GET /documentos?setor_id=&categoria=&busca=` — qualquer autenticado (inclusive `comum`), todos os
setores (GER-04). Mais recentes primeiro. Sem token → `401`.

- `busca` (até 200): trecho do **título**, sem diferenciar maiúsculas; `%` e `_` são tratados como
  texto, não como curinga.
- **Dado** busca por título parcial, **então** retorna os documentos correspondentes.
- **Dado** `categoria` e/ou `setor_id`, **então** a lista fica restrita a eles; categoria fora da
  lista → `422`.

### DOC-02 — Consultar um documento
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

`GET /documentos/{id}` — qualquer autenticado; `404 "Documento não encontrado"`. Traz `titulo`,
`descricao`, `categoria`, `nome_arquivo`, `tipo_conteudo`, `tamanho_bytes`, setor e autor com nome.

### DOC-03 — Baixar e pré-visualizar documento
Origem: [ENT H2] · Back ✅ · Front ✅ · Teste ⬜

`GET /documentos/{id}/download?inline=` — qualquer autenticado, sem precisar de papel admin.

- Padrão `attachment` com o nome original; `inline=true` para pré-visualizar no navegador.
- Tipo vem do cadastro (derivado da extensão, GER-06).
- **Dado** arquivo ausente no bucket, **então** `404`; MinIO fora → `503`.

### DOC-04 — Enviar documento
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

`POST /documentos`, `multipart/form-data` — `admin_setor` ou `superadmin`; setor por GER-04.

| Campo | Regra |
|---|---|
| `titulo` | obrigatório, 1–200 |
| `descricao` | opcional; texto vazio vira `null` |
| `categoria` | uma das cinco; padrão `outro` |
| `setor_id` | opcional (GER-04) |
| `arquivo` | obrigatório; tipos e limite de GER-06 |

- **Dado** dados válidos, **então** `201`; o objeto fica em
  `documentos/setores/{setor_id}/{categoria}/{documento_id}/{nome-sanitizado}`.
- **Dado** falha ao gravar no banco, **então** o objeto enviado é removido (GER-07).

### DOC-05 — Editar metadados
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

`PUT /documentos/{id}` (JSON) — escopo por setor (GER-04). Atualização parcial de `titulo`,
`descricao`, `categoria`.

- `descricao: null` limpa a descrição; `titulo` ou `categoria` `null` → `422`.
- Mudar a categoria move o objeto para a pasta da nova categoria; se o commit falhar, volta
  (GER-07).
- Qualquer mudança atualiza `atualizado_em`; corpo vazio não muda nada.

### DOC-06 — Substituir o arquivo
Origem: [ENT] [ENT persona Carla — "versão mais recente do POP"] · Back ✅ · Front ✅ · Teste ⬜

`PUT /documentos/{id}/arquivo` (campo `arquivo`) — escopo por setor. Troca o binário mantendo o
mesmo documento (id, título, histórico de autor/setor); atualiza `nome_arquivo`, `tipo_conteudo`,
`tamanho_bytes`, `atualizado_em`. O arquivo antigo é removido depois do commit.

### DOC-07 — Excluir documento
Origem: [ENT] · Back ✅ · Front ✅ · Teste ⬜

`DELETE /documentos/{id}` → `204`; escopo por setor. Remove a linha e depois o objeto.

### DOC-08 — Tela de documentos
Origem: [ESP] [ENT H2] · Back — · Front ✅ · Teste ⬜

- Filtros de setor e categoria vão para o backend (DOC-01).
- Busca por palavras-chave **local**: todas as palavras digitadas precisam aparecer (sem acento,
  sem diferenciar maiúsculas) em título, descrição, nome do arquivo, setor ou categoria.
- Estados de carregamento e de lista vazia.
- Botão de download em cada item; pré-visualização em modal (`inline=true`).
- Envio/edição só para quem pode (GER-12); para `admin_setor`, o seletor de setor mostra só o
  próprio setor.
- Validação de tipo e tamanho antes do envio, espelhando GER-06.

### DOC-09 — Histórico de versões
Origem: [ENT persona Carla] · Back ❓ · Front ❓ · Teste ⬜

Hoje substituir o arquivo descarta a versão anterior. A decidir se o hospital precisa guardar
versões antigas de POPs (rastreabilidade/acreditação).
