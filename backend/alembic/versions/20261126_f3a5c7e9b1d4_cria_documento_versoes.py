"""cria documento_versoes

Revision ID: f3a5c7e9b1d4
Revises: d2f4a6c8e0b1
Create Date: 2026-11-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a5c7e9b1d4'
down_revision: Union[str, Sequence[str], None] = 'd2f4a6c8e0b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('documentos', sa.Column('versao', sa.Integer(), server_default='1', nullable=False))
    op.create_table('documento_versoes',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('documento_id', sa.Uuid(), nullable=False),
    sa.Column('numero', sa.Integer(), nullable=False),
    sa.Column('nome_arquivo', sa.String(length=255), nullable=False),
    sa.Column('tipo_conteudo', sa.String(length=150), nullable=False),
    sa.Column('tamanho_bytes', sa.BigInteger(), nullable=False),
    sa.Column('chave_armazenamento', sa.String(length=500), nullable=False),
    sa.Column('alteracao', sa.String(length=500), nullable=True),
    sa.Column('autor_id', sa.Uuid(), nullable=False),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['autor_id'], ['usuarios.id'], name=op.f('fk_documento_versoes_autor_id_usuarios')),
    sa.ForeignKeyConstraint(['documento_id'], ['documentos.id'], name=op.f('fk_documento_versoes_documento_id_documentos'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_documento_versoes')),
    sa.UniqueConstraint('chave_armazenamento', name=op.f('uq_documento_versoes_chave_armazenamento')),
    sa.UniqueConstraint('documento_id', 'numero', name='uq_documento_versoes_numero'),
    )
    op.create_index(op.f('ix_documento_versoes_autor_id'), 'documento_versoes', ['autor_id'], unique=False)
    op.create_index(op.f('ix_documento_versoes_documento_id'), 'documento_versoes', ['documento_id'], unique=False)
    # Documentos que já existem viram a versão 1, com os dados atuais.
    op.execute(
        """
        INSERT INTO documento_versoes
          (id, documento_id, numero, nome_arquivo, tipo_conteudo, tamanho_bytes,
           chave_armazenamento, autor_id, criado_em)
        SELECT gen_random_uuid(), id, 1, nome_arquivo, tipo_conteudo, tamanho_bytes,
               chave_armazenamento, autor_id, criado_em
        FROM documentos
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_documento_versoes_documento_id'), table_name='documento_versoes')
    op.drop_index(op.f('ix_documento_versoes_autor_id'), table_name='documento_versoes')
    op.drop_table('documento_versoes')
    op.drop_column('documentos', 'versao')
