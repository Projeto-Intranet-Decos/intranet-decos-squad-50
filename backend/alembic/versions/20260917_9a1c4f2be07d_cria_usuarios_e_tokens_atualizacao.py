"""cria usuarios e tokens_atualizacao

Revision ID: 9a1c4f2be07d
Revises: 7c41ba823b98
Create Date: 2026-09-17 10:12:04.331207

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a1c4f2be07d'
down_revision: Union[str, Sequence[str], None] = '7c41ba823b98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('usuarios',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('nome', sa.String(length=200), nullable=False),
    sa.Column('email', sa.String(length=200), nullable=False),
    sa.Column('senha_hash', sa.String(length=255), nullable=False),
    sa.Column('role', sa.String(length=20), server_default='comum', nullable=False),
    sa.Column('setor_id', sa.Uuid(), nullable=True),
    sa.Column('data_nascimento', sa.Date(), nullable=True),
    sa.Column('ativo', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint(
        "role IN ('comum', 'admin_setor', 'superadmin')", name=op.f('ck_usuarios_role')
    ),
    sa.ForeignKeyConstraint(['setor_id'], ['setores.id'], name=op.f('fk_usuarios_setor_id_setores')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_usuarios')),
    sa.UniqueConstraint('email', name=op.f('uq_usuarios_email'))
    )
    op.create_index(op.f('ix_usuarios_setor_id'), 'usuarios', ['setor_id'], unique=False)
    op.create_table('tokens_atualizacao',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('usuario_id', sa.Uuid(), nullable=False),
    sa.Column('token_hash', sa.String(length=255), nullable=False),
    sa.Column('expira_em', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revogado', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], name=op.f('fk_tokens_atualizacao_usuario_id_usuarios')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_tokens_atualizacao')),
    sa.UniqueConstraint('token_hash', name=op.f('uq_tokens_atualizacao_token_hash'))
    )
    op.create_index(op.f('ix_tokens_atualizacao_usuario_id'), 'tokens_atualizacao', ['usuario_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_tokens_atualizacao_usuario_id'), table_name='tokens_atualizacao')
    op.drop_table('tokens_atualizacao')
    op.drop_index(op.f('ix_usuarios_setor_id'), table_name='usuarios')
    op.drop_table('usuarios')
