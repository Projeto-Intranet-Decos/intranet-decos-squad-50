# Arquitetura Backend — Intranet do Hospital

## Stack

- **FastAPI**
- **SQLAlchemy** (models de banco) + **Pydantic** (schemas de validação/serialização) — separados, não usando SQLModel
- **PostgreSQL**
- **Alembic** para migrations
- **MinIO** (S3-compatible) para armazenamento de arquivos
- **JWT** (access + refresh token) para autenticação
- **pwdlib** para hash de senha (não `passlib` — sem manutenção ativa e com incompatibilidades conhecidas)

## Organização de pastas

Estrutura por módulo, 1:1 com o frontend, para consistência entre as camadas:

```
backend/
  app/
    modules/
      usuarios/
        models.py       # SQLAlchemy
        schemas.py       # Pydantic
        router.py         # endpoints FastAPI
        service.py         # lógica de negócio
      murais/
      calendario/
      documentos/
        models.py        # metadados do arquivo (nome, setor, uploaded_by, storage_key)
        schemas.py
        router.py
        service.py         # lógica de upload/download, fala com o MinIO
        storage.py          # layout das chaves do módulo no bucket (usa core/armazenamento.py)
      setores/
      duvidas/
      logs/
    core/
      config.py           # env vars, settings
      armazenamento.py     # cliente MinIO compartilhado entre os módulos
      security.py          # hash de senha, criação/validação de JWT
      permissions.py        # lógica de RBAC + escopo por setor
      database.py            # engine, sessão do SQLAlchemy
    main.py                   # instancia FastAPI, inclui routers
  alembic/
    versions/
  alembic.ini
  requirements.txt (ou pyproject.toml)
```

Separação `router.py` / `service.py`: o router só valida input (via Pydantic) e delega ao service; o service concentra a lógica de negócio, facilitando reuso e testes sem precisar simular request HTTP.

Documentos: Postgres guarda apenas os **metadados** do arquivo; o binário fica no MinIO — evita inchar o banco com blobs.

## Armazenamento (MinIO)

O cliente MinIO mora em `core/armazenamento.py` e é compartilhado entre os módulos. Ele não sabe
nada de domínio: recebe a chave completa do objeto e expõe `enviar_arquivo`, `ler_arquivo`,
`mover_arquivo` e `remover_arquivo`. Falha do MinIO vira `ErroArmazenamento`, que
`core/erros.py` traduz para 503 (`ArquivoNaoEncontrado` vira 404). O bucket é criado no startup
da API, e o `/saude` também checa o MinIO.

Um bucket só (`MINIO_BUCKET`, padrão `intranet`), com o nome do módulo como prefixo de primeiro
nível. Cada módulo define o próprio layout; o de documentos fica em `documentos/storage.py`:

```
documentos/setores/{setor_id}/{categoria}/{documento_id}/{nome-sanitizado}.{ext}
```

O setor entra pelo id, e não pelo nome, porque setor pode ser renomeado. Se a categoria do
documento mudar, o objeto é movido para a pasta nova.

O mural guarda a capa e os anexos de cada aviso (`murais/storage.py`):

```
murais/avisos/{aviso_id}/capa/{uuid}.{ext}
murais/avisos/{aviso_id}/anexos/{anexo_id}/{nome-sanitizado}.{ext}
```

A capa ganha um uuid novo a cada troca. A API expõe esse uuid como `versao_imagem`, e o
frontend monta a URL `/murais/avisos/{id}/imagem?v={versao_imagem}`, que é servida com
`Cache-Control: immutable`: capa nova é sempre URL nova, sem cache velho.

A capa é o único arquivo servido **sem autenticação** (`GET /murais/avisos/{id}/imagem`): é
conteúdo institucional que todo colaborador já vê, o id do aviso é um UUID que não dá para
adivinhar, e a tag `<img>` não envia o header `Authorization`. Os anexos seguem a regra dos
documentos: download autenticado, via stream. Capa aceita png/jpg/webp até 5 MB; anexos usam
a mesma lista de tipos e o mesmo `TAMANHO_MAXIMO_UPLOAD_MB` dos documentos, até 10 por aviso.
Ao excluir o aviso, a FK com `ON DELETE CASCADE` apaga os anexos no banco e depois todos os
objetos do aviso são removidos do bucket.

Postgres e MinIO não compartilham transação. A ordem das operações garante que uma falha deixe,
no pior caso, um **objeto órfão** no bucket, e nunca uma linha sem arquivo:

| Operação | Ordem |
|---|---|
| Criar | envia objeto → insere linha; se o commit falhar, remove o objeto |
| Substituir arquivo / capa | envia objeto novo → commit → remove o antigo |
| Mudar categoria | move objeto → commit; se o commit falhar, move de volta |
| Excluir | commit da remoção → remove objeto (falha vira só `logger.warning`) |

O tipo do arquivo salvo e servido no download vem de uma lista fechada de extensões
(`core/arquivos.py`), nunca do `content-type` enviado pelo cliente — evita servir um
`text/html` enviado como documento. O download passa pelo backend (stream), então o MinIO não
precisa ficar exposto ao navegador.

Dívidas técnicas: o backend usa a credencial root do MinIO (o ideal é um usuário com policy
restrita ao bucket) e não há rotina de limpeza de objetos órfãos.

## Autenticação (JWT)

- **Access token**: expira em 15-30 min.
- **Refresh token**: expira em 7 dias, usado só para obter um novo access token via endpoint `/auth/refresh` (não acessa a API diretamente).
- Refresh token deve ser rastreável no banco (permite revogação/logout remoto).
- Frontend intercepta 401 do access token expirado, chama `/auth/refresh` automaticamente e repete a requisição original (via interceptor do axios).

### Payload do access token

```json
{
  "sub": "user_id",
  "role": "admin_setor",
  "setor_id": "uuid-do-setor",
  "exp": 1234567890
}
```

Decisão consciente: `role` e `setor_id` embutidos no token evitam consulta ao banco a cada request. Trade-off aceito: mudança de role/setor demora até o access token expirar (15-30min) para refletir — considerado aceitável dado o baixo volume de mudanças desse tipo no contexto do hospital.

## RBAC (controle de acesso)

Duas camadas de checagem, usadas conforme o caso:

- **Dependency do FastAPI** (`Depends()`) — para permissão **genérica**, que não depende do recurso específico sendo acessado (ex: "só admin ou superadmin acessa `/logs`"). Ficam todas centralizadas em `core/permissions.py` (`usuario_atual`, `requer_admin`, `requer_superadmin`); os módulos não têm `dependencies.py` próprio.
- **Checagem dentro do service** — para permissão que depende de um dado que só existe **depois de buscar o recurso** no banco (ex: "admin_setor só deleta POP do próprio setor" — precisa buscar o POP primeiro para saber o setor dele).

```python
# core/permissions.py
def requer_admin(usuario: User = Depends(usuario_atual)) -> User:
    if usuario.role not in ("admin_setor", "superadmin"):
        raise HTTPException(403, "Acesso negado")
    return usuario
```

```python
# router.py
@router.delete("/documentos/{id}")
def deletar_documento(id: int, usuario: User = Depends(requer_admin)):
    return service.deletar_documento(id, usuario)
```

```python
# service.py
def deletar_documento(id: int, usuario: User):
    documento = repository.buscar_por_id(id)
    if not documento:
        raise HTTPException(404)
    if usuario.role == "admin_setor" and usuario.setor_id != documento.setor_id:
        raise HTTPException(403, "Fora do seu setor")
    repository.deletar(documento)
```

Regra fixa para evitar inconsistência entre módulos/devs: dependency para regra genérica, service para regra dependente do recurso. Não deixar a escolha arbitrária por módulo.

Esta é a validação **real** de autorização — a checagem equivalente no frontend (`ProtectedRoute`, `podeDeletar`) é só UX, nunca a fonte de verdade.

### Fonte do usuário autenticado

`usuario_atual` mora só em `core/permissions.py` e monta o `UsuarioAutenticado` a partir dos
claims do access token, **sem consultar o banco** — nenhuma query extra por requisição.

A contrapartida é que desativar um usuário ou mudar o papel dele só passa a valer quando o
access token atual expira (`ACCESS_TOKEN_MINUTOS`). O que contém a janela é o refresh:
`/auth/refresh` e `/auth/login` consultam o banco, então um usuário desativado não consegue
renovar nem entrar de novo — o acesso dele morre no fim do token que já tinha em mãos.

Se algum módulo precisar de revogação imediata (ex: uma ação crítica), a checagem extra vai
no service daquele módulo, não numa segunda implementação de `usuario_atual`.

## Logs

Duas coisas distintas, tratadas de forma diferente:

- **Log de auditoria** (módulo "logs" do sistema): registra ações administrativas — criar, editar, deletar — em qualquer módulo. Ações de leitura simples (ver aviso do mural, listar documentos) **não** entram na auditoria. Guardado no **Postgres**, por ser dado estruturado e consultável (ex: "tudo que o usuário X fez", "tudo que aconteceu no setor Y").
- **Log técnico** (exceptions, erros 500, stack traces): não vai para o banco. No MVP, fica simples — console/output padrão do FastAPI. Pode evoluir depois para um serviço externo (ex: Sentry) se o volume justificar.

## Docker

Containerização via `docker-compose`, cobrindo Postgres, MinIO, backend e frontend. Resolve dois problemas ao mesmo tempo: ambiente idêntico entre os 5 devs durante o MVP (sem instalar/configurar cada serviço manualmente) e reprodutibilidade do ambiente para a equipe de TI do hospital no handoff (sem depender de adivinhar versões de Postgres/Python em produção).

## Decisões a serem tomadas

- **MinIO: self-hosted ou gerenciado?** Definir se o MinIO vai rodar em container próprio, dentro da infraestrutura do hospital (mais uma peça que a equipe de TI herda no handoff, junto com Postgres), ou se aponta para um serviço já gerenciado.
- **Tratamento de erro global**: padronizar formato de erro (`{ campo, mensagem }`) via exception handler centralizado do FastAPI, ou cada endpoint formata manualmente?
- **CORS**: configuração para dev (frontend e backend em portas diferentes) vs produção (mesmo domínio) ainda não definida.
- **Variáveis de ambiente**: uso de `pydantic-settings` (ou equivalente) para carregar `.env` (URL do Postgres, credenciais MinIO, segredo JWT) ainda não decidido.
- ~~**Testes**~~: decidido — entram no MVP, guiados pelos specs (pytest + TestClient). Ver [`specs/README.md`](./specs/README.md).
