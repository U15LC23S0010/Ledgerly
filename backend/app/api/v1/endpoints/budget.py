from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.category import Category

from app.core.dependencies import get_current_user

from app.schemas.budget import BudgetCreate

from app.utils.date_utils import (
    get_today,
    get_current_month_range,
    get_month_range,
)


router = APIRouter(
    prefix="/budget",
    tags=["Budget"]
)


def get_current_budget(
    db: Session,
    current_user
):
    today = get_today()

    return (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == today.month,
            Budget.year == today.year
        )
        .first()
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

    existing_budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == budget.month,
            Budget.year == budget.year
        )
        .first()
    )

    if existing_budget:

        existing_budget.monthly_budget = (
            budget.monthly_budget
        )

        db.commit()
        db.refresh(existing_budget)

        return {
            "success": True,
            "message": "Budget updated successfully.",
            "budget": {
                "id": existing_budget.id,
                "monthly_budget": float(
                    existing_budget.monthly_budget
                ),
                "month": existing_budget.month,
                "year": existing_budget.year,
                "user_id": existing_budget.user_id
            }
        }

    new_budget = Budget(
        monthly_budget=budget.monthly_budget,
        month=budget.month,
        year=budget.year,
        user_id=current_user.id
    )

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)

    return {
        "success": True,
        "message": "Budget created successfully.",
        "budget": {
            "id": new_budget.id,
            "monthly_budget": float(
                new_budget.monthly_budget
            ),
            "month": new_budget.month,
            "year": new_budget.year,
            "user_id": new_budget.user_id
        }
    }


# =========================================================
# GET CURRENT MONTH BUDGET
# =========================================================

@router.get("/")
def get_budget(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    budget = get_current_budget(
        db,
        current_user
    )

    if not budget:

        return {
            "success": True,
            "budget_exists": False,
            "message": "No budget found for this month."
        }

    return {
        "success": True,
        "budget_exists": True,
        "budget": {
            "id": budget.id,
            "monthly_budget": float(
                budget.monthly_budget
            ),
            "month": budget.month,
            "year": budget.year,
            "user_id": budget.user_id
        }
    }


# =========================================================
# BUDGET STATUS
# =========================================================

@router.get("/status")
def budget_status(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    budget = get_current_budget(
        db,
        current_user
    )

    if not budget:

        return {
            "success": True,
            "budget_exists": False,
            "message": (
                "No budget has been set for this month."
            )
        }

    start_date, next_month = (
        get_current_month_range()
    )

    spent = (
        db.query(
            func.sum(Transaction.amount)
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date < next_month
        )
        .scalar()
        or 0
    )

    budget_amount = Decimal(
        str(budget.monthly_budget)
    )

    spent_amount = Decimal(
        str(spent)
    )

    remaining = (
        budget_amount - spent_amount
    )

    if budget_amount > 0:

        used_percentage = (
            spent_amount /
            budget_amount
        ) * Decimal("100")

    else:

        used_percentage = Decimal("0")

    used_percentage = round(
        used_percentage,
        2
    )

    if used_percentage >= 100:

        status = "over_budget"

        message = (
            "You have exceeded your monthly budget."
        )

    elif used_percentage >= 90:

        status = "critical"

        message = (
            "You have used more than 90% "
            "of your monthly budget."
        )

    elif used_percentage >= 70:

        status = "warning"

        message = (
            "You have used more than 70% "
            "of your monthly budget."
        )

    else:

        status = "normal"

        message = (
            "Your spending is within your budget."
        )

    return {
        "success": True,

        "budget_exists": True,

        "budget": {
            "id": budget.id,
            "monthly_budget": float(
                budget_amount
            ),
            "month": budget.month,
            "year": budget.year
        },

        "spending": {
            "spent": float(
                spent_amount
            ),
            "remaining": float(
                remaining
            ),
            "used_percentage": float(
                used_percentage
            )
        },

        "alert": {
            "status": status,
            "message": message
        }
    }


# =========================================================
# BUDGET BREAKDOWN
# =========================================================

@router.get("/breakdown")
def budget_breakdown(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    today = get_today()

    budget = get_current_budget(
        db,
        current_user
    )

    start_date, next_month = (
        get_current_month_range()
    )

    total_spent = (
        db.query(
            func.sum(Transaction.amount)
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date < next_month
        )
        .scalar()
        or 0
    )

    total_spent = Decimal(
        str(total_spent)
    )

    if budget:

        budget_amount = Decimal(
            str(budget.monthly_budget)
        )

    else:

        budget_amount = Decimal("0")

    remaining = (
        budget_amount -
        total_spent
    )

    category_rows = (
        db.query(
            Category.name,
            func.sum(Transaction.amount)
        )
        .join(
            Transaction,
            Transaction.category_id == Category.id
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date < next_month
        )
        .group_by(
            Category.id,
            Category.name
        )
        .order_by(
            func.sum(
                Transaction.amount
            ).desc()
        )
        .all()
    )

    categories = []

    for category_name, category_spent in category_rows:

        category_spent = Decimal(
            str(category_spent or 0)
        )

        if budget_amount > 0:

            percentage_of_budget = (
                category_spent /
                budget_amount
            ) * Decimal("100")

        else:

            percentage_of_budget = Decimal("0")

        if total_spent > 0:

            percentage_of_spending = (
                category_spent /
                total_spent
            ) * Decimal("100")

        else:

            percentage_of_spending = Decimal("0")

        categories.append(
            {
                "category": category_name,

                "spent": float(
                    category_spent
                ),

                "percentage_of_budget": float(
                    round(
                        percentage_of_budget,
                        2
                    )
                ),

                "percentage_of_spending": float(
                    round(
                        percentage_of_spending,
                        2
                    )
                )
            }
        )

    return {
        "success": True,

        "month": today.month,
        "year": today.year,

        "budget_exists": bool(budget),

        "budget": float(
            budget_amount
        ),

        "spent": float(
            total_spent
        ),

        "remaining": float(
            remaining
        ),

        "categories": categories
    }


# =========================================================
# BUDGET HISTORY
# =========================================================

@router.get("/history")
def budget_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id
        )
        .order_by(
            Budget.year.desc(),
            Budget.month.desc()
        )
        .all()
    )

    if not budgets:

        return {
            "success": True,
            "count": 0,
            "history": []
        }

    history = []

    for budget in budgets:

        start_date, next_month = (
            get_month_range(
                budget.year,
                budget.month
            )
        )

        spent = (
            db.query(
                func.sum(Transaction.amount)
            )
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.date >= start_date,
                Transaction.date < next_month
            )
            .scalar()
            or 0
        )

        budget_amount = Decimal(
            str(budget.monthly_budget)
        )

        spent_amount = Decimal(
            str(spent)
        )

        remaining = (
            budget_amount -
            spent_amount
        )

        if budget_amount > 0:

            used_percentage = (
                spent_amount /
                budget_amount
            ) * Decimal("100")

        else:

            used_percentage = Decimal("0")

        used_percentage = round(
            used_percentage,
            2
        )

        if used_percentage >= 100:

            status = "over_budget"

        elif used_percentage >= 90:

            status = "critical"

        elif used_percentage >= 70:

            status = "warning"

        else:

            status = "normal"

        history.append(
            {
                "id": budget.id,

                "month": budget.month,

                "year": budget.year,

                "monthly_budget": float(
                    budget_amount
                ),

                "spent": float(
                    spent_amount
                ),

                "remaining": float(
                    remaining
                ),

                "used_percentage": float(
                    used_percentage
                ),

                "status": status
            }
        )

    return {
        "success": True,
        "count": len(history),
        "history": history
    }


# =========================================================
# SMART BUDGET RECOMMENDATION
# =========================================================

@router.get("/recommendation")
def budget_recommendation(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Analyze current-month spending and provide
    a smart budget recommendation.
    """

    today = get_today()

    # -----------------------------------------------------
    # FIND CURRENT MONTH BUDGET
    # -----------------------------------------------------

    budget = get_current_budget(
        db,
        current_user
    )

    if not budget:

        return {
            "success": True,
            "budget_exists": False,
            "message": (
                "Set a monthly budget first "
                "to receive recommendations."
            )
        }

    # -----------------------------------------------------
    # DATE INFORMATION
    # -----------------------------------------------------

    start_date, next_month = (
        get_current_month_range()
    )

    days_elapsed = today.day

    days_in_month = (
        next_month -
        start_date
    ).days

    days_remaining = max(
        days_in_month -
        days_elapsed,
        0
    )

    # -----------------------------------------------------
    # CURRENT SPENDING
    # -----------------------------------------------------

    spent = (
        db.query(
            func.sum(Transaction.amount)
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.date >= start_date,
            Transaction.date < next_month
        )
        .scalar()
        or 0
    )

    budget_amount = Decimal(
        str(budget.monthly_budget)
    )

    spent_amount = Decimal(
        str(spent)
    )

    remaining = (
        budget_amount -
        spent_amount
    )

    # -----------------------------------------------------
    # SPENDING RATE
    # -----------------------------------------------------

    if days_elapsed > 0:

        daily_spending_rate = (
            spent_amount /
            Decimal(str(days_elapsed))
        )

    else:

        daily_spending_rate = Decimal("0")

    # -----------------------------------------------------
    # PROJECTED MONTHLY SPENDING
    # -----------------------------------------------------

    if days_elapsed > 0:

        projected_spending = (
            daily_spending_rate *
            Decimal(str(days_in_month))
        )

    else:

        projected_spending = Decimal("0")

    projected_spending = round(
        projected_spending,
        2
    )

    projected_difference = (
        projected_spending -
        budget_amount
    )

    # -----------------------------------------------------
    # DAILY SAFE SPENDING LIMIT
    # -----------------------------------------------------

    if days_remaining > 0 and remaining > 0:

        suggested_daily_limit = (
            remaining /
            Decimal(str(days_remaining))
        )

    else:

        suggested_daily_limit = Decimal("0")

    suggested_daily_limit = round(
        suggested_daily_limit,
        2
    )

    # -----------------------------------------------------
    # USED PERCENTAGE
    # -----------------------------------------------------

    if budget_amount > 0:

        used_percentage = (
            spent_amount /
            budget_amount
        ) * Decimal("100")

    else:

        used_percentage = Decimal("0")

    used_percentage = round(
        used_percentage,
        2
    )

    # -----------------------------------------------------
    # RECOMMENDATION LOGIC
    # -----------------------------------------------------

    if spent_amount > budget_amount:

        status = "over_budget"

        message = (
            "You have already exceeded your "
            "monthly budget. Reduce spending "
            "for the rest of the month."
        )

        recommendation = (
            "Avoid non-essential expenses "
            "until the next budget period."
        )

    elif projected_spending > budget_amount:

        status = "at_risk"

        message = (
            "Your current spending rate may "
            "push you over budget by the end "
            "of the month."
        )

        recommendation = (
            "Try to keep your daily spending "
            "below the suggested daily limit."
        )

    elif used_percentage >= 90:

        status = "critical"

        message = (
            "You have used more than 90% "
            "of your monthly budget."
        )

        recommendation = (
            "Limit discretionary spending "
            "for the remaining days."
        )

    elif used_percentage >= 70:

        status = "warning"

        message = (
            "You have used more than 70% "
            "of your monthly budget."
        )

        recommendation = (
            "Monitor your spending carefully "
            "to stay within budget."
        )

    else:

        status = "healthy"

        message = (
            "Your current spending is "
            "within a healthy range."
        )

        recommendation = (
            "Continue maintaining your "
            "current spending pattern."
        )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "success": True,

        "budget_exists": True,

        "period": {
            "month": today.month,
            "year": today.year,
            "days_elapsed": days_elapsed,
            "days_remaining": days_remaining,
            "days_in_month": days_in_month
        },

        "budget": {
            "monthly_budget": float(
                budget_amount
            ),
            "spent": float(
                spent_amount
            ),
            "remaining": float(
                remaining
            ),
            "used_percentage": float(
                used_percentage
            )
        },

        "spending_analysis": {
            "daily_spending_rate": float(
                round(
                    daily_spending_rate,
                    2
                )
            ),

            "projected_monthly_spending": float(
                projected_spending
            ),

            "projected_difference": float(
                round(
                    projected_difference,
                    2
                )
            )
        },

        "recommendation": {
            "status": status,
            "message": message,
            "suggestion": recommendation,
            "suggested_daily_limit": float(
                suggested_daily_limit
            )
        }
    }


# =========================================================
# DELETE CURRENT MONTH BUDGET
# =========================================================

@router.delete("/")
def delete_budget(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    budget = get_current_budget(
        db,
        current_user
    )

    if not budget:

        return {
            "success": False,
            "message": (
                "Budget not found for this month."
            )
        }

    db.delete(budget)

    db.commit()

    return {
        "success": True,
        "message": (
            "Budget deleted successfully."
        )
    }
