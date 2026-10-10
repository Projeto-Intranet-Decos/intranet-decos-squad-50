# Transversal (`GER`)

Regras que valem para todos os módulos. Os specs de domínio referenciam estes IDs em vez de
repetir a regra.

## Contexto do produto

Intranet web para centralizar a comunicação interna do Hospital Decós: avisos, eventos,
aniversariantes, POPs/documentos, FAQ e diretório de setores/ramais. `[ESP]`

Personas `[ENT]`:

- **Carla Mendes**, técnica de enfermagem (internação) — acessa em intervalos curtos no posto de
  enfermagem. Precisa achar ramais e o POP mais recente rápido e ver os avisos do dia.
- **Roberto Souza**, analista de RH / comunicação interna — publica avisos e eventos, mantém FAQ,
  aniversariantes e ramais atualizados.

## Requisitos

### GER-01 — Plataforma e público
Origem: [ESP] · Back — · Front ✅ · Teste —

Aplicação web de uso interno, pensada para o desktop. Público: colaboradores administrativos e
assistenciais, exceto o corpo médico. Abaixo de 1024px o layout se adapta (menu lateral vira
drawer aberto por uma barra superior), sem rolagem horizontal da página a partir de 360px; o
desktop não muda por causa disso. Visual de referência em
[`docs/DESIGN_PROMPT.md`](../DESIGN_PROMPT.md); o fundo da aplicação tem um gradiente suave
(ajustável, ver GER-14) e a rolagem tem efeito elástico no desktop (GER-15).

### GER-02 — Autenticação obrigatória
Origem: [ENT] [COD] · Back ✅ · Front ✅ · Teste 🟡

Toda rota da API exige access token válido, exceto: `POST /auth/login`, `POST /auth/refresh`,
`GET /murais/avisos/{id}/imagem` (ver MUR-09) e `GET /saude`.

- **Dado** uma rota protegida, **quando** a requisição vem sem `Authorization`, com token
  malformado, com assinatura inválida ou expirado, **então** responde `401`
  `{"mensagem": "Não autenticado"}` com header `WWW-Authenticate: Bearer`.
- **Dado** um token válido, **então** o usuário é montado a partir dos claims, sem consulta ao
  banco (ver AUT-03).

### GER-03 — Papéis de acesso
Origem: [ESP] [ENT] [CTX] · Back ✅ · Front ✅ · Teste 🟡

Três papéis: `comum` (só lê), `admin_setor` (mantém conteúdo do próprio setor) e `superadmin`
(nível sistêmico: único com acesso a Usuários, Registro de atividades e criação/edição/remoção de
setores).

- Permissão que não depende do recurso é checada por dependency (`requer_admin`,
  `requer_superadmin`) e responde `403 {"mensagem": "Acesso negado"}` antes de qualquer
  processamento — inclusive antes de validar o recurso.
- **Dado** um `comum`, **quando** chama qualquer endpoint de escrita de conteúdo, **então** `403`.
- **Dado** um `admin_setor`, **quando** chama endpoint exclusivo de `superadmin`, **então** `403`.

### GER-04 — Escopo por setor (escrita) e leitura institucional
Origem: [CTX] [ENT] [COD] · Back ✅ · Front ✅ · Teste 🟡

Vale para Aviso (inclusive eventos, MUR-03), FAQ, Documento e Ramal. O registro guarda o setor de quem criou.

Leitura:
- **Dado** qualquer usuário autenticado, **quando** lista ou busca esses recursos, **então** vê os
  de **todos** os setores.

Edição/exclusão (checagem no service, depois de buscar o recurso):
- **Dado** um `admin_setor`, **quando** edita/exclui recurso de outro setor, **então** `403`
  `{"mensagem": "Fora do seu setor"}` e nada muda.
- **Dado** um `superadmin`, **então** edita/exclui recurso de qualquer setor.
- **Dado** um id inexistente, **então** `404` (a busca vem antes da checagem de escopo).

Criação (`resolver_setor`):
- **Dado** um `admin_setor`, **quando** cria sem `setor_id` ou com o próprio, **então** o recurso
  nasce no setor dele.
- **Dado** um `admin_setor`, **quando** envia `setor_id` de outro setor, ou ele próprio não tem
  setor, **então** `403 "Fora do seu setor"`.
- **Dado** um `superadmin`, **quando** envia `setor_id`, **então** usa esse; sem `setor_id`, usa o
  próprio setor; sem nenhum dos dois, **então** `422 {"campo": "setor_id", ...}`.
- **Dado** um `setor_id` que não existe, **então** `404 "Setor não encontrado"`.
- O setor de um recurso **não muda** depois de criado (os endpoints de edição não aceitam
  `setor_id`).

### GER-05 — Contrato de erro
Origem: [ENT] [COD] · Back ✅ · Front ✅ · Teste ⬜

Todo erro da API tem corpo `{ "campo"?: string, "mensagem": string }`.

- Erro de validação do corpo/query/path → `422` com `campo` = último elemento do `loc` do Pydantic
  (só o primeiro erro é devolvido).
- Violação de unicidade/FK conhecida → `409` com `campo` quando há um campo responsável.
- Falha do MinIO → `503 {"mensagem": "Armazenamento de arquivos indisponível"}`; objeto ausente no
  bucket → `404 {"mensagem": "Arquivo não encontrado no armazenamento"}`.
- Frontend: erro com `campo` é atrelado ao campo do formulário (`setError`) **e** mostrado em toast;
  erro sem `campo` (rede, 500) vai só para o toast.

### GER-06 — Upload e download de arquivos
Origem: [ENT] [COD] · Back ✅ · Front ✅ · Teste ⬜

- O tipo do arquivo é decidido **pela extensão**, numa lista fechada (`core/arquivos.py`), nunca
  pelo `content-type` enviado pelo cliente.
  - Documentos e anexos: pdf, doc, docx, xls, xlsx, ppt, pptx, odt, ods, odp, txt, png, jpg, jpeg.
  - Imagens (capa): png, jpg, jpeg, webp.
- Extensão fora da lista → `415`; acima do limite → `413`; sem nome ou vazio → `422`. Todos com
  `campo` apontando o campo do formulário.
- Limite geral `TAMANHO_MAXIMO_UPLOAD_MB` (padrão 50 MB), igual ao `client_max_body_size` do
  nginx. O frontend valida tipo e tamanho antes de enviar (só UX).
- Download passa pelo backend em stream (MinIO não é exposto ao navegador), com
  `Content-Disposition` preservando o nome original com acentos (RFC 5987), `Content-Length` e
  `X-Content-Type-Options: nosniff`.

### GER-07 — Consistência entre Postgres e MinIO
Origem: [ENT] [COD] · Back ✅ · Front — · Teste ⬜

Nunca pode existir linha no banco apontando para arquivo inexistente. No pior caso sobra um
objeto órfão no bucket.

| Operação | Ordem garantida |
|---|---|
| Criar | envia objeto → insere linha; se o commit falhar, remove o objeto |
| Substituir arquivo/capa | envia novo → commit → remove o antigo |
| Mudar categoria (documento) | move objeto → commit; se o commit falhar, move de volta |
| Excluir | commit → remove objeto (falha vira só `warning` no log técnico) |

- **Dado** que o MinIO falha no meio de um upload com vários arquivos, **então** os já enviados
  são removidos, nada é gravado no banco e a resposta é `503`.

### GER-08 — Respostas com nomes resolvidos
Origem: [ENT] [COD] · Back ✅ · Front ✅ · Teste ⬜

Recursos com autor/setor devolvem `autor_nome` e `setor_nome` junto com os ids, para o frontend
não precisar de chamada extra.

### GER-09 — Saúde da aplicação
Origem: [COD] · Back ✅ · Front — · Teste 🟡

- `GET /saude` (sem login) devolve `{status, banco, armazenamento}` com `200` se banco e MinIO
  respondem e `503` se algum está fora.
- A API sobe mesmo com o MinIO fora (o bucket é criado no startup quando possível).

### GER-10 — Auditoria de escrita
Origem: [ENT H7] [CTX] · Back ⬜ · Front 🟡 · Teste ⬜

Toda ação administrativa (criar, editar, excluir) em qualquer módulo gera registro de auditoria;
leitura não gera. Detalhado em [`logs.md`](./logs.md).

### GER-11 — Banco de dados
Origem: [ESP] [ENT] · Back ✅ · Front — · Teste —

O cliente especificou Oracle DB; o time usa PostgreSQL via SQLAlchemy para facilitar o
desenvolvimento, mantendo a migração para Oracle viável na entrega. Toda mudança de schema vem com
migration Alembic. Constraints que o service traduz em erro de campo (ex: `uq_usuarios_email`)
precisam manter o nome estável entre migrations.

- ❓ Migração efetiva para Oracle no handoff — a confirmar com o cliente.

### GER-12 — Autorização no frontend é só UX
Origem: [CTX] · Back — · Front ✅ · Teste ⬜

O frontend esconde ações que o usuário não pode executar (`podeGerenciarConteudo`, `podeEditar`),
mas a API é a fonte de verdade: qualquer chamada direta continua sujeita a GER-02/03/04.

### GER-13 — Infraestrutura
Origem: [ESP] [COD] · Back ✅ · Front ✅ · Teste —

Ambiente reproduzível via `docker-compose` (Postgres, MinIO, backend, frontend com nginx). O nginx
remove o prefixo `/api` e repassa ao backend.

- ❓ Hospedagem em nuvem (citada pelo cliente) e MinIO self-hosted × gerenciado — a decidir.

### GER-14 — Preferências de interface
Origem: [CTX] · Back — · Front ✅ · Teste ✅

Página **Configurações** (`/configuracoes`, item no menu lateral) com ajustes visuais da
interface. São do **navegador**, não da conta: ficam em `localStorage` (`intranet:preferencias`),
não passam pelo backend e continuam valendo depois de sair e entrar com outro usuário.

| Preferência | Valores | Padrão |
|---|---|---|
| Desfoque do vidro | 0 a 24 px | 16 px |
| Transparência do vidro | 0 a 100% | 60% |
| Gradiente de fundo | desligado, suave, intenso | suave |
| Efeito elástico na rolagem (GER-15) | ligado/desligado | ligado |
| Reduzir animações | ligado/desligado | desligado |

- **Dado** qualquer usuário autenticado (inclusive `comum`), **quando** abre `/configuracoes`,
  **então** vê a página; o menu lateral tem o item "Configurações".
- **Dado** que nada foi salvo, **então** valem os padrões da tabela.
- **Dado** que o usuário muda uma opção, **então** o efeito aparece na hora, sem botão de salvar,
  e o valor é gravado; **quando** a página é recarregada, **então** a preferência já vem aplicada.
- **Dado** um valor salvo inválido (JSON corrompido, campo fora dos limites ou de outro tipo),
  **então** o campo inválido volta ao padrão e os demais são mantidos.
- **Dado** desfoque 0 e transparência 0, **então** o vidro vira superfície sólida, sem
  `backdrop-filter`.
- **Dado** "Reduzir animações" ligado, **então** transições e animações são suprimidas como em
  `prefers-reduced-motion`, e o efeito elástico não acontece.
- **Quando** o usuário aciona "Restaurar padrão", **então** todas as opções voltam ao padrão.

A tela de login não muda com as preferências. A classe `no-glass` no `<html>` continua
funcionando só por CSS.

### GER-15 — Efeito elástico na rolagem
Origem: [CTX] · Back — · Front ✅ · Teste ✅

No desktop (mouse ou trackpad), rolar além do topo ou do fim da página desloca o conteúdo com
resistência e ele volta sozinho ao lugar (*rubber banding*). O menu lateral não se move. Em telas
de toque vale o comportamento nativo do navegador.

- **Dado** a página no topo, **quando** o usuário continua rolando para cima, **então** o conteúdo
  desce no máximo 96px, cada vez menos a cada rolagem; o mesmo vale, espelhado, no fim da página.
- **Dado** o conteúdo deslocado, **quando** a rolagem para ou muda de sentido, **então** ele volta
  à posição original.
- **Não acontece** com um modal aberto, com o ponteiro sobre uma área que tem rolagem própria, com
  `Ctrl` pressionado (zoom), com a preferência desligada ou com animações reduzidas (GER-14 ou
  `prefers-reduced-motion`).

### GER-16 — Modais
Origem: [COD] · Back — · Front ✅ · Teste ✅

Todo modal usa o componente compartilhado `Modal`: painel de vidro centralizado sobre um fundo que
escurece e desfoca de leve a página.

- **Dado** um modal aberto, **quando** o usuário clica fora do painel, aperta `Esc` ou aciona
  "Fechar", **então** o modal fecha; clicar dentro do painel não fecha.
- **Dado** um modal aberto, **então** o painel desfoca o que está atrás dele: o painel não pode
  ficar dentro do elemento que desfoca a página, porque um `backdrop-filter` aninhado em outro só
  enxerga o conteúdo do pai, não a página. 🐞 corrigido: o painel ficava dentro do fundo e o texto
  da página aparecia nítido através dele.
- O painel tem um vidro próprio (`glass-modal`), mais branco e menos transparente que o do menu,
  para não escurecer junto com o fundo. Ele segue as preferências de desfoque e transparência
  (GER-14), sempre mais opaco que o resto.
