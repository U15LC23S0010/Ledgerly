from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.account import Account
from app.models.user import User
from app.schemas.account import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
)
from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/accounts",
    tags=["Accounts"],
)


VALID_ACCOUNT_TYPES = {
    "asset",
    "liability",
    "equity",
    "revenue",
    "expense",
}


# =========================================================
# CREATE ACCOUNT
# =========================================================

@router.post(
    "/",
    response_model=AccountResponse,
)
def create_account(
    account: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account_type = (
        account.account_type.strip().lower()
    )

    if account_type not in VALID_ACCOUNT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid account type. Use: "
                "asset, liability, equity, revenue, expense"
            ),
        )

    existing = (
        db.query(Account)
        .filter(
            Account.name == account.name.strip(),
            Account.user_id == current_user.id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Account already exists",
        )

    new_account = Account(
        name=account.name.strip(),
        account_type=account_type,
        balance=account.balance,
        user_id=current_user.id,
    )

    try:
        db.add(new_account)
        db.commit()
        db.refresh(new_account)

    except Exception:
        db.rollback()
        raise

    return new_account


# =========================================================
# GET ALL ACCOUNTS
# =========================================================

@router.get(
    "/",
    response_model=list[AccountResponse],
)
def get_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Account)
        .filter(
            Account.user_id == current_user.id
        )
        .order_by(Account.name.asc())
        .all()
    )


# =========================================================
# BULK DELETE ACCOUNTS
#
# IMPORTANT:
# This route MUST come BEFORE /{account_id}
# so "bulk" is not interpreted as an integer account_id.
# =========================================================

@router.delete("/bulk")
def bulk_delete_accounts(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account_ids = data.get("account_ids")

    # -----------------------------------------------------
    # Validate request
    # -----------------------------------------------------

    if not isinstance(account_ids, list):
        raise HTTPException(
            status_code=400,
            detail="account_ids must be a list",
        )

    if len(account_ids) == 0:
        raise HTTPException(
            status_code=400,
            detail="No accounts selected",
        )

    # -----------------------------------------------------
    # Convert IDs to integers
    # -----------------------------------------------------

    try:
        account_ids = [
            int(account_id)
            for account_id in account_ids
        ]

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="All account IDs must be valid integers",
        )

    # Remove duplicates
    account_ids = list(set(account_ids))

    # -----------------------------------------------------
    # Get only accounts belonging to current user
    # -----------------------------------------------------

    accounts = (
        db.query(Account)
        .filter(
            Account.id.in_(account_ids),
            Account.user_id == current_user.id,
        )
        .all()
    )

    # -----------------------------------------------------
    # Make sure every requested account belongs to user
    # -----------------------------------------------------

    found_ids = {
        account.id
        for account in accounts
    }

    missing_ids = [
        account_id
        for account_id in account_ids
        if account_id not in found_ids
    ]

    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail="One or more accounts were not found",
        )

    # -----------------------------------------------------
    # Delete
    # -----------------------------------------------------

    try:
        for account in accounts:
            db.delete(account)

        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to delete selected accounts. "
                "Make sure the accounts are not being used "
                "by other records."
            ),
        ) from exc

    return {
        "message": (
            f"{len(accounts)} account"
            f"{'s' if len(accounts) != 1 else ''} "
            "deleted successfully"
        ),
        "deleted_count": len(accounts),
        "account_ids": account_ids,
    }


# =========================================================
# GET ACCOUNT BY ID
#
# IMPORTANT:
# This comes AFTER /bulk.
# =========================================================

@router.get(
    "/{account_id}",
    response_model=AccountResponse,
)
def get_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = (
        db.query(Account)
        .filter(
            Account.id == account_id,
            Account.user_id == current_user.id,
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Account not found",
        )

    return account


# =========================================================
# UPDATE ACCOUNT
# =========================================================

@router.put(
    "/{account_id}",
    response_model=AccountResponse,
)
def update_account(
    account_id: int,
    account_data: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = (
        db.query(Account)
        .filter(
            Account.id == account_id,
            Account.user_id == current_user.id,
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Account not found",
        )

    account_type = (
        account_data.account_type.strip().lower()
    )

    if account_type not in VALID_ACCOUNT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid account type. Use: "
                "asset, liability, equity, revenue, expense"
            ),
        )

    # Check duplicate account name
    duplicate = (
        db.query(Account)
        .filter(
            Account.name == account_data.name.strip(),
            Account.user_id == current_user.id,
            Account.id != account_id,
        )
        .first()
    )

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Account already exists",
        )

    account.name = account_data.name.strip()
    account.account_type = account_type
    account.balance = account_data.balance

    try:
        db.commit()
        db.refresh(account)

    except Exception:
        db.rollback()
        raise

    return account


# =========================================================
# DELETE SINGLE ACCOUNT
# =========================================================

@router.delete(
    "/{account_id}",
)
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = (
        db.query(Account)
        .filter(
            Account.id == account_id,
            Account.user_id == current_user.id,
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Account not found",
        )

    try:
        db.delete(account)
        db.commit()

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to delete this account. "
                "Make sure it is not being used "
                "by other records."
            ),
        ) from exc

    return {
        "message": "Account deleted successfully",
        "account_id": account_id,
    }
