"""cria documentos

Revision ID: e5a7c9d2f4b6
Revises: d4e7a1b9c2f3
Create Date: 2026-09-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5a7c9d2f4b6'
down_revision: Union[str, Sequence[str], None] = 'd4e7a1b9c2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('documentos',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('titulo', sa.String(length=200), nullable=False),
    sa.Column('descricao', sa.Text(), nullable=True),
    sa.Column('categoria', sa.String(length=20), server_default='outro', nullable=False),
    sa.Column('nome_arquivo', sa.String(length=255), nullable=False),
    sa.Column('tipo_conteudo', sa.String(length=150), nullable=False),
    sa.Column('tamanho_bytes', sa.BigInteger(), nullable=False),
    sa.Column('chave_armazenamento', sa.String(length=500), nullable=False),
    sa.Column('autor_id', sa.Uuid(), nullable=False),
    sa.Column('setor_id', sa.Uuid(), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint(
        "categoria IN ('pop', 'protocolo', 'manual', 'formulario', 'outro')",
        name='ck_documentos_categoria',
    ),
    sa.ForeignKeyConstraint(['autor_id'], ['usuarios.id'], name=op.f('fk_documentos_autor_id_usuarios')),
    sa.ForeignKeyConstraint(['setor_id'], ['setores.id'], name=op.f('fk_documentos_setor_id_setores')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_documentos')),
    sa.UniqueConstraint('chave_armazenamento', name=op.f('uq_documentos_chave_armazenamento'))
    )
    op.create_index(op.f('ix_documentos_autor_id'), 'documentos', ['autor_id'], unique=False)
    op.create_index(op.f('ix_documentos_setor_id'), 'documentos', ['setor_id'], unique=False)
    op.create_index(op.f('ix_documentos_categoria'), 'documentos', ['categoria'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_documentos_categoria'), table_name='documentos')
    op.drop_index(op.f('ix_documentos_setor_id'), table_name='documentos')
    op.drop_index(op.f('ix_documentos_autor_id'), table_name='documentos')
    op.drop_table('documentos')
