from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import configuracoes
from app.core.database import Base

# Importe aqui os models de cada módulo, para o autogenerate enxergá-los.
import app.modules.autenticacao.models  # noqa: F401
import app.modules.setores.models  # noqa: F401
import app.modules.usuarios.models  # noqa: F401
import app.modules.murais.models  # noqa: F401
import app.modules.documentos.models  # noqa: F401
import app.modules.duvidas.models  # noqa: F401
import app.modules.atalhos.models  # noqa: F401
import app.modules.logs.models  # noqa: F401

# A URL vem de app.core.config (variáveis POSTGRES_*), não do alembic.ini. Ela não passa pelo
# config do Alembic porque o configparser trataria o `%` da senha escapada como interpolação.
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def rodar_migrations_offline() -> None:
    context.configure(
        url=configuracoes.url_banco,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def rodar_migrations_online() -> None:
    conectavel = create_engine(configuracoes.url_banco, poolclass=pool.NullPool)
    with conectavel.connect() as conexao:
        context.configure(connection=conexao, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    rodar_migrations_offline()
else:
    rodar_migrations_online()
