from datetime import date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.transaction import Transaction
from app.models.account import Account
from app.models.user import User
from app.models.category import Category

from app.core.dependencies import get_current_user

from app.schemas.transaction import (
    TransactionCreate,
    TransactionResponse,
)


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
)


# =========================================================
# CONSTANTS
# =========================================================

ALLOWED_TRANSACTION_TYPES = {
    "income",
    "expense",
    "transfer",
}


# =========================================================
# BULK DELETE REQUEST SCHEMA
# =========================================================

class BulkDeleteTransactionsRequest(BaseModel):
    transaction_ids: List[int]


# =========================================================
# VALIDATION
# =========================================================

def validate_transaction_type(
    transaction_type: str,
) -> str:

    value = (
        transaction_type or ""
    ).strip().lower()

    if value not in ALLOWED_TRANSACTION_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Transaction type must be "
                "income, expense, or transfer"
            ),
        )

    return value


def validate_amount(
    amount: float,
) -> None:

    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Transaction amount must be greater than 0",
        )


def validate_description(
    description: str,
) -> str:

    value = (
        description or ""
    ).strip()

    if not value:
        raise HTTPException(
            status_code=400,
            detail="Transaction description cannot be empty",
        )

    return value


# =========================================================
# ACCOUNT HELPERS
# =========================================================

def get_user_account(
    db: Session,
    account_id: int,
    user_id: int,
) -> Optional[Account]:

    return (
        db.query(Account)
        .filter(
            Account.id == account_id,
            Account.user_id == user_id,
        )
        .first()
    )


# =========================================================
# CATEGORY HELPERS
# =========================================================

def get_category(
    db: Session,
    category_id: int,
) -> Optional[Category]:

    return (
        db.query(Category)
        .filter(
            Category.id == category_id
        )
        .first()
    )


def validate_category(
    db: Session,
    category_id: Optional[int],
) -> Optional[Category]:

    if category_id is None:
        return None

    category = get_category(
        db,
        category_id,
    )

    if category is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid category.",
        )

    return category


# =========================================================
# ACCOUNT VALIDATION
# =========================================================

def validate_accounts(
    db: Session,
    user_id: int,
    transaction_type: str,
    account_id: int,
    destination_account_id: Optional[int],
):

    source_account = get_user_account(
        db,
        account_id,
        user_id,
    )

    if source_account is None:
        raise HTTPException(
            status_code=404,
            detail="Source account not found.",
        )

    destination_account = None

    # -----------------------------------------------------
    # TRANSFER
    # -----------------------------------------------------

    if transaction_type == "transfer":

        if destination_account_id is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Destination account is required "
                    "for transfers."
                ),
            )

        if destination_account_id == account_id:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Source and destination accounts "
                    "must be different."
                ),
            )

        destination_account = get_user_account(
            db,
            destination_account_id,
            user_id,
        )

        if destination_account is None:
            raise HTTPException(
                status_code=404,
                detail="Destination account not found.",
            )

    # -----------------------------------------------------
    # INCOME / EXPENSE
    # -----------------------------------------------------

    else:

        if destination_account_id is not None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Destination account can only be used "
                    "for transfers."
                ),
            )

    return (
        source_account,
        destination_account,
    )


# =========================================================
# APPLY BALANCE EFFECT
# =========================================================

def apply_transaction_effect(
    transaction_type: str,
    amount: float,
    source_account: Account,
    destination_account: Optional[Account],
):

    # -----------------------------------------------------
    # INCOME
    # -----------------------------------------------------

    if transaction_type == "income":

        source_account.balance += amount

    # -----------------------------------------------------
    # EXPENSE
    # -----------------------------------------------------

    elif transaction_type == "expense":

        source_account.balance -= amount

    # -----------------------------------------------------
    # TRANSFER
    # -----------------------------------------------------

    elif transaction_type == "transfer":

        if destination_account is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Destination account is required "
                    "for transfers."
                ),
            )

        source_account.balance -= amount

        destination_account.balance += amount


# =========================================================
# REVERSE BALANCE EFFECT
# Used when deleting/editing transactions
# =========================================================

def reverse_transaction_effect(
    transaction: Transaction,
    source_account: Optional[Account],
    destination_account: Optional[Account],
):

    amount = float(
        transaction.amount or 0
    )

    # -----------------------------------------------------
    # REVERSE INCOME
    # -----------------------------------------------------

    if transaction.transaction_type == "income":

        if source_account:
            source_account.balance -= amount

    # -----------------------------------------------------
    # REVERSE EXPENSE
    # -----------------------------------------------------

    elif transaction.transaction_type == "expense":

        if source_account:
            source_account.balance += amount

    # -----------------------------------------------------
    # REVERSE TRANSFER
    # -----------------------------------------------------

    elif transaction.transaction_type == "transfer":

        if source_account:
            source_account.balance += amount

        if destination_account:
            destination_account.balance -= amount


# =========================================================
# SERIALIZATION
# =========================================================

def serialize_transaction(
    transaction: Transaction,
):

    return {
        "id": transaction.id,

        "description": transaction.description,

        "amount": float(
            transaction.amount or 0
        ),

        "transaction_type": (
            transaction.transaction_type
        ),

        "date": transaction.date,

        "account_id": transaction.account_id,

        "account_name": (
            transaction.account.name
            if transaction.account
            else None
        ),

        "destination_account_id": (
            transaction.destination_account_id
        ),

        "destination_account_name": (
            transaction.destination_account.name
            if transaction.destination_account
            else None
        ),

        "user_id": transaction.user_id,

        "category_id": transaction.category_id,

        "category_name": (
            transaction.category.name
            if transaction.category
            else None
        ),
    }


# =========================================================
# CREATE TRANSACTION
# =========================================================

@router.post(
    "/",
    response_model=dict,
)
def create_transaction(
    transaction_data: TransactionCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):

    # -----------------------------------------------------
    # 1. VALIDATE TYPE
    # -----------------------------------------------------

    transaction_type = (
        validate_transaction_type(
            transaction_data.transaction_type
        )
    )

    # -----------------------------------------------------
    # 2. VALIDATE AMOUNT
    # -----------------------------------------------------

    validate_amount(
        transaction_data.amount
    )

    # -----------------------------------------------------
    # 3. VALIDATE DESCRIPTION
    # -----------------------------------------------------

    description = validate_description(
        transaction_data.description
    )

    # -----------------------------------------------------
    # 4. VALIDATE ACCOUNTS
    # -----------------------------------------------------

    source_account, destination_account = (
        validate_accounts(
            db=db,
            user_id=current_user.id,
            transaction_type=transaction_type,
            account_id=transaction_data.account_id,
            destination_account_id=(
                transaction_data.destination_account_id
            ),
        )
    )

    # -----------------------------------------------------
    # 5. VALIDATE CATEGORY
    # -----------------------------------------------------

    category = validate_category(
        db,
        transaction_data.category_id,
    )

    # -----------------------------------------------------
    # 6. CREATE TRANSACTION
    # -----------------------------------------------------

    transaction = Transaction(
        description=description,

        amount=transaction_data.amount,

        transaction_type=transaction_type,

        date=transaction_data.date,

        account_id=source_account.id,

        destination_account_id=(
            destination_account.id
            if destination_account
            else None
        ),

        user_id=current_user.id,

        category_id=(
            category.id
            if category
            else None
        ),
    )

    # -----------------------------------------------------
    # 7. APPLY BALANCE
    # -----------------------------------------------------

    try:

        apply_transaction_effect(
            transaction_type=transaction_type,

            amount=transaction_data.amount,

            source_account=source_account,

            destination_account=destination_account,
        )

        # -------------------------------------------------
        # 8. SAVE
        # -------------------------------------------------

        db.add(transaction)

        db.commit()

        db.refresh(transaction)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save transaction: "
                + str(e)
            ),
        )

    # -----------------------------------------------------
    # 9. RESPONSE
    # -----------------------------------------------------

    return {
        "message": (
            "Transaction created successfully"
        ),

        "transaction": serialize_transaction(
            transaction
        ),
    }


# =========================================================
# GET TRANSACTIONS
# =========================================================

@router.get("/")
def get_transactions(

    transaction_type: Optional[str] = Query(
        None,
    ),

    account_id: Optional[int] = Query(
        None,
    ),

    category_id: Optional[int] = Query(
        None,
    ),

    start_date: Optional[date] = Query(
        None,
    ),

    end_date: Optional[date] = Query(
        None,
    ),

    search: Optional[str] = Query(
        None,
    ),

    page: int = Query(
        1,
        ge=1,
    ),

    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):

    # -----------------------------------------------------
    # BASE QUERY
    # -----------------------------------------------------

    query = (
        db.query(Transaction)
        .filter(
            Transaction.user_id
            == current_user.id
        )
    )

    # -----------------------------------------------------
    # TYPE
    # -----------------------------------------------------

    if transaction_type:

        transaction_type = (
            validate_transaction_type(
                transaction_type
            )
        )

        query = query.filter(
            Transaction.transaction_type
            == transaction_type
        )

    # -----------------------------------------------------
    # ACCOUNT
    # -----------------------------------------------------

    if account_id is not None:

        account = get_user_account(
            db,
            account_id,
            current_user.id,
        )

        if account is None:
            raise HTTPException(
                status_code=404,
                detail="Account not found.",
            )

        query = query.filter(
            or_(
                Transaction.account_id
                == account_id,

                Transaction.destination_account_id
                == account_id,
            )
        )

    # -----------------------------------------------------
    # CATEGORY
    # -----------------------------------------------------

    if category_id is not None:

        category = validate_category(
            db,
            category_id,
        )

        if category is None:
            raise HTTPException(
                status_code=404,
                detail="Category not found.",
            )

        query = query.filter(
            Transaction.category_id
            == category_id
        )

    # -----------------------------------------------------
    # DATE VALIDATION
    # -----------------------------------------------------

    if (
        start_date
        and end_date
        and start_date > end_date
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "start_date cannot be later "
                "than end_date."
            ),
        )

    # -----------------------------------------------------
    # START DATE
    # -----------------------------------------------------

    if start_date:

        query = query.filter(
            Transaction.date >= start_date
        )

    # -----------------------------------------------------
    # END DATE
    # -----------------------------------------------------

    if end_date:

        query = query.filter(
            Transaction.date <= end_date
        )

    # -----------------------------------------------------
    # SEARCH
    # -----------------------------------------------------

    if search:

        search_value = search.strip()

        if search_value:

            query = query.filter(
                Transaction.description.ilike(
                    f"%{search_value}%"
                )
            )

    # -----------------------------------------------------
    # COUNT
    # -----------------------------------------------------

    total = query.count()

    # -----------------------------------------------------
    # PAGINATION
    # -----------------------------------------------------

    offset = (
        page - 1
    ) * limit

    transactions = (
        query
        .order_by(
            Transaction.date.desc(),
            Transaction.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    total_pages = (
        (total + limit - 1) // limit
        if total > 0
        else 0
    )

    return {
        "transactions": [
            serialize_transaction(
                transaction
            )
            for transaction in transactions
        ],

        "pagination": {
            "page": page,

            "limit": limit,

            "total": total,

            "total_pages": total_pages,

            "has_next": (
                page < total_pages
            ),

            "has_previous": (
                page > 1
            ),
        },
    }


# =========================================================
# TRANSACTION STATISTICS
# =========================================================

@router.get(
    "/statistics/summary"
)
def transaction_statistics(

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):

    user_id = current_user.id

    # -----------------------------------------------------
    # TOTAL TRANSACTIONS
    # -----------------------------------------------------

    total_transactions = (
        db.query(
            func.count(
                Transaction.id
            )
        )
        .filter(
            Transaction.user_id
            == user_id
        )
        .scalar()
        or 0
    )

    # -----------------------------------------------------
    # INCOME
    # -----------------------------------------------------

    total_income = (
        db.query(
            func.coalesce(
                func.sum(
                    Transaction.amount
                ),
                0,
            )
        )
        .filter(
            Transaction.user_id
            == user_id,

            Transaction.transaction_type
            == "income",
        )
        .scalar()
        or 0
    )

    # -----------------------------------------------------
    # EXPENSE
    # -----------------------------------------------------

    total_expense = (
        db.query(
            func.coalesce(
                func.sum(
                    Transaction.amount
                ),
                0,
            )
        )
        .filter(
            Transaction.user_id
            == user_id,

            Transaction.transaction_type
            == "expense",
        )
        .scalar()
        or 0
    )

    # -----------------------------------------------------
    # TRANSFER
    # -----------------------------------------------------

    total_transfer = (
        db.query(
            func.coalesce(
                func.sum(
                    Transaction.amount
                ),
                0,
            )
        )
        .filter(
            Transaction.user_id
            == user_id,

            Transaction.transaction_type
            == "transfer",
        )
        .scalar()
        or 0
    )

    # -----------------------------------------------------
    # COUNTS
    # -----------------------------------------------------

    income_count = (
        db.query(
            func.count(
                Transaction.id
            )
        )
        .filter(
            Transaction.user_id
            == user_id,

            Transaction.transaction_type
            == "income",
        )
        .scalar()
        or 0
    )

    expense_count = (
        db.query(
            func.count(
                Transaction.id
            )
        )
        .filter(
            Transaction.user_id
            == user_id,

            Transaction.transaction_type
            == "expense",
        )
        .scalar()
        or 0
    )

    transfer_count = (
        db.query(
            func.count(
                Transaction.id
            )
        )
        .filter(
            Transaction.user_id
            == user_id,

            Transaction.transaction_type
            == "transfer",
        )
        .scalar()
        or 0
    )

    # -----------------------------------------------------
    # NET CASH FLOW
    # -----------------------------------------------------

    net_cash_flow = (
        float(total_income)
        - float(total_expense)
    )

    return {
        "total_transactions": (
            total_transactions
        ),

        "income": {
            "count": income_count,
            "total": round(
                float(total_income),
                2,
            ),
        },

        "expense": {
            "count": expense_count,
            "total": round(
                float(total_expense),
                2,
            ),
        },

        "transfer": {
            "count": transfer_count,
            "total": round(
                float(total_transfer),
                2,
            ),
        },

        "net_cash_flow": round(
            net_cash_flow,
            2,
        ),
    }


# =========================================================
# CATEGORY SPENDING STATISTICS
# =========================================================

@router.get(
    "/statistics/categories"
)
def category_spending_statistics(

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):

    results = (
        db.query(
            Category.id.label(
                "category_id"
            ),

            Category.name.label(
                "category_name"
            ),

            func.count(
                Transaction.id
            ).label(
                "transaction_count"
            ),

            func.coalesce(
                func.sum(
                    Transaction.amount
                ),
                0,
            ).label(
                "total_amount"
            ),
        )

        .join(
            Transaction,
            Transaction.category_id
            == Category.id,
        )

        .filter(
            Transaction.user_id
            == current_user.id,

            Transaction.transaction_type
            == "expense",
        )

        .group_by(
            Category.id,
            Category.name,
        )

        .order_by(
            func.sum(
                Transaction.amount
            ).desc()
        )

        .all()
    )

    return {
        "categories": [
            {
                "category_id": row.category_id,

                "category_name": row.category_name,

                "transaction_count": (
                    row.transaction_count
                ),

                "total_amount": round(
                    float(
                        row.total_amount or 0
                    ),
                    2,
                ),
            }

            for row in results
        ]
    }


# =========================================================
# GET SINGLE TRANSACTION
# =========================================================

@router.get(
    "/{transaction_id}"
)
def get_transaction(

    transaction_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,

            Transaction.user_id
            == current_user.id,
        )
        .first()
    )

    if transaction is None:

        raise HTTPException(
            status_code=404,
            detail="Transaction not found.",
        )

    return {
        "transaction": serialize_transaction(
            transaction
        )
    }


# =========================================================
# UPDATE TRANSACTION
# =========================================================

@router.put(
    "/{transaction_id}",
    response_model=dict,
)
def update_transaction(

    transaction_id: int,

    transaction_data: TransactionCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):

    # -----------------------------------------------------
    # 1. FIND EXISTING TRANSACTION
    # -----------------------------------------------------

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,

            Transaction.user_id
            == current_user.id,
        )
        .first()
    )

    if transaction is None:

        raise HTTPException(
            status_code=404,
            detail="Transaction not found.",
        )

    # -----------------------------------------------------
    # 2. VALIDATE NEW DATA
    # -----------------------------------------------------

    transaction_type = (
        validate_transaction_type(
            transaction_data.transaction_type
        )
    )

    validate_amount(
        transaction_data.amount
    )

    description = validate_description(
        transaction_data.description
    )

    # -----------------------------------------------------
    # 3. GET OLD ACCOUNTS
    # -----------------------------------------------------

    old_source_account = get_user_account(
        db,
        transaction.account_id,
        current_user.id,
    )

    old_destination_account = None

    if transaction.destination_account_id is not None:

        old_destination_account = get_user_account(
            db,
            transaction.destination_account_id,
            current_user.id,
        )

    # -----------------------------------------------------
    # 4. REVERSE OLD BALANCE
    # -----------------------------------------------------

    reverse_transaction_effect(
        transaction,
        old_source_account,
        old_destination_account,
    )

    # -----------------------------------------------------
    # 5. VALIDATE NEW ACCOUNTS
    # -----------------------------------------------------

    new_source_account, new_destination_account = (
        validate_accounts(
            db=db,

            user_id=current_user.id,

            transaction_type=transaction_type,

            account_id=transaction_data.account_id,

            destination_account_id=(
                transaction_data.destination_account_id
            ),
        )
    )

    # -----------------------------------------------------
    # 6. VALIDATE CATEGORY
    # -----------------------------------------------------

    category = validate_category(
        db,
        transaction_data.category_id,
    )

    # -----------------------------------------------------
    # 7. UPDATE TRANSACTION
    # -----------------------------------------------------

    transaction.description = description

    transaction.amount = (
        transaction_data.amount
    )

    transaction.transaction_type = (
        transaction_type
    )

    transaction.date = (
        transaction_data.date
    )

    transaction.account_id = (
        new_source_account.id
    )

    transaction.destination_account_id = (
        new_destination_account.id
        if new_destination_account
        else None
    )

    transaction.category_id = (
        category.id
        if category
        else None
    )

    # -----------------------------------------------------
    # 8. APPLY NEW BALANCE
    # -----------------------------------------------------

    apply_transaction_effect(
        transaction_type=transaction_type,

        amount=transaction_data.amount,

        source_account=new_source_account,

        destination_account=new_destination_account,
    )

    # -----------------------------------------------------
    # 9. SAVE
    # -----------------------------------------------------

    try:

        db.commit()

        db.refresh(transaction)

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to update transaction: "
                + str(e)
            ),
        )

    # -----------------------------------------------------
    # 10. RESPONSE
    # -----------------------------------------------------

    return {
        "message": (
            "Transaction updated successfully"
        ),

        "transaction": serialize_transaction(
            transaction
        ),
    }


# =========================================================
# BULK DELETE TRANSACTIONS
#
# IMPORTANT:
# Balance is reversed for EVERY transaction before
# deleting the transactions.
# =========================================================

@router.delete(
    "/bulk"
)
def bulk_delete_transactions(

    request: BulkDeleteTransactionsRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):

    # -----------------------------------------------------
    # 1. GET TRANSACTION IDS
    # -----------------------------------------------------

    transaction_ids = list(
        set(request.transaction_ids)
    )

    # -----------------------------------------------------
    # 2. VALIDATE IDS
    # -----------------------------------------------------

    if not transaction_ids:

        raise HTTPException(
            status_code=400,
            detail="No transaction IDs were provided.",
        )

    # -----------------------------------------------------
    # 3. FIND TRANSACTIONS
    #
    # IMPORTANT:
    # Only transactions belonging to the current user
    # are allowed to be deleted.
    # -----------------------------------------------------

    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.id.in_(transaction_ids),

            Transaction.user_id
            == current_user.id,
        )
        .all()
    )

    # -----------------------------------------------------
    # 4. CHECK MISSING TRANSACTIONS
    # -----------------------------------------------------

    found_ids = {
        transaction.id
        for transaction in transactions
    }

    missing_ids = [
        transaction_id
        for transaction_id in transaction_ids
        if transaction_id not in found_ids
    ]

    if missing_ids:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Transaction(s) not found: "
                f"{missing_ids}"
            ),
        )

    # -----------------------------------------------------
    # 5. REVERSE BALANCES
    # -----------------------------------------------------

    try:

        for transaction in transactions:

            # ---------------------------------------------
            # SOURCE ACCOUNT
            # ---------------------------------------------

            source_account = get_user_account(
                db,

                transaction.account_id,

                current_user.id,
            )

            # ---------------------------------------------
            # DESTINATION ACCOUNT
            # ---------------------------------------------

            destination_account = None

            if transaction.destination_account_id:

                destination_account = get_user_account(
                    db,

                    transaction.destination_account_id,

                    current_user.id,
                )

            # ---------------------------------------------
            # REVERSE BALANCE EFFECT
            # ---------------------------------------------

            reverse_transaction_effect(
                transaction,

                source_account,

                destination_account,
            )

        # -------------------------------------------------
        # 6. DELETE ALL TRANSACTIONS
        # -------------------------------------------------

        for transaction in transactions:

            db.delete(transaction)

        # -------------------------------------------------
        # 7. COMMIT
        # -------------------------------------------------

        db.commit()

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to delete selected "
                "transactions: "
                + str(e)
            ),
        )

    # -----------------------------------------------------
    # 8. RESPONSE
    # -----------------------------------------------------

    return {
        "message": (
            f"{len(transactions)} transaction(s) "
            "deleted successfully."
        ),

        "deleted_count": (
            len(transactions)
        ),

        "deleted_transaction_ids": [
            transaction.id
            for transaction in transactions
        ],
    }


# =========================================================
# DELETE SINGLE TRANSACTION
#
# IMPORTANT:
# Balance is reversed before deletion.
# =========================================================

@router.delete(
    "/{transaction_id}"
)
def delete_transaction(

    transaction_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        get_current_user
    ),
):

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,

            Transaction.user_id
            == current_user.id,
        )
        .first()
    )

    if transaction is None:

        raise HTTPException(
            status_code=404,
            detail="Transaction not found.",
        )

    # -----------------------------------------------------
    # SOURCE ACCOUNT
    # -----------------------------------------------------

    source_account = get_user_account(
        db,

        transaction.account_id,

        current_user.id,
    )

    # -----------------------------------------------------
    # DESTINATION ACCOUNT
    # -----------------------------------------------------

    destination_account = None

    if transaction.destination_account_id:

        destination_account = get_user_account(
            db,

            transaction.destination_account_id,

            current_user.id,
        )

    try:

        # -------------------------------------------------
        # REVERSE BALANCE
        # -------------------------------------------------

        reverse_transaction_effect(
            transaction,

            source_account,

            destination_account,
        )

        # -------------------------------------------------
        # DELETE TRANSACTION
        # -------------------------------------------------

        db.delete(transaction)

        # -------------------------------------------------
        # COMMIT
        # -------------------------------------------------

        db.commit()

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to delete transaction: "
                + str(e)
            ),
        )

    return {
        "message": (
            "Transaction deleted successfully"
        )
    }
