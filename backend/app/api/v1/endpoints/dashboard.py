from dateutil.relativedelta import relativedelta
from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.category import Category
from app.models.account import Account

from app.core.dependencies import get_current_user

from app.utils.date_utils import (
    get_today,
    get_month_range,
)

from app.utils.money_utils import (
    money_to_float,
    round_money,
)


router = APIRouter(
    tags=["Dashboard"]
)


# =========================================================
# DASHBOARD
# =========================================================

@router.get("/")
def dashboard(
    month: str | None = Query(
        default=None,
        description="Dashboard month in YYYY-MM format",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    user_id = current_user.id

    # =====================================================
    # SELECTED MONTH
    # =====================================================

    today = get_today()

    if month:

        try:
            selected_year, selected_month = map(
                int,
                month.split("-")
            )

            if not (
                1 <= selected_month <= 12
                and selected_year >= 1
            ):
                raise ValueError

            selected_date = date(
                selected_year,
                selected_month,
                1,
            )

        except (ValueError, TypeError):

            selected_date = date(
                today.year,
                today.month,
                1,
            )

    else:

        selected_date = date(
            today.year,
            today.month,
            1,
        )

    # -----------------------------------------------------
    # Selected month range
    # -----------------------------------------------------

    month_start, next_month = get_month_range(
        selected_date.year,
        selected_date.month,
    )


    print(
        "DASHBOARD MONTH:",
        month,
        "SELECTED:",
        selected_date,
        "START:",
        month_start,
        "END:",
        next_month,
    )

    # =====================================================
    # TOTAL INCOME
    # =====================================================

    total_income = (
        db.query(
            func.coalesce(
                func.sum(Transaction.amount),
                0,
            )
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "income",
            Transaction.date >= month_start,
            Transaction.date < next_month,
        )
        .scalar()
        or 0
    )

    # =====================================================
    # TOTAL EXPENSES
    # =====================================================

    total_expenses = (
        db.query(
            func.coalesce(
                func.sum(Transaction.amount),
                0,
            )
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= month_start,
            Transaction.date < next_month,
        )
        .scalar()
        or 0
    )

    # =====================================================
    # MONTHLY INCOME
    # =====================================================

    monthly_income = (
        db.query(
            func.coalesce(
                func.sum(Transaction.amount),
                0,
            )
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "income",
            Transaction.date >= month_start,
            Transaction.date < next_month,
        )
        .scalar()
        or 0
    )

    # =====================================================
    # MONTHLY EXPENSES
    # =====================================================

    monthly_expenses = (
        db.query(
            func.coalesce(
                func.sum(Transaction.amount),
                0,
            )
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= month_start,
            Transaction.date < next_month,
        )
        .scalar()
        or 0
    )

    # =====================================================
    # MONTHLY SPENDING TREND
    # =====================================================

    monthly_trend = []

    for i in range(5, -1, -1):

        trend_month = selected_date - relativedelta(
            months=i
        )

        trend_start, trend_end = get_month_range(
            trend_month.year,
            trend_month.month,
        )

        trend_income = (
            db.query(
                func.coalesce(
                    func.sum(Transaction.amount),
                    0,
                )
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_type == "income",
                Transaction.date >= trend_start,
                Transaction.date < trend_end,
            )
            .scalar()
            or 0
        )

        trend_expenses = (
            db.query(
                func.coalesce(
                    func.sum(Transaction.amount),
                    0,
                )
            )
            .filter(
                Transaction.user_id == user_id,
                Transaction.transaction_type == "expense",
                Transaction.date >= trend_start,
                Transaction.date < trend_end,
            )
            .scalar()
            or 0
        )

        trend_income = float(trend_income)
        trend_expenses = float(trend_expenses)

        monthly_trend.append(
            {
                "month": (
                    f"{trend_start.year}-"
                    f"{trend_start.month:02d}"
                ),
                "income": round(
                    trend_income,
                    2,
                ),
                "expenses": round(
                    trend_expenses,
                    2,
                ),
                "net": round(
                    trend_income - trend_expenses,
                    2,
                ),
            }
        )

    # =====================================================
    # SPENDING TREND ANALYSIS
    # =====================================================

    expense_values = [
        item["expenses"]
        for item in monthly_trend
    ]

    if expense_values:

        average_monthly_expenses = (
            sum(expense_values)
            / len(expense_values)
        )

        highest_expense_month = max(
            monthly_trend,
            key=lambda item: item["expenses"],
        )

        lowest_expense_month = min(
            monthly_trend,
            key=lambda item: item["expenses"],
        )

        if len(expense_values) >= 2:

            previous_expenses = expense_values[-2]
            current_expenses = expense_values[-1]

            if current_expenses > previous_expenses:
                trend_direction = "increasing"

            elif current_expenses < previous_expenses:
                trend_direction = "decreasing"

            else:
                trend_direction = "stable"

        else:

            trend_direction = "stable"

    else:

        average_monthly_expenses = 0
        highest_expense_month = None
        lowest_expense_month = None
        trend_direction = "stable"

    # =====================================================
    # SPENDING CHANGE %
    # =====================================================

    if len(expense_values) >= 2:

        previous_month_expenses = expense_values[-2]
        current_month_expenses = expense_values[-1]

        if previous_month_expenses > 0:

            spending_change_percentage = (
                (
                    current_month_expenses
                    - previous_month_expenses
                )
                / previous_month_expenses
            ) * 100

        elif current_month_expenses > 0:

            spending_change_percentage = 100

        else:

            spending_change_percentage = 0

    else:

        spending_change_percentage = 0

    spending_change_percentage = round(
        spending_change_percentage,
        2,
    )

    # =====================================================
    # NET CASH FLOW
    # =====================================================

    net_cash_flow = (
        float(total_income)
        - float(total_expenses)
    )

    monthly_net_cash_flow = (
        float(monthly_income)
        - float(monthly_expenses)
    )

    # =====================================================
    # ACCOUNTS
    # =====================================================

    accounts = (
        db.query(Account)
        .filter(
            Account.user_id == user_id,
        )
        .order_by(
            Account.id.asc(),
        )
        .all()
    )

    total_balance = sum(
        money_to_float(account.balance)
        for account in accounts
    )

    account_summary = [
        {
            "id": account.id,
            "name": account.name,
            "account_type": account.account_type,
            "balance": round_money(account.balance),
        }
        for account in accounts
    ]

    # =====================================================
    # BUDGET
    # =====================================================

    budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == user_id,
            Budget.month == selected_date.month,
            Budget.year == selected_date.year,
        )
        .first()
    )

    monthly_budget = (
        float(budget.monthly_budget)
        if budget
        else 0
    )

    remaining_budget = (
        monthly_budget
        - float(monthly_expenses)
    )

    budget_usage = (
        (
            float(monthly_expenses)
            / monthly_budget
        )
        * 100
        if monthly_budget > 0
        else 0
    )

    # =====================================================
    # BUDGET STATUS
    # =====================================================

    if not budget:

        budget_status = "not_set"

    elif remaining_budget < 0:

        budget_status = "exceeded"

    elif budget_usage >= 80:

        budget_status = "warning"

    else:

        budget_status = "healthy"

    # =====================================================
    # EXPENSE COUNT
    # =====================================================

    expense_records = (
        db.query(
            func.count(Transaction.id)
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= month_start,
            Transaction.date < next_month,
        )
        .scalar()
        or 0
    )

    monthly_expense_records = expense_records

    # =====================================================
    # AVERAGE EXPENSE
    # =====================================================

    average_expense = (
        float(monthly_expenses)
        / monthly_expense_records
        if monthly_expense_records > 0
        else 0
    )

    # =====================================================
    # HIGHEST EXPENSE
    # SELECTED MONTH ONLY
    # =====================================================

    highest_expense = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= month_start,
            Transaction.date < next_month,
        )
        .order_by(
            Transaction.amount.desc(),
            Transaction.id.desc(),
        )
        .first()
    )

    # =====================================================
    # CATEGORY SUMMARY
    # SELECTED MONTH ONLY
    # =====================================================

    category_summary = (
        db.query(
            Category.id.label("category_id"),
            Category.name.label("category"),
            func.sum(
                Transaction.amount
            ).label("total"),
        )
        .join(
            Transaction,
            Transaction.category_id == Category.id,
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= month_start,
            Transaction.date < next_month,
        )
        .group_by(
            Category.id,
            Category.name,
        )
        .order_by(
            func.sum(
                Transaction.amount
            ).desc(),
        )
        .all()
    )

    # =====================================================
    # CATEGORIZED EXPENSES
    # =====================================================

    categorized_expenses = sum(
        float(category.total or 0)
        for category in category_summary
    )

    # =====================================================
    # UNCATEGORIZED EXPENSES
    # =====================================================

    uncategorized_expenses = (
        float(monthly_expenses)
        - categorized_expenses
    )

    if uncategorized_expenses < 0:
        uncategorized_expenses = 0

    # =====================================================
    # CATEGORY CHART
    # =====================================================

    category_chart = [
        {
            "category_id": category.category_id,
            "category": category.category,
            "total": round(
                float(category.total or 0),
                2,
            ),
        }
        for category in category_summary
    ]

    if uncategorized_expenses > 0:

        category_chart.append(
            {
                "category_id": None,
                "category": "Uncategorized",
                "total": round(
                    uncategorized_expenses,
                    2,
                ),
            }
        )

    # =====================================================
    # TOP CATEGORY
    # =====================================================

    top_category = (
        category_summary[0]
        if category_summary
        else None
    )

    # =====================================================
    # SAVINGS RATE
    # =====================================================

    if float(monthly_income) > 0:

        savings_rate = (
            (
                float(monthly_income)
                - float(monthly_expenses)
            )
            / float(monthly_income)
        ) * 100

    else:

        savings_rate = 0

    # =====================================================
    # FINANCIAL HEALTH SCORE
    # =====================================================

    if savings_rate >= 30:

        savings_score = 40

    elif savings_rate >= 20:

        savings_score = 32

    elif savings_rate >= 10:

        savings_score = 24

    elif savings_rate > 0:

        savings_score = 16

    else:

        savings_score = 0

    if monthly_budget <= 0:

        budget_score = 15

    elif budget_usage <= 50:

        budget_score = 30

    elif budget_usage <= 70:

        budget_score = 25

    elif budget_usage <= 80:

        budget_score = 20

    elif budget_usage <= 100:

        budget_score = 10

    else:

        budget_score = 0

    if monthly_net_cash_flow > 0:

        cash_flow_score = 20

    elif monthly_net_cash_flow == 0:

        cash_flow_score = 10

    else:

        cash_flow_score = 0

    if monthly_expense_records == 0:

        expense_score = 10

    else:

        expense_score = 7

    financial_health_score = (
        savings_score
        + budget_score
        + cash_flow_score
        + expense_score
    )

    # =====================================================
    # FINANCIAL HEALTH STATUS
    # =====================================================

    if financial_health_score >= 80:

        financial_health_status = "excellent"

    elif financial_health_score >= 60:

        financial_health_status = "good"

    elif financial_health_score >= 40:

        financial_health_status = "fair"

    else:

        financial_health_status = "needs_attention"

    # =====================================================
    # FINANCIAL DATA STATUS
    # =====================================================

    if (
        monthly_income == 0
        and monthly_expenses == 0
    ):

        data_status = "no_activity"

    elif (
        monthly_income == 0
        or monthly_expenses == 0
    ):

        data_status = "limited_data"

    else:

        data_status = "active"

  # =====================================================
  # FINANCIAL INSIGHTS
  # =====================================================

    financial_insights = []

    if monthly_net_cash_flow < 0:

        financial_insights.append(
            {
                "type": "warning",
                "title": "Negative cash flow",
                "message": (
                    "Your expenses are higher than "
                    "your income this month."
                ),
            }
        )

    if (
        monthly_budget > 0
        and budget_usage > 100
    ):

        financial_insights.append(
            {
                "type": "danger",
                "title": "Budget exceeded",
                "message": (
                    f"You have exceeded your monthly "
                    f"budget by ₹"
                    f"{abs(remaining_budget):.2f}."
                ),
            }
        )

    elif (
        monthly_budget > 0
        and budget_usage >= 80
        and budget_usage <= 100
    ):

        financial_insights.append(
            {
                "type": "warning",
                "title": "Budget warning",
                "message": (
                    "You have used more than 80% "
                    "of your monthly budget."
                ),
            }
        )

    if savings_rate >= 20:

        financial_insights.append(
            {
                "type": "success",
                "title": "Good savings rate",
                "message": (
                    f"You are saving "
                    f"{savings_rate:.1f}% of your "
                    "monthly income."
                ),
            }
        )

    elif savings_rate < 0:

        financial_insights.append(
            {
                "type": "danger",
                "title": "Negative savings",
                "message": (
                    "Your spending is higher than "
                    "your income this month."
                ),
            }
        )

    if (
        monthly_expenses > 0
        and uncategorized_expenses
        > monthly_expenses * 0.30
    ):

        financial_insights.append(
            {
                "type": "info",
                "title": "Categorize your expenses",
                "message": (
                    "More than 30% of your expenses "
                    "are uncategorized."
                ),
            }
        )

    if (
        monthly_income == 0
        and monthly_expenses == 0
    ):

        financial_insights.append(
            {
                "type": "info",
                "title": "No activity this month",
                "message": (
                    "Add income and expense transactions "
                    "to start tracking your finances."
                ),
            }
        )

    if (
        highest_expense
        and monthly_income > 0
        and money_to_float(highest_expense.amount)
        > float(monthly_income) * 0.25
    ):

        financial_insights.append(
            {
                "type": "warning",
                "title": "Large expense detected",
                "message": (
                    f"Your highest expense of ₹"
                    f"{money_to_float(highest_expense.amount):.2f} "
                    "is more than 25% of your monthly income."
                ),
            }
        )

    # =====================================================
    # SMART FINANCIAL RECOMMENDATIONS
    # =====================================================

    financial_recommendations = []

    if monthly_net_cash_flow < 0:

        financial_recommendations.append(
            {
                "priority": "high",
                "type": "cash_flow",
                "title": "Reduce monthly spending",
                "message": (
                    "Your expenses are currently higher "
                    "than your income. Review non-essential "
                    "expenses and reduce unnecessary spending."
                ),
            }
        )

    if (
        monthly_budget > 0
        and budget_usage > 100
    ):

        financial_recommendations.append(
            {
                "priority": "high",
                "type": "budget",
                "title": "Review your budget",
                "message": (
                    f"You have exceeded your monthly "
                    f"budget by ₹"
                    f"{abs(remaining_budget):.2f}. "
                    "Consider reducing discretionary spending."
                ),
            }
        )

    elif (
        monthly_budget > 0
        and budget_usage >= 80
        and budget_usage <= 100
    ):

        financial_recommendations.append(
            {
                "priority": "medium",
                "type": "budget",
                "title": "Watch your remaining budget",
                "message": (
                    "You have already used more than 80% "
                    "of your monthly budget."
                ),
            }
        )

    if monthly_budget <= 0:

        financial_recommendations.append(
            {
                "priority": "medium",
                "type": "budget",
                "title": "Create a monthly budget",
                "message": (
                    "Set a monthly spending budget to "
                    "better control and monitor your expenses."
                ),
            }
        )

    if (
        monthly_income > 0
        and savings_rate >= 0
        and savings_rate < 10
    ):

        financial_recommendations.append(
            {
                "priority": "medium",
                "type": "savings",
                "title": "Increase your savings",
                "message": (
                    "Your current savings rate is below 10%. "
                    "Try setting aside a fixed amount from "
                    "each income transaction."
                ),
            }
        )

    elif savings_rate < 0:

        financial_recommendations.append(
            {
                "priority": "high",
                "type": "savings",
                "title": "Stop negative savings",
                "message": (
                    "Your expenses are greater than your "
                    "income. Focus on reducing expenses "
                    "before increasing your savings target."
                ),
            }
        )

    if (
        monthly_expenses > 0
        and uncategorized_expenses
        > monthly_expenses * 0.30
    ):

        financial_recommendations.append(
            {
                "priority": "low",
                "type": "organization",
                "title": "Categorize your transactions",
                "message": (
                    "A large portion of your expenses is "
                    "uncategorized. Assign categories to "
                    "your transactions for better spending analysis."
                ),
            }
        )

    if (
        highest_expense
        and monthly_income > 0
        and money_to_float(highest_expense.amount)
        > float(monthly_income) * 0.25
    ):

        financial_recommendations.append(
            {
                "priority": "medium",
                "type": "spending",
                "title": "Review your largest expense",
                "message": (
                    f"Your largest expense this month is "
                    f"₹{money_to_float(highest_expense.amount):.2f}. "
                    "Review whether this expense was necessary "
                    "or recurring."
                ),
            }
        )

    if (
        financial_health_score >= 80
        and monthly_net_cash_flow > 0
    ):

        financial_recommendations.append(
            {
                "priority": "low",
                "type": "positive",
                "title": "Keep up the good work",
                "message": (
                    "Your current financial health is strong. "
                    "Continue maintaining your savings and "
                    "budgeting habits."
                ),
            }
        )

    if (
        monthly_income == 0
        and monthly_expenses == 0
    ):

        financial_recommendations.append(
            {
                "priority": "low",
                "type": "activity",
                "title": "Start tracking your finances",
                "message": (
                    "Add your income and expenses to receive "
                    "personalized financial recommendations."
                ),
            }
        )

    # =====================================================
    # TREND-BASED RECOMMENDATIONS
    # =====================================================

    if trend_direction == "increasing":

        financial_recommendations.append(
            {
                "priority": "medium",
                "type": "trend",
                "title": "Spending is increasing",
                "message": (
                    f"Your spending increased by "
                    f"{abs(spending_change_percentage):.1f}% "
                    "compared with the previous month. "
                    "Review recent expenses and identify "
                    "areas where you can reduce spending."
                ),
            }
        )

    elif trend_direction == "decreasing":

        financial_recommendations.append(
            {
                "priority": "low",
                "type": "trend",
                "title": "Spending is decreasing",
                "message": (
                    f"Your spending decreased by "
                    f"{abs(spending_change_percentage):.1f}% "
                    "compared with the previous month. "
                    "Keep maintaining your current spending habits."
                ),
            }
        )

    # =====================================================
    # RECENT TRANSACTIONS
    # =====================================================

    recent_transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.date >= month_start,
            Transaction.date < next_month,
        )
        .order_by(
            Transaction.date.desc(),
            Transaction.id.desc(),
        )
        .limit(10)
        .all()
    )

    # =====================================================
    # RETURN DASHBOARD
    # =====================================================

    return {

        # =================================================
        # USER
        # =================================================

        "user": current_user.full_name,

        # =================================================
        # DATES
        # =================================================

        "dashboard_date": today.isoformat(),

        "current_month": (
            f"{selected_date.year}-"
            f"{selected_date.month:02d}"
        ),

        "selected_month": (
            f"{selected_date.year}-"
            f"{selected_date.month:02d}"
        ),

        # =================================================
        # FINANCIAL SUMMARY
        # =================================================

        "financial_summary": {

            "total_income": round(
                float(total_income),
                2,
            ),

            "total_expenses": round(
                float(total_expenses),
                2,
            ),

            "net_cash_flow": round(
                net_cash_flow,
                2,
            ),

            "total_balance": round(
                total_balance,
                2,
            ),

            "monthly_income": round(
                float(monthly_income),
                2,
            ),

            "monthly_expenses": round(
                float(monthly_expenses),
                2,
            ),

            "monthly_net_cash_flow": round(
                monthly_net_cash_flow,
                2,
            ),
        },

        # =================================================
        # FINANCIAL HEALTH
        # =================================================

        "financial_health": {

            "score": financial_health_score,

            "status": financial_health_status,

            "savings_rate": round(
                savings_rate,
                2,
            ),

            "data_status": data_status,

            "components": {

                "savings_score": savings_score,

                "budget_score": budget_score,

                "cash_flow_score": cash_flow_score,

                "expense_score": expense_score,
            },
        },

        # =================================================
        # FINANCIAL INSIGHTS
        # =================================================

        "financial_insights": {

            "count": len(
                financial_insights
            ),

            "items": financial_insights,
        },

        # =================================================
        # SMART RECOMMENDATIONS
        # =================================================

        "financial_recommendations": {

            "count": len(
                financial_recommendations
            ),

            "items": financial_recommendations,
        },

        # =================================================
        # MONTHLY TREND
        # =================================================

        "monthly_trend": monthly_trend,

        # =================================================
        # SPENDING TREND ANALYSIS
        # =================================================

        "spending_trend_analysis": {

            "direction": trend_direction,

            "average_monthly_expenses": round(
                average_monthly_expenses,
                2,
            ),

            "highest_spending_month": (
                highest_expense_month["month"]
                if highest_expense_month
                else None
            ),

            "highest_spending_amount": (
                round(
                    highest_expense_month["expenses"],
                    2,
                )
                if highest_expense_month
                else 0
            ),

            "lowest_spending_month": (
                lowest_expense_month["month"]
                if lowest_expense_month
                else None
            ),

            "lowest_spending_amount": (
                round(
                    lowest_expense_month["expenses"],
                    2,
                )
                if lowest_expense_month
                else 0
            ),

            "change_percentage":
                spending_change_percentage,
        },

        # =================================================
        # EXPENSE SUMMARY
        # =================================================

        "expense_summary": {

            "expense_records":
                expense_records,

            "monthly_expense_records":
                monthly_expense_records,

            "average_expense": round(
                average_expense,
                2,
            ),

            "categorized_expenses": round(
                categorized_expenses,
                2,
            ),

            "uncategorized_expenses": round(
                uncategorized_expenses,
                2,
            ),
        },

        # =================================================
        # BUDGET
        # =================================================

        "budget": {

            "monthly_budget": round(
                monthly_budget,
                2,
            ),

            "spent": round(
                float(monthly_expenses),
                2,
            ),

            "remaining": round(
                remaining_budget,
                2,
            ),

            "used_percentage": round(
                budget_usage,
                2,
            ),

            "status": budget_status,
        },

        # =================================================
        # ACCOUNTS
        # =================================================

        "accounts": account_summary,

        "account_count": len(
            account_summary
        ),

        # =================================================
        # TOP CATEGORY
        # =================================================

        "top_category": (
            top_category.category
            if top_category
            else None
        ),

        "top_category_amount": (
            round(
                float(top_category.total),
                2,
            )
            if top_category
            else 0
        ),

        # =================================================
        # CATEGORY CHART
        # =================================================

        "category_summary": category_chart,

        # =================================================
        # HIGHEST EXPENSE
        # =================================================

        "highest_expense": (

            {
                "id": highest_expense.id,

                "title":
                    highest_expense.description,

                "amount": float(
                    highest_expense.amount or 0
                ),

                "date":
                    highest_expense.date,

                "category_id":
                    highest_expense.category_id,
            }

            if highest_expense

            else None
        ),

        # =================================================
        # RECENT TRANSACTIONS
        # =================================================

        "recent_transactions": [

            {
                "id":
                    transaction.id,

                "description":
                    transaction.description,

                "amount": float(
                    transaction.amount or 0
                ),

                "transaction_type":
                    transaction.transaction_type,

                "date":
                    transaction.date,

                "account_id":
                    transaction.account_id,

                "category_id":
                    transaction.category_id,
            }

            for transaction
            in recent_transactions
        ],
    }
