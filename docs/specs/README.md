# Especificações (specs) — Intranet do Hospital

Fonte única do **que** o sistema faz. Cada arquivo cobre um domínio (mesmo nome dos módulos do
backend e das features do frontend) e lista requisitos com ID, origem, status e critérios de
aceite verificáveis. Os critérios de aceite viram testes.

| Arquivo | Prefixo | Domínio |
|---|---|---|
| [`transversal.md`](./transversal.md) | `GER` | Regras que valem pra todos os módulos (auth obrigatória, RBAC, escopo por setor, erros, arquivos, saúde) |
| [`autenticacao.md`](./autenticacao.md) | `AUT` | Login, refresh, sessão no frontend |
| [`usuarios.md`](./usuarios.md) | `USU` | Cadastro e desativação de colaboradores |
| [`setores.md`](./setores.md) | `SET` | Setores, ramais e guia de contatos |
| [`murais.md`](./murais.md) | `MUR` | Mural de avisos, eventos, capa e anexos, aniversariantes e tela de calendário |
| [`calendario.md`](./calendario.md) | ~~`CAL`~~ | Absorvido pelo mural (IDs riscados apontando para `MUR`) |
| [`documentos.md`](./documentos.md) | `DOC` | Repositório de POPs e documentos |
| [`duvidas.md`](./duvidas.md) | `DUV` | Central de dúvidas (FAQ) |
| [`logs.md`](./logs.md) | `LOG` | Registro de atividades (auditoria) |

**Specs × design:** `docs/specs/` descreve comportamento e é vivo (sempre reflete o sistema).
`docs/superpowers/specs/` e `docs/superpowers/plans/` guardam o design e o plano de **uma
entrega** específica (como foi feito) e envelhecem junto com ela.

## Origem dos requisitos

- `[ESP]` — *Especificação do Projeto — Intranet Hospitalar Decós Corporativa* (documento do cliente).
- `[ENT]` — *Entrega Parcial LevelUp — Squad 50* (personas, histórias, critérios de aceite).
- `[COD]` — regra que já existe no código e não estava em nenhum dos dois documentos.
- `[CTX]` — decisão registrada em [`CONTEXT.md`](../../CONTEXT.md).

## Status

Cada requisito tem três colunas de status — **Back**, **Front** e **Teste** (teste automatizado):

| Símbolo | Significado |
|---|---|
| ✅ | feito |
| 🟡 | parcial (o texto do requisito diz o que falta) |
| ⬜ | pendente |
| 🐞 | bug conhecido — o comportamento atual contraria o requisito |
| 🔴 | (coluna Teste) teste escrito e marcado `xfail`, esperando a correção do 🐞 |
| ❓ | regra ainda não decidida — **não implementar sem decisão do time** |
| — | não se aplica àquela camada |

## Formato de um requisito

```md
### MUR-03 — Publicar aviso
Origem: [ESP] [ENT H1] · Back ✅ · Front ✅ · Teste ⬜

Descrição curta da regra.

- **Dado** <estado>, **quando** <ação>, **então** <resultado observável (status HTTP, corpo, efeito)>.
- ...
```

Regras de escrita:

- Um critério = um comportamento observável que dá pra testar (status, corpo, efeito colateral).
  Evite "deve funcionar bem".
- IDs são permanentes. Requisito removido fica com status ~~riscado~~ e o motivo; não reaproveite
  o número. Requisito novo pega o próximo número livre do domínio.
- Regra que vale para vários módulos mora em `transversal.md` e é referenciada (`ver GER-04`),
  não copiada.

## Ciclo de desenvolvimento

Toda mudança de comportamento segue o ciclo abaixo, **um critério de aceite por volta**:

1. **Spec** — ache o requisito em `docs/specs/<dominio>.md`. Se ele não existe ou a mudança altera
   a regra, edite o spec **primeiro**, no mesmo PR. Regra ambígua vira `❓` e é levada ao time;
   não se inventa regra no código.
2. **Teste vermelho** — escreva o teste que codifica o critério, citando o ID. Rode e confirme que
   ele falha **pelo motivo certo** (não por import quebrado ou fixture errada).
3. **Solução** — esboce a abordagem respeitando `docs/arquitetura-*.md` (camadas, RBAC dependency
   × service, ordem Postgres/MinIO). Mudança grande ou que atravessa módulos ganha um plano em
   `docs/superpowers/plans/` antes do código.
4. **Implementação** — o mínimo pra o teste passar. Mudança de schema sempre com migration Alembic.
5. **Verde** — rode o teste, depois a suíte do módulo e a suíte toda, e lint/type-check/build.
6. **Refatoração e fechamento** — limpe com os testes verdes e atualize o status no spec. Próximo
   critério → volta ao passo 2.

**Bug:** antes de corrigir, registre o comportamento esperado no spec (status `🐞`) e escreva o
teste que reproduz o bug. O teste vermelho é a prova de que o bug existe; o verde, de que acabou.
Se a correção não entra no mesmo PR, o teste vai marcado com
`@pytest.mark.xfail(reason="MUR-12 🐞: ...", raises=AssertionError)` e o status Teste fica `🔴`.
O `raises=` e a preparação fora de `assert` (helpers usam `pytest.fail`) garantem que só a
asserção do bug conta como falha esperada; erro na preparação aparece como falha. Como o `xfail` é
estrito (`pytest.ini`), quando a correção chegar o teste passa a falhar até a marca ser removida —
ninguém esquece de atualizar.

### Na equipe

- **Branch/PR por requisito** (ou grupo pequeno do mesmo domínio), seguindo
  [`convencao-branches-commits.md`](../convencao-branches-commits.md). Dá pra ter commits
  `test(...)` e `feat(...)` separados no PR — mostra o vermelho antes do verde.
- **Descrição do PR** lista os IDs cobertos (`Cobre: MUR-03, MUR-04`) e o que mudou no spec.
- **Revisão** confere spec ↔ teste ↔ código: cada critério alterado tem teste, cada teste cita um
  ID que existe, status do spec está atualizado.
- **Mudança de regra** (não de implementação) num spec precisa do aval de quem é dono do domínio
  ou da validação com o cliente; registre a decisão em `CONTEXT.md` se ela mudar o vocabulário.
- **Card do Trello** referencia o ID do requisito no título, pra rastrear tarefa → spec → PR.

## Testes: onde e como

**Backend** — `pytest` + `fastapi.testclient.TestClient` (requisição HTTP de verdade contra o
app). Configurado; o frontend ainda não tem suíte.

```bash
docker compose up -d banco                  # Postgres do compose (só o banco basta)
cd backend
pip install -r requirements-dev.txt
pytest                                      # tudo
pytest -k mur03                             # um requisito
pytest tests/murais                         # um módulo
```

- **Banco:** Postgres real, num banco separado — o do `DATABASE_URL` com sufixo `_teste`
  (ex: `intranet_teste`), ou o que vier em `DATABASE_URL_TESTE`. Ele é **apagado e recriado** a
  cada execução e migrado com `alembic upgrade head`, então as migrations também são testadas.
  O conftest recusa rodar se o nome não terminar em `_teste`, e só deriva o banco de um
  `DATABASE_URL` local (`localhost` ou `banco`); outro host só via `DATABASE_URL_TESTE`. Duas
  execuções simultâneas no mesmo banco: a segunda para com erro em vez de derrubar a primeira.
- **Isolamento:** cada teste roda numa transação desfeita no fim; os `commit()` dos services viram
  savepoints. Consequência: `now()` dá o mesmo instante para tudo que um teste insere. Cada
  requisição usa uma sessão nova (mesmas opções da `SessaoLocal`), como em produção.
- **MinIO:** sempre substituído por `ArmazenamentoFalso` (dicionário em memória, fixture
  `armazenamento_falso`); código que chegar ao cliente MinIO real quebra o teste.
  `armazenamento_falso.objetos` mostra o que foi gravado (`conteudo` e `tipo_conteudo`) e
  `armazenamento_falso.indisponivel = True` simula o MinIO fora do ar (503).
- **Cenário pronto:** fixtures `cliente`, `sessao`, `setor` ("Enfermagem"), `comum` e
  `admin_setor` nesse setor, e `superadmin` sem setor (como o real). Outros setores/usuários com
  `fabrica.setor(...)` e `fabrica.usuario(Papel.X, setor)`. Token: `headers=autenticar(usuario)`.

```
backend/
  pytest.ini
  requirements-dev.txt     # pytest e cliente HTTP do TestClient; a imagem Docker não instala
  tests/
    conftest.py            # banco de teste, sessão com rollback, cliente, MinIO falso, fixtures
    apoio.py               # autenticar(), Fabrica, ArmazenamentoFalso — importáveis nos testes
    test_transversal.py    # GER-*
    murais/                # MUR-*: test_avisos.py, test_eventos.py, test_aniversariantes.py
```

Monte o cenário com a `fabrica` (direto no banco) e exercite o comportamento **pela API**, que é
o contrato do spec. Verifique o efeito também pela API (ou pelo `armazenamento_falso`), não pelo
estado interno do ORM.

O nome do teste começa com o ID em minúsculas sem hífen, pra `pytest -k mur03` rodar só aquele
requisito:

```python
def test_mur03_titulo_vazio_retorna_422(cliente, token_admin_setor):
    ...
```

**Frontend** — `vitest` + Testing Library, com MSW para simular a API. Teste junto do componente
ou hook (`PaginaMural.test.tsx`). O ID entra no nome do `describe`/`it`, pra `vitest -t MUR-11`:

```ts
describe('MUR-11 — filtros do mural', () => {
  it('esconde o botão "Novo aviso" para colaborador comum', () => { ... })
})
```

O que testar em cada camada:

- Regra de negócio, permissão e contrato HTTP → **backend** (é a fonte de verdade).
- Frontend testa comportamento de tela: o que aparece pra cada papel, filtros locais, erro do
  backend indo pro campo certo, invalidação de cache depois da mutation. Não retestar no front uma
  regra que o backend já garante.
