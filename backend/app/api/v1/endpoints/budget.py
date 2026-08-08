from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.budget import Budget
from app.models.expense import Expense
from app.schemas.budget import BudgetCreate
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/budget",
    tags=["Budget"]
)


# =========================================================
# CREATE / UPDATE BUDGET
# =========================================================

@router.post("/")
def set_budget(
    budget: BudgetCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Check existing budget
    existing_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id
    ).first()

    if existing_budget:
        existing_budget.monthly_budget = budget.monthly_budget

        db.commit()
        db.refresh(existing_budget)

        return {
            "message": "Budget Updated Successfully",
            "budget": existing_budget
        }

    # Create new budget
    new_budget = Budget(
        monthly_budget=budget.monthly_budget,
        user_id=current_user.id
    )

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)

    return {
        "message": "Budget Created Successfully",
        "budget": new_budget
    }


# =========================================================
# GET BUDGET
# =========================================================

@router.get("/")
def get_budget(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        return {
            "message": "No budget found"
        }

    return {
        "id": budget.id,
        "monthly_budget": budget.monthly_budget,
        "user_id": budget.user_id
    }


# =========================================================
# BUDGET STATUS
# =========================================================

@router.get("/status")
def budget_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        return {
            "message": "No budget found"
        }

    # Calculate total spending
    spent = db.query(
        func.sum(Expense.amount)
    ).filter(
        Expense.user_id == current_user.id
    ).scalar() or 0

    remaining = budget.monthly_budget - spent

    used_percentage = (
        (spent / budget.monthly_budget) * 100
        if budget.monthly_budget > 0
        else 0
    )

    return {
        "monthly_budget": budget.monthly_budget,
        "spent": spent,
        "remaining": remaining,
        "used_percentage": round(
            used_percentage,
            2
        )
    }


# =========================================================
# DELETE BUDGET
# =========================================================

@router.delete("/")
def delete_budget(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    budget = db.query(Budget).filter(
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found"
        )

    db.delete(budget)
    db.commit()

    return {
        "message": "Budget Deleted Successfully"
    }