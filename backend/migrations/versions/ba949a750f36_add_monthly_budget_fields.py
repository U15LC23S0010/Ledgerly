"""add monthly budget fields

Revision ID: ba949a750f36
Revises: 53b1eda660c8
Create Date: 2026-08-15
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ba949a750f36"
down_revision = "53b1eda660c8"
branch_labels = None
depends_on = None


def upgrade():
    # =====================================================
    # ADD NEW COLUMNS AS NULLABLE FIRST
    # =====================================================

    op.add_column(
        "budgets",
        sa.Column(
            "month",
            sa.Integer(),
            nullable=True
        )
    )

    op.add_column(
        "budgets",
        sa.Column(
            "year",
            sa.Integer(),
            nullable=True
        )
    )

    op.add_column(
        "budgets",
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True
        )
    )

    op.add_column(
        "budgets",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=True
        )
    )

    # =====================================================
    # FILL EXISTING BUDGET ROWS
    #
    # Your current existing budget is treated as the
    # current month's budget.
    # =====================================================

    op.execute(
        """
        UPDATE budgets
        SET
            month = EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
            year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
            created_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE month IS NULL
        """
    )

    # =====================================================
    # MAKE COLUMNS REQUIRED
    # =====================================================

    op.alter_column(
        "budgets",
        "month",
        existing_type=sa.Integer(),
        nullable=False
    )

    op.alter_column(
        "budgets",
        "year",
        existing_type=sa.Integer(),
        nullable=False
    )

    op.alter_column(
        "budgets",
        "created_at",
        existing_type=sa.DateTime(),
        nullable=False
    )

    op.alter_column(
        "budgets",
        "updated_at",
        existing_type=sa.DateTime(),
        nullable=False
    )

    # =====================================================
    # CHANGE MONEY TYPE
    # Float -> Numeric(12,2)
    # =====================================================

    op.alter_column(
        "budgets",
        "monthly_budget",
        existing_type=sa.DOUBLE_PRECISION(),
        type_=sa.Numeric(
            precision=12,
            scale=2
        ),
        existing_nullable=False
    )

    # =====================================================
    # USER_ID
    # =====================================================

    op.alter_column(
        "budgets",
        "user_id",
        existing_type=sa.INTEGER(),
        nullable=False
    )

    # =====================================================
    # REMOVE OLD UNIQUE USER CONSTRAINT
    #
    # Previously one user could only have one budget.
    # Now a user can have one budget per month.
    # =====================================================

    op.drop_constraint(
        "budgets_user_id_key",
        "budgets",
        type_="unique"
    )

    # =====================================================
    # ADD USER INDEX
    # =====================================================

    op.create_index(
        "ix_budgets_user_id",
        "budgets",
        ["user_id"],
        unique=False
    )

    # =====================================================
    # UNIQUE USER + MONTH + YEAR
    # =====================================================

    op.create_unique_constraint(
        "uq_user_budget_month_year",
        "budgets",
        [
            "user_id",
            "month",
            "year"
        ]
    )


def downgrade():

    # =====================================================
    # REMOVE NEW CONSTRAINT
    # =====================================================

    op.drop_constraint(
        "uq_user_budget_month_year",
        "budgets",
        type_="unique"
    )

    # =====================================================
    # REMOVE INDEX
    # =====================================================

    op.drop_index(
        "ix_budgets_user_id",
        table_name="budgets"
    )

    # =====================================================
    # RESTORE OLD USER UNIQUE CONSTRAINT
    # =====================================================

    op.create_unique_constraint(
        "budgets_user_id_key",
        "budgets",
        ["user_id"]
    )

    # =====================================================
    # RESTORE FLOAT
    # =====================================================

    op.alter_column(
        "budgets",
        "monthly_budget",
        existing_type=sa.Numeric(
            precision=12,
            scale=2
        ),
        type_=sa.DOUBLE_PRECISION(),
        existing_nullable=False
    )

    # =====================================================
    # REMOVE NEW COLUMNS
    # =====================================================

    op.drop_column(
        "budgets",
        "updated_at"
    )

    op.drop_column(
        "budgets",
        "created_at"
    )

    op.drop_column(
        "budgets",
        "year"
    )

    op.drop_column(
        "budgets",
        "month"
    )