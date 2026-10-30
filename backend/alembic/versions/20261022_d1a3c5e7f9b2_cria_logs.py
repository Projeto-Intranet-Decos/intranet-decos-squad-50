"""cria logs

Revision ID: d1a3c5e7f9b2
Revises: c9e1f3a5b7d2
Create Date: 2026-10-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1a3c5e7f9b2'
down_revision: Union[str, Sequence[str], None] = 'c9e1f3a5b7d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('logs',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('usuario_id', sa.Uuid(), nullable=False),
    sa.Column('usuario_nome', sa.String(length=200), nullable=False),
    sa.Column('setor_id', sa.Uuid(), nullable=True),
    sa.Column('acao', sa.String(length=20), nullable=False),
    sa.Column('modulo', sa.String(length=20), nullable=False),
    sa.Column('entidade_tipo', sa.String(length=50), nullable=False),
    sa.Column('entidade_id', sa.Uuid(), nullable=False),
    sa.Column('resumo', sa.String(length=500), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("acao IN ('criar', 'editar', 'excluir')", name='ck_logs_acao'),
    sa.CheckConstraint("modulo IN ('murais', 'documentos', 'duvidas', 'setores', 'usuarios', 'atalhos')", name='ck_logs_modulo'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_logs'))
    )
    op.create_index(op.f('ix_logs_usuario_id'), 'logs', ['usuario_id'], unique=False)
    op.create_index(op.f('ix_logs_setor_id'), 'logs', ['setor_id'], unique=False)
    op.create_index(op.f('ix_logs_criado_em'), 'logs', ['criado_em'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_logs_criado_em'), table_name='logs')
    op.drop_index(op.f('ix_logs_setor_id'), table_name='logs')
    op.drop_index(op.f('ix_logs_usuario_id'), table_name='logs')
    op.drop_table('logs')
