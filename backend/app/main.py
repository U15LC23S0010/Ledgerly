from fastapi import FastAPI

from app.db.database import Base, engine

# =========================================================
# ROUTERS
# =========================================================

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.expenses import router as expenses_router
from app.api.v1.endpoints.recurring_expenses import router as recurring_expenses_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.budget import router as budget_router
from app.api.v1.endpoints.auto_expense import router as auto_expense_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.categories import router as category_router
from app.api.v1.endpoints.insights import router as insights_router


# =========================================================
# MODELS
# =========================================================

from app.models.user import User
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.category import Category
from app.models.recurring_expense import RecurringExpense
from app.models.refresh_token import RefreshToken


# =========================================================
# CREATE FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="LedgerFlow AI",
    description="AI Powered Expense Tracking Backend API",
    version="1.0.0"
)


# =========================================================
# DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# AUTHENTICATION APIs
# =========================================================

app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)


# =========================================================
# EXPENSE APIs
# =========================================================

app.include_router(
    expenses_router,
    prefix="/api/v1/expenses",
    tags=["Expenses"]
)


# =========================================================
# ANALYTICS APIs
# =========================================================

app.include_router(
    analytics_router,
    prefix="/api/v1/analytics",
    tags=["Analytics"]
)


# =========================================================
# BUDGET APIs
# =========================================================

app.include_router(
    budget_router,
    prefix="/api/v1",
    tags=["Budget"]
)


# =========================================================
# DASHBOARD APIs
# =========================================================

app.include_router(
    dashboard_router,
    prefix="/api/v1/dashboard",
    tags=["Dashboard"]
)


# =========================================================
# CATEGORY APIs
# =========================================================

app.include_router(
    category_router,
    prefix="/api/v1",
    tags=["Categories"]
)


# =========================================================
# AI INSIGHTS APIs
# =========================================================

app.include_router(
    insights_router,
    prefix="/api/v1",
    tags=["AI Insights"]
)


# =========================================================
# AUTO EXPENSE APIs
# =========================================================

app.include_router(
    auto_expense_router,
    prefix="/api/v1/auto-expense",
    tags=["Auto Expense"]
)


# =========================================================
# RECURRING EXPENSE APIs
# =========================================================

app.include_router(
    recurring_expenses_router,
    prefix="/api/v1/recurring-expenses",
    tags=["Recurring Expenses"]
)


# =========================================================
# ADMIN APIs
# =========================================================

app.include_router(
    admin_router,
    prefix="/api/v1",
    tags=["Admin"]
)


# =========================================================
# ROOT API
# =========================================================

@app.get("/")
def home():
    return {
        "message": "LedgerFlow AI Backend Running",
        "status": "success"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "message": "Server is healthy"
    }