"""cria atalhos

Revision ID: c9e1f3a5b7d2
Revises: b7e2d4f6a8c1
Create Date: 2026-10-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9e1f3a5b7d2'
down_revision: Union[str, Sequence[str], None] = 'b7e2d4f6a8c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('atalhos',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('titulo', sa.String(length=100), nullable=False),
    sa.Column('url', sa.String(length=500), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_atalhos'))
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('atalhos')
