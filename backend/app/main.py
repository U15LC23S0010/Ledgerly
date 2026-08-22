
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

# =========================================================
# DATABASE
# =========================================================

from app.db.database import Base, engine, SessionLocal
from app.db.seed import seed_default_categories

# =========================================================
# MODELS
# =========================================================
# Import all models so SQLAlchemy metadata knows about them.
# =========================================================

from app.models.user import User
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.category import Category
from app.models.refresh_token import RefreshToken
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.vendor import Vendor
from app.models.otp import OTPVerification

# =========================================================
# ROUTERS
# =========================================================

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.expenses import router as expenses_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.budget import router as budget_router
from app.api.v1.endpoints.auto_expense import router as auto_expense_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.categories import router as category_router
from app.api.v1.endpoints.insights import router as insights_router
from app.api.v1.endpoints.accounts import router as accounts_router
from app.api.v1.endpoints.customers import router as customers_router
from app.api.v1.endpoints.transactions import router as transactions_router
from app.api.v1.endpoints.invoices import router as invoices_router
from app.api.v1.endpoints.vendors import router as vendors_router
from app.api.v1.endpoints.reports import router as reports_router


# =========================================================
# APPLICATION LIFESPAN
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown logic.
    """

    # -----------------------------------------------------
    # STARTUP
    # -----------------------------------------------------

    # Create tables if they do not already exist.
    #
    # This is mainly useful for local development/testing.
    # In production, Alembic migrations should be preferred.
    Base.metadata.create_all(bind=engine)

    # Seed default categories.
    db = SessionLocal()

    try:
        seed_default_categories(db)
    finally:
        db.close()

    yield

    # -----------------------------------------------------
    # SHUTDOWN
    # -----------------------------------------------------
    # Nothing is required here currently.


# =========================================================
# CREATE FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="Ledgerly - Smart Bookkeeping",
    description="Smart bookkeeping and financial management platform.",
    version="1.0.0",
    lifespan=lifespan,
)


# =========================================================
# CORS
# =========================================================

allowed_origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# AUTHENTICATION APIs
# =========================================================

app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication"],
)


# =========================================================
# EXPENSE APIs
# =========================================================

app.include_router(
    expenses_router,
    prefix="/api/v1/expenses",
    tags=["Expenses"],
)


# =========================================================
# ANALYTICS APIs
# =========================================================

app.include_router(
    analytics_router,
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


# =========================================================
# BUDGET APIs
# =========================================================

app.include_router(
    budget_router,
    prefix="/api/v1",
    tags=["Budget"],
)


# =========================================================
# DASHBOARD APIs
# =========================================================

app.include_router(
    dashboard_router,
    prefix="/api/v1/dashboard",
    tags=["Dashboard"],
)


# =========================================================
# CATEGORY APIs
# =========================================================

app.include_router(
    category_router,
    prefix="/api/v1",
    tags=["Categories"],
)


# =========================================================
# AI INSIGHTS APIs
# =========================================================

app.include_router(
    insights_router,
    prefix="/api/v1",
    tags=["AI Insights"],
)


# =========================================================
# AUTO EXPENSE APIs
# =========================================================

app.include_router(
    auto_expense_router,
    prefix="/api/v1",
    tags=["Auto Expense"],
)


# =========================================================
# ACCOUNTS APIs
# =========================================================

app.include_router(
    accounts_router,
    prefix="/api/v1",
    tags=["Bookkeeping"],
)


# =========================================================
# TRANSACTIONS APIs
# =========================================================

app.include_router(
    transactions_router,
    prefix="/api/v1",
    tags=["Transactions"],
)


# =========================================================
# CUSTOMERS APIs
# =========================================================

app.include_router(
    customers_router,
    prefix="/api/v1/customers",
    tags=["Customers"],
)


# =========================================================
# VENDORS APIs
# =========================================================

app.include_router(
    vendors_router,
    prefix="/api/v1",
    tags=["Vendors"],
)


# =========================================================
# INVOICES APIs
# =========================================================

app.include_router(
    invoices_router,
    prefix="/api/v1/invoices",
    tags=["Invoices"],
)


# =========================================================
# REPORTS APIs
# =========================================================

app.include_router(
    reports_router,
    prefix="/api/v1",
    tags=["Reports"],
)


# =========================================================
# ADMIN APIs
# =========================================================

app.include_router(
    admin_router,
    prefix="/api/v1",
    tags=["Admin"],
)


# =========================================================
# ROOT API
# =========================================================

@app.get("/")
def home():
    return {
        "message": "LedgerFlow AI Backend Running",
        "status": "success",
        "environment": settings.APP_ENV,
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "message": "Server is healthy",
        "status": "success",
    }
