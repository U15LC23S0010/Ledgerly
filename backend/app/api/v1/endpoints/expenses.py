from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import csv
import io

from app.db.session import get_db

from app.models.expense import Expense
from app.models.user import User
from app.models.category import Category
from app.models.budget import Budget

from app.schemas.expense import ExpenseCreate, ExpenseResponse

from app.core.dependencies import get_current_user


router = APIRouter(tags=["Expenses"])


# =========================================================
# CREATE EXPENSE
# =========================================================

@router.post("/")
def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Current user is already a User object
    user = current_user

    # Check category
    category = db.query(Category).filter(
        Category.id == expense.category_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    # Create expense
    new_expense = Expense(
        title=expense.title,
        amount=expense.amount,
        category_id=expense.category_id,
        date=expense.date,
        user_id=user.id
    )

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    # Check budget
    budget = db.query(Budget).filter(
        Budget.user_id == user.id
    ).first()

    warning = None

    if budget:
        total_spent = db.query(
            func.sum(Expense.amount)
        ).filter(
            Expense.user_id == user.id
        ).scalar() or 0

        if total_spent >= budget.monthly_budget:
            warning = "⚠️ Budget exceeded!"

        elif total_spent >= budget.monthly_budget * 0.8:
            warning = (
                "⚠️ You have used more than 80% "
                "of your monthly budget."
            )

    return {
        "message": "Expense Added Successfully",
        "expense": new_expense,
        "warning": warning
    }


# =========================================================
# GET EXPENSES
# =========================================================

@router.get("/", response_model=list[ExpenseResponse])
def get_expenses(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("date"),
    order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Expense).filter(
        Expense.user_id == current_user.id
    )

    # Allowed sorting fields
    if sort_by == "amount":
        column = Expense.amount
    elif sort_by == "title":
        column = Expense.title
    else:
        column = Expense.date

    if order.lower() == "asc":
        query = query.order_by(column.asc())
    else:
        query = query.order_by(column.desc())

    expenses = query.offset(
        (page - 1) * limit
    ).limit(limit).all()

    return expenses


# =========================================================
# SEARCH EXPENSES
# =========================================================

@router.get("/search", response_model=list[ExpenseResponse])
def search_expenses(
    keyword: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.title.ilike(f"%{keyword}%")
    ).order_by(
        Expense.date.desc()
    ).all()

    return expenses


# =========================================================
# UPDATE EXPENSE
# =========================================================

@router.put("/{expense_id}")
def update_expense(
    expense_id: int,
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check category
    category = db.query(Category).filter(
        Category.id == expense.category_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    # Find only the current user's expense
    db_expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()

    if not db_expense:
        raise HTTPException(
            status_code=404,
            detail="Expense not found"
        )

    # Update fields
    db_expense.title = expense.title
    db_expense.amount = expense.amount
    db_expense.category_id = expense.category_id
    db_expense.date = expense.date

    db.commit()
    db.refresh(db_expense)

    return {
        "message": "Expense Updated Successfully",
        "expense": db_expense
    }


# =========================================================
# DELETE EXPENSE
# =========================================================

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find only the current user's expense
    db_expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()

    if not db_expense:
        raise HTTPException(
            status_code=404,
            detail="Expense not found"
        )

    db.delete(db_expense)
    db.commit()

    return {
        "message": "Expense Deleted Successfully"
    }


# =========================================================
# FILTER EXPENSES
# =========================================================

@router.get("/filter", response_model=list[ExpenseResponse])
def filter_expenses(
    category_id: Optional[int] = Query(None, gt=0),
    min_amount: Optional[float] = Query(None, ge=0),
    max_amount: Optional[float] = Query(None, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate amount range
    if (
        min_amount is not None
        and max_amount is not None
        and min_amount > max_amount
    ):
        raise HTTPException(
            status_code=400,
            detail="min_amount cannot be greater than max_amount"
        )

    query = db.query(Expense).filter(
        Expense.user_id == current_user.id
    )

    # Category filter
    if category_id is not None:
        query = query.filter(
            Expense.category_id == category_id
        )

    # Minimum amount
    if min_amount is not None:
        query = query.filter(
            Expense.amount >= min_amount
        )

    # Maximum amount
    if max_amount is not None:
        query = query.filter(
            Expense.amount <= max_amount
        )

    return query.order_by(
        Expense.date.desc()
    ).all()


# =========================================================
# EXPORT EXPENSES AS CSV
# =========================================================

@router.get("/export/csv")
def export_expenses_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expenses = (
        db.query(Expense, Category.name)
        .join(
            Category,
            Expense.category_id == Category.id
        )
        .filter(
            Expense.user_id == current_user.id
        )
        .order_by(
            Expense.date.desc()
        )
        .all()
    )

    # Create CSV in memory
    output = io.StringIO()

    writer = csv.writer(output)

    # CSV header
    writer.writerow([
        "ID",
        "Title",
        "Amount",
        "Category",
        "Date"
    ])

    # CSV rows
    for expense, category_name in expenses:
        writer.writerow([
            expense.id,
            expense.title,
            expense.amount,
            category_name,
            expense.date
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                "attachment; filename=expenses.csv"
        }
    )