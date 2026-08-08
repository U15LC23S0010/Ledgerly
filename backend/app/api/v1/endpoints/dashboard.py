from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db

from app.models.user import User
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.category import Category

from app.core.dependencies import get_current_user


router = APIRouter(
    tags=["Dashboard"]
)


# =========================================================
# DASHBOARD
# =========================================================

@router.get("/")
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # -----------------------------------------------------
    # TOTAL EXPENSES
    # -----------------------------------------------------

    total_expenses = db.query(
        func.count(Expense.id)
    ).filter(
        Expense.user_id == current_user.id
    ).scalar() or 0


    # -----------------------------------------------------
    # TOTAL SPENDING
    # -----------------------------------------------------

    total_amount = db.query(
        func.sum(Expense.amount)
    ).filter(
        Expense.user_id == current_user.id
    ).scalar() or 0


    # -----------------------------------------------------
    # BUDGET
    # -----------------------------------------------------

    budget = db.query(Budget).filter(
        Budget.user_id == current_user.id
    ).first()

    monthly_budget = (
        budget.monthly_budget
        if budget
        else 0
    )


    # -----------------------------------------------------
    # REMAINING BUDGET
    # -----------------------------------------------------

    remaining = monthly_budget - total_amount


    # -----------------------------------------------------
    # BUDGET USAGE
    # -----------------------------------------------------

    used_percentage = (
        (total_amount / monthly_budget) * 100
        if monthly_budget > 0
        else 0
    )


    # -----------------------------------------------------
    # TOP CATEGORY
    # -----------------------------------------------------

    top_category = (
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
        .first()
    )


    # -----------------------------------------------------
    # HIGHEST EXPENSE
    # -----------------------------------------------------

    highest_expense = db.query(
        Expense
    ).filter(
        Expense.user_id == current_user.id
    ).order_by(
        Expense.amount.desc()
    ).first()


    # -----------------------------------------------------
    # RECENT EXPENSES
    # -----------------------------------------------------

    recent_expenses = db.query(
        Expense
    ).filter(
        Expense.user_id == current_user.id
    ).order_by(
        Expense.date.desc()
    ).limit(5).all()


    # -----------------------------------------------------
    # CATEGORY SUMMARY
    # -----------------------------------------------------

    category_summary = (
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


    # -----------------------------------------------------
    # RETURN DASHBOARD
    # -----------------------------------------------------

    return {
        "user": current_user.full_name,

        "total_expenses": total_expenses,

        "total_amount": total_amount,

        "monthly_budget": monthly_budget,

        "remaining_budget": remaining,

        "used_percentage": round(
            used_percentage,
            2
        ),

        "top_category": (
            top_category[0]
            if top_category
            else None
        ),

        "top_category_amount": (
            top_category[1]
            if top_category
            else 0
        ),

        "highest_expense": (
            {
                "title": highest_expense.title,
                "amount": highest_expense.amount,
                "date": highest_expense.date
            }
            if highest_expense
            else None
        ),

        "recent_expenses": [
            {
                "id": expense.id,
                "title": expense.title,
                "amount": expense.amount,
                "category_id": expense.category_id,
                "date": expense.date
            }
            for expense in recent_expenses
        ],

        "category_summary": [
            {
                "category": category,
                "total": total
            }
            for category, total in category_summary
        ]
    }