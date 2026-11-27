"""une o endurecimento OWASP e os papéis RH e Marketing

Revision ID: b7d9f1a3c5e2
Revises: f4c6e8a0b2d3, a6c8e0b2d4f1
Create Date: 2026-11-27 00:00:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = 'b7d9f1a3c5e2'
down_revision: Union[str, Sequence[str], None] = ('f4c6e8a0b2d3', 'a6c8e0b2d4f1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
