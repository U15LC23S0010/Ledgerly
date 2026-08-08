from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.expense import Expense
from app.models.category import Category
from app.core.dependencies import get_current_user

from app.services.auto_expense_service import parse_expense_text


router = APIRouter(
    prefix="/auto-expense",
    tags=["Auto Expense"]
)


# =========================================================
# CREATE EXPENSE FROM TEXT
# =========================================================

@router.post("/")
def create_auto_expense(
    text: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # -----------------------------------------------------
    # Validate text
    # -----------------------------------------------------

    if not text or not text.strip():
        raise HTTPException(
            status_code=400,
            detail="Expense text cannot be empty"
        )


    # -----------------------------------------------------
    # Parse expense text
    # -----------------------------------------------------

    try:
        data = parse_expense_text(text)

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not understand the expense text"
        )


    # -----------------------------------------------------
    # Validate parsed data
    # -----------------------------------------------------

    required_fields = [
        "title",
        "amount",
        "category",
        "date"
    ]

    for field in required_fields:
        if field not in data or data[field] is None:
            raise HTTPException(
                status_code=400,
                detail=f"Could not determine {field}"
            )


    # -----------------------------------------------------
    # Find category
    # -----------------------------------------------------

    category = db.query(Category).filter(
        Category.name.ilike(data["category"])
    ).first()


    # -----------------------------------------------------
    # Create category if it doesn't exist
    # -----------------------------------------------------

    if not category:
        category = Category(
            name=data["category"].title()
        )

        db.add(category)
        db.commit()
        db.refresh(category)


    # -----------------------------------------------------
    # Create expense
    # -----------------------------------------------------

    expense = Expense(
        title=data["title"],
        amount=data["amount"],
        category_id=category.id,
        date=data["date"],
        user_id=current_user.id
    )


    db.add(expense)
    db.commit()
    db.refresh(expense)


    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {
        "message": "Auto Expense Created Successfully",
        "expense_id": expense.id,
        "title": expense.title,
        "category": category.name,
        "amount": expense.amount,
        "date": expense.date
    }