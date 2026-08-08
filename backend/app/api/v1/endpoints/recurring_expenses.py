from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.recurring_expense import RecurringExpense
from app.schemas.recurring_expense import (
    RecurringExpenseCreate,
    RecurringExpenseResponse
)
from app.core.dependencies import get_current_user


router = APIRouter(
    tags=["Recurring Expenses"]
)


# =========================================================
# CREATE RECURRING EXPENSE
# =========================================================

@router.post(
    "/",
    response_model=RecurringExpenseResponse
)
def create_recurring_expense(
    expense: RecurringExpenseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    recurring = RecurringExpense(
        title=expense.title,
        amount=expense.amount,
        frequency=expense.frequency,
        next_date=expense.next_date,
        user_id=current_user.id
    )

    db.add(recurring)
    db.commit()
    db.refresh(recurring)

    return recurring


# =========================================================
# GET RECURRING EXPENSES
# =========================================================

@router.get(
    "/",
    response_model=list[RecurringExpenseResponse]
)
def get_recurring_expenses(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    recurring_expenses = db.query(
        RecurringExpense
    ).filter(
        RecurringExpense.user_id == current_user.id
    ).all()

    return recurring_expenses


# =========================================================
# DELETE RECURRING EXPENSE
# =========================================================

@router.delete("/{expense_id}")
def delete_recurring_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    recurring = db.query(
        RecurringExpense
    ).filter(
        RecurringExpense.id == expense_id,
        RecurringExpense.user_id == current_user.id
    ).first()

    if not recurring:
        raise HTTPException(
            status_code=404,
            detail="Recurring expense not found"
        )

    db.delete(recurring)
    db.commit()

    return {
        "message": "Recurring expense deleted successfully"
    }