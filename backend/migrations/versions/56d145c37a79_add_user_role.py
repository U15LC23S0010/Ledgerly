"""add user role

Revision ID: 56d145c37a79
Revises: e8d0aaea2e91
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "56d145c37a79"
down_revision: Union[str, Sequence[str], None] = "e8d0aaea2e91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add role with a temporary server default
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(),
            nullable=False,
            server_default="user"
        )
    )

    # Remove the temporary default
    op.alter_column(
        "users",
        "role",
        server_default=None
    )


def downgrade() -> None:
    op.drop_column("users", "role")