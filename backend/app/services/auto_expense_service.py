import re
from datetime import date, timedelta
from app.utils.date_utils import get_today


CATEGORY_KEYWORDS = {
    "Food": [
        "food",
        "pizza",
        "restaurant",
        "lunch",
        "dinner",
        "breakfast",
        "snack",
        "snacks",
        "coffee",
        "tea",
        "burger",
        "swiggy",
        "zomato",
        "grocery",
        "groceries",
        "meal",
        "canteen",
        "bakery",
        "cake",
        "juice",
        "drink",
    ],

    "Transport": [
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
        "metro",
        "rickshaw",
        "cab",
        "parking",
        "toll",
    ],

    "Shopping": [
        "shopping",
        "clothes",
        "clothing",
        "shoes",
        "shoe",
        "dress",
        "shirt",
        "pants",
        "amazon",
        "flipkart",
        "myntra",
        "purchase",
        "purchased",
        "bought",
        "electronics",
        "headphones",
        "laptop",
        "computer",
        "phone",
        "watch",
        "bag",
    ],

    "Health": [
        "medicine",
        "medical",
        "doctor",
        "hospital",
        "pharmacy",
        "health",
        "clinic",
        "tablet",
        "treatment",
        "dentist",
        "dental",
    ],

    "Personal Care": [
        "spa",
        "salon",
        "haircut",
        "hair",
        "beauty",
        "facial",
        "massage",
        "grooming",
        "shampoo",
        "cosmetics",
        "skincare",
        "skin care",
        "makeup",
        "parlour",
        "parlor",
    ],

    "Entertainment": [
        "movie",
        "cinema",
        "netflix",
        "prime video",
        "spotify",
        "game",
        "gaming",
        "entertainment",
        "concert",
        "subscription",
        "youtube premium",
    ],

    "Bills": [
        "electricity",
        "electric",
        "water bill",
        "water",
        "internet",
        "wifi",
        "mobile bill",
        "phone bill",
        "recharge",
        "rent",
        "bill",
        "bills",
        "utility",
        "utilities",
        "gas bill",
        "gas",
    ],

    "Education": [
        "college",
        "school",
        "course",
        "book",
        "books",
        "education",
        "exam",
        "tuition",
        "fee",
        "fees",
        "udemy",
        "coursera",
        "training",
        "class",
    ],

    "Travel": [
        "hotel",
        "flight",
        "travel",
        "trip",
        "booking",
        "airbnb",
        "vacation",
        "tour",
        "resort",
    ],
}


def extract_amount(text: str) -> float:
    """
    Extract amount from natural language.

    Examples:
        ₹500 on pizza
        Rs 1200 for hotel
        spent 2500 on shoes
        coffee 150
        600 on spa
    """

    text_lower = text.lower()

    patterns = [
        # ₹500 / Rs 500 / INR 500
        r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)",

        # spent 500 / paid 500 / cost 500
        r"(?:spent|paid|cost|worth)\s+(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)",

        # for 500 / on 500
        r"(?:for|on)\s+(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)",

        # 500 rupees
        r"\b([\d,]+(?:\.\d+)?)\s*(?:rupees|rs)\b",

        # standalone number
        r"\b([\d,]+(?:\.\d+)?)\b",
    ]

    for pattern in patterns:
        match = re.search(
            pattern,
            text_lower
        )

        if not match:
            continue

        try:
            amount = float(
                match.group(1).replace(",", "")
            )

            if amount > 0:
                return amount

        except (ValueError, TypeError):
            continue

    raise ValueError(
        "Could not find an amount in the expense text."
    )

def extract_category(text: str) -> str:
    """
    Detect expense category using keyword matching.
    """

    text_lower = text.lower()

    category_scores = {}

    for category, keywords in CATEGORY_KEYWORDS.items():

        score = 0

        for keyword in keywords:

            if keyword in text_lower:
                # Longer keywords are more specific.
                score += 1 + (len(keyword) / 100)

        if score > 0:
            category_scores[category] = score

    if not category_scores:
        return "Other"

    return max(
        category_scores,
        key=category_scores.get
    )


def extract_date(text: str) -> date:
    """
    Extract date from natural language.

    Supported:
        today
        yesterday
        day before yesterday
        tomorrow

    Also:
        DD/MM/YYYY
        DD-MM-YYYY
        YYYY-MM-DD
    """

    text_lower = text.lower()

    today = get_today()

    if "day before yesterday" in text_lower:
        return today - timedelta(days=2)

    if "yesterday" in text_lower:
        return today - timedelta(days=1)

    if "tomorrow" in text_lower:
        return today + timedelta(days=1)

    if "today" in text_lower:
        return today

    date_patterns = [
        r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b",
        r"\b(\d{1,2})-(\d{1,2})-(\d{4})\b",
        r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b",
    ]

    for pattern in date_patterns:

        match = re.search(
            pattern,
            text
        )

        if not match:
            continue

        try:

            values = list(
                map(
                    int,
                    match.groups()
                )
            )

            if pattern.startswith(
                r"\b(\d{4})"
            ):
                year, month, day = values
            else:
                day, month, year = values

            return date(
                year,
                month,
                day
            )

        except ValueError:
            continue

    return today


def clean_title(text: str) -> str:
    """
    Convert natural language into a clean expense title.

    Examples:

        I spent ₹500 on pizza yesterday
        -> Pizza

        600 on spa
        -> Spa

        Paid ₹1200 for petrol today
        -> Petrol

        Bought shoes for ₹2500
        -> Shoes

        Paid ₹800 for electricity bill
        -> Electricity Bill
    """

    title = text.strip()

    title = re.sub(
        r"(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d+)?",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"\b[\d,]+(?:\.\d+)?\s*(?:rupees|rs)\b",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"\b\d+(?:\.\d+)?\b",
        "",
        title
    )

    title = re.sub(
        r"\b(day before yesterday|yesterday|tomorrow|today)\b",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"\b\d{1,2}/\d{1,2}/\d{4}\b",
        "",
        title
    )

    title = re.sub(
        r"\b\d{1,2}-\d{1,2}-\d{4}\b",
        "",
        title
    )

    title = re.sub(
        r"\b\d{4}-\d{1,2}-\d{1,2}\b",
        "",
        title
    )


    title = re.sub(
        r"^\s*(i\s+)?spent\s+",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"^\s*(i\s+)?paid\s+",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"^\s*(i\s+)?bought\s+",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"^\s*(i\s+)?purchased\s+",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"^\s*(i\s+)?spent\s+money\s+on\s+",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"^\s*(for|on|at)\s+",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"\s+(for|on|at)\s*$",
        "",
        title,
        flags=re.IGNORECASE
    )

    title = re.sub(
        r"\b(an|a|the)\b",
        "",
        title,
        flags=re.IGNORECASE
    )


    title = re.sub(
        r"\s+",
        " ",
        title
    ).strip()

    title = re.sub(
        r"^[\s,:;-]+|[\s,:;-]+$",
        "",
        title
    )

    if not title:
        return "Expense"

    return title[:255].strip().capitalize()


def calculate_confidence(
    text: str,
    amount,
    category,
    expense_date,
    title
) -> float:
    """
    Calculate confidence for the rule-based AI parser.

    This prevents the API from always returning
    confidence = 0 when the parser successfully
    understands the expense.
    """

    confidence = 0.0

    if amount is not None and amount > 0:
        confidence += 0.35

    if category and category != "Other":
        confidence += 0.30

    if expense_date is not None:
        confidence += 0.20

    if title and title != "Expense":
        confidence += 0.15

    return round(
        min(confidence, 1.0),
        2
    )

def parse_expense_text(text: str):
    """
    Convert natural language into structured expense data.

    Examples:

        "I spent ₹500 on pizza yesterday"

        {
            "title": "Pizza",
            "amount": 500,
            "category": "Food",
            "date": yesterday,
            "confidence": 1.0
        }
    """

    if not text or not text.strip():
        raise ValueError(
            "Expense text cannot be empty."
        )

    text = text.strip()

    amount = extract_amount(text)

    category = extract_category(text)

    expense_date = extract_date(text)

    title = clean_title(text)

    confidence = calculate_confidence(
        text=text,
        amount=amount,
        category=category,
        expense_date=expense_date,
        title=title
    )

    result = {
        "title": title,
        "amount": amount,
        "category": category,
        "date": expense_date,
        "confidence": confidence,
        "reason": (
            "Expense details were extracted "
            "from the provided natural-language text."
        ),
        "suggestions": []
    }

    print(
        "AUTO EXPENSE PARSER:",
        result
    )

    return result
