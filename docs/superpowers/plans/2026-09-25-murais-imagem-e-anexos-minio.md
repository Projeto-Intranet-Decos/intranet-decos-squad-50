# Plano: imagem de capa e anexos dos avisos no MinIO (fullstack)

## Contexto

Na tela "adicionar aviso" do mural (`murais`), o formulário já tem uma área de ANEXOS, mas os arquivos ficam só no estado local e nunca são enviados (há um TODO em `frontend/src/features/murais/components/ModalAviso.tsx:84`).

No backend, `Aviso.chave_imagem` é uma string que o cliente manda livremente. Não há rota de upload, nada confere se o objeto existe e apagar o aviso não apaga nada no MinIO. O front usa `chaveImagem` direto como `url(...)` no CSS, o que não funciona, porque é uma chave de objeto e não uma URL.

A integração com o MinIO já existe na branch de documentos (`app/core/armazenamento.py`) e foi feita pensando em ser reaproveitada pelos avisos. Ver `docs/superpowers/plans/2026-09-24-documentos-armazenamento-minio.md:14`.

**Decisões tomadas com você:**
- O escopo é **capa + anexos**.
- A capa é servida por um **endpoint público**, `GET /murais/avisos/{id}/imagem`. Os anexos exigem autenticação e são baixados com axios como blob.

## Backend (`backend/app`)

### 1. Extrair o que é comum para o core
Hoje o validador, o sanitizador de nome e o cabeçalho de download ficam dentro de `documentos`. Eles vão para `app/core/arquivos.py` (novo, com indentação de 4 espaços como o resto do core):
- `TIPOS_DOCUMENTO`, que é o atual `TIPOS_PERMITIDOS` de `documentos/service.py:21`, e `TIPOS_IMAGEM` (png, jpg, jpeg, webp).
- `validar_arquivo(arquivo, tipos, limite_mb) -> (nome, tipo, tamanho)`, generalizado a partir de `documentos/service.py:43`.
- `sanitizar_nome`, que vem de `documentos/storage.py:17`.
- `content_disposition`, que vem de `documentos/router.py:23`.

O módulo `documentos` passa a importar daí, sem mudar o comportamento.

### 2. Modelo e migração (`modules/murais/models.py`)
- Nova classe `AnexoAviso`, tabela `anexos_aviso`, com as colunas:
  - `id` (uuid)
  - `aviso_id` (FK para `avisos`, `ondelete=CASCADE`, com índice)
  - `nome_arquivo` String(255)
  - `tipo_conteudo` String(150)
  - `tamanho_bytes` BigInteger
  - `chave_armazenamento` String(500), única
  - `criado_em`
- Em `Aviso`, entram `anexos = relationship(..., order_by=criado_em)` e `selectinload` em `_consulta_base` do repository.
- `chave_imagem` continua como está.
- Nova migração Alembic com `down_revision = "e5a7c9d2f4b6"`, a head atual.

### 3. Chaves no MinIO (`modules/murais/storage.py`, novo)
Seguem o padrão de prefixo por módulo:
- Capa: `murais/avisos/{aviso_id}/capa/{uuid}.{ext}`. O uuid muda a cada troca de capa, então a URL nova fura o cache.
- Anexo: `murais/avisos/{aviso_id}/anexos/{anexo_id}/{nome-sanitizado}.{ext}`

### 4. Schemas (`modules/murais/schemas.py`)
- `AvisoCriar` vira um Form model multipart, como `DocumentoCriar` (`documentos/schemas.py:10`). Campos: os de hoje, mais `imagem: UploadFile | None = None` e `anexos: list[UploadFile] = []`. **Sai `chave_imagem`**, porque o cliente não pode mais apontar para qualquer chave.
- `AvisoAtualizar` também perde `chave_imagem`. A capa passa a ter endpoints próprios.
- `AvisoResposta` deixa de expor `chave_imagem` e passa a ter:
  - `possui_imagem: bool`
  - `versao_imagem: str | None`, um trecho da chave usado como `?v=` para o cache
  - `anexos: list[AnexoResposta]`, com `id`, `nome_arquivo`, `tipo_conteudo` e `tamanho_bytes`

### 5. Service (`modules/murais/service.py`)
A ordem das operações segue a regra de `docs/arquitetura-backend.md`: no pior caso sobra um objeto órfão no MinIO, nunca uma linha no banco sem arquivo.
- `criar_aviso`:
  1. Valida a capa e cada anexo. Máximo de 10 anexos. A capa tem limite fixo de 5 MB; os anexos usam `tamanho_maximo_upload_mb`.
  2. Gera `aviso_id` e os ids dos anexos antes do insert e sobe todos os objetos.
  3. Insere o aviso e os anexos.
  4. Se o `SQLAlchemyError` estourar, remove todos os objetos enviados. É o mesmo padrão de `criar_documento` em `documentos/service.py:79`.
- `substituir_imagem(sessao, aviso_id, arquivo, usuario)`: chama `garantir_escopo`, sobe a nova capa, faz o commit (atualizando `atualizado_em`) e só então remove a capa antiga.
- `remover_imagem`: faz o commit com `chave_imagem=None` e depois remove o objeto.
- `adicionar_anexos` e `remover_anexo`: seguem o mesmo padrão.
- `deletar_aviso`: coleta a chave da capa e as chaves dos anexos, faz o commit (a FK com CASCADE apaga as linhas) e depois chama `armazenamento.remover_arquivo` para cada chave.
- `abrir_imagem(sessao, aviso_id)` e `abrir_anexo(sessao, aviso_id, anexo_id)` devolvem os metadados e `armazenamento.ler_arquivo(chave)`. Uma capa ausente gera 404.

### 6. Router (`modules/murais/router.py`)
- `POST /avisos` passa a receber `dados: Annotated[AvisoCriar, Form()]` e continua com `requer_admin`.
- `PUT /avisos/{id}/imagem` (recebe `arquivo: UploadFile`) e `DELETE /avisos/{id}/imagem` exigem `requer_admin`.
- `POST /avisos/{id}/anexos` (recebe `arquivos: list[UploadFile]`) e `DELETE /avisos/{id}/anexos/{anexo_id}` exigem `requer_admin`.
- `GET /avisos/{id}/imagem` é **público**, sem dependência de autenticação. Devolve um `StreamingResponse` com o tipo derivado da extensão e os cabeçalhos:
  - `Cache-Control: public, max-age=31536000, immutable`, o que funciona porque a URL leva `?v=`
  - `X-Content-Type-Options: nosniff`
- `GET /avisos/{id}/anexos/{anexo_id}/download` exige `usuario_atual` e faz streaming como o download de documentos, com `content_disposition`.

### 7. Documentação
- `docs/arquitetura-backend.md`, seção "Armazenamento (MinIO)": registrar o prefixo `murais/`, as chaves de capa e de anexo e o motivo de a capa ser pública (conteúdo institucional, id UUID que não dá para adivinhar, e `<img>` não envia o Bearer).
- `CONTEXT.md`: adicionar os termos "Capa" e "Anexo" do aviso.
- `frontend/nginx.conf`: conferir o `client_max_body_size`, porque a criação com vários anexos manda tudo numa única requisição.

## Frontend (`frontend/src/features/murais`)

### 8. Tipos e API
- Em `types.ts`:
  - `Aviso` perde `chaveImagem` e ganha `urlImagem: string | null`. `anexos` passa a ser `Anexo[]`, com `{ id, nome, tamanho, tipoConteudo }`.
  - `NovoAviso` ganha `imagem?: File | null` e `anexos?: File[]`.
  - Remover o comentário que diz que "anexos não existem no backend".
- Em `api.ts`:
  - `paraAviso` monta `urlImagem = possui_imagem ? \`/api/murais/avisos/${id}/imagem?v=${versao_imagem}\` : null` e mapeia os anexos com `formatarTamanhoArquivo`.
  - `criarAviso` passa a enviar um `FormData` com os campos, `imagem` e cada item de `anexos`. O axios define o boundary sozinho, porque `lib/api.ts` não fixa Content-Type.
  - Funções novas: `substituirImagemAviso`, `removerImagemAviso`, `enviarAnexosAviso`, `removerAnexoAviso` e `baixarAnexoAviso`. Esta última faz um GET com `responseType: 'blob'`, cria um objectURL, dispara o clique num `<a download>` e revoga a URL em seguida.
  - `paraCorpoAviso` deixa de enviar `chave_imagem`.

### 9. Hook `hooks/useSalvarAviso.ts`
- Na criação, é uma única chamada multipart.
- Na edição, primeiro vai o `PUT` do texto e depois, em sequência, as operações de arquivo que mudaram:
  - trocar ou remover a capa
  - enviar os anexos novos
  - remover os anexos marcados
- O `onError` segue o padrão atual, com `ErroCampo.mensagem` no toast. O `onSuccess` invalida `['avisos']`, como já faz hoje.

### 10. `components/ModalAviso.tsx`
- Novo campo **"IMAGEM DE CAPA"**, com:
  - `accept="image/png,image/jpeg,image/webp"`
  - pré-visualização via `URL.createObjectURL`, revogada num cleanup
  - botões para trocar e remover
  - checagem de tipo e do limite de 5 MB antes de enviar, com erro via toast
  - quando está editando, mostra a `urlImagem` atual
- **ANEXOS**: `AnexoLocal` passa a separar os anexos existentes (`id`) dos novos (`arquivo: File`) e guarda os ids removidos. O dropzone e a lista atuais são reaproveitados. O texto de dica deve refletir os limites reais do backend: os tipos de `TIPOS_DOCUMENTO`, até 10 arquivos, e o `tamanho_maximo_upload_mb`.
- Remover o TODO da linha 84.

### 11. Exibição
- `CartaoAviso.tsx:57`, `ModalDetalheAviso.tsx:45` e `CarrosselDestaques.tsx:33` passam a usar `aviso.urlImagem` em vez de `chaveImagem`. O gradiente de fallback do carrossel continua.
- `BadgeCategoria` recebe `comImagem={!!aviso.urlImagem}`.
- `ModalDetalheAviso` ganha a lista de anexos com um botão de baixar, que chama `baixarAnexoAviso` e mostra um toast se der erro.

## Commits e branch
- Uma branch `feature/backend/murais/imagem-e-anexos-minio` e outra `feature/frontend/murais/imagem-e-anexos`, criadas a partir da branch atual de documentos, porque dependem de `core/armazenamento.py`.
- Commits em Conventional Commits, na ordem: refatoração do core, modelo e migração, service e router, docs, front.

## Verificação
Não há testes automatizados no backend (é uma decisão ainda em aberto em `docs/arquitetura-backend.md:177`), então a verificação é manual:
1. Subir Postgres e MinIO e rodar `alembic upgrade head`. Confirmar que a tabela `anexos_aviso` existe.
2. Com um token de `admin_setor`, testar com `curl`:
   - `POST /api/murais/avisos` multipart com a capa e 2 anexos. Deve responder 201, com `possui_imagem=true` e 2 anexos.
   - Conferir os objetos no console do MinIO, em `murais/avisos/{id}/...`.
   - `GET .../imagem` **sem token** deve responder 200, com o tipo correto e o cabeçalho de cache.
   - `GET .../anexos/{id}/download` sem token deve responder 401. Com token, 200 e o `Content-Disposition` correto.
   - Mandar um `.html` como capa deve dar 415. Uma capa acima de 5 MB deve dar 413. Mais de 10 anexos deve dar 422.
   - `PUT .../imagem` deve remover a capa antiga do bucket. `DELETE` do aviso deve deixar o prefixo vazio.
   - Um `admin_setor` de outro setor deve receber 403 nos endpoints de escrita.
3. Regressão em documentos: upload e download continuam funcionando depois da extração para `core/arquivos.py`.
4. No front (`npm run dev`, depois `npm run lint` e `tsc`):
   - Criar um aviso com capa e anexos, e ver a capa no card, no carrossel e no detalhe.
   - Baixar um anexo.
   - Editar trocando a capa (a imagem deve atualizar sem cache velho), removendo um anexo e adicionando outro.
   - Excluir o aviso.
