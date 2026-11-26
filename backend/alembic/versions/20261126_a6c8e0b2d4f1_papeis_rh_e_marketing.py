"""papeis rh e marketing

Revision ID: a6c8e0b2d4f1
Revises: f3a5c7e9b1d4
Create Date: 2026-11-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a6c8e0b2d4f1'
down_revision: Union[str, Sequence[str], None] = 'f3a5c7e9b1d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f('ck_usuarios_role'), 'usuarios', type_='check')
    op.create_check_constraint(
        op.f('ck_usuarios_role'),
        'usuarios',
        "role IN ('comum', 'admin_setor', 'superadmin', 'rh', 'marketing')",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE usuarios SET role = 'comum' WHERE role IN ('rh', 'marketing')")
    op.drop_constraint(op.f('ck_usuarios_role'), 'usuarios', type_='check')
    op.create_check_constraint(
        op.f('ck_usuarios_role'),
        'usuarios',
        "role IN ('comum', 'admin_setor', 'superadmin')",
    )
