from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.expense import Expense
from app.models.category import Category
from app.models.budget import Budget


def generate_insight(
    db: Session,
    user_id: int
):
    # =====================================================
    # TOTAL SPENDING
    # =====================================================

    total_amount = db.query(
        func.sum(Expense.amount)
    ).filter(
        Expense.user_id == user_id
    ).scalar() or 0


    # =====================================================
    # EXPENSE COUNT
    # =====================================================

    expense_count = db.query(
        func.count(Expense.id)
    ).filter(
        Expense.user_id == user_id
    ).scalar() or 0


    # =====================================================
    # NO EXPENSES
    # =====================================================

    if expense_count == 0:
        return {
            "message": "No expenses available yet",
            "advice": "Start adding expenses to get AI insights.",
            "total_spending": 0,
            "expense_count": 0,
            "top_category": None,
            "top_category_amount": 0,
            "average_expense": 0,
            "monthly_budget": 0,
            "remaining_budget": 0,
            "budget_used_percentage": 0
        }


    # =====================================================
    # AVERAGE EXPENSE
    # =====================================================

    average_expense = (
        total_amount / expense_count
    )


    # =====================================================
    # CATEGORY ANALYSIS
    # =====================================================

    category_data = (
        db.query(
            Category.name,
            func.sum(Expense.amount).label("total")
        )
        .join(
            Expense,
            Expense.category_id == Category.id
        )
        .filter(
            Expense.user_id == user_id
        )
        .group_by(
            Category.name
        )
        .order_by(
            func.sum(Expense.amount).desc()
        )
        .all()
    )


    top_category = (
        category_data[0][0]
        if category_data
        else None
    )

    top_amount = (
        category_data[0][1]
        if category_data
        else 0
    )


    # =====================================================
    # BUDGET ANALYSIS
    # =====================================================

    budget = db.query(Budget).filter(
        Budget.user_id == user_id
    ).first()


    monthly_budget = (
        budget.monthly_budget
        if budget
        else 0
    )


    remaining_budget = (
        monthly_budget - total_amount
        if monthly_budget > 0
        else 0
    )


    budget_used_percentage = (
        (total_amount / monthly_budget) * 100
        if monthly_budget > 0
        else 0
    )


    # =====================================================
    # AI ADVICE
    # =====================================================

    if monthly_budget <= 0:

        advice = (
            "Set a monthly budget to receive "
            "more accurate financial insights."
        )

    elif total_amount > monthly_budget:

        advice = (
            f"You have exceeded your monthly budget by "
            f"₹{abs(remaining_budget):.2f}. "
            f"Consider reducing spending, especially in "
            f"{top_category}."
        )

    elif budget_used_percentage >= 80:

        advice = (
            f"You have used {budget_used_percentage:.1f}% "
            f"of your monthly budget. "
            f"Try to reduce unnecessary spending."
        )

    elif budget_used_percentage >= 50:

        advice = (
            f"You have used {budget_used_percentage:.1f}% "
            f"of your monthly budget. "
            f"Keep monitoring your expenses."
        )

    else:

        advice = (
            "Your spending is currently under control. "
            "Continue tracking your expenses regularly."
        )


    # =====================================================
    # CATEGORY ADVICE
    # =====================================================

    category_advice = None

    if top_category:

        category_percentage = (
            (top_amount / total_amount) * 100
            if total_amount > 0
            else 0
        )

        if category_percentage >= 50:

            category_advice = (
                f"{top_category} accounts for "
                f"{category_percentage:.1f}% of your "
                f"total spending. Consider reviewing "
                f"this category."
            )

        else:

            category_advice = (
                f"{top_category} is your highest spending "
                f"category at ₹{top_amount:.2f}."
            )


    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return {
        "message": (
            f"Your highest spending category is "
            f"{top_category}"
        ),

        "top_category": top_category,

        "top_category_amount": top_amount,

        "total_spending": total_amount,

        "expense_count": expense_count,

        "average_expense": round(
            average_expense,
            2
        ),

        "monthly_budget": monthly_budget,

        "remaining_budget": remaining_budget,

        "budget_used_percentage": round(
            budget_used_percentage,
            2
        ),

        "advice": advice,

        "category_advice": category_advice
    }