import logging
from calendar import monthrange
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.models.expense import Expense
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.budget import Budget
from app.models.invoice import Invoice
from app.models.customer import Customer

logger = logging.getLogger(__name__)
router = APIRouter()


class CopilotRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


def parse_date(value: Any, field_name: str):
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must use YYYY-MM-DD format.")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(
            f"{field_name} must use YYYY-MM-DD format."
        ) from exc


def validate_dates(start, end):
    if start and end and start > end:
        raise ValueError("Start date cannot be after end date.")


def safe_limit(value):
    if value is None:
        return 10
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError("limit must be an integer.")
    return max(1, min(value, 50))


def amount(value):
    return round(float(value or 0), 2)


def search_expenses(db, user_id, args):
    start = parse_date(args.get("start_date"), "start_date")
    end = parse_date(args.get("end_date"), "end_date")
    validate_dates(start, end)

    query = db.query(Expense).filter(Expense.user_id == user_id)

    if start:
        query = query.filter(Expense.date >= start)
    if end:
        query = query.filter(Expense.date <= end)

    keyword = args.get("keyword")
    if keyword:
        if not isinstance(keyword, str):
            raise ValueError("keyword must be text.")
        query = query.filter(Expense.title.ilike(f"%{keyword[:100]}%"))

    category_id = args.get("category_id")
    if category_id is not None:
        if isinstance(category_id, bool) or not isinstance(category_id, int):
            raise ValueError("category_id must be an integer.")
        query = query.filter(Expense.category_id == category_id)

    total = query.with_entities(func.sum(Expense.amount)).scalar()
    count = query.count()
    records = query.order_by(
        Expense.date.desc(), Expense.id.desc()
    ).limit(safe_limit(args.get("limit"))).all()

    return {
        "total_matching_expenses": amount(total),
        "matching_count": count,
        "records": [
            {
                "title": item.title,
                "amount": amount(item.amount),
                "date": item.date.isoformat(),
                "category": (
                    item.category.name if item.category else "Uncategorized"
                ),
            }
            for item in records
        ],
    }


def search_transactions(db, user_id, args):
    start = parse_date(args.get("start_date"), "start_date")
    end = parse_date(args.get("end_date"), "end_date")
    validate_dates(start, end)

    query = db.query(Transaction).filter(
        Transaction.user_id == user_id
    )

    if start:
        query = query.filter(Transaction.date >= start)
    if end:
        query = query.filter(Transaction.date <= end)

    keyword = args.get("keyword")
    if keyword:
        if not isinstance(keyword, str):
            raise ValueError("keyword must be text.")
        query = query.filter(
            Transaction.description.ilike(f"%{keyword[:100]}%")
        )

    transaction_type = args.get("transaction_type")
    if transaction_type:
        if transaction_type not in ("income", "expense", "transfer"):
            raise ValueError(
                "transaction_type must be income, expense, or transfer."
            )
        query = query.filter(
            Transaction.transaction_type == transaction_type
        )

    income = amount(
        query.filter(Transaction.transaction_type == "income")
        .with_entities(func.sum(Transaction.amount)).scalar()
    )
    expenses = amount(
        query.filter(Transaction.transaction_type == "expense")
        .with_entities(func.sum(Transaction.amount)).scalar()
    )
    transfers = amount(
        query.filter(Transaction.transaction_type == "transfer")
        .with_entities(func.sum(Transaction.amount)).scalar()
    )

    records = query.order_by(
        Transaction.date.desc(), Transaction.id.desc()
    ).limit(safe_limit(args.get("limit"))).all()

    return {
        "matching_count": query.count(),
        "income_total": income,
        "expense_total": expenses,
        "transfer_total": transfers,
        "net_cash_flow": round(income - expenses, 2),
        "records": [
            {
                "description": item.description,
                "amount": amount(item.amount),
                "type": item.transaction_type,
                "date": item.date.isoformat(),
                "account": item.account.name if item.account else None,
                "destination_account": (
                    item.destination_account.name
                    if item.destination_account else None
                ),
                "category": (
                    item.category.name if item.category else None
                ),
            }
            for item in records
        ],
    }


def get_accounts(db, user_id, args):
    accounts = db.query(Account).filter(
        Account.user_id == user_id
    ).order_by(Account.name.asc()).all()

    return {
        "account_count": len(accounts),
        "total_balance": amount(
            sum(float(item.balance or 0) for item in accounts)
        ),
        "accounts": [
            {
                "name": item.name,
                "type": item.account_type,
                "balance": amount(item.balance),
            }
            for item in accounts
        ],
    }


def get_budgets(db, user_id, args):
    today = date.today()
    month = args.get("month", today.month)
    year = args.get("year", today.year)

    if (
        isinstance(month, bool)
        or not isinstance(month, int)
        or not 1 <= month <= 12
    ):
        raise ValueError("month must be between 1 and 12.")

    if (
        isinstance(year, bool)
        or not isinstance(year, int)
        or not 2000 <= year <= 2100
    ):
        raise ValueError("year must be between 2000 and 2100.")

    budget = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.month == month,
        Budget.year == year,
    ).first()

    if not budget:
        return {
            "found": False,
            "month": month,
            "year": year,
            "message": "No budget exists for this month.",
        }

    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])

    spent = amount(
        db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "expense",
            Transaction.date >= start,
            Transaction.date <= end,
        ).scalar()
    )

    budget_amount = amount(budget.monthly_budget)

    return {
        "found": True,
        "month": month,
        "year": year,
        "budget": budget_amount,
        "spent": spent,
        "remaining": round(budget_amount - spent, 2),
        "used_percentage": (
            round(spent / budget_amount * 100, 2)
            if budget_amount else None
        ),
    }


def search_invoices(db, user_id, args):
    query = db.query(Invoice).filter(Invoice.user_id == user_id)

    status = args.get("status")
    if status:
        if not isinstance(status, str):
            raise ValueError("status must be text.")
        query = query.filter(Invoice.status == status[:50])

    start = parse_date(args.get("start_date"), "start_date")
    end = parse_date(args.get("end_date"), "end_date")
    validate_dates(start, end)

    if start:
        query = query.filter(Invoice.issue_date >= start)
    if end:
        query = query.filter(Invoice.issue_date <= end)

    total = query.with_entities(func.sum(Invoice.total)).scalar()
    count = query.count()

    invoices = query.order_by(
        Invoice.issue_date.desc(), Invoice.id.desc()
    ).limit(safe_limit(args.get("limit"))).all()

    return {
        "matching_count": count,
        "total_invoice_value": amount(total),
        "invoices": [
            {
                "invoice_number": item.invoice_number,
                "customer": item.customer.name if item.customer else None,
                "issue_date": (
                    item.issue_date.isoformat() if item.issue_date else None
                ),
                "due_date": (
                    item.due_date.isoformat() if item.due_date else None
                ),
                "total": amount(item.total),
                "status": item.status,
            }
            for item in invoices
        ],
    }


def search_customers(db, user_id, args):
    query = db.query(Customer).filter(Customer.user_id == user_id)

    keyword = args.get("keyword")
    if keyword:
        if not isinstance(keyword, str):
            raise ValueError("keyword must be text.")
        term = f"%{keyword[:100]}%"
        query = query.filter(
            or_(
                Customer.name.ilike(term),
                Customer.email.ilike(term),
            )
        )

    count = query.count()
    customers = query.order_by(
        Customer.name.asc()
    ).limit(safe_limit(args.get("limit"))).all()

    return {
        "matching_count": count,
        "customers": [
            {
                "name": item.name,
                "email": item.email,
                "phone": item.phone,
            }
            for item in customers
        ],
    }


def declaration(name, description, properties):
    return types.FunctionDeclaration(
        name=name,
        description=description,
        parameters={
            "type": "OBJECT",
            "properties": properties,
        },
    )


DATE_FIELDS = {
    "start_date": {
        "type": "STRING",
        "description": "Optional start date, YYYY-MM-DD.",
    },
    "end_date": {
        "type": "STRING",
        "description": "Optional end date, YYYY-MM-DD.",
    },
    "keyword": {
        "type": "STRING",
        "description": "Optional keyword to search for.",
    },
    "limit": {
        "type": "INTEGER",
        "description": "Maximum records to return, from 1 to 50.",
    },
}


TOOL_DECLARATIONS = [
    declaration(
        "search_expenses",
        "Search the authenticated user's expenses by dates, keyword, "
        "or category ID. Returns matching totals and records.",
        {
            **DATE_FIELDS,
            "category_id": {
                "type": "INTEGER",
                "description": "Optional expense category ID.",
            },
        },
    ),
    declaration(
        "search_transactions",
        "Search the user's transactions and summarize income, expenses, "
        "transfers and net cash flow. Transfers are excluded from net cash flow.",
        {
            **DATE_FIELDS,
            "transaction_type": {
                "type": "STRING",
                "enum": ["income", "expense", "transfer"],
            },
        },
    ),
    declaration(
        "get_accounts",
        "Get the user's accounts and current recorded balances.",
        {},
    ),
    declaration(
        "get_budgets",
        "Get the user's monthly budget and compare it with expense transactions.",
        {
            "month": {"type": "INTEGER"},
            "year": {"type": "INTEGER"},
        },
    ),
    declaration(
        "search_invoices",
        "Search the user's invoices by status and issue-date range.",
        {
            "start_date": DATE_FIELDS["start_date"],
            "end_date": DATE_FIELDS["end_date"],
            "status": {"type": "STRING"},
            "limit": DATE_FIELDS["limit"],
        },
    ),
    declaration(
        "search_customers",
        "Search the user's customers by name or email.",
        {
            "keyword": DATE_FIELDS["keyword"],
            "limit": DATE_FIELDS["limit"],
        },
    ),
]


TOOL_FUNCTIONS = {
    "search_expenses": search_expenses,
    "search_transactions": search_transactions,
    "get_accounts": get_accounts,
    "get_budgets": get_budgets,
    "search_invoices": search_invoices,
    "search_customers": search_customers,
}


SYSTEM_INSTRUCTION = """
You are Ledgerly's Financial Copilot, a practical and helpful
financial assistant built into a bookkeeping application.

YOUR PRIMARY RULE:
Answer the user's actual question directly. Do not turn a
straightforward question into an interview.

RESPONSE BEHAVIOR:
1. Start with the answer, result, or most useful recommendation.
2. Use available tools automatically when the question requires
   the user's financial records.
3. Do not ask the user to provide information that can be retrieved
   using the available tools.
4. Do not ask multiple follow-up questions.
5. Ask at most ONE short clarification question, and only when
   missing information makes a reliable answer impossible.
6. When details are missing but a useful general answer is possible,
   give that answer and clearly state any assumptions.
7. For broad questions such as "How can I save money?",
   provide practical advice immediately. Do not demand income,
   expenses, goals, or other personal details first.
8. For questions such as "How much did I spend this month?",
   retrieve the relevant records and give the total directly.
9. For requests for recommendations, give concrete next steps.
   Do not end every response by asking another question.
10. Do not repeatedly ask the user to clarify the same request.

USING LEDGERLY DATA:
- Use tools whenever they can answer questions about the user's
  expenses, transactions, accounts, budgets, invoices, or customers.
- Prefer the current month for questions about "this month" and
  the current year for questions about "this year".
- Interpret relative dates using today's date.
- When comparing periods, retrieve the relevant data for each period.
- Distinguish expenses from income and transfers.
- Expense records and transaction records are separate ledgers.
  Never combine their totals or assume they contain identical data.
- Budget spending is based on expense-type Transaction records.
- If a tool returns no records, explain that no matching records
  were found. Do not invent missing information.
- If a tool fails, be transparent instead of pretending it succeeded.

FINANCIAL ADVICE:
- Give practical, understandable recommendations.
- Use actual amounts and percentages when supported by the data.
- Distinguish recorded facts from estimates and general advice.
- Never fabricate balances, income, expenses, or savings.
- Do not claim to create, edit, or delete records; tools are read-only.
- Do not present uncertain predictions as guaranteed outcomes.

STYLE:
- Use simple, natural English.
- Be concise but sufficiently informative.
- Answer first, then give brief supporting details or steps.
- Use headings or bullet points when they improve readability.
- Use ₹ and INR for currency.
- Avoid generic disclaimers, unnecessary introductions, and
  repetitive closing questions.
- Do not ask a question merely to keep the conversation going.

EXAMPLES OF DESIRED BEHAVIOR:

User: "How can I reduce my spending?"
Good: Give three practical ways to reduce spending, suggesting that
the user review their largest categories if their records are available.
Do not first ask for their salary, goals, and monthly expenses.

User: "How much did I spend this month?"
Good: Use the appropriate tool, calculate the relevant total, and
report the amount and date range. Do not ask which month they mean.

User: "Can I afford to buy a laptop for ₹50,000?"
Good: Retrieve account balances and relevant financial records.
Explain what the available data supports. If affordability cannot
be established from recorded data alone, state the limitation and
give a useful conditional recommendation instead of asking a series
of questions.

User: "What is my biggest expense?"
Good: Search the relevant expense records and identify the largest
matching expense. Do not ask the user to name a category first.

Always prioritize a useful answer over unnecessary clarification.
"""

def get_candidate(response):
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return None
    return candidates[0]


def get_parts(content):
    return getattr(content, "parts", None) or []


def execute_tool(name, args, db, user_id):
    function = TOOL_FUNCTIONS.get(name)
    if function is None:
        return {"error": "Tool not permitted."}

    try:
        if not isinstance(args, dict):
            args = dict(args or {})
        return function(db, user_id, args)
    except (ValueError, TypeError) as exc:
        return {"error": str(exc)}
    except Exception:
        logger.exception("Copilot tool failed: %s", name)
        return {"error": "Unable to retrieve this information."}


@router.post("/copilot")
def ask_financial_copilot(
    request: CopilotRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured.",
        )

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        tool = types.Tool(function_declarations=TOOL_DECLARATIONS)

        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=request.message.strip())
                ],
            )
        ]

        tools_used = []

        for _ in range(3):
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    tools=[tool],
                    temperature=0.2,
                ),
            )

            candidate = get_candidate(response)
            if candidate is None:
                raise HTTPException(
                    status_code=502,
                    detail="Gemini returned no response candidate.",
                )

            model_content = getattr(candidate, "content", None)
            if model_content is None:
                # Do not dereference None. Return any available text;
                # otherwise log the finish reason for diagnosis.
                text_response = getattr(response, "text", None)
                if text_response:
                    return {
                        "answer": text_response,
                        "currency": "INR",
                        "tools_used": list(dict.fromkeys(tools_used)),
                    }

                logger.error(
                    "Gemini response has no content. Finish reason: %s",
                    getattr(candidate, "finish_reason", None),
                )
                raise HTTPException(
                    status_code=502,
                    detail=(
                        "Gemini returned no usable content. "
                        "Please retry your question."
                    ),
                )

            parts = get_parts(model_content)
            if not parts:
                text_response = getattr(response, "text", None)
                if text_response:
                    return {
                        "answer": text_response,
                        "currency": "INR",
                        "tools_used": list(dict.fromkeys(tools_used)),
                    }
                raise HTTPException(
                    status_code=502,
                    detail="Gemini returned empty content. Please retry.",
                )

            contents.append(model_content)

            calls = [
                part.function_call
                for part in parts
                if getattr(part, "function_call", None)
                and getattr(part.function_call, "name", None)
            ]

            if not calls:
                answer = getattr(response, "text", None)
                if not answer:
                    raise HTTPException(
                        status_code=502,
                        detail="Gemini returned an empty answer.",
                    )
                return {
                    "answer": answer,
                    "currency": "INR",
                    "tools_used": list(dict.fromkeys(tools_used)),
                }

            function_responses = []

            for call in calls:
                name = call.name
                args = dict(getattr(call, "args", None) or {})

                if name in TOOL_FUNCTIONS:
                    tools_used.append(name)

                result = execute_tool(
                    name,
                    args,
                    db,
                    current_user.id,
                )

                function_responses.append(
                    types.Part.from_function_response(
                        name=name,
                        response={"result": result},
                    )
                )

            contents.append(
                types.Content(
                    role="user",
                    parts=function_responses,
                )
            )

        # One final generation attempt after the tool-call limit.
        final_response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.2,
            ),
        )

        final_answer = getattr(final_response, "text", None)
        if not final_answer:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Gemini could not complete the answer after tool calls. "
                    "Please simplify the question and retry."
                ),
            )

        return {
            "answer": final_answer,
            "currency": "INR",
            "tools_used": list(dict.fromkeys(tools_used)),
        }

    except HTTPException:
        raise
    except Exception:
        logger.exception("Financial Copilot request failed")
        raise HTTPException(
            status_code=502,
            detail="The Financial Copilot failed to process this request. "
                   "Check the backend terminal for the underlying error.",
        )