"""cria avisos

Revision ID: c3d8e5f1a2b7
Revises: b1f2c3d4e5a6
Create Date: 2026-09-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d8e5f1a2b7'
down_revision: Union[str, Sequence[str], None] = 'b1f2c3d4e5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('avisos',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('titulo', sa.String(length=200), nullable=False),
    sa.Column('conteudo', sa.Text(), nullable=False),
    sa.Column('categoria', sa.String(length=20), server_default='comunicado', nullable=False),
    sa.Column('fixado', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('chave_imagem', sa.String(length=500), nullable=True),
    sa.Column('autor_id', sa.Uuid(), nullable=False),
    sa.Column('setor_id', sa.Uuid(), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint(
        "categoria IN ('comunicado', 'promocao', 'evento')", name=op.f('ck_avisos_categoria')
    ),
    sa.ForeignKeyConstraint(['autor_id'], ['usuarios.id'], name=op.f('fk_avisos_autor_id_usuarios')),
    sa.ForeignKeyConstraint(['setor_id'], ['setores.id'], name=op.f('fk_avisos_setor_id_setores')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_avisos'))
    )
    op.create_index(op.f('ix_avisos_autor_id'), 'avisos', ['autor_id'], unique=False)
    op.create_index(op.f('ix_avisos_setor_id'), 'avisos', ['setor_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_avisos_setor_id'), table_name='avisos')
    op.drop_index(op.f('ix_avisos_autor_id'), table_name='avisos')
    op.drop_table('avisos')
