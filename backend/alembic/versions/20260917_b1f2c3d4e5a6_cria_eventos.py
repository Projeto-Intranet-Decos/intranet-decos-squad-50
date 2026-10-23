"""cria eventos

Revision ID: b1f2c3d4e5a6
Revises: 9a1c4f2be07d
Create Date: 2026-09-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1f2c3d4e5a6'
down_revision: Union[str, Sequence[str], None] = '9a1c4f2be07d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
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
