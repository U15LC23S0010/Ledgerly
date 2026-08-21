from datetime import date, datetime, timedelta
from calendar import monthrange

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.dependencies import get_current_user

from app.models.expense import Expense
from app.models.category import Category
from app.models.budget import Budget

from app.utils.date_utils import get_today

router = APIRouter(
    prefix="/insights",
    tags=["AI Insights"]
)


# =========================================================
# BASIC HELPERS
# =========================================================

def calculate_percentage(value, total):
    if not total:
        return 0.0

    return round((float(value) / float(total)) * 100, 2)


def get_month_range(year, month):
    start = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end = date(year, month, last_day)

    return start, end


def get_previous_month(year, month):
    if month == 1:
        return year - 1, 12

    return year, month - 1


def safe_float(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


# =========================================================
# CATEGORY ANALYSIS
# =========================================================

def build_category_analysis(expenses, categories):
    """
    Build category spending information.

    Uses one category lookup instead of querying the
    database for every expense.
    """

    category_map = {
        category.id: category.name
        for category in categories
    }

    totals = {}

    for expense in expenses:

        category_name = category_map.get(
            expense.category_id,
            "Uncategorized"
        )

        amount = safe_float(expense.amount)

        totals[category_name] = (
            totals.get(category_name, 0)
            + amount
        )

    total_expenses = sum(totals.values())

    result = []

    for category_name, amount in totals.items():

        result.append({
            "category": category_name,
            "amount": round(amount, 2),
            "percentage": calculate_percentage(
                amount,
                total_expenses
            )
        })

    result.sort(
        key=lambda item: item["amount"],
        reverse=True
    )

    return result


# =========================================================
# TOP EXPENSES
# =========================================================

def build_top_expenses(expenses, categories):
    """
    Return the largest transactions for the current month.
    """

    category_map = {
        category.id: category.name
        for category in categories
    }

    sorted_expenses = sorted(
        expenses,
        key=lambda expense: safe_float(
            expense.amount
        ),
        reverse=True
    )

    result = []

    for expense in sorted_expenses[:5]:

        result.append({
            "id": expense.id,
            "title": expense.title,
            "amount": round(
                safe_float(expense.amount),
                2
            ),
            "category": category_map.get(
                expense.category_id,
                "Uncategorized"
            ),
            "date": expense.date
        })

    return result


# =========================================================
# UNUSUAL EXPENSE DETECTION
# =========================================================

def detect_unusual_expenses(
    current_expenses,
    previous_expenses
):
    """
    Detect transactions that are significantly larger
    than the user's normal spending pattern.

    This is a deterministic AI-style analysis layer.
    """

    if not current_expenses:
        return []

    historical_amounts = [
        safe_float(expense.amount)
        for expense in previous_expenses
        if safe_float(expense.amount) > 0
    ]

    current_amounts = [
        safe_float(expense.amount)
        for expense in current_expenses
        if safe_float(expense.amount) > 0
    ]

    if not current_amounts:
        return []

    # Prefer previous-month behavior as baseline.
    if historical_amounts:

        baseline = (
            sum(historical_amounts)
            / len(historical_amounts)
        )

    else:

        baseline = (
            sum(current_amounts)
            / len(current_amounts)
        )

    if baseline <= 0:
        return []

    unusual = []

    for expense in current_expenses:

        amount = safe_float(
            expense.amount
        )

        # At least 3x normal transaction size
        # and at least ₹1,000.
        if (
            amount >= baseline * 3
            and amount >= 1000
        ):

            unusual.append({
                "id": expense.id,
                "title": expense.title,
                "amount": round(amount, 2),
                "date": expense.date,
                "baseline": round(
                    baseline,
                    2
                ),
                "multiple": round(
                    amount / baseline,
                    1
                )
            })

    unusual.sort(
        key=lambda item: item["amount"],
        reverse=True
    )

    return unusual[:5]


# =========================================================
# DAILY SPENDING
# =========================================================

def build_daily_analysis(expenses):
    """
    Calculate average daily spending and
    identify the highest-spending day.
    """

    if not expenses:
        return {
            "average_daily_spending": 0,
            "highest_spending_day": None
        }

    daily_totals = {}

    for expense in expenses:

        if not expense.date:
            continue

        amount = safe_float(
            expense.amount
        )

        day_key = expense.date.isoformat()

        daily_totals[day_key] = (
            daily_totals.get(day_key, 0)
            + amount
        )

    if not daily_totals:
        return {
            "average_daily_spending": 0,
            "highest_spending_day": None
        }

    total = sum(
        daily_totals.values()
    )

    average_daily = (
        total / len(daily_totals)
    )

    highest_day = max(
        daily_totals.items(),
        key=lambda item: item[1]
    )

    return {
        "average_daily_spending": round(
            average_daily,
            2
        ),

        "highest_spending_day": {
            "date": highest_day[0],
            "amount": round(
                highest_day[1],
                2
            )
        }
    }


# =========================================================
# AI INSIGHT GENERATOR
# =========================================================

def build_ai_insights(
    total_expenses,
    previous_expenses,
    category_data,
    budget,
    largest_expense,
    average_expense,
    expense_count,
    unusual_expenses,
    daily_analysis
):

    insights = []
    warnings = []
    recommendations = []

    # =====================================================
    # MONTHLY TREND
    # =====================================================

    if previous_expenses > 0:

        change = (
            (
                total_expenses
                - previous_expenses
            )
            / previous_expenses
        ) * 100

        change = round(change, 2)

        if change > 20:

            insights.append(
                f"Your spending increased by {change}% "
                "compared with the previous month."
            )

            warnings.append(
                "Monthly spending has increased significantly."
            )

            recommendations.append(
                "Review your largest expense categories "
                "and reduce non-essential spending where possible."
            )

        elif change > 5:

            insights.append(
                f"Your spending is {change}% higher "
                "than the previous month."
            )

            recommendations.append(
                "Keep an eye on your spending for the rest "
                "of the month."
            )

        elif change < -20:

            insights.append(
                f"Excellent progress: your spending decreased "
                f"by {abs(change)}% compared with the previous month."
            )

            recommendations.append(
                "Continue the spending habits that helped "
                "you reduce your expenses."
            )

        elif change < -5:

            insights.append(
                f"Your spending decreased by {abs(change)}% "
                "compared with the previous month."
            )

        else:

            insights.append(
                "Your spending is relatively stable "
                "compared with the previous month."
            )

    else:

        insights.append(
            "There is not enough previous-month data "
            "to calculate a reliable spending trend."
        )


    # =====================================================
    # CATEGORY ANALYSIS
    # =====================================================

    if category_data:

        highest_category = category_data[0]

        category_percentage = (
            highest_category["percentage"]
        )

        insights.append(
            f"{highest_category['category']} is your largest "
            f"expense category, accounting for "
            f"{category_percentage}% of your spending."
        )

        if category_percentage >= 40:

            warnings.append(
                f"A large portion of your spending is "
                f"concentrated in {highest_category['category']}."
            )

            recommendations.append(
                f"Review your {highest_category['category']} "
                "expenses and look for possible savings."
            )


        # Top two categories
        if len(category_data) >= 2:

            top_two_percentage = round(
                category_data[0]["percentage"]
                + category_data[1]["percentage"],
                2
            )

            if top_two_percentage >= 70:

                insights.append(
                    f"Your top two categories account for "
                    f"{top_two_percentage}% of your total spending."
                )


    # =====================================================
    # BUDGET
    # =====================================================

    budget_status = "not_set"
    budget_percentage = 0
    budget_remaining = None

    if budget and budget.monthly_budget:

        monthly_budget = safe_float(
            budget.monthly_budget
        )

        budget_percentage = calculate_percentage(
            total_expenses,
            monthly_budget
        )

        budget_remaining = round(
            monthly_budget - total_expenses,
            2
        )

        if budget_percentage >= 100:

            budget_status = "exceeded"

            warnings.append(
                "You have exceeded your monthly budget."
            )

            recommendations.append(
                "Reduce discretionary spending and "
                "review your largest expense categories."
            )

        elif budget_percentage >= 80:

            budget_status = "warning"

            warnings.append(
                f"You have already used {budget_percentage}% "
                "of your monthly budget."
            )

            recommendations.append(
                "Monitor the rest of the month's spending carefully."
            )

        else:

            budget_status = "healthy"

            insights.append(
                f"You have used {budget_percentage}% "
                "of your monthly budget."
            )


    # =====================================================
    # LARGEST EXPENSE
    # =====================================================

    if largest_expense:

        largest_amount = safe_float(
            largest_expense.amount
        )

        insights.append(
            f"Your largest recorded expense this month was "
            f"₹{largest_amount:,.2f}."
        )

        if (
            average_expense > 0
            and largest_amount > average_expense * 3
        ):

            warnings.append(
                "Your largest expense is significantly higher "
                "than your typical transaction amount."
            )

            recommendations.append(
                "Review this transaction and determine whether "
                "it was a one-time expense or part of a recurring pattern."
            )


    # =====================================================
    # UNUSUAL EXPENSES
    # =====================================================

    if unusual_expenses:

        unusual = unusual_expenses[0]

        warnings.append(
            f"₹{unusual['amount']:,.2f} spent on "
            f"'{unusual['title']}' is unusually high "
            f"compared with your normal transaction size."
        )

        recommendations.append(
            "Review unusually large transactions to make sure "
            "they are intentional and correctly recorded."
        )


    # =====================================================
    # TRANSACTION COUNT
    # =====================================================

    if expense_count >= 50:

        insights.append(
            "You have recorded a high number of transactions "
            "this month."
        )

        recommendations.append(
            "Continue categorizing transactions consistently "
            "to keep your financial analysis accurate."
        )

    elif 0 < expense_count <= 3:

        insights.append(
            "Only a small number of transactions have been "
            "recorded this month."
        )

        recommendations.append(
            "Record all your expenses to get more accurate "
            "financial insights."
        )


    # =====================================================
    # DAILY SPENDING
    # =====================================================

    average_daily = daily_analysis.get(
        "average_daily_spending",
        0
    )

    if average_daily > 0:

        insights.append(
            f"Your average spending on active spending days "
            f"is ₹{average_daily:,.2f}."
        )


    # =====================================================
    # FALLBACK
    # =====================================================

    if not insights:

        insights.append(
            "Add more transactions to receive "
            "more detailed financial insights."
        )


    return {
        "insights": insights,
        "warnings": warnings,
        "recommendations": recommendations,

        "budget": {
            "status": budget_status,
            "used_percentage": budget_percentage,
            "remaining": budget_remaining
        }
    }


# =========================================================
# FINANCIAL HEALTH SCORE
# =========================================================

def calculate_financial_health(
    total_expenses,
    previous_expenses,
    category_data,
    budget,
    unusual_expenses,
    expense_count
):

    score = 100

    # -----------------------------------------------------
    # BUDGET
    # -----------------------------------------------------

    if budget:

        monthly_budget = safe_float(
            budget.monthly_budget
        )

        if monthly_budget > 0:

            usage = (
                total_expenses
                / monthly_budget
            )

            if usage >= 1:
                score -= 30

            elif usage >= 0.8:
                score -= 15

            elif usage >= 0.6:
                score -= 5


    # -----------------------------------------------------
    # MONTHLY TREND
    # -----------------------------------------------------

    if previous_expenses > 0:

        change_ratio = (
            total_expenses
            / previous_expenses
        )

        if change_ratio >= 1.5:
            score -= 20

        elif change_ratio >= 1.2:
            score -= 15

        elif change_ratio <= 0.8:
            score += 5


    # -----------------------------------------------------
    # CATEGORY CONCENTRATION
    # -----------------------------------------------------

    if category_data:

        highest_percentage = (
            category_data[0]["percentage"]
        )

        if highest_percentage >= 60:
            score -= 15

        elif highest_percentage >= 50:
            score -= 10

        elif highest_percentage >= 40:
            score -= 5


    # -----------------------------------------------------
    # UNUSUAL TRANSACTIONS
    # -----------------------------------------------------

    if len(unusual_expenses) >= 3:
        score -= 10

    elif len(unusual_expenses) == 2:
        score -= 5


    # -----------------------------------------------------
    # LIMITED DATA
    # -----------------------------------------------------

    if expense_count == 0:
        score = 50

    elif expense_count <= 2:
        score -= 5


    score = max(
        0,
        min(
            100,
            round(score)
        )
    )

    if score >= 85:
        label = "Excellent"

    elif score >= 70:
        label = "Good"

    elif score >= 50:
        label = "Needs Attention"

    else:
        label = "Critical"

    return {
        "score": score,
        "label": label
    }


# =========================================================
# MAIN API
# =========================================================

@router.get("/")
def get_insights(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Generate personalized financial insights for
    the authenticated user.

    The analysis includes:

    - Monthly spending
    - Previous-month comparison
    - Category breakdown
    - Budget usage
    - Largest expenses
    - Unusual expenses
    - Daily spending
    - AI-style recommendations
    - Financial health score
    """

    today = get_today()

    current_year = today.year
    current_month = today.month


    # =====================================================
    # CURRENT MONTH RANGE
    # =====================================================

    current_start, current_end = get_month_range(
        current_year,
        current_month
    )


    # =====================================================
    # PREVIOUS MONTH RANGE
    # =====================================================

    previous_year, previous_month = get_previous_month(
        current_year,
        current_month
    )

    previous_start, previous_end = get_month_range(
        previous_year,
        previous_month
    )


    # =====================================================
    # CURRENT MONTH EXPENSES
    # =====================================================

    current_expenses = (
        db.query(Expense)
        .filter(
            Expense.user_id == current_user.id,
            Expense.date >= current_start,
            Expense.date <= current_end
        )
        .order_by(
            Expense.date.desc()
        )
        .all()
    )


    # =====================================================
    # PREVIOUS MONTH EXPENSES
    # =====================================================

    previous_expenses_list = (
        db.query(Expense)
        .filter(
            Expense.user_id == current_user.id,
            Expense.date >= previous_start,
            Expense.date <= previous_end
        )
        .all()
    )


    previous_expenses = sum(
        safe_float(expense.amount)
        for expense in previous_expenses_list
    )


    # =====================================================
    # TOTAL CURRENT EXPENSES
    # =====================================================

    total_expenses = sum(
        safe_float(expense.amount)
        for expense in current_expenses
    )


    # =====================================================
    # CATEGORY DATA
    # =====================================================

    category_ids = {
        expense.category_id
        for expense in current_expenses
        if expense.category_id is not None
    }

    categories = []

    if category_ids:

        categories = (
            db.query(Category)
            .filter(
                Category.id.in_(category_ids)
            )
            .all()
        )


    category_data = build_category_analysis(
        current_expenses,
        categories
    )


    # =====================================================
    # LARGEST EXPENSE
    # =====================================================

    largest_expense = None

    if current_expenses:

        largest_expense = max(
            current_expenses,
            key=lambda expense:
                safe_float(expense.amount)
        )


    # =====================================================
    # AVERAGE EXPENSE
    # =====================================================

    expense_count = len(
        current_expenses
    )

    average_expense = (
        total_expenses / expense_count
        if expense_count
        else 0
    )


    # =====================================================
    # TOP EXPENSES
    # =====================================================

    top_expenses = build_top_expenses(
        current_expenses,
        categories
    )


    # =====================================================
    # UNUSUAL EXPENSES
    # =====================================================

    unusual_expenses = detect_unusual_expenses(
        current_expenses=current_expenses,
        previous_expenses=previous_expenses_list
    )


    # =====================================================
    # DAILY ANALYSIS
    # =====================================================

    daily_analysis = build_daily_analysis(
        current_expenses
    )


    # =====================================================
    # BUDGET
    # =====================================================

    budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id
        )
        .first()
    )


    # =====================================================
    # AI ANALYSIS
    # =====================================================

    analysis = build_ai_insights(
        total_expenses=total_expenses,
        previous_expenses=previous_expenses,
        category_data=category_data,
        budget=budget,
        largest_expense=largest_expense,
        average_expense=average_expense,
        expense_count=expense_count,
        unusual_expenses=unusual_expenses,
        daily_analysis=daily_analysis
    )


    # =====================================================
    # FINANCIAL HEALTH
    # =====================================================

    financial_health = calculate_financial_health(
        total_expenses=total_expenses,
        previous_expenses=previous_expenses,
        category_data=category_data,
        budget=budget,
        unusual_expenses=unusual_expenses,
        expense_count=expense_count
    )


    # =====================================================
    # BUDGET RESPONSE
    # =====================================================

    budget_analysis = analysis["budget"]


    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return {
        "status": "success",

        "generated_at": datetime.now().isoformat(),

        "period": {
            "month": current_month,
            "year": current_year,

            "start": current_start,
            "end": current_end
        },

        "summary": {
            "total_expenses": round(
                total_expenses,
                2
            ),

            "previous_month_expenses": round(
                previous_expenses,
                2
            ),

            "expense_count": expense_count,

            "average_expense": round(
                average_expense,
                2
            ),

            "largest_expense": (
                round(
                    safe_float(
                        largest_expense.amount
                    ),
                    2
                )
                if largest_expense
                else 0
            )
        },

        "category_analysis": category_data,

        "top_expenses": top_expenses,

        "unusual_expenses": unusual_expenses,

        "daily_analysis": daily_analysis,

        "financial_health": financial_health,

        "ai_insights": analysis["insights"],

        "warnings": analysis["warnings"],

        "recommendations": analysis["recommendations"],

        "budget_analysis": budget_analysis
    }