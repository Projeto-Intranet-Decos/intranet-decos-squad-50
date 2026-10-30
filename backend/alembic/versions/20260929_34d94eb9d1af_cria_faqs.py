"""cria faqs

Revision ID: 34d94eb9d1af
Revises: a8c3e6f9b1d2
Create Date: 2026-09-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34d94eb9d1af'
down_revision: Union[str, Sequence[str], None] = 'a8c3e6f9b1d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('faqs',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('pergunta', sa.String(length=500), nullable=False),
    sa.Column('resposta', sa.Text(), nullable=False),
    sa.Column('autor_id', sa.Uuid(), nullable=False),
    sa.Column('setor_id', sa.Uuid(), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['autor_id'], ['usuarios.id'], name=op.f('fk_faqs_autor_id_usuarios')),
    sa.ForeignKeyConstraint(['setor_id'], ['setores.id'], name=op.f('fk_faqs_setor_id_setores')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_faqs'))
    )
    op.create_index(op.f('ix_faqs_autor_id'), 'faqs', ['autor_id'], unique=False)
    op.create_index(op.f('ix_faqs_setor_id'), 'faqs', ['setor_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_faqs_setor_id'), table_name='faqs')
    op.drop_index(op.f('ix_faqs_autor_id'), table_name='faqs')
    op.drop_table('faqs')
