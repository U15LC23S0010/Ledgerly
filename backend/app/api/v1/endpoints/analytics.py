from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.expense import Expense
from app.models.category import Category
from app.core.dependencies import get_current_user


router = APIRouter()


# =========================================================
# EXPENSE SUMMARY
# =========================================================

@router.get("/summary")
def expense_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    total_expenses = db.query(
        func.count(Expense.id)
    ).filter(
        Expense.user_id == current_user.id
    ).scalar()

    total_amount = db.query(
        func.sum(Expense.amount)
    ).filter(
        Expense.user_id == current_user.id
    ).scalar()

    average_amount = db.query(
        func.avg(Expense.amount)
    ).filter(
        Expense.user_id == current_user.id
    ).scalar()

    highest_expense = db.query(
        func.max(Expense.amount)
    ).filter(
        Expense.user_id == current_user.id
    ).scalar()

    lowest_expense = db.query(
        func.min(Expense.amount)
    ).filter(
        Expense.user_id == current_user.id
    ).scalar()

    return {
        "total_expenses": total_expenses or 0,
        "total_amount": total_amount or 0,
        "average_expense": round(average_amount or 0, 2),
        "highest_expense": highest_expense or 0,
        "lowest_expense": lowest_expense or 0
    }


# =========================================================
# CATEGORY SUMMARY
# =========================================================

@router.get("/category-summary")
def category_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    results = (
        db.query(
            Category.name,
            func.sum(Expense.amount).label("total")
        )
        .join(
            Expense,
            Expense.category_id == Category.id
        )
        .filter(
            Expense.user_id == current_user.id
        )
        .group_by(
            Category.name
        )
        .order_by(
            func.sum(Expense.amount).desc()
        )
        .all()
    )

    return [
        {
            "category": category,
            "total": total
        }
        for category, total in results
    ]


# =========================================================
# MONTHLY SUMMARY
# =========================================================

@router.get("/monthly-summary")
def monthly_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    results = (
        db.query(
            func.extract(
                "month",
                Expense.date
            ).label("month"),
            func.sum(
                Expense.amount
            ).label("total")
        )
        .filter(
            Expense.user_id == current_user.id
        )
        .group_by(
            func.extract(
                "month",
                Expense.date
            )
        )
        .order_by(
            func.extract(
                "month",
                Expense.date
            )
        )
        .all()
    )

    return [
        {
            "month": int(month),
            "total": total
        }
        for month, total in results
    ]