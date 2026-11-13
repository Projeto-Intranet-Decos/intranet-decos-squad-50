"""email de usuario em minusculas

Revision ID: e3b5d7f9a1c2
Revises: d2f4a6c8e0b1
Create Date: 2026-10-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3b5d7f9a1c2'
down_revision: Union[str, Sequence[str], None] = 'd2f4a6c8e0b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conexao = op.get_bind()
    # Maria@x e maria@x passam a ser a mesma conta (USU-02). Se as duas já existem, a migration
    # para aqui: um humano decide qual fica, em vez de o UPDATE falhar no meio com erro genérico.
    duplicados = conexao.execute(
        sa.text(
            "SELECT lower(email) FROM usuarios GROUP BY lower(email) HAVING count(*) > 1"
        )
    ).scalars().all()
    if duplicados:
        raise RuntimeError(
            "E-mails que só diferem em maiúsculas; resolva antes de migrar: " + ", ".join(duplicados)
        )
    op.execute("UPDATE usuarios SET email = lower(email) WHERE email <> lower(email)")
    op.create_check_constraint('ck_usuarios_email_minusculo', 'usuarios', 'email = lower(email)')


def downgrade() -> None:
    """Downgrade schema."""
    # Os e-mails continuam em minúsculas: o valor original não foi guardado.
    op.drop_constraint('ck_usuarios_email_minusculo', 'usuarios', type_='check')
