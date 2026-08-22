from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db

from app.models.user import User
from app.models.transaction import Transaction
from app.models.expense import Expense
from app.models.account import Account

from app.core.dependencies import get_current_user


router = APIRouter()


# =========================================================
# REPORT SUMMARY
# =========================================================

@router.get("/reports/summary")
def get_report_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Return financial summary for the logged-in user.
    """

    # -----------------------------------------------------
    # TOTAL INCOME
    # -----------------------------------------------------

    total_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "income"
        )
        .scalar()
    )

    # -----------------------------------------------------
    # TRANSACTION EXPENSES
    # -----------------------------------------------------

    transaction_expenses = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "expense"
        )
        .scalar()
    )

    # -----------------------------------------------------
    # EXPENSE RECORDS
    # -----------------------------------------------------

    expense_records = (
        db.query(func.coalesce(func.sum(Expense.amount), 0))
        .filter(
            Expense.user_id == current_user.id
        )
        .scalar()
    )

    # -----------------------------------------------------
    # TOTAL EXPENSES
    # -----------------------------------------------------

    total_expenses = (
        transaction_expenses
        if transaction_expenses > 0
        else expense_records
    )

    # -----------------------------------------------------
    # NET RESULT
    # -----------------------------------------------------

    net_result = total_income - total_expenses

    # -----------------------------------------------------
    # ACCOUNT COUNT
    # -----------------------------------------------------

    account_count = (
        db.query(Account)
        .filter(
            Account.user_id == current_user.id
        )
        .count()
    )

    # -----------------------------------------------------
    # TRANSACTION COUNT
    # -----------------------------------------------------

    transaction_count = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id
        )
        .count()
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "total_income": float(total_income or 0),
        "total_expenses": float(total_expenses or 0),
        "net_result": float(net_result or 0),
        "account_count": account_count,
        "transaction_count": transaction_count
    }
