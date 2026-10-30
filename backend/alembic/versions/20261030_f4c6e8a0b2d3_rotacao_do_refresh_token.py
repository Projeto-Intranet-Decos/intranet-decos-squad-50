"""rotacao do refresh token

Revision ID: f4c6e8a0b2d3
Revises: e3b5d7f9a1c2
Create Date: 2026-10-30 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4c6e8a0b2d3'
down_revision: Union[str, Sequence[str], None] = 'e3b5d7f9a1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'tokens_atualizacao',
        sa.Column('substituido_em', sa.DateTime(timezone=True), nullable=True),
    )
    # gen_random_uuid() roda por linha: cada token que já existe vira uma sessão própria.
    op.add_column(
        'tokens_atualizacao',
        sa.Column(
            'sessao_id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False
        ),
    )
    op.create_index('ix_tokens_atualizacao_sessao_id', 'tokens_atualizacao', ['sessao_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_tokens_atualizacao_sessao_id', table_name='tokens_atualizacao')
    op.drop_column('tokens_atualizacao', 'sessao_id')
    op.drop_column('tokens_atualizacao', 'substituido_em')
