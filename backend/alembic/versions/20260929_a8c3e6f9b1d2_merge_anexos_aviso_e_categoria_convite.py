"""une anexos do aviso e categoria convite

Revision ID: a8c3e6f9b1d2
Revises: f7b9d1e3a5c8, e5f8b2c3d4a1
Create Date: 2026-09-29 00:00:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = 'a8c3e6f9b1d2'
down_revision: Union[str, Sequence[str], None] = ('f7b9d1e3a5c8', 'e5f8b2c3d4a1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
