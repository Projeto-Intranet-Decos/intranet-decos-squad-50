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
Origem: [ESP] · Back — · Front ✅ · Teste 🟡

Aplicação web de uso interno, pensada para o desktop. Público: colaboradores administrativos e
assistenciais, exceto o corpo médico. Abaixo de 1024px o layout se adapta (menu lateral vira
um painel de tela cheia aberto por uma barra superior), sem rolagem horizontal da página a partir de 360px; o
desktop não muda por causa disso. Há dois estilos visuais, escolhidos em Configurações (GER-14):
**Vidro líquido** (padrão), com referência em [`docs/DESIGN_VIDRO_LIQUIDO.md`](../DESIGN_VIDRO_LIQUIDO.md), e
**Vidro clínico**, com referência em [`docs/DESIGN_PROMPT.md`](../DESIGN_PROMPT.md). Os dois mudam
só a aparência: as telas, os textos e a posição das coisas no desktop são os mesmos. Rótulos curtos
(títulos de seção do menu, cabeçalhos de painel e de tabela, rótulos de campo) são escritos em frase
normal e aparecem assim no Vidro líquido; no Vidro clínico ficam em caixa alta, só por CSS. O fundo da
aplicação tem um gradiente suave (ajustável, ver GER-14) e a rolagem tem efeito elástico no
desktop (GER-15).

- **Dado** uma tela abaixo de 1024px, **quando** o usuário abre o menu pela barra superior, **então**
  o menu cobre a tela toda (sem margem nem cantos arredondados) e tem um botão "Fechar menu", que o
  fecha e devolve o foco ao botão que o abriu. `Esc` e escolher um item também fecham.

### GER-02 — Autenticação obrigatória
Origem: [ENT] [COD] · Back ✅ · Front ✅ · Teste 🟡

Toda rota da API exige access token válido, exceto: `POST /auth/login`, `POST /auth/refresh`,
`GET /murais/avisos/{id}/imagem` (ver MUR-09), `GET /saude`, as rotas de magic link (AUT-08):
`POST /auth/convite/verificar`, `POST /auth/convite/aceitar` (AUT-09), `POST
/auth/redefinicao-senha`, `POST /auth/redefinicao-senha/verificar` e `POST
/auth/redefinicao-senha/confirmar` (USU-07) — e as **leituras de conteúdo** do modo visitante
(AUT-10). Escrita, downloads, `/usuarios` e `/logs` sempre exigem token.

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
- **Dado** qualquer pessoa, logada ou não (AUT-10), **quando** lista ou busca esses recursos, **então** vê os
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
- **Dado** um erro inesperado (exceção não tratada), **então** `500 {"mensagem": "Erro interno do
  servidor"}` em JSON, sem detalhe da exceção; o traceback vai só para o log técnico.

### GER-06 — Upload e download de arquivos
Origem: [ENT] [COD] · Back ✅ · Front ✅ · Teste ⬜

- O tipo do arquivo é decidido **pela extensão**, numa lista fechada (`core/arquivos.py`), nunca
  pelo `content-type` enviado pelo cliente.
  - Documentos e anexos: pdf, doc, docx, xls, xlsx, ppt, pptx, odt, ods, odp, txt, png, jpg, jpeg.
  - Imagens (capa): png, jpg, jpeg, webp.
- Extensão fora da lista → `415`; acima do limite → `413`; sem nome ou vazio → `422`. Todos com
  `campo` apontando o campo do formulário.
- Limite geral `MAX_UPLOAD_SIZE_MB` (padrão 50 MB), igual ao `client_max_body_size` do
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
Origem: [ESP] [COD] · Back ✅ · Front ✅ · Teste ✅

Ambiente de desenvolvimento reproduzível via `docker-compose` (Postgres, MinIO, backend, frontend
com nginx). Em produção, o backend e o frontend sobem no Railway, cada um do próprio Dockerfile,
com Postgres e armazenamento à parte. O nginx remove o prefixo `/api` e repassa ao backend.

- A API monta a conexão com o Postgres a partir de `POSTGRES_HOST`, `POSTGRES_PORT`,
  `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD` — não existe `DATABASE_URL`. No compose, host
  e porta são fixos (`banco:5432`, a rede interna); fora do Docker valem os do `.env` (padrão
  `localhost:5432`, banco e usuário `intranet`; a senha é obrigatória).
- Senha com caracteres especiais (`@ : / # %`) funciona: cada parte é escapada ao montar a URL.
- O backend lê o `.env` da raiz (o mesmo do compose) e, por cima, o `backend/.env`, que é
  opcional; variável de ambiente vence os dois.
- Nenhum `.env` entra na imagem: o container recebe as credenciais em tempo de execução, pelo
  `environment` do compose em dev e pelas variáveis do serviço no Railway. O `backend/.env` é só
  para desenvolvimento.
- O backend ouve na porta do `PORT` (padrão `8000`), em IPv4 e IPv6: a rede privada do Railway
  pode usar qualquer um dos dois. O nginx acha o backend em `API_URL` (padrão
  `http://backend:8000`, o do compose) e resolve o nome de novo a cada 10 s, então segue funcionando
  quando o backend é recriado com outro IP.
- 🐞 `API_URL` com barra no fim (`https://backend.exemplo/`) funciona igual a sem barra: o nginx
  remove as barras ao subir. Antes, o caminho do `API_URL` substituía o da requisição e o login
  chegava ao backend como `POST /` (404).
- As variáveis de ambiente têm nome em inglês (`AWS_SECRET_ACCESS_KEY`, `EMAIL_PROVIDER`,
  `INVITE_HOURS`…), no `.env`, no compose e no código. Os campos da configuração no Python continuam
  em português e leem a variável pelo nome em inglês.
- O armazenamento é qualquer serviço compatível com S3 (o MinIO do compose, AWS S3, Railway
  Buckets…) e lê as variáveis no padrão da AWS, que são as que esses provedores injetam:
  `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME` (padrão
  `intranet`) e `AWS_DEFAULT_REGION` (opcional; `auto` no Railway).
  - `AWS_ENDPOINT_URL` é uma URL completa (`https://t3.storageapi.dev`, `http://localhost:9000`):
    o esquema decide se a conexão usa TLS. Sem `http://`/`https://`, ou com caminho depois do host,
    a configuração é recusada e a API não sobe.
  - Endereçamento: virtual-hosted (`<bucket>.<host>`) por padrão, que é o que o Railway Buckets e a
    AWS usam; path style (`<host>/<bucket>`) quando o host é `localhost`, um IP ou um nome sem ponto
    (serviço do compose). `AWS_S3_FORCE_PATH_STYLE=true` ou `false` força um dos dois (ex: MinIO
    próprio atrás de um domínio, que só aceita path style).
- Segredos (senha do banco, `AWS_SECRET_ACCESS_KEY`, `JWT_SECRET`, `RESEND_API_KEY`) nunca aparecem na
  representação da configuração, que vai parar em tracebacks e erros de validação.
- No compose, só o frontend (nginx) é publicado para a rede. Postgres, MinIO e a API ficam em
  `127.0.0.1` do host: de fora, tudo passa pelo nginx (e pelos headers de GER-23).
- O nginx responde com `server_tokens off` e, em toda resposta (inclusive as de erro), os headers
  de GER-23 mais `Content-Security-Policy` (só recursos da própria origem; `frame-ancestors 'none'`),
  `Strict-Transport-Security` e `Permissions-Policy`.

- ❓ Hospedagem em nuvem (citada pelo cliente) e MinIO self-hosted × gerenciado — a decidir.

### GER-14 — Preferências de interface
Origem: [CTX] · Back — · Front ✅ · Teste ✅

Página **Configurações** (`/configuracoes`, item no menu lateral) com ajustes visuais da
interface. São do **navegador**, não da conta: ficam em `localStorage` (`intranet:preferencias`),
não passam pelo backend e continuam valendo depois de sair e entrar com outro usuário.

| Preferência | Valores | Padrão |
|---|---|---|
| Estilo visual (GER-01) | Vidro líquido, Vidro clínico | Vidro líquido |
| Desfoque do vidro | 0 a 24 px | 16 px |
| Transparência do vidro | 0 a 100% | 60% |
| Refração no carrossel | ligado/desligado | ligado |
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
- **Dado** o estilo visual escolhido, **então** o `<html>` recebe `data-visual="liquido"` ou
  `data-visual="clinico"` e a interface toda (menu, páginas, modais, toasts e a tela de login) passa
  a usar aquele estilo. Desfoque e transparência valem nos dois estilos, sempre relativos aos valores
  do design de cada um.
- **Dado** "Refração no carrossel" ligado, o Vidro líquido e um navegador Chromium (Chrome, Edge), **então**
  o `<html>` recebe a classe `refracao` e a placa de vidro do carrossel distorce o fundo nas bordas,
  como uma lente (filtro SVG `feDisplacementMap` no `backdrop-filter`). Em outros navegadores o
  interruptor fica desativado, com a explicação, e a placa usa só o desfoque. Desfoque 0, `no-glass`
  ou transparência reduzida também tiram a refração.
- **Quando** o usuário aciona "Restaurar padrão", **então** todas as opções voltam ao padrão.

A tela de login segue o estilo visual, mas não muda com as demais preferências. A classe
`no-glass` no `<html>` continua funcionando só por CSS, nos dois estilos.

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
- **Dado** um modal aberto, **então** o foco fica preso no painel: `Tab` no último elemento focável
  volta ao primeiro e `Shift+Tab` no primeiro (ou com o foco no próprio painel) vai ao último; o
  foco nunca passa para a página atrás.
- **Quando** o modal fecha, **então** o foco volta ao elemento que estava focado antes de ele abrir.
- **Dado** um modal aberto, **então** o painel desfoca o que está atrás dele: o painel não pode
  ficar dentro do elemento que desfoca a página, porque um `backdrop-filter` aninhado em outro só
  enxerga o conteúdo do pai, não a página. 🐞 corrigido: o painel ficava dentro do fundo e o texto
  da página aparecia nítido através dele.
- O painel tem um vidro próprio (`glass-modal`), tão branco quanto o do menu (GER-18) e com
  sombra mais forte, para não escurecer junto com o fundo. Ele segue as preferências de desfoque e
  transparência (GER-14). No Vidro líquido o painel é mais translúcido que no Vidro clínico, mas ainda
  mais branco que o menu, para o carrossel bordô atrás não tingir o painel.

### GER-17 — Transição entre páginas
Origem: [CTX] · Back — · Front ✅ · Teste ✅

Trocar de página pelo menu lateral é animado, no conteúdo e no menu.

- **Dado** uma página aberta, **quando** o usuário vai para outra, **então** o conteúdo atual some
  e só depois o novo entra (esmaecendo e subindo de leve); a troca toda leva menos de meio segundo.
- **Dado** a troca de página, **então** o menu lateral não é remontado (continua recolhido ou
  expandido como estava) e o indicador de página atual desliza do item antigo até o novo. Só o
  item da página atual tem indicador.
- **Dado** animações reduzidas (GER-14 ou `prefers-reduced-motion`), **então** a troca é imediata,
  sem animação.
- A primeira página aberta depois de carregar o site entra sem animação.

### GER-18 — Vidro do menu e da barra superior
Origem: [CTX] · Back — · Front ✅ · Teste ✅

O menu lateral, a barra superior (abaixo de 1024px) e os dropdowns usam o vidro estrutural
(`glass`), com o mesmo branco do painel dos modais (GER-16). No celular a página passa por trás
deles: o conteúdo rola sob a barra superior e o menu abre em tela cheia por cima da página escurecida.

- **Dado** a barra superior ou o menu lateral, **então** o texto deles fica legível com qualquer
  conteúdo atrás: o fundo do vidro é tão branco quanto o do modal e segue as preferências de
  desfoque e transparência (GER-14). 🐞 corrigido: o vidro era transparente demais e, no celular,
  o texto da página atrás competia com o do menu.
- No Vidro líquido o vidro é mais translúcido, como no design; a legibilidade no celular vem do fundo
  do drawer, que escurece **e desfoca** a página, e da barra superior compacta, que só tem o botão
  do menu e o logo.

### GER-20 — Ordenação pelo cabeçalho da tabela
Origem: [CTX] · Back — · Front ✅ · Teste ✅

Toda coluna ordenável de uma tabela (cabeçalho real `<th>` ou cabeçalho em grid) ordena a lista ao
clicar no próprio nome da coluna, com uma seta indicando a direção. Não se aplica à coluna de
Ações.

- **Dado** uma tabela com colunas ordenáveis, **quando** o usuário clica no nome de uma coluna,
  **então** a lista ordena por ela em ordem crescente (alfabética ou numérica, conforme o tipo do
  dado) e a seta aponta para cima.
- **Dado** a coluna já ativa, **quando** o usuário clica nela de novo, **então** a direção
  inverte (decrescente, seta para baixo).
- **Dado** outra coluna, **quando** o usuário clica nela, **então** ela passa a ordenar (sempre
  crescente de início) e a seta da coluna anterior desaparece.
- Cada tabela tem uma coluna e direção padrão ao carregar a página (ex: nome A–Z, ou mais recente
  primeiro quando a tela já tinha esse padrão antes desta regra existir).

### GER-21 — Carregamento com skeleton
Origem: [CTX] · Back — · Front ✅ · Teste 🟡

Toda página que busca dados da API mostra blocos skeleton (cinza, pulsando) no formato aproximado
do conteúdo final, em vez de só um texto "Carregando…", enquanto a requisição não termina.

- **Dado** uma página carregando dados, **então** aparecem blocos skeleton no lugar do conteúdo
  (linhas de tabela, cards, painéis); cabeçalho e filtros que não dependem do dado continuam
  visíveis e usáveis.
- **Dado** "Reduzir animações" (GER-14) ou `prefers-reduced-motion`, **então** o skeleton aparece
  sem a pulsação (só o bloco estático) — efeito automático, porque a pulsação é a mesma animação
  CSS que essas preferências já suprimem (GER-14, GER-17).
- **Quando** o carregamento termina, **então** o skeleton é substituído pelo conteúdo real (sucesso)
  ou pela mensagem de erro (falha).
- 🟡 Implementado em `setores`, `usuarios`, `documentos`, `logs`, `murais` (mural e calendário) e
  `duvidas`. Teste automatizado só em `setores` (`PaginaSetores.test.tsx`); falta replicar nas
  outras páginas.

### GER-19 — Seções colapsáveis do menu lateral
Origem: [CTX] · Back — · Front ✅ · Teste ✅

Cada seção do menu lateral ("Páginas", "Administração" quando visível, "Acesso rápido") pode ser
colapsada e expandida pelo próprio cabeçalho, com animação. O estado é só da sessão da página (não
persiste em `localStorage` nem recarregando).

- **Dado** o menu expandido (não recolhido para ícones), **quando** o usuário clica no cabeçalho de
  uma seção, **então** os itens dela somem com animação e a seta do cabeçalho gira; clicar de novo
  expande de volta.
- **Dado** o menu recolhido para ícones (GER-17), **então** todas as seções mostram seus itens
  (ícones), sem cabeçalho nem controle de colapso — o estado de colapso de cada seção não se aplica
  nesse modo.
- **Dado** "Reduzir animações" ligado (GER-14) ou `prefers-reduced-motion`, **então** colapsar ou
  expandir é imediato, sem animação.
- **Quando** a página é recarregada, **então** todas as seções voltam a expandidas.

### GER-22 — Envio de e-mail
Origem: [CTX] · Back ✅ · Front — · Teste ✅

Serviço único de e-mail em `core/`, usado por qualquer módulo (hoje: convite, USU-02/USU-08, e
redefinição de senha, USU-07). O provedor é escolhido por `EMAIL_PROVIDER`:

- `resend` — envio pela API HTTP do **Resend** (`POST https://api.resend.com/emails`, HTTPS), autenticado
  pela chave de API em `RESEND_API_KEY`.
- `console` — padrão em desenvolvimento: escreve destinatário, assunto e texto (com o link) no log,
  sem enviar nada. Ninguém do time precisa de credencial de e-mail para rodar o projeto. Só para
  desenvolvimento: o link em claro fica no log.
- Nos testes, o envio é sempre substituído por um falso em memória (como o MinIO, GER-07); código
  que chegar à API real quebra o teste.
- ~~`mailgun`~~, ~~`smtp`~~ — removidos: a API do Mailgun foi trocada pelo SMTP da Brevo, e este
  pela API do Resend.

Critérios:

- Todo e-mail tem versão HTML e texto puro, remetente `EMAIL_FROM`, e os links são montados a
  partir de `FRONTEND_URL`.
- O HTML usa o layout comum (`core/modelo_email.py`), com a identidade da tela de login: faixa
  bordeaux com "Hospital Decós", cartão branco com título, botão bordeaux para o link, o mesmo
  link por extenso para quem não consegue clicar, e o rodapé "Uso restrito a colaboradores".
  Estilos inline em tabelas, sem `<style>` nem imagem externa, para Gmail e Outlook mostrarem
  igual. Texto vindo do banco (ex: o nome) é escapado.
- **Dado** uma ação que grava no banco e envia e-mail, **então** o envio só acontece depois do
  commit.
- **Dado** `EMAIL_PROVIDER=resend`, **então** o e-mail sai num `POST` JSON para a API do Resend,
  com `Authorization: Bearer <RESEND_API_KEY>`, e o provedor monta os cabeçalhos da mensagem
  (`Date`, `Message-ID`).
- **Dado** que o provedor falha (resposta de erro da API, erro de rede ou timeout de 10 s),
  **então** a gravação não é desfeita:
  a falha vira `logger.warning` e a resposta indica que o e-mail não saiu onde o requisito pedir
  (`email_enviado: false`).
- 🐞 **Dado** um erro inesperado durante o envio (ex: timeout ao ler o corpo da resposta de erro),
  **então** o comportamento é o mesmo da falha do provedor: nada é desfeito e o envio devolve
  `false`, sem virar `500`.
- 🐞 **Dado** `EMAIL_PROVIDER=console`, **então** a resposta indica que o e-mail não saiu
  (`email_enviado: false`) — um deploy que esqueceu o `resend` aparece para o superadmin logo no
  primeiro convite — e a API avisa no log ao subir que os e-mails não são enviados.
- **Dado** `EMAIL_PROVIDER=resend` sem `RESEND_API_KEY`, **então** a API não sobe (erro de
  configuração no startup).
- ❓ Remetente: o Resend só envia de um domínio verificado (SPF e DKIM). Domínio do hospital ×
  domínio próprio do projeto — a combinar com a TI do hospital.

### GER-23 — Superfície HTTP da API
Origem: [COD] (auditoria OWASP, A02) · Back ✅ · Front — · Teste ✅

- **Dado** a configuração padrão, **quando** alguém abre `/docs`, `/redoc` ou `/openapi.json`,
  **então** `404`. Com `API_DOCS=true` (só desenvolvimento) as três voltam.
- **Dado** qualquer resposta da API, **então** ela traz `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY` e `Referrer-Policy: no-referrer`.
- **Dado** uma resposta que não define o próprio cache, **então** `Cache-Control: no-store` (dado de
  colaborador não fica no cache do navegador do posto). A capa do aviso (MUR-09) mantém o
  `Cache-Control` dela.

### GER-24 — Segredo do JWT
Origem: [COD] (auditoria OWASP, A02) · Back ✅ · Front — · Teste ✅

- **Dado** `JWT_SECRET` com menos de 32 bytes ou igual ao valor de exemplo do `.env.example`
  (`troque-este-segredo`), **então** a API não sobe (erro de configuração no startup, sem mostrar o
  valor).
