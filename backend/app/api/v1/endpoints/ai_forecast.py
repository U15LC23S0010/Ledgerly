import logging
import calendar
from datetime import date, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from google import genai
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.expense import Expense

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/forecast")
def generate_spending_forecast(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Generate a spending forecast from the logged-in user's expenses."""

    today = date.today()
    month_start = today.replace(day=1)
    days_in_month = calendar.monthrange(today.year, today.month)[1]

    previous_month_end = month_start - timedelta(days=1)
    previous_month_start = previous_month_end.replace(day=1)

    # Fetch current-month expenses for the logged-in user.
    current_expenses = (
        db.query(Expense)
        .filter(
            Expense.user_id == current_user.id,
            Expense.date >= month_start,
            Expense.date <= today,
        )
        .all()
    )

    # Fetch previous-month expenses for comparison.
    previous_expenses = (
        db.query(Expense)
        .filter(
            Expense.user_id == current_user.id,
            Expense.date >= previous_month_start,
            Expense.date <= previous_month_end,
        )
        .all()
    )

    actual_total = round(
        sum(float(expense.amount or 0) for expense in current_expenses),
        2,
    )

    previous_total = round(
        sum(float(expense.amount or 0) for expense in previous_expenses),
        2,
    )

    if not current_expenses:
        raise HTTPException(
            status_code=422,
            detail=(
                "No expenses recorded this month. "
                "Add expenses to generate a forecast."
            ),
        )

    days_elapsed = today.day
    expense_count = len(current_expenses)

    # Confidence label based on the available transaction count.
    # This is a simple heuristic, not a statistical accuracy score.
    if expense_count < 5:
        forecast_confidence = "Low"
        forecast_note = (
            "This is a preliminary estimate based on limited "
            "expense records. Add more transactions for a "
            "more personalized forecast."
        )
    elif expense_count < 20:
        forecast_confidence = "Moderate"
        forecast_note = (
            "This estimate uses your recorded expenses, but "
            "more transaction history may improve reliability."
        )
    else:
        forecast_confidence = "Higher"
        forecast_note = (
            "This estimate uses a larger set of current-month "
            "transactions, but actual spending may still vary."
        )

    # Baseline forecast: current daily average continues.
    daily_average = round(actual_total / days_elapsed, 2)
    projected_total = round(daily_average * days_in_month, 2)
    projected_remaining = round(
        max(projected_total - actual_total, 0),
        2,
    )

    # Calculate category-level spending and projections.
    category_totals = defaultdict(float)

    for expense in current_expenses:
        category_name = (
            expense.category.name
            if expense.category
            else "Uncategorized"
        )
        category_totals[category_name] += float(expense.amount or 0)

    category_forecasts = []

    for category_name, amount in sorted(
        category_totals.items(),
        key=lambda item: item[1],
        reverse=True,
    )[:5]:
        category_forecasts.append(
            {
                "category": category_name,
                "actual_spending": round(amount, 2),
                "projected_spending": round(
                    (amount / days_elapsed) * days_in_month,
                    2,
                ),
            }
        )

    financial_data = {
        "period": today.strftime("%B %Y"),
        "currency": "INR",
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month,
        "actual_spending": actual_total,
        "daily_average": daily_average,
        "projected_month_end_spending": projected_total,
        "projected_remaining_spending": projected_remaining,
        "previous_month_spending": previous_total,
        "expense_count": expense_count,
        "forecast_confidence": forecast_confidence,
        "forecast_note": forecast_note,
        "category_forecasts": category_forecasts,
    }

    api_key = settings.GEMINI_API_KEY

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured.",
        )

    prompt = f"""
You are Ledgerly's financial insights assistant.

Explain the supplied spending forecast in simple English.
Provide:
1. A short summary of projected month-end spending.
2. Two observations supported by the supplied figures.
3. Two practical spending-management suggestions.

Rules:
- Use only the supplied data.
- Do not invent income, savings, budgets, or transactions.
- State that the projection assumes the current daily average continues.
- Explain that confidence is limited when transaction data is sparse.
- Treat forecast_confidence as a simple transaction-count heuristic,
  not a measured probability of accuracy.
- If previous-month spending is zero, say a comparison is unavailable.
- Do not present the forecast as a guaranteed outcome.
- Avoid generic claims that are not supported by the data.

Calculated financial data:
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
                detail="Gemini returned an empty response.",
            )

        return {
            **financial_data,
            "ai_explanation": response.text,
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to generate Ledgerly spending forecast")
        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to generate the spending forecast right now. "
                "Please try again later."
            ),
        )