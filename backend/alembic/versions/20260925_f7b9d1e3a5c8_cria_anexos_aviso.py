"""cria anexos_aviso

Revision ID: f7b9d1e3a5c8
Revises: e5a7c9d2f4b6
Create Date: 2026-09-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7b9d1e3a5c8'
down_revision: Union[str, Sequence[str], None] = 'e5a7c9d2f4b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('anexos_aviso',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('aviso_id', sa.Uuid(), nullable=False),
    sa.Column('nome_arquivo', sa.String(length=255), nullable=False),
    sa.Column('tipo_conteudo', sa.String(length=150), nullable=False),
    sa.Column('tamanho_bytes', sa.BigInteger(), nullable=False),
    sa.Column('chave_armazenamento', sa.String(length=500), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(
        ['aviso_id'], ['avisos.id'],
        name=op.f('fk_anexos_aviso_aviso_id_avisos'), ondelete='CASCADE',
    ),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_anexos_aviso')),
    sa.UniqueConstraint('chave_armazenamento', name=op.f('uq_anexos_aviso_chave_armazenamento'))
    )
    op.create_index(op.f('ix_anexos_aviso_aviso_id'), 'anexos_aviso', ['aviso_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_anexos_aviso_aviso_id'), table_name='anexos_aviso')
    op.drop_table('anexos_aviso')
