"""renomeia categoria de aviso evento para convite

Revision ID: e5f8b2c3d4a1
Revises: d4e7a1b9c2f3
Create Date: 2026-09-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e5f8b2c3d4a1'
down_revision: Union[str, Sequence[str], None] = 'd4e7a1b9c2f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f('ck_avisos_categoria'), 'avisos', type_='check')
    op.execute("UPDATE avisos SET categoria = 'convite' WHERE categoria = 'evento'")
    op.create_check_constraint(
        op.f('ck_avisos_categoria'), 'avisos', "categoria IN ('comunicado', 'promocao', 'convite')"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('ck_avisos_categoria'), 'avisos', type_='check')
    op.execute("UPDATE avisos SET categoria = 'evento' WHERE categoria = 'convite'")
    op.create_check_constraint(
        op.f('ck_avisos_categoria'), 'avisos', "categoria IN ('comunicado', 'promocao', 'evento')"
    )
