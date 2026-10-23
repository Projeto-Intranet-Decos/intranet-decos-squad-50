# Calendário — Eventos e Aniversariantes: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o backend do módulo `calendario`: CRUD de eventos (criados por `admin_setor`/`superadmin`, visíveis a todo usuário autenticado) e endpoint de aniversariantes do mês derivado de `usuarios.data_nascimento`.

**Architecture:** Segue o padrão já estabelecido pelo módulo `setores`: `models.py` (SQLAlchemy) + `schemas.py` (Pydantic) + `service.py` (regra de negócio, inclusive escopo por setor) + `router.py` (só valida input e delega). Permissão genérica vem das dependencies do `app/core/permissions.py`; permissão que depende do recurso buscado é checada no service. A tabela `usuarios` não existe em `dev`, então esta entrega cria o **model** dela (sem router/service) para viabilizar a FK `eventos.autor_id` e a leitura de `data_nascimento`.

**Tech Stack:** Python 3.14, FastAPI 0.141, SQLAlchemy 2.0, Pydantic 2.13, Alembic 1.20, PostgreSQL 16, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-17-calendario-eventos-e-aniversariantes-design.md`

## Global Constraints

- **Idioma do código:** nomes de arquivos, funções, variáveis, classes e rotas em **português sem acento** (`listar_eventos`, `roteador_calendario`, `/calendario/eventos`). Identificadores de biblioteca continuam em inglês (`Depends`, `Mapped`, `select`).
- **Escopo:** backend apenas. Nada em `frontend/`. Sem testes automatizados (decisão do time).
- **Padrão de erro:** todo erro sai como `{campo?, mensagem}` — já garantido por `app/core/erros.py`. Para erro atrelado a campo, levantar `HTTPException(status, {"campo": ..., "mensagem": ...})`.
- **Indentação:** 4 espaços nos arquivos de `app/modules/` (padrão do módulo `setores`). Linhas até ~100 colunas.
- **Nomes de constraint/índice na migration:** usar `op.f(...)` (default do SQLAlchemy), igual à migration `7c41ba823b98` já existente — mantém o `alembic autogenerate` estável. Exceção: o CHECK de `role` tem nome explícito `ck_usuarios_role`, declarado também no model.
- **Não alterar** `app/modules/setores/*`, `sql/schema.sql` (já descreve `usuarios` e `eventos`) nem nada de `frontend/`.
- **Commits:** Conventional Commits, escopo `backend/calendario` ou `backend/usuarios`. Ex: `feat(backend/calendario): adiciona CRUD de eventos`.
- **Branch:** `feature/backend/calendario/crud-eventos-e-aniversariantes` (já criada a partir de `dev`).

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `backend/app/modules/usuarios/models.py` | **Criar.** Model `Usuario` (inclui `data_nascimento`). Sem camada HTTP. |
| `backend/app/modules/calendario/models.py` | **Criar.** Model `Evento` + propriedades `autor_nome`/`setor_nome`. |
| `backend/app/modules/calendario/schemas.py` | **Criar.** `EventoCriar`, `EventoAtualizar`, `EventoResposta`, `AniversarianteResposta`. |
| `backend/app/modules/calendario/service.py` | **Criar.** CRUD, resolução de setor, escopo de edição, aniversariantes. |
| `backend/app/modules/calendario/router.py` | **Criar.** Endpoints sob `/calendario`. |
| `backend/alembic/versions/20260917_<rev>_cria_usuarios_e_eventos.py` | **Criar.** DDL das duas tabelas. |
| `backend/alembic/env.py` | **Modificar.** Importar os models novos. |
| `backend/app/main.py` | **Modificar.** `include_router(roteador_calendario)`. |
| `backend/app/modules/calendario/dependencies.py` | **Fica vazio de propósito** (regra genérica mora no core). |

## Ordem de execução e paralelismo

- **Onda A (paralelo):** Task 1 e Task 2 — arquivos distintos, sem dependência mútua.
- **Onda B (paralelo):** Task 3 e Task 4 — migration e schemas não se tocam.
- **Onda C:** Task 5 (service) — depende de models + schemas.
- **Onda D:** Task 6 (router + main).
- **Onda E:** Task 7 (validação end-to-end).

---

### Task 1: Model `Usuario` + registro no Alembic

**Files:**
- Create: `backend/app/modules/usuarios/models.py` (arquivo existe vazio — preencher)
- Modify: `backend/alembic/env.py` (linha do comentário "Importe aqui os models de cada módulo")

**Interfaces:**
- Consumes: `app.core.database.Base`, `app.modules.setores.models.Setor`
- Produces: classe `Usuario` com atributos `id: uuid.UUID`, `nome: str`, `email: str`, `senha_hash: str`, `role: str`, `setor_id: uuid.UUID | None`, `data_nascimento: date | None`, `ativo: bool`, `criado_em: datetime`, relationship `setor: Setor | None`. Tabela `usuarios`.

- [ ] **Step 1: Escrever o model**

Conteúdo completo de `backend/app/modules/usuarios/models.py`:

```python
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.setores.models import Setor


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint(
            "role IN ('comum', 'admin_setor', 'superadmin')",
            name="ck_usuarios_role",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nome: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(200), unique=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), server_default="comum")
    setor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("setores.id"), index=True)
    # Nullable de propósito: usuário já cadastrado pode não ter a data informada — quem não
    # tem simplesmente não aparece na lista de aniversariantes.
    data_nascimento: Mapped[date | None] = mapped_column(Date)
    ativo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Sem back_populates: evita alterar setores/models.py, que é de outro módulo.
    setor: Mapped[Setor | None] = relationship()
```

- [ ] **Step 2: Registrar os models novos no Alembic**

Em `backend/alembic/env.py`, substituir a linha:

```python
import app.modules.setores.models  # noqa: F401
```

por:

```python
import app.modules.setores.models  # noqa: F401
import app.modules.usuarios.models  # noqa: F401
import app.modules.calendario.models  # noqa: F401
```

(`calendario.models` ainda pode estar vazio neste momento — o import de um módulo vazio funciona normalmente e a Task 2 o preenche.)

- [ ] **Step 3: Verificar que o model carrega**

Run:
```bash
docker compose run --rm --no-deps --entrypoint python backend -c "import app.modules.usuarios.models as m; print(m.Usuario.__table__.c.keys())"
```
Expected: imprime `['id', 'nome', 'email', 'senha_hash', 'role', 'setor_id', 'data_nascimento', 'ativo', 'criado_em']` sem traceback.

Se a imagem ainda não existir, rodar antes `docker compose build backend`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/modules/usuarios/models.py backend/alembic/env.py
git commit -m "feat(backend/usuarios): adiciona model de usuario com data de nascimento"
```

---

### Task 2: Model `Evento`

**Files:**
- Create: `backend/app/modules/calendario/models.py` (arquivo existe vazio — preencher)

**Interfaces:**
- Consumes: `app.core.database.Base`, `app.modules.setores.models.Setor`, `app.modules.usuarios.models.Usuario`
- Produces: classe `Evento` com `id: uuid.UUID`, `titulo: str`, `descricao: str | None`, `data_inicio: datetime`, `data_fim: datetime | None`, `autor_id: uuid.UUID`, `setor_id: uuid.UUID`, `criado_em: datetime`, relationships `autor: Usuario` e `setor: Setor`, e as propriedades de leitura `autor_nome: str` e `setor_nome: str`. Tabela `eventos`.

- [ ] **Step 1: Escrever o model**

Conteúdo completo de `backend/app/modules/calendario/models.py`:

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Usuario


class Evento(Base):
    __tablename__ = "eventos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    titulo: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str | None] = mapped_column(Text)
    data_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    data_fim: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    autor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id"), index=True)
    # Setor de quem criou: define quem pode editar/excluir. A leitura é sempre institucional.
    setor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("setores.id"), index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    autor: Mapped[Usuario] = relationship()
    setor: Mapped[Setor] = relationship()

    # Expostas no schema de resposta para a tela não precisar de uma busca por autor/setor.
    @property
    def autor_nome(self) -> str:
        return self.autor.nome

    @property
    def setor_nome(self) -> str:
        return self.setor.nome
```

- [ ] **Step 2: Verificar que o mapeamento resolve**

Run:
```bash
docker compose run --rm --no-deps --entrypoint python backend -c "from sqlalchemy.orm import configure_mappers; import app.modules.calendario.models as m; configure_mappers(); print(m.Evento.__table__.c.keys())"
```
Expected: imprime `['id', 'titulo', 'descricao', 'data_inicio', 'data_fim', 'autor_id', 'setor_id', 'criado_em']` sem traceback (`configure_mappers` falharia se algum relationship não resolvesse).

- [ ] **Step 3: Commit**

```bash
git add backend/app/modules/calendario/models.py
git commit -m "feat(backend/calendario): adiciona model de evento"
```

---

### Task 3: Migration `cria usuarios e eventos`

**Files:**
- Create: `backend/alembic/versions/20260917_b1f2c3d4e5a6_cria_usuarios_e_eventos.py`

**Interfaces:**
- Consumes: migration anterior `7c41ba823b98` (setores e ramais)
- Produces: tabelas `usuarios` e `eventos` no banco; revision `b1f2c3d4e5a6` passa a ser o `head`.

- [ ] **Step 1: Escrever a migration**

Conteúdo completo do arquivo:

```python
"""cria usuarios e eventos

Revision ID: b1f2c3d4e5a6
Revises: 7c41ba823b98
Create Date: 2026-09-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1f2c3d4e5a6'
down_revision: Union[str, Sequence[str], None] = '7c41ba823b98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('usuarios',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('nome', sa.String(length=200), nullable=False),
    sa.Column('email', sa.String(length=200), nullable=False),
    sa.Column('senha_hash', sa.String(length=255), nullable=False),
    sa.Column('role', sa.String(length=20), server_default='comum', nullable=False),
    sa.Column('setor_id', sa.Uuid(), nullable=True),
    sa.Column('data_nascimento', sa.Date(), nullable=True),
    sa.Column('ativo', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("role IN ('comum', 'admin_setor', 'superadmin')", name='ck_usuarios_role'),
    sa.ForeignKeyConstraint(['setor_id'], ['setores.id'], name=op.f('fk_usuarios_setor_id_setores')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_usuarios')),
    sa.UniqueConstraint('email', name=op.f('uq_usuarios_email'))
    )
    op.create_index(op.f('ix_usuarios_setor_id'), 'usuarios', ['setor_id'], unique=False)
    op.create_table('eventos',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('titulo', sa.String(length=200), nullable=False),
    sa.Column('descricao', sa.Text(), nullable=True),
    sa.Column('data_inicio', sa.DateTime(timezone=True), nullable=False),
    sa.Column('data_fim', sa.DateTime(timezone=True), nullable=True),
    sa.Column('autor_id', sa.Uuid(), nullable=False),
    sa.Column('setor_id', sa.Uuid(), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['autor_id'], ['usuarios.id'], name=op.f('fk_eventos_autor_id_usuarios')),
    sa.ForeignKeyConstraint(['setor_id'], ['setores.id'], name=op.f('fk_eventos_setor_id_setores')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_eventos'))
    )
    op.create_index(op.f('ix_eventos_autor_id'), 'eventos', ['autor_id'], unique=False)
    op.create_index(op.f('ix_eventos_setor_id'), 'eventos', ['setor_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_eventos_setor_id'), table_name='eventos')
    op.drop_index(op.f('ix_eventos_autor_id'), table_name='eventos')
    op.drop_table('eventos')
    op.drop_index(op.f('ix_usuarios_setor_id'), table_name='usuarios')
    op.drop_table('usuarios')
```

- [ ] **Step 2: Preparar o `.env` da raiz, se ainda não existir**

O `.env` é gitignored; criar localmente a partir do exemplo, definindo senhas:

```bash
test -f .env || (cp .env.example .env && sed -i 's/troque-esta-senha/senha-local-dev/; s/troque-este-segredo/segredo-local-dev-para-smoke/' .env)
```

- [ ] **Step 3: Subir o banco e aplicar a migration**

Run:
```bash
docker compose up -d banco
docker compose build backend
docker compose run --rm --no-deps --entrypoint alembic backend upgrade head
```
Expected: saída contendo `Running upgrade 7c41ba823b98 -> b1f2c3d4e5a6, cria usuarios e eventos`, sem traceback.

- [ ] **Step 4: Conferir que o autogenerate não vê diferença**

Run:
```bash
docker compose run --rm --no-deps --entrypoint alembic backend check
```
Expected: `No new upgrade operations detected.`

Se aparecer diferença, ajustar a migration (não o model) até bater.

- [ ] **Step 5: Verificar o downgrade e reaplicar**

Run:
```bash
docker compose run --rm --no-deps --entrypoint alembic backend downgrade 7c41ba823b98
docker compose run --rm --no-deps --entrypoint alembic backend upgrade head
```
Expected: ambos completam sem erro.

- [ ] **Step 6: Commit**

```bash
git add backend/alembic/versions/20260917_b1f2c3d4e5a6_cria_usuarios_e_eventos.py
git commit -m "feat(backend/calendario): cria tabelas de usuarios e eventos"
```

---

### Task 4: Schemas Pydantic do calendário

**Files:**
- Create: `backend/app/modules/calendario/schemas.py` (arquivo existe vazio — preencher)

**Interfaces:**
- Consumes: nada de outras tasks.
- Produces:
  - `EventoCriar(titulo: str, descricao: str | None, data_inicio: datetime, data_fim: datetime | None, setor_id: uuid.UUID | None)`
  - `EventoAtualizar(titulo: str, descricao: str | None, data_inicio: datetime, data_fim: datetime | None)`
  - `EventoResposta(id, titulo, descricao, data_inicio, data_fim, setor_id, setor_nome, autor_id, autor_nome, criado_em)` com `from_attributes=True`
  - `AniversarianteResposta(id: uuid.UUID, nome: str, dia: int, setor_id: uuid.UUID | None, setor_nome: str | None)`

- [ ] **Step 1: Escrever os schemas**

Conteúdo completo de `backend/app/modules/calendario/schemas.py`:

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EventoCriar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    titulo: str = Field(min_length=1, max_length=200)
    descricao: str | None = None
    data_inicio: datetime
    data_fim: datetime | None = None
    # Só o superadmin escolhe: para admin_setor o service força o próprio setor.
    setor_id: uuid.UUID | None = None


class EventoAtualizar(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    # setor_id e autor_id não são editáveis: trocar o setor mudaria quem pode editar o evento.
    titulo: str = Field(min_length=1, max_length=200)
    descricao: str | None = None
    data_inicio: datetime
    data_fim: datetime | None = None


class EventoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    titulo: str
    descricao: str | None
    data_inicio: datetime
    data_fim: datetime | None
    setor_id: uuid.UUID
    setor_nome: str
    autor_id: uuid.UUID
    autor_nome: str
    criado_em: datetime


class AniversarianteResposta(BaseModel):
    """Derivado de usuarios.data_nascimento — o ano nunca é exposto, para não revelar idade."""

    id: uuid.UUID
    nome: str
    dia: int
    setor_id: uuid.UUID | None
    setor_nome: str | None
```

- [ ] **Step 2: Verificar que os schemas carregam**

Run:
```bash
docker compose run --rm --no-deps --entrypoint python backend -c "from app.modules.calendario.schemas import EventoCriar, EventoAtualizar, EventoResposta, AniversarianteResposta; print(sorted(EventoResposta.model_fields))"
```
Expected: `['autor_id', 'autor_nome', 'criado_em', 'data_fim', 'data_inicio', 'descricao', 'id', 'setor_id', 'setor_nome', 'titulo']`

- [ ] **Step 3: Commit**

```bash
git add backend/app/modules/calendario/schemas.py
git commit -m "feat(backend/calendario): adiciona schemas de evento e aniversariante"
```

---

### Task 5: Service do calendário

**Files:**
- Create: `backend/app/modules/calendario/service.py` (arquivo existe vazio — preencher)

**Interfaces:**
- Consumes: `Evento` (Task 2), `Usuario` (Task 1), schemas (Task 4), `app.core.permissions.{Papel, UsuarioAutenticado, pode_gerenciar_setor}`, `app.modules.setores.service.buscar_setor`.
- Produces:
  - `listar_eventos(sessao: Session, de: date | None = None, ate: date | None = None, setor_id: uuid.UUID | None = None) -> list[Evento]`
  - `buscar_evento(sessao: Session, evento_id: uuid.UUID) -> Evento`
  - `criar_evento(sessao: Session, dados: EventoCriar, usuario: UsuarioAutenticado) -> Evento`
  - `atualizar_evento(sessao: Session, evento_id: uuid.UUID, dados: EventoAtualizar, usuario: UsuarioAutenticado) -> Evento`
  - `deletar_evento(sessao: Session, evento_id: uuid.UUID, usuario: UsuarioAutenticado) -> None`
  - `listar_aniversariantes(sessao: Session, mes: int | None = None) -> list[AniversarianteResposta]`

- [ ] **Step 1: Escrever o service**

Conteúdo completo de `backend/app/modules/calendario/service.py`:

```python
import uuid
from datetime import UTC, date, datetime, time

from fastapi import HTTPException, status
from sqlalchemy import extract, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import Papel, UsuarioAutenticado, pode_gerenciar_setor
from app.modules.calendario.models import Evento
from app.modules.calendario.schemas import AniversarianteResposta, EventoAtualizar, EventoCriar
from app.modules.setores.service import buscar_setor
from app.modules.usuarios.models import Usuario

PERIODO_INVALIDO = {
    "campo": "data_fim",
    "mensagem": "Data de fim deve ser posterior à data de início",
}
SETOR_OBRIGATORIO = {
    "campo": "setor_id",
    "mensagem": "Informe o setor do evento",
}


# Eventos: leitura institucional (todo autenticado vê tudo), edição escopada por setor.


def listar_eventos(
    sessao: Session,
    de: date | None = None,
    ate: date | None = None,
    setor_id: uuid.UUID | None = None,
) -> list[Evento]:
    consulta = (
        select(Evento)
        .options(selectinload(Evento.autor), selectinload(Evento.setor))
        .order_by(Evento.data_inicio, Evento.titulo)
    )
    if de is not None:
        consulta = consulta.where(Evento.data_inicio >= datetime.combine(de, time.min, tzinfo=UTC))
    if ate is not None:
        # time.max para incluir o dia inteiro de `ate`.
        consulta = consulta.where(Evento.data_inicio <= datetime.combine(ate, time.max, tzinfo=UTC))
    if setor_id is not None:
        # Filtro de conveniência da tela, não restrição de visibilidade.
        consulta = consulta.where(Evento.setor_id == setor_id)
    return list(sessao.scalars(consulta))


def buscar_evento(sessao: Session, evento_id: uuid.UUID) -> Evento:
    consulta = (
        select(Evento)
        .options(selectinload(Evento.autor), selectinload(Evento.setor))
        .where(Evento.id == evento_id)
    )
    evento = sessao.scalars(consulta).first()
    if evento is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evento não encontrado")
    return evento


def criar_evento(sessao: Session, dados: EventoCriar, usuario: UsuarioAutenticado) -> Evento:
    _validar_periodo(dados.data_inicio, dados.data_fim)
    setor_id = _resolver_setor(dados.setor_id, usuario)
    buscar_setor(sessao, setor_id)
    evento = Evento(
        titulo=dados.titulo,
        descricao=dados.descricao,
        data_inicio=dados.data_inicio,
        data_fim=dados.data_fim,
        autor_id=usuario.id,
        setor_id=setor_id,
    )
    sessao.add(evento)
    try:
        sessao.commit()
    except IntegrityError:
        sessao.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Autor do evento não encontrado")
    return buscar_evento(sessao, evento.id)


def atualizar_evento(
    sessao: Session, evento_id: uuid.UUID, dados: EventoAtualizar, usuario: UsuarioAutenticado
) -> Evento:
    evento = buscar_evento(sessao, evento_id)
    _garantir_escopo(usuario, evento.setor_id)
    _validar_periodo(dados.data_inicio, dados.data_fim)
    evento.titulo = dados.titulo
    evento.descricao = dados.descricao
    evento.data_inicio = dados.data_inicio
    evento.data_fim = dados.data_fim
    sessao.commit()
    return buscar_evento(sessao, evento.id)


def deletar_evento(sessao: Session, evento_id: uuid.UUID, usuario: UsuarioAutenticado) -> None:
    evento = buscar_evento(sessao, evento_id)
    _garantir_escopo(usuario, evento.setor_id)
    sessao.delete(evento)
    sessao.commit()


# Aniversariantes: derivados de usuarios.data_nascimento, não são registro próprio.


def listar_aniversariantes(sessao: Session, mes: int | None = None) -> list[AniversarianteResposta]:
    mes_alvo = mes if mes is not None else date.today().month
    consulta = (
        select(Usuario)
        .options(selectinload(Usuario.setor))
        .where(
            Usuario.ativo.is_(True),
            Usuario.data_nascimento.is_not(None),
            extract("month", Usuario.data_nascimento) == mes_alvo,
        )
        .order_by(extract("day", Usuario.data_nascimento), Usuario.nome)
    )
    return [
        AniversarianteResposta(
            id=usuario.id,
            nome=usuario.nome,
            dia=usuario.data_nascimento.day,
            setor_id=usuario.setor_id,
            setor_nome=usuario.setor.nome if usuario.setor else None,
        )
        for usuario in sessao.scalars(consulta)
    ]


def _resolver_setor(setor_id: uuid.UUID | None, usuario: UsuarioAutenticado) -> uuid.UUID:
    """admin_setor cria sempre no próprio setor; superadmin escolhe."""
    if usuario.role == Papel.ADMIN_SETOR:
        if usuario.setor_id is None or (setor_id is not None and setor_id != usuario.setor_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Fora do seu setor")
        return usuario.setor_id
    escolhido = setor_id or usuario.setor_id
    if escolhido is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, SETOR_OBRIGATORIO)
    return escolhido


def _garantir_escopo(usuario: UsuarioAutenticado, setor_id: uuid.UUID) -> None:
    if not pode_gerenciar_setor(usuario, setor_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Fora do seu setor")


def _validar_periodo(data_inicio: datetime, data_fim: datetime | None) -> None:
    if data_fim is not None and data_fim < data_inicio:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, PERIODO_INVALIDO)
```

- [ ] **Step 2: Verificar import e assinaturas**

Run:
```bash
docker compose run --rm --no-deps --entrypoint python backend -c "from app.modules.calendario import service; import inspect; print([n for n in dir(service) if not n.startswith('__')][:12]); print(inspect.signature(service.listar_aniversariantes))"
```
Expected: sem traceback, e a assinatura `(sessao: sqlalchemy.orm.session.Session, mes: int | None = None) -> list[app.modules.calendario.schemas.AniversarianteResposta]`.

- [ ] **Step 3: Commit**

```bash
git add backend/app/modules/calendario/service.py
git commit -m "feat(backend/calendario): adiciona service de eventos e aniversariantes"
```

---

### Task 6: Router do calendário + registro na aplicação

**Files:**
- Create: `backend/app/modules/calendario/router.py` (arquivo existe vazio — preencher)
- Modify: `backend/app/main.py` (import dos routers e `include_router`)

**Interfaces:**
- Consumes: service (Task 5), schemas (Task 4), `app.core.database.obter_sessao`, `app.core.permissions.{UsuarioAutenticado, requer_admin, usuario_atual}`.
- Produces: `router` (objeto `APIRouter` com `prefix="/calendario"`), exportado como `roteador_calendario` em `app/main.py`.

- [ ] **Step 1: Escrever o router**

Conteúdo completo de `backend/app/modules/calendario/router.py`:

```python
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import obter_sessao
from app.core.permissions import UsuarioAutenticado, requer_admin, usuario_atual
from app.modules.calendario import service
from app.modules.calendario.schemas import (
    AniversarianteResposta,
    EventoAtualizar,
    EventoCriar,
    EventoResposta,
)

router = APIRouter(prefix="/calendario", tags=["calendario"])


# Eventos: leitura para qualquer usuário autenticado, escrita para admin_setor (do próprio
# setor, checado no service) e superadmin.


@router.get(
    "/eventos", response_model=list[EventoResposta], dependencies=[Depends(usuario_atual)]
)
def listar_eventos(
    de: date | None = None,
    ate: date | None = None,
    setor_id: uuid.UUID | None = None,
    sessao: Session = Depends(obter_sessao),
):
    return service.listar_eventos(sessao, de, ate, setor_id)


@router.get(
    "/eventos/{evento_id}",
    response_model=EventoResposta,
    dependencies=[Depends(usuario_atual)],
)
def buscar_evento(evento_id: uuid.UUID, sessao: Session = Depends(obter_sessao)):
    return service.buscar_evento(sessao, evento_id)


@router.post(
    "/eventos",
    response_model=EventoResposta,
    status_code=status.HTTP_201_CREATED,
)
def criar_evento(
    dados: EventoCriar,
    usuario: UsuarioAutenticado = Depends(requer_admin),
    sessao: Session = Depends(obter_sessao),
):
    return service.criar_evento(sessao, dados, usuario)


@router.put("/eventos/{evento_id}", response_model=EventoResposta)
def atualizar_evento(
    evento_id: uuid.UUID,
    dados: EventoAtualizar,
    usuario: UsuarioAutenticado = Depends(requer_admin),
    sessao: Session = Depends(obter_sessao),
):
    return service.atualizar_evento(sessao, evento_id, dados, usuario)


@router.delete("/eventos/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_evento(
    evento_id: uuid.UUID,
    usuario: UsuarioAutenticado = Depends(requer_admin),
    sessao: Session = Depends(obter_sessao),
):
    service.deletar_evento(sessao, evento_id, usuario)


# Aniversariantes: leitura para qualquer usuário autenticado.


@router.get(
    "/aniversariantes",
    response_model=list[AniversarianteResposta],
    dependencies=[Depends(usuario_atual)],
)
def listar_aniversariantes(
    mes: int | None = Query(default=None, ge=1, le=12),
    sessao: Session = Depends(obter_sessao),
):
    return service.listar_aniversariantes(sessao, mes)
```

- [ ] **Step 2: Registrar o router na aplicação**

Em `backend/app/main.py`, adicionar o import logo abaixo do import de setores:

```python
from app.modules.calendario.router import router as roteador_calendario
from app.modules.setores.router import router as roteador_setores
```

(ordem alfabética — `calendario` vem antes de `setores`)

e, abaixo de `app.include_router(roteador_setores)`, adicionar:

```python
app.include_router(roteador_calendario)
```

- [ ] **Step 3: Verificar as rotas registradas**

Run:
```bash
docker compose run --rm --no-deps --entrypoint python backend -c "from app.main import app; print(sorted({r.path for r in app.routes if r.path.startswith('/calendario')}))"
```
Expected: `['/calendario/aniversariantes', '/calendario/eventos', '/calendario/eventos/{evento_id}']`

- [ ] **Step 4: Commit**

```bash
git add backend/app/modules/calendario/router.py backend/app/main.py
git commit -m "feat(backend/calendario): expoe endpoints de eventos e aniversariantes"
```

---

### Task 7: Validação end-to-end (smoke)

Sem testes automatizados no escopo, esta task é a verificação de que a feature funciona de ponta a ponta. O script é **descartável** e não vai para o commit.

**Files:**
- Create (temporário, apagado ao final): `backend/_smoke.py`

**Interfaces:**
- Consumes: API rodando em `http://localhost:8000` dentro do container `backend`, com a migration aplicada.
- Produces: relatório impresso com `OK`/`FALHA` por cenário.

- [ ] **Step 1: Subir o ambiente completo**

Run:
```bash
docker compose up -d --build
docker compose ps
```
Expected: `banco`, `armazenamento`, `backend` e `frontend` no ar; `backend` com status `healthy` após ~20s.

Se o serviço `armazenamento` (MinIO) não ficar `healthy` e travar o `backend`, use o caminho alternativo, que não depende dele:
```bash
docker compose up -d banco
docker compose run --rm --no-deps --entrypoint alembic backend upgrade head
docker compose run -d --name intranet-api --no-deps --service-ports backend
```

- [ ] **Step 2: Conferir o boot**

Run:
```bash
curl -s http://localhost:8000/saude
```
Expected: `{"status":"ok","banco":"ok"}`

- [ ] **Step 3: Escrever o script de smoke**

Conteúdo completo de `backend/_smoke.py` (roda **dentro** do container, por isso fala com `localhost:8000` e gera os tokens com o mesmo segredo da aplicação):

```python
"""Smoke descartável do módulo calendario. Não versionar."""

import json
import urllib.error
import urllib.request
import uuid
from datetime import date, datetime, timedelta, timezone

import jwt

from app.core.config import configuracoes
from app.core.database import SessaoLocal
from app.modules.calendario.models import Evento
from app.modules.setores.models import Setor
from app.modules.usuarios.models import Usuario

BASE = "http://localhost:8000"
falhas = []


def checar(nome, condicao, detalhe=""):
    print(f"{'OK  ' if condicao else 'FALHA'} {nome} {detalhe if not condicao else ''}")
    if not condicao:
        falhas.append(nome)


def token(usuario_id, role, setor_id):
    carga = {
        "sub": str(usuario_id),
        "role": role,
        "setor_id": str(setor_id) if setor_id else None,
        "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(carga, configuracoes.segredo_jwt, algorithm=configuracoes.algoritmo_jwt)


def chamar(metodo, caminho, tok=None, corpo=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(BASE + caminho, data=dados, method=metodo)
    req.add_header("Content-Type", "application/json")
    if tok:
        req.add_header("Authorization", f"Bearer {tok}")
    try:
        with urllib.request.urlopen(req) as resp:
            texto = resp.read().decode()
            return resp.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as erro:
        texto = erro.read().decode()
        return erro.code, (json.loads(texto) if texto else None)


# --- seed -------------------------------------------------------------------
sessao = SessaoLocal()
sessao.query(Evento).delete()
sessao.query(Usuario).delete()
sessao.query(Setor).filter(Setor.nome.in_(["Smoke A", "Smoke B"])).delete()
sessao.commit()

setor_a = Setor(id=uuid.uuid4(), nome="Smoke A")
setor_b = Setor(id=uuid.uuid4(), nome="Smoke B")
hoje = date.today()
chefe = Usuario(
    id=uuid.uuid4(), nome="Super Root", email="super@smoke.local", senha_hash="x",
    role="superadmin", setor_id=None, data_nascimento=date(1980, hoje.month, 5),
)
admin_a = Usuario(
    id=uuid.uuid4(), nome="Admin A", email="admina@smoke.local", senha_hash="x",
    role="admin_setor", setor_id=setor_a.id, data_nascimento=date(1990, hoje.month, 2),
)
admin_b = Usuario(
    id=uuid.uuid4(), nome="Admin B", email="adminb@smoke.local", senha_hash="x",
    role="admin_setor", setor_id=setor_b.id, data_nascimento=date(1991, 1, 9),
)
comum = Usuario(
    id=uuid.uuid4(), nome="Zé Comum", email="comum@smoke.local", senha_hash="x",
    role="comum", setor_id=setor_a.id, data_nascimento=None,
)
inativo = Usuario(
    id=uuid.uuid4(), nome="Ex Funcionário", email="ex@smoke.local", senha_hash="x",
    role="comum", setor_id=setor_a.id, data_nascimento=date(1985, hoje.month, 1), ativo=False,
)
sessao.add_all([setor_a, setor_b, chefe, admin_a, admin_b, comum, inativo])
sessao.commit()

tk_super = token(chefe.id, "superadmin", None)
tk_admin_a = token(admin_a.id, "admin_setor", setor_a.id)
tk_admin_b = token(admin_b.id, "admin_setor", setor_b.id)
tk_comum = token(comum.id, "comum", setor_a.id)
id_setor_a, id_setor_b = str(setor_a.id), str(setor_b.id)
sessao.close()

inicio = datetime(hoje.year, hoje.month, 10, 14, 0, tzinfo=timezone.utc).isoformat()
fim = datetime(hoje.year, hoje.month, 10, 16, 0, tzinfo=timezone.utc).isoformat()

# --- autenticação e permissão ----------------------------------------------
codigo, _ = chamar("GET", "/calendario/eventos")
checar("401 sem token", codigo == 401, codigo)

codigo, corpo = chamar("POST", "/calendario/eventos", tk_comum,
                       {"titulo": "Proibido", "data_inicio": inicio})
checar("403 comum nao cria", codigo == 403, (codigo, corpo))

# --- criação ----------------------------------------------------------------
codigo, evento_a = chamar("POST", "/calendario/eventos", tk_admin_a,
                          {"titulo": "Treinamento A", "descricao": "POP novo",
                           "data_inicio": inicio, "data_fim": fim})
checar("201 admin_setor cria no proprio setor",
       codigo == 201 and evento_a["setor_id"] == id_setor_a, (codigo, evento_a))
checar("resposta traz setor_nome e autor_nome",
       evento_a and evento_a.get("setor_nome") == "Smoke A"
       and evento_a.get("autor_nome") == "Admin A", evento_a)

codigo, corpo = chamar("POST", "/calendario/eventos", tk_admin_a,
                       {"titulo": "Invasao", "data_inicio": inicio, "setor_id": id_setor_b})
checar("403 admin_setor cria em outro setor", codigo == 403, (codigo, corpo))

codigo, evento_b = chamar("POST", "/calendario/eventos", tk_super,
                          {"titulo": "Reuniao geral", "data_inicio": inicio,
                           "setor_id": id_setor_b})
checar("201 superadmin cria em qualquer setor",
       codigo == 201 and evento_b["setor_id"] == id_setor_b, (codigo, evento_b))

codigo, corpo = chamar("POST", "/calendario/eventos", tk_super,
                       {"titulo": "Sem setor", "data_inicio": inicio})
checar("422 superadmin sem setor", codigo == 422 and corpo.get("campo") == "setor_id",
       (codigo, corpo))

codigo, corpo = chamar("POST", "/calendario/eventos", tk_admin_a,
                       {"titulo": "Periodo invalido", "data_inicio": fim, "data_fim": inicio})
checar("422 data_fim antes de data_inicio",
       codigo == 422 and corpo.get("campo") == "data_fim", (codigo, corpo))

codigo, corpo = chamar("POST", "/calendario/eventos", tk_super,
                       {"titulo": "Setor fantasma", "data_inicio": inicio,
                        "setor_id": str(uuid.uuid4())})
checar("404 setor inexistente", codigo == 404, (codigo, corpo))

# --- leitura institucional e filtros ---------------------------------------
codigo, lista = chamar("GET", "/calendario/eventos", tk_comum)
checar("comum le eventos de todos os setores",
       codigo == 200 and len(lista) == 2, (codigo, lista))

codigo, lista = chamar("GET", f"/calendario/eventos?setor_id={id_setor_b}", tk_comum)
checar("filtro por setor_id", codigo == 200 and len(lista) == 1
       and lista[0]["setor_id"] == id_setor_b, (codigo, lista))

dia = f"{hoje.year:04d}-{hoje.month:02d}-10"
codigo, lista = chamar("GET", f"/calendario/eventos?de={dia}&ate={dia}", tk_comum)
checar("filtro de/ate inclui o dia inteiro", codigo == 200 and len(lista) == 2, (codigo, lista))

codigo, lista = chamar("GET", f"/calendario/eventos?de={hoje.year + 1}-01-01", tk_comum)
checar("filtro de futuro nao traz nada", codigo == 200 and lista == [], (codigo, lista))

codigo, corpo = chamar("GET", f"/calendario/eventos/{evento_a['id']}", tk_comum)
checar("busca por id", codigo == 200 and corpo["id"] == evento_a["id"], (codigo, corpo))

codigo, corpo = chamar("GET", f"/calendario/eventos/{uuid.uuid4()}", tk_comum)
checar("404 evento inexistente", codigo == 404, (codigo, corpo))

# --- edição e exclusão com escopo ------------------------------------------
codigo, corpo = chamar("PUT", f"/calendario/eventos/{evento_a['id']}", tk_admin_b,
                       {"titulo": "Sequestro", "data_inicio": inicio})
checar("403 admin_setor edita evento de outro setor", codigo == 403, (codigo, corpo))

codigo, corpo = chamar("PUT", f"/calendario/eventos/{evento_a['id']}", tk_admin_a,
                       {"titulo": "Treinamento A (revisado)", "descricao": None,
                        "data_inicio": inicio, "data_fim": fim})
checar("200 admin_setor edita o proprio",
       codigo == 200 and corpo["titulo"] == "Treinamento A (revisado)", (codigo, corpo))

codigo, corpo = chamar("PUT", f"/calendario/eventos/{evento_a['id']}", tk_super,
                       {"titulo": "Treinamento A (super)", "data_inicio": inicio})
checar("200 superadmin edita qualquer um", codigo == 200, (codigo, corpo))

codigo, corpo = chamar("DELETE", f"/calendario/eventos/{evento_b['id']}", tk_admin_a)
checar("403 admin_setor deleta de outro setor", codigo == 403, (codigo, corpo))

codigo, _ = chamar("DELETE", f"/calendario/eventos/{evento_a['id']}", tk_admin_a)
checar("204 admin_setor deleta o proprio", codigo == 204, codigo)

codigo, _ = chamar("DELETE", f"/calendario/eventos/{evento_b['id']}", tk_super)
checar("204 superadmin deleta qualquer um", codigo == 204, codigo)

# --- aniversariantes --------------------------------------------------------
codigo, lista = chamar("GET", "/calendario/aniversariantes", tk_comum)
nomes = [a["nome"] for a in lista]
checar("mes corrente por padrao, so ativos e com data",
       codigo == 200 and nomes == ["Admin A", "Super Root"], (codigo, lista))
checar("ordenado por dia e sem expor o ano",
       lista and lista[0]["dia"] == 2 and "ano" not in lista[0]
       and set(lista[0]) == {"id", "nome", "dia", "setor_id", "setor_nome"}, lista)
checar("setor_nome preenchido e nulo quando nao ha setor",
       lista and lista[0]["setor_nome"] == "Smoke A" and lista[1]["setor_nome"] is None, lista)

codigo, lista = chamar("GET", "/calendario/aniversariantes?mes=1", tk_comum)
checar("mes explicito", codigo == 200 and [a["nome"] for a in lista] == ["Admin B"],
       (codigo, lista))

codigo, corpo = chamar("GET", "/calendario/aniversariantes?mes=13", tk_comum)
checar("422 mes fora de 1-12", codigo == 422 and corpo.get("campo") == "mes", (codigo, corpo))

codigo, _ = chamar("GET", "/calendario/aniversariantes")
checar("401 aniversariantes sem token", codigo == 401, codigo)

# --- limpeza ----------------------------------------------------------------
sessao = SessaoLocal()
sessao.query(Evento).delete()
sessao.query(Usuario).delete()
sessao.query(Setor).filter(Setor.nome.in_(["Smoke A", "Smoke B"])).delete()
sessao.commit()
sessao.close()

print()
print("FALHAS:", falhas if falhas else "nenhuma")
raise SystemExit(1 if falhas else 0)
```

- [ ] **Step 4: Rodar o smoke**

Run:
```bash
docker compose cp backend/_smoke.py backend:/app/_smoke.py
docker compose exec backend python /app/_smoke.py
```
Expected: todas as linhas começando com `OK`, a última linha `FALHAS: nenhuma`, exit code 0.

(No caminho alternativo do Step 1, trocar `docker compose exec backend` por `docker exec intranet-api` e `docker compose cp ... backend:` por `docker cp backend/_smoke.py intranet-api:/app/_smoke.py`.)

Se algo falhar: corrigir o código do módulo (não o smoke, salvo se o próprio cenário estiver errado), reconstruir se necessário e repetir.

- [ ] **Step 5: Conferir o contrato no OpenAPI**

Run:
```bash
curl -s http://localhost:8000/openapi.json | python -c "import json,sys; d=json.load(sys.stdin); print(sorted(p for p in d['paths'] if p.startswith('/calendario')))"
```
Expected: `['/calendario/aniversariantes', '/calendario/eventos', '/calendario/eventos/{evento_id}']`

- [ ] **Step 6: Apagar o script e conferir que a árvore está limpa**

Run:
```bash
rm backend/_smoke.py
git status --porcelain
```
Expected: saída vazia (nenhum arquivo não commitado ou não rastreado).

---

## Self-Review

**Cobertura do spec:**

| Requisito do spec | Task |
|---|---|
| Model `usuarios` com `data_nascimento` | 1 |
| Import dos models no `alembic/env.py` | 1 |
| Model `eventos` + relationships | 2 |
| Migration das duas tabelas + índices, com downgrade | 3 |
| Schemas de evento e aniversariante | 4 |
| `GET /calendario/eventos` com filtros `de`/`ate`/`setor_id` | 5, 6 |
| `GET /calendario/eventos/{id}` | 5, 6 |
| `POST` com resolução de setor (403 admin fora do setor, 422 superadmin sem setor, 404 setor inexistente) | 5, 6 |
| `PUT`/`DELETE` com escopo por setor | 5, 6 |
| Validação `data_fim` >= `data_inicio` (422 com campo) | 5 |
| `GET /calendario/aniversariantes` com `mes` opcional 1–12, só ativos com data, sem ano | 5, 6 |
| `setor_nome`/`autor_nome` sem N+1 | 2 (properties), 5 (`selectinload`) |
| Registro do router em `main.py` | 6 |
| Tabela de erros do spec | 5, 6, validada na 7 |
| Validação: migration up/down, boot, smoke de permissões e filtros | 3, 7 |

**Placeholders:** nenhum. Todo passo tem comando ou código completo.

**Consistência de tipos:** `listar_eventos`, `buscar_evento`, `criar_evento`, `atualizar_evento`, `deletar_evento` e `listar_aniversariantes` têm a mesma assinatura na Task 5 (definição) e na Task 6 (chamada). `EventoCriar`/`EventoAtualizar`/`EventoResposta`/`AniversarianteResposta` têm os mesmos campos na Task 4, no uso da Task 5 e nas asserções da Task 7. `Evento.autor_nome`/`setor_nome` (Task 2) batem com os campos de `EventoResposta` (Task 4).
