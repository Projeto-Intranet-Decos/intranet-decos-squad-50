"""Infra de teste do backend. Convenções em docs/specs/README.md ("Testes: onde e como").

Banco: Postgres de verdade, num banco separado (`<banco do DATABASE_URL>_teste`, ou o que vier em
`DATABASE_URL_TESTE`), recriado e migrado com o Alembic uma vez por execução. Cada teste roda numa
transação desfeita no final: os `commit()` dos services viram savepoints e nada vaza entre testes.
Por isso `now()` devolve o mesmo instante para tudo que um teste insere. Cada requisição ganha uma
sessão própria, configurada como a `SessaoLocal` do app, e fechada no fim, como em produção.

Armazenamento: o MinIO é trocado por um dicionário em memória (`ArmazenamentoFalso`) em todos os
testes; se algum código chegar ao cliente MinIO real, o teste quebra.
"""

import os
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy.engine import make_url

RAIZ_BACKEND = Path(__file__).resolve().parents[1]
# "banco" é o Postgres do docker compose visto de dentro da rede do compose.
HOSTS_LOCAIS = {"localhost", "127.0.0.1", "::1", "banco"}


def _url_banco_teste() -> str:
    explicita = os.environ.get("DATABASE_URL_TESTE")
    if explicita:
        return explicita
    base = os.environ.get("DATABASE_URL") or dotenv_values(RAIZ_BACKEND / ".env").get("DATABASE_URL")
    if not base:
        raise RuntimeError("Defina DATABASE_URL_TESTE, ou DATABASE_URL no backend/.env")
    url = make_url(base)
    if not url.database:
        raise RuntimeError("DATABASE_URL não tem nome de banco para derivar o banco de teste")
    # O banco derivado é apagado a cada execução: só em host local. Outro host, só explícito.
    if url.host not in HOSTS_LOCAIS:
        raise RuntimeError(
            f"DATABASE_URL aponta pra '{url.host}', que não parece local. "
            "Se for mesmo onde os testes devem rodar, defina DATABASE_URL_TESTE explicitamente."
        )
    if not url.database.endswith("_teste"):
        url = url.set(database=f"{url.database}_teste")
    return url.render_as_string(hide_password=False)


URL_BANCO_TESTE = _url_banco_teste()
if not (make_url(URL_BANCO_TESTE).database or "").endswith("_teste"):
    raise RuntimeError("O nome do banco de teste precisa terminar em _teste: ele é apagado a cada execução")

# Tem que vir antes de importar `app`: core/config.py lê o ambiente na importação.
os.environ["DATABASE_URL"] = URL_BANCO_TESTE
# 32+ bytes: o PyJWT avisa quando a chave HMAC é curta.
os.environ.setdefault("JWT_SECRET", "segredo-so-para-teste-com-32-bytes-ou-mais")
os.environ.setdefault("MINIO_USUARIO", "teste")
os.environ.setdefault("MINIO_SENHA", "teste")

from collections.abc import Iterator  # noqa: E402

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.engine import Connection  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

import app.main  # noqa: E402
from app.core import armazenamento  # noqa: E402
from app.core.database import SessaoLocal, engine, obter_sessao  # noqa: E402
from app.modules.setores.models import Setor  # noqa: E402
from app.modules.usuarios.models import Papel, Usuario  # noqa: E402
from tests.apoio import ArmazenamentoFalso, Fabrica  # noqa: E402


# Banco


def _recriar_banco(manutencao: Connection, nome_banco: str) -> None:
    nome = '"' + nome_banco.replace('"', '""') + '"'
    manutencao.execute(text(f"DROP DATABASE IF EXISTS {nome} WITH (FORCE)"))
    manutencao.execute(text(f"CREATE DATABASE {nome}"))


@pytest.fixture(scope="session")
def banco_migrado() -> Iterator[None]:
    url = make_url(URL_BANCO_TESTE)
    nome_banco = url.database or ""
    manutencao = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with manutencao.connect() as conexao:
        # O DROP ... WITH (FORCE) derrubaria outra execução usando o mesmo banco; o lock de sessão
        # (liberado quando a conexão fecha) faz a segunda execução parar com uma mensagem clara.
        if not conexao.scalar(text("SELECT pg_try_advisory_lock(hashtext(:nome))"), {"nome": nome_banco}):
            raise RuntimeError(
                f"Outra execução do pytest está usando o banco {nome_banco}. "
                "Espere ela terminar ou use outro banco em DATABASE_URL_TESTE."
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
