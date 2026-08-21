"""add accounts table

Revision ID: 21e86b263534
Revises: 56d145c37a79
Create Date: 2026-08-09 10:56:06.448447

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "21e86b263534"
down_revision: Union[str, Sequence[str], None] = "56d145c37a79"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create accounts table."""

    op.create_table(
        "accounts",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False
        ),

        sa.Column(
            "name",
            sa.String(),
            nullable=False
        ),

        sa.Column(
            "account_type",
            sa.String(),
            nullable=False
        ),

        sa.Column(
            "balance",
            sa.Float(),
            nullable=False,
            server_default="0.0"
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False
        )
    )

    op.create_index(
        "ix_accounts_id",
        "accounts",
        ["id"],
        unique=False
    )


def downgrade() -> None:
    """Remove accounts table."""

    op.drop_index(
        "ix_accounts_id",
        table_name="accounts"
    )

    op.drop_table("accounts")