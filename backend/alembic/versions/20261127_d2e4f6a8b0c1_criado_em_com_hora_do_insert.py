"""criado_em com a hora do insert

Revision ID: d2e4f6a8b0c1
Revises: 8c14e81c753b
Create Date: 2026-11-27 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd2e4f6a8b0c1'
down_revision: Union[str, Sequence[str], None] = '8c14e81c753b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABELAS = ('avisos', 'documento_versoes')


def upgrade() -> None:
    """Upgrade schema."""
    # O now() é o início da transação: uma publicação lenta (anexo grande) que termina depois de
    # o usuário marcar as novidades como vistas ficaria com `criado_em` anterior e sumiria (GER-28).
    for tabela in TABELAS:
        op.alter_column(tabela, 'criado_em', server_default=sa.text('clock_timestamp()'))


def downgrade() -> None:
    """Downgrade schema."""
    for tabela in TABELAS:
        op.alter_column(tabela, 'criado_em', server_default=sa.text('now()'))
