import re
from datetime import date


def parse_expense_text(text: str):

    if not text or not text.strip():
        raise ValueError("Expense text cannot be empty")


    text_lower = text.lower().strip()


    # =====================================================
    # FIND AMOUNT
    # =====================================================

    amount_match = re.search(
        r"(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)",
        text_lower
    )

    if not amount_match:
        raise ValueError(
            "Could not find an amount in the expense text"
        )


    amount = float(amount_match.group(1))


    if amount <= 0:
        raise ValueError(
            "Expense amount must be greater than 0"
        )


    # =====================================================
    # CATEGORY DETECTION
    # =====================================================

    category = "Other"


    # Food
    food_keywords = [
        "food",
        "pizza",
        "restaurant",
        "lunch",
        "dinner",
        "breakfast",
        "snacks",
        "snack",
        "coffee",
        "burger",
        "hotel",
        "swiggy",
        "zomato",
        "grocery",
        "groceries"
    ]


    # Transport
    transport_keywords = [
        "petrol",
        "fuel",
        "diesel",
        "transport",
        "bus",
        "train",
        "taxi",
        "uber",
        "ola",
        "auto",
        "metro"
    ]


    # Shopping
    shopping_keywords = [
        "shopping",
        "clothes",
        "clothing",
        "shoes",
        "dress",
        "shirt",
        "amazon",
        "flipkart"
    ]


    # Health
    health_keywords = [
        "medicine",
        "medical",
        "doctor",
        "hospital",
        "pharmacy",
        "health"
    ]


    # Entertainment
    entertainment_keywords = [
        "movie",
        "cinema",
        "netflix",
        "game",
        "gaming",
        "entertainment"
    ]


    if any(
        keyword in text_lower
        for keyword in food_keywords
    ):
        category = "Food"


    elif any(
        keyword in text_lower
        for keyword in transport_keywords
    ):
        category = "Transport"


    elif any(
        keyword in text_lower
        for keyword in shopping_keywords
    ):
        category = "Shopping"


    elif any(
        keyword in text_lower
        for keyword in health_keywords
    ):
        category = "Health"


    elif any(
        keyword in text_lower
        for keyword in entertainment_keywords
    ):
        category = "Entertainment"


    # =====================================================
    # CLEAN TITLE
    # =====================================================

    title = text.strip()


    # =====================================================
    # RETURN STRUCTURED EXPENSE
    # =====================================================

    return {
        "title": title,
        "amount": amount,
        "category": category,
        "date": date.today()
    }