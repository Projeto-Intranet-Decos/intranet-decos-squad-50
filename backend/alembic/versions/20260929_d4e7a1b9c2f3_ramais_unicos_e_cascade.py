"""ramais unicos por setor e cascade na remocao do setor

Revision ID: d4e7a1b9c2f3
Revises: c3d8e5f1a2b7
Create Date: 2026-09-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd4e7a1b9c2f3'
down_revision: Union[str, Sequence[str], None] = 'c3d8e5f1a2b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint('uq_ramais_setor_id_numero', 'ramais', ['setor_id', 'numero'])
    op.drop_constraint('fk_ramais_setor_id_setores', 'ramais', type_='foreignkey')
    op.create_foreign_key(
        'fk_ramais_setor_id_setores', 'ramais', 'setores', ['setor_id'], ['id'], ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_ramais_setor_id_setores', 'ramais', type_='foreignkey')
    op.create_foreign_key('fk_ramais_setor_id_setores', 'ramais', 'setores', ['setor_id'], ['id'])
    op.drop_constraint('uq_ramais_setor_id_numero', 'ramais', type_='unique')
