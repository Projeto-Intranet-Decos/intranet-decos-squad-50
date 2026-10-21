"""convite por magic link: senha opcional e tokens_uso_unico

Revision ID: d2f4a6c8e0b1
Revises: c9e1f3a5b7d2
Create Date: 2026-10-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2f4a6c8e0b1'
down_revision: Union[str, Sequence[str], None] = 'c9e1f3a5b7d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Usuário convidado fica sem senha até ativar a conta (AUT-09).
    op.alter_column('usuarios', 'senha_hash', existing_type=sa.String(length=255), nullable=True)
    op.create_table('tokens_uso_unico',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('usuario_id', sa.Uuid(), nullable=False),
    sa.Column('finalidade', sa.String(length=30), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('expira_em', sa.DateTime(timezone=True), nullable=False),
    sa.Column('usado_em', sa.DateTime(timezone=True), nullable=True),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint(
        "finalidade IN ('convite', 'redefinicao_senha')", name='ck_tokens_uso_unico_finalidade'
    ),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], name='fk_tokens_uso_unico_usuario_id_usuarios'),
    sa.PrimaryKeyConstraint('id', name='pk_tokens_uso_unico'),
    sa.UniqueConstraint('token_hash', name='uq_tokens_uso_unico_token_hash')
    )
    op.create_index('ix_tokens_uso_unico_usuario_id', 'tokens_uso_unico', ['usuario_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_tokens_uso_unico_usuario_id', table_name='tokens_uso_unico')
    op.drop_table('tokens_uso_unico')
    # Pendentes não têm senha nem conteúdo próprio: sem eles o NOT NULL volta a valer.
    op.execute(
        "DELETE FROM tokens_atualizacao WHERE usuario_id IN "
        "(SELECT id FROM usuarios WHERE senha_hash IS NULL)"
    )
    op.execute("DELETE FROM usuarios WHERE senha_hash IS NULL")
    op.alter_column('usuarios', 'senha_hash', existing_type=sa.String(length=255), nullable=False)
