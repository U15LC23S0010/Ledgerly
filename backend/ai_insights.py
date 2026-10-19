import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from google import genai
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.expense import Expense

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/ai")
def generate_ai_insights(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Generate AI insights using the authenticated user's
    actual expense records from the last 30 days.
    """

    api_key = settings.GEMINI_API_KEY

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured.",
        )

    end_date = date.today()
    start_date = end_date - timedelta(days=29)

    expenses = (
        db.query(Expense)
        .filter(
            Expense.user_id == current_user.id,
            Expense.date >= start_date,
            Expense.date <= end_date,
        )
        .order_by(Expense.amount.desc())
        .all()
    )

    total_expenses = round(
        sum(float(expense.amount or 0) for expense in expenses),
        2,
    )

    category_totals = {}

    for expense in expenses:
        category_name = (
            expense.category.name
            if expense.category
            else "Uncategorized"
        )

        category_totals[category_name] = (
            category_totals.get(category_name, 0)
            + float(expense.amount or 0)
        )

    top_categories = sorted(
        [
            {
                "category": name,
                "amount": round(amount, 2),
            }
            for name, amount in category_totals.items()
        ],
        key=lambda item: item["amount"],
        reverse=True,
    )[:5]

    largest_expenses = [
        {
            "title": expense.title,
            "amount": round(float(expense.amount or 0), 2),
            "date": expense.date.isoformat(),
        }
        for expense in expenses[:5]
    ]

    financial_data = {
        "period": f"{start_date} to {end_date}",
        "currency": "INR",
        "expense_count": len(expenses),
        "total_expenses": total_expenses,
        "top_categories": top_categories,
        "largest_expenses": largest_expenses,
    }

    prompt = f"""
You are Ledgerly's financial insights assistant.

Explain the user's expense data in simple English.
Give 3 useful observations and 2 practical budgeting suggestions.

Rules:
- Use only the supplied data.
- Do not invent income, savings, budgets, or financial figures.
- Do not claim that an expense is unusual without sufficient evidence.
- If there are no expenses, say there is not enough data yet.
- Be helpful, concise, and non-judgmental.

Expense data:
{financial_data}
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        if not response.text:
            raise HTTPException(
                status_code=502,
                detail="The AI service returned an empty response.",
            )

        return {
            "period": financial_data["period"],
            "currency": "INR",
            "total_expenses": total_expenses,
            "expense_count": len(expenses),
            "top_categories": top_categories,
            "ai_insights": response.text,
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to generate AI expense insights")
        raise HTTPException(
            status_code=502,
            detail="Unable to generate AI insights right now. Please try again later.",
        )