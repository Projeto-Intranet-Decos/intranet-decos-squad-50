"""novidades vistas em

Revision ID: 8c14e81c753b
Revises: b7d9f1a3c5e2
Create Date: 2026-11-27 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '8c14e81c753b'
down_revision: Union[str, Sequence[str], None] = 'b7d9f1a3c5e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Quem já existe começa no momento da migration: o que foi publicado antes não vira novidade.
    op.add_column(
        'usuarios',
        sa.Column(
            'novidades_vistas_em',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('usuarios', 'novidades_vistas_em')
