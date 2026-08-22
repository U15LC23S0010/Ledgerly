from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.db.database import get_db
from app.models.transaction import Transaction
from app.models.category import Category
from app.core.dependencies import get_current_user


router = APIRouter()


# =========================================================
# ANALYTICS SUMMARY
# =========================================================

@router.get("/summary")
def analytics_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # -----------------------------------------------------
    # TOTAL INCOME
    # -----------------------------------------------------

    total_income = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "income",
        )
        .scalar()
        or 0
    )

    # -----------------------------------------------------
    # TOTAL EXPENSES
    # -----------------------------------------------------

    total_expenses = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "expense",
        )
        .scalar()
        or 0
    )

    # -----------------------------------------------------
    # INCOME COUNT
    # -----------------------------------------------------

    income_count = (
        db.query(func.count(Transaction.id))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "income",
        )
        .scalar()
        or 0
    )

    # -----------------------------------------------------
    # EXPENSE COUNT
    # -----------------------------------------------------

    expense_count = (
        db.query(func.count(Transaction.id))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "expense",
        )
        .scalar()
        or 0
    )

    # -----------------------------------------------------
    # TOTAL TRANSACTIONS
    # -----------------------------------------------------

    transaction_count = (
        db.query(func.count(Transaction.id))
        .filter(
            Transaction.user_id == current_user.id,
        )
        .scalar()
        or 0
    )

    # -----------------------------------------------------
    # NET BALANCE
    # -----------------------------------------------------

    net_balance = (
        float(total_income)
        - float(total_expenses)
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "total_income": float(total_income),
        "total_expenses": float(total_expenses),
        "income_count": int(income_count),
        "expense_count": int(expense_count),
        "transaction_count": int(transaction_count),
        "balance": net_balance,
        "net_balance": net_balance,
    }


# =========================================================
# CATEGORY SUMMARY
# =========================================================

@router.get("/category-summary")
def category_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    results = (
        db.query(
            Category.id.label("category_id"),
            Category.name.label("category"),
            func.sum(
                Transaction.amount
            ).label("total"),
        )
        .join(
            Category,
            Transaction.category_id == Category.id,
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "expense",
            Transaction.category_id.isnot(None),
        )
        .group_by(
            Category.id,
            Category.name,
        )
        .order_by(
            func.sum(
                Transaction.amount
            ).desc()
        )
        .all()
    )

    return [
        {
            "category_id": int(category_id),
            "category": category_name,
            "total": float(total or 0),
        }
        for (
            category_id,
            category_name,
            total,
        ) in results
    ]


# =========================================================
# MONTHLY SUMMARY
# =========================================================

@router.get("/monthly-summary")
def monthly_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    results = (
        db.query(
            extract(
                "year",
                Transaction.date,
            ).label("year"),

            extract(
                "month",
                Transaction.date,
            ).label("month"),

            func.sum(
                Transaction.amount
            ).label("total"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "expense",
        )
        .group_by(
            extract(
                "year",
                Transaction.date,
            ),
            extract(
                "month",
                Transaction.date,
            ),
        )
        .order_by(
            extract(
                "year",
                Transaction.date,
            ),
            extract(
                "month",
                Transaction.date,
            ),
        )
        .all()
    )

    return [
        {
            "year": int(year),
            "month": int(month),
            "total": float(total or 0),
        }
        for year, month, total in results
    ]
