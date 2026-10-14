"""eventos viram avisos de categoria evento

Revision ID: b7e2d4f6a8c1
Revises: 34d94eb9d1af
Create Date: 2026-10-09 00:00:00.000000

O módulo calendario foi absorvido pelo mural (docs/specs/calendario.md): cada linha de `eventos`
vira um aviso de categoria `evento`, com o mesmo id, e a tabela `eventos` some. A categoria
`convite` deixa de existir; como convite não tem data, os convites viram `comunicado`.

O downgrade tem perda: comunicado que era convite não volta a ser convite, e os avisos-evento
voltam para `eventos` sem capa, anexos e fixado (as linhas de anexo são apagadas e os objetos
no MinIO ficam órfãos).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2d4f6a8c1'
down_revision: Union[str, Sequence[str], None] = '34d94eb9d1af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('avisos', sa.Column('data_inicio', sa.DateTime(timezone=True), nullable=True))
    op.add_column('avisos', sa.Column('data_fim', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_avisos_data_inicio'), 'avisos', ['data_inicio'], unique=False)
    op.alter_column('avisos', 'conteudo', existing_type=sa.Text(), nullable=True)

    op.drop_constraint(op.f('ck_avisos_categoria'), 'avisos', type_='check')
    op.execute("UPDATE avisos SET categoria = 'comunicado' WHERE categoria = 'convite'")
    op.execute(
        """
        INSERT INTO avisos (
            id, titulo, conteudo, categoria, data_inicio, data_fim, fixado,
            autor_id, setor_id, criado_em
        )
        SELECT
            id, titulo, NULLIF(btrim(descricao), ''), 'evento', data_inicio, data_fim, false,
            autor_id, setor_id, criado_em
        FROM eventos
        """
    )
    op.create_check_constraint(
        op.f('ck_avisos_categoria'), 'avisos', "categoria IN ('comunicado', 'promocao', 'evento')"
    )
    op.create_check_constraint(
        op.f('ck_avisos_evento_tem_data'), 'avisos',
        "(categoria = 'evento') = (data_inicio IS NOT NULL)",
    )
    op.create_check_constraint(
        op.f('ck_avisos_data_fim_valida'), 'avisos',
        "data_fim IS NULL OR (data_inicio IS NOT NULL AND data_fim >= data_inicio)",
    )
    op.create_check_constraint(
        op.f('ck_avisos_conteudo_fora_de_evento'), 'avisos',
        "categoria = 'evento' OR conteudo IS NOT NULL",
    )

    op.drop_index(op.f('ix_eventos_setor_id'), table_name='eventos')
    op.drop_index(op.f('ix_eventos_autor_id'), table_name='eventos')
    op.drop_table('eventos')


def downgrade() -> None:
    """Downgrade schema."""
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

    op.execute(
        """
        INSERT INTO eventos (id, titulo, descricao, data_inicio, data_fim, autor_id, setor_id, criado_em)
        SELECT id, titulo, conteudo, data_inicio, data_fim, autor_id, setor_id, criado_em
        FROM avisos
        WHERE categoria = 'evento'
        """
    )
    # A FK de anexos_aviso tem ON DELETE CASCADE: os anexos somem junto.
    op.execute("DELETE FROM avisos WHERE categoria = 'evento'")

    op.drop_constraint(op.f('ck_avisos_conteudo_fora_de_evento'), 'avisos', type_='check')
    op.drop_constraint(op.f('ck_avisos_data_fim_valida'), 'avisos', type_='check')
    op.drop_constraint(op.f('ck_avisos_evento_tem_data'), 'avisos', type_='check')
    op.drop_constraint(op.f('ck_avisos_categoria'), 'avisos', type_='check')
    op.create_check_constraint(
        op.f('ck_avisos_categoria'), 'avisos', "categoria IN ('comunicado', 'promocao', 'convite')"
    )

    op.alter_column('avisos', 'conteudo', existing_type=sa.Text(), nullable=False)
    op.drop_index(op.f('ix_avisos_data_inicio'), table_name='avisos')
    op.drop_column('avisos', 'data_fim')
    op.drop_column('avisos', 'data_inicio')
