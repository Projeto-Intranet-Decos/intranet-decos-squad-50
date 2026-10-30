"""Infra de teste do backend. Convenções em docs/specs/README.md ("Testes: onde e como").

Banco: Postgres de verdade, num banco separado (`<POSTGRES_DB>_teste`, ou o que vier em
`TEST_DATABASE_URL`), recriado e migrado com o Alembic uma vez por execução. Cada teste roda numa
transação desfeita no final: os `commit()` dos services viram savepoints e nada vaza entre testes.
Por isso `now()` devolve o mesmo instante para tudo que um teste insere. Cada requisição ganha uma
sessão própria, configurada como a `SessaoLocal` do app, e fechada no fim, como em produção.

Armazenamento: o MinIO é trocado por um dicionário em memória (`ArmazenamentoFalso`) em todos os
testes; se algum código chegar ao cliente MinIO real, o teste quebra.

E-mail: a entrega é trocada pelo `CorreioFalso`, que guarda as mensagens; se algum código chegar à
API real do provedor, o teste quebra.
"""

import os

from sqlalchemy.engine import make_url

# "banco" é o Postgres do docker compose visto de dentro da rede do compose.
HOSTS_LOCAIS = {"localhost", "127.0.0.1", "::1", "banco"}

# Têm que vir antes de importar a configuração, que exige todas.
# 32+ bytes: o PyJWT avisa quando a chave HMAC é curta.
os.environ.setdefault("JWT_SECRET", "segredo-so-para-teste-com-32-bytes-ou-mais")
os.environ.setdefault("MINIO_USER", "teste")
os.environ.setdefault("MINIO_PASSWORD", "teste")
# Com TEST_DATABASE_URL a senha vem da URL, e a configuração não pode exigir POSTGRES_PASSWORD de
# quem roda sem .env. Só nesse caso: a variável de ambiente venceria a senha do .env.
if os.environ.get("TEST_DATABASE_URL"):
    os.environ.setdefault("POSTGRES_PASSWORD", "vem-da-TEST_DATABASE_URL")
# Os testes não dependem do provedor de e-mail configurado no .env de quem os roda.
os.environ["EMAIL_PROVIDER"] = "console"

from app.core.config import RAIZ_BACKEND, configuracoes  # noqa: E402


def _apontar_para_o_banco_de_teste() -> None:
    """Troca o banco da configuração antes de o engine (app.core.database) ser criado."""
    explicita = os.environ.get("TEST_DATABASE_URL")
    if explicita:
        url = make_url(explicita)
        configuracoes.postgres_host = url.host or "localhost"
        configuracoes.postgres_port = url.port or 5432
        configuracoes.postgres_db = url.database or ""
        configuracoes.postgres_user = url.username or ""
        configuracoes.postgres_password = url.password or ""
    else:
        # O banco derivado é apagado a cada execução: só em host local. Outro host, só explícito.
        if configuracoes.postgres_host not in HOSTS_LOCAIS:
            raise RuntimeError(
                f"POSTGRES_HOST é '{configuracoes.postgres_host}', que não parece local. "
                "Se for mesmo onde os testes devem rodar, defina TEST_DATABASE_URL explicitamente."
            )
        if not configuracoes.postgres_db.endswith("_teste"):
            configuracoes.postgres_db = f"{configuracoes.postgres_db}_teste"
    if not configuracoes.postgres_db.endswith("_teste"):
        raise RuntimeError("O nome do banco de teste precisa terminar em _teste: ele é apagado a cada execução")


_apontar_para_o_banco_de_teste()

from collections.abc import Iterator  # noqa: E402

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.engine import Connection  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

import app.main  # noqa: E402
from app.core import armazenamento, correio  # noqa: E402
from app.core.database import SessaoLocal, engine, obter_fabrica_de_sessoes, obter_sessao  # noqa: E402
from app.modules.setores.models import Setor  # noqa: E402
from app.modules.usuarios.models import Papel, Usuario  # noqa: E402
from tests.apoio import ArmazenamentoFalso, CorreioFalso, Fabrica  # noqa: E402


# Banco


def _recriar_banco(manutencao: Connection, nome_banco: str) -> None:
    nome = '"' + nome_banco.replace('"', '""') + '"'
    manutencao.execute(text(f"DROP DATABASE IF EXISTS {nome} WITH (FORCE)"))
    manutencao.execute(text(f"CREATE DATABASE {nome}"))


@pytest.fixture(scope="session")
def banco_migrado() -> Iterator[None]:
    url = configuracoes.url_banco
    nome_banco = url.database or ""
    manutencao = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with manutencao.connect() as conexao:
        # O DROP ... WITH (FORCE) derrubaria outra execução usando o mesmo banco; o lock de sessão
        # (liberado quando a conexão fecha) faz a segunda execução parar com uma mensagem clara.
        if not conexao.scalar(text("SELECT pg_try_advisory_lock(hashtext(:nome))"), {"nome": nome_banco}):
            raise RuntimeError(
                f"Outra execução do pytest está usando o banco {nome_banco}. "
                "Espere ela terminar ou use outro banco em TEST_DATABASE_URL."
            )
        _recriar_banco(conexao, nome_banco)
        # Config sem arquivo: o env.py pula o fileConfig e não mexe no logging do pytest.
        config = Config()
        config.set_main_option("script_location", str(RAIZ_BACKEND / "alembic"))
        command.upgrade(config, "head")
        yield
    manutencao.dispose()


@pytest.fixture
def conexao(banco_migrado: None) -> Iterator[Connection]:
    conexao = engine.connect()
    transacao = conexao.begin()
    try:
        yield conexao
    finally:
        transacao.rollback()
        conexao.close()


def _nova_sessao(conexao: Connection) -> Session:
    # Mesmas opções da SessaoLocal do app (autoflush=False etc.), só que presa à transação do teste.
    return SessaoLocal(bind=conexao, join_transaction_mode="create_savepoint")


@pytest.fixture
def sessao(conexao: Connection) -> Iterator[Session]:
    sessao = _nova_sessao(conexao)
    try:
        yield sessao
    finally:
        sessao.close()


@pytest.fixture
def cliente(conexao: Connection) -> Iterator[TestClient]:
    # Uma sessão por requisição, como o obter_sessao real: nada do ORM sobra de uma para a outra.
    def obter_sessao_de_teste() -> Iterator[Session]:
        sessao = _nova_sessao(conexao)
        try:
            yield sessao
        finally:
            sessao.close()

    app.main.app.dependency_overrides[obter_sessao] = obter_sessao_de_teste
    # Tarefas em segundo plano abrem a própria sessão; nos testes, também presa à transação.
    app.main.app.dependency_overrides[obter_fabrica_de_sessoes] = lambda: lambda: _nova_sessao(conexao)
    try:
        # Sem `with`: não roda o lifespan, que tentaria criar o bucket no MinIO real.
        yield TestClient(app.main.app)
    finally:
        app.main.app.dependency_overrides.clear()


# Armazenamento


@pytest.fixture(autouse=True)
def armazenamento_falso(monkeypatch: pytest.MonkeyPatch) -> ArmazenamentoFalso:
    falso = ArmazenamentoFalso()
    for nome in ("enviar_arquivo", "ler_arquivo", "mover_arquivo", "remover_arquivo"):
        monkeypatch.setattr(armazenamento, nome, getattr(falso, nome))
    # main.py importa a função pelo nome, então precisa ser trocada lá também.
    monkeypatch.setattr(app.main, "armazenamento_disponivel", falso.armazenamento_disponivel)

    # Rede de segurança: quem escapar das trocas acima (import por nome, garantir_bucket...) chega
    # aqui e quebra o teste, em vez de falar com o MinIO do docker compose.
    def obter_cliente_proibido() -> None:
        raise RuntimeError(
            "Teste tentou usar o MinIO real. Troque a função no fixture armazenamento_falso."
        )

    monkeypatch.setattr(armazenamento, "obter_cliente", obter_cliente_proibido)
    return falso


# E-mail


def _envio_proibido(*args: object, **kwargs: object) -> None:
    raise RuntimeError("Teste tentou enviar e-mail de verdade. Use o fixture correio_falso.")


@pytest.fixture(autouse=True)
def correio_falso(monkeypatch: pytest.MonkeyPatch) -> CorreioFalso:
    falso = CorreioFalso()
    monkeypatch.setattr(correio, "_entregar", falso.entregar)
    # Rede de segurança: os testes do próprio envio trocam o urlopen por um falso.
    monkeypatch.setattr(correio, "urlopen", _envio_proibido)
    return falso


# Cenário: um setor com um usuário comum e um admin_setor nele, e um superadmin sem setor (como o
# criado por scripts/criar_superadmin.py). Outros setores/usuários via `fabrica`.


@pytest.fixture
def fabrica(sessao: Session) -> Fabrica:
    return Fabrica(sessao)


@pytest.fixture
def setor(fabrica: Fabrica) -> Setor:
    return fabrica.setor("Enfermagem")


@pytest.fixture
def comum(fabrica: Fabrica, setor: Setor) -> Usuario:
    return fabrica.usuario(Papel.comum, setor)


@pytest.fixture
def admin_setor(fabrica: Fabrica, setor: Setor) -> Usuario:
    return fabrica.usuario(Papel.admin_setor, setor)


@pytest.fixture
def superadmin(fabrica: Fabrica) -> Usuario:
    return fabrica.usuario(Papel.superadmin)
