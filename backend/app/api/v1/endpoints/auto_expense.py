from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.expense import Expense
from app.models.category import Category
from app.core.dependencies import get_current_user

from app.services.auto_expense_service import parse_expense_text
from app.utils.money_utils import money_to_float


router = APIRouter(
    prefix="/auto-expense",
    tags=["Auto Expense"]
)


# =========================================================
# REQUEST SCHEMA
# =========================================================

class AutoExpenseRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="Natural language expense description"
    )

    auto_create: bool = True


# =========================================================
# CATEGORY HELPERS
# =========================================================

def normalize_category_name(name: str) -> str:
    """
    Normalize category names for comparison.
    """

    return (
        str(name)
        .strip()
        .lower()
        .replace("_", " ")
        .replace("-", " ")
    )


def find_category(
    db: Session,
    category_name: str
):
    """
    Find an existing category.
    """

    if not category_name:
        return None

    normalized = normalize_category_name(
        category_name
    )

    categories = db.query(Category).all()

    for category in categories:

        if normalize_category_name(
            category.name
        ) == normalized:
            return category

    return None


def create_category(
    db: Session,
    category_name: str
):
    """
    Create category if it does not exist.
    """

    existing = find_category(
        db,
        category_name
    )

    if existing:
        return existing

    category = Category(
        name=category_name.strip().title()
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


# =========================================================
# DUPLICATE DETECTION
# =========================================================

def detect_duplicate(
    db: Session,
    current_user,
    amount,
    transaction_date,
    title
):
    """
    Detect a similar expense belonging to
    the current user.
    """

    if not amount or not transaction_date:
        return None

    try:
        amount_decimal = Decimal(
            str(amount)
        )

    except Exception:
        return None

    start_date = (
        transaction_date -
        timedelta(days=1)
    )

    end_date = (
        transaction_date +
        timedelta(days=1)
    )

    expenses = (
        db.query(Expense)
        .filter(
            Expense.user_id == current_user.id,
            Expense.amount == amount_decimal,
            Expense.date >= start_date,
            Expense.date <= end_date
        )
        .all()
    )

    normalized_title = (
        str(title or "")
        .strip()
        .lower()
    )

    for expense in expenses:

        existing_title = (
            str(expense.title or "")
            .strip()
            .lower()
        )

        if (
            normalized_title
            and existing_title
            and (
                normalized_title in existing_title
                or existing_title in normalized_title
            )
        ):
            return expense

    return None


# =========================================================
# VALIDATE PARSER RESULT
# =========================================================

def validate_ai_result(data):
    """
    Validate structured data returned
    by the expense parser.
    """

    if not isinstance(data, dict):

        raise HTTPException(
            status_code=400,
            detail="Invalid expense data returned by parser."
        )

    required_fields = [
        "title",
        "amount",
        "category",
        "date"
    ]

    missing_fields = [
        field
        for field in required_fields
        if data.get(field) in (None, "")
    ]

    if missing_fields:

        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "Could not understand the "
                    "expense completely."
                ),
                "missing_fields": missing_fields
            }
        )

    try:

        amount = Decimal(
            str(data["amount"])
        )

        if amount <= 0:
            raise ValueError

    except Exception:

        raise HTTPException(
            status_code=422,
            detail=(
                "Could not determine a valid "
                "expense amount."
            )
        )

    return True


# =========================================================
# NORMALIZE DATE
# =========================================================

def normalize_transaction_date(
    transaction_date
):
    """
    Convert parser date into Python date.
    """

    if isinstance(
        transaction_date,
        datetime
    ):
        return transaction_date.date()

    if isinstance(
        transaction_date,
        date
    ):
        return transaction_date

    if isinstance(
        transaction_date,
        str
    ):

        try:
            return datetime.fromisoformat(
                transaction_date
            ).date()

        except ValueError:
            pass

        try:
            return date.fromisoformat(
                transaction_date
            )

        except ValueError:
            raise HTTPException(
                status_code=422,
                detail="Invalid expense date."
            )

    raise HTTPException(
        status_code=422,
        detail="Invalid expense date."
    )


def get_confidence(data) -> float:
    """
    Get confidence returned by parser.

    Older versions of the parser did not return
    confidence, so this function calculates a
    fallback value.
    """

    existing_confidence = data.get(
        "confidence"
    )

    if existing_confidence is not None:

        try:

            confidence = float(
                existing_confidence
            )

            return round(
                max(
                    0.0,
                    min(
                        confidence,
                        1.0
                    )
                ),
                2
            )

        except (
            ValueError,
            TypeError
        ):
            pass

    # -----------------------------------------------------
    # Fallback confidence
    # -----------------------------------------------------

    confidence = 0.0

    if data.get("amount") is not None:
        confidence += 0.35

    if (
        data.get("category")
        and data.get("category") != "Other"
    ):
        confidence += 0.30

    if data.get("date") is not None:
        confidence += 0.20

    if (
        data.get("title")
        and data.get("title") != "Expense"
    ):
        confidence += 0.15

    return round(
        min(confidence, 1.0),
        2
    )


# =========================================================
# PREVIEW AUTO EXPENSE
# =========================================================

@router.post("/preview")
def preview_auto_expense(
    request: AutoExpenseRequest,
    current_user=Depends(get_current_user)
):
    """
    Parse an expense without saving it.

    Example:

    {
        "text": "I spent ₹500 on pizza yesterday"
    }
    """

    text = request.text.strip()

    if not text:

        raise HTTPException(
            status_code=400,
            detail="Expense text cannot be empty."
        )

    try:

        data = parse_expense_text(
            text
        )

    except Exception as exc:

        print(
            "AUTO EXPENSE PREVIEW ERROR:",
            exc
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Could not understand the "
                "expense text."
            )
        )

    validate_ai_result(data)

    confidence = get_confidence(
        data
    )

    return {
        "success": True,
        "mode": "preview",
        "original_text": text,

        "expense": {
            "title": data.get("title"),
            "amount": float(
                data.get("amount")
            ),
            "category": data.get("category"),
            "date": data.get("date"),
        },

        "confidence": confidence,

        "ai": {
            "confidence": confidence,

            "reason": data.get(
                "reason",
                "Expense extracted from natural language."
            ),

            "suggestions": data.get(
                "suggestions",
                []
            )
        }
    }


# =========================================================
# CREATE AUTO EXPENSE
# =========================================================

@router.post("/")
def create_auto_expense(
    request: AutoExpenseRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Create an expense using natural language.
    """

    # -----------------------------------------------------
    # INPUT
    # -----------------------------------------------------

    text = request.text.strip()

    if not text:

        raise HTTPException(
            status_code=400,
            detail="Expense text cannot be empty."
        )

    # -----------------------------------------------------
    # PARSE
    # -----------------------------------------------------

    try:

        data = parse_expense_text(
            text
        )

    except Exception as exc:

        print(
            "AUTO EXPENSE PARSING ERROR:",
            exc
        )

        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "Could not understand "
                    "the expense text."
                ),
                "suggestion": (
                    "Try something like "
                    "'Spent ₹500 on dinner yesterday'."
                )
            }
        )

    # -----------------------------------------------------
    # VALIDATE
    # -----------------------------------------------------

    validate_ai_result(
        data
    )

    # -----------------------------------------------------
    # CONFIDENCE
    # -----------------------------------------------------

    confidence = get_confidence(
        data
    )

    # -----------------------------------------------------
    # PARSED VALUES
    # -----------------------------------------------------

    title = str(
        data["title"]
    ).strip()

    category_name = str(
        data["category"]
    ).strip()

    amount = Decimal(
        str(data["amount"])
    )

    transaction_date = (
        normalize_transaction_date(
            data["date"]
        )
    )

    # -----------------------------------------------------
    # LOW CONFIDENCE
    # -----------------------------------------------------

    if confidence < 0.45:

        return {
            "success": False,

            "requires_confirmation": True,

            "message": (
                "The expense was understood "
                "with low confidence. "
                "Please confirm the details."
            ),

            "expense": {
                "title": title,
                "amount": money_to_float(amount),
                "category": category_name,
                "date": transaction_date,
            },

            "confidence": confidence
        }

    # -----------------------------------------------------
    # CATEGORY
    # -----------------------------------------------------

    category = find_category(
        db,
        category_name
    )

    if not category:

        category = create_category(
            db,
            category_name
        )

    # -----------------------------------------------------
    # DUPLICATE
    # -----------------------------------------------------

    duplicate = detect_duplicate(
        db=db,
        current_user=current_user,
        amount=amount,
        transaction_date=transaction_date,
        title=title
    )

    if duplicate:

        return {
            "success": False,

            "duplicate": True,

            "requires_confirmation": True,

            "message": (
                "A similar transaction "
                "already exists."
            ),

            "existing_expense": {
                "id": duplicate.id,
                "title": duplicate.title,
                "amount": money_to_float(
                    duplicate.amount
                ),
                "date": duplicate.date,
            },

            "parsed_expense": {
                "title": title,
                "amount":money_to_float(amount),
                "category": category.name,
                "date": transaction_date,
            },

            "confidence": confidence
        }

    # -----------------------------------------------------
    # CREATE
    # -----------------------------------------------------

    expense = Expense(
        title=title,
        amount=amount,
        category_id=category.id,
        date=transaction_date,
        user_id=current_user.id
    )

    db.add(expense)

    db.commit()

    db.refresh(expense)

    # -----------------------------------------------------
    # SUCCESS RESPONSE
    # -----------------------------------------------------

    return {
        "success": True,

        "requires_confirmation": False,

        "message": (
            "Expense created successfully "
            "using AI."
        ),

        "expense": {
            "id": expense.id,
            "title": expense.title,
            "amount": float(
                expense.amount
            ),
            "category": category.name,
            "category_id": category.id,
            "date": expense.date,
        },

        "confidence": confidence,

        "ai": {
            "confidence": confidence,

            "reason": data.get(
                "reason",
                "Expense extracted from natural language."
            ),

            "suggestions": data.get(
                "suggestions",
                []
            )
        }
    }
