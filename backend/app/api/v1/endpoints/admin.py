from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.expense import Expense
from app.core.dependencies import get_current_admin

from app.utils.money_utils import (
    money_to_float,
    round_money,
)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# -----------------------------------------
# ADMIN DASHBOARD
# -----------------------------------------

@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):

    total_users = db.query(User).count()

    active_users = (
        db.query(User)
        .filter(User.is_active == True)
        .count()
    )

    inactive_users = (
        db.query(User)
        .filter(User.is_active == False)
        .count()
    )

    total_admins = (
        db.query(User)
        .filter(User.role == "admin")
        .count()
    )

    # -----------------------------
    # EXPENSE STATISTICS
    # -----------------------------

    total_expenses = db.query(Expense).count()

    total_expense_amount = (
        db.query(Expense.amount)
        .all()
    )

    total_expense_value = sum(
        money_to_float(expense.amount)
        for expense in total_expense_amount
    )


    return {
        "status": "success",
        "message": "Admin Dashboard",

        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": inactive_users,
            "admins": total_admins
        },

        "expenses": {
            "total": total_expenses,
            "total_amount": round_money(total_expense_value)
        }
    }


# -----------------------------------------
# VIEW ALL USERS
# -----------------------------------------

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    users = db.query(User).all()

    return [
        {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "company_name": user.company_name,
            "role": user.role
        }
        for user in users
    ]

# -----------------------------------------
# VIEW SINGLE USER
# -----------------------------------------

@router.get("/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        return {
            "status": "error",
            "message": "User not found"
        }

    return {
        "status": "success",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "company_name": user.company_name,
            "role": user.role
        }
    }

# -----------------------------------------
# ACTIVATE / DEACTIVATE USER
# -----------------------------------------

@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        return {
            "status": "error",
            "message": "User not found"
        }

    # Prevent admin from disabling their own account
    if user.id == admin.id and not is_active:
        return {
            "status": "error",
            "message": "You cannot deactivate your own admin account"
        }

    user.is_active = is_active
    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "message": "User activated successfully"
        if is_active
        else "User deactivated successfully",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "is_active": user.is_active
        }
    }

 # -----------------------------------------
# CHANGE USER ROLE
# -----------------------------------------

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        return {
            "status": "error",
            "message": "User not found"
        }

    allowed_roles = ["user", "admin"]

    if role not in allowed_roles:
        return {
            "status": "error",
            "message": "Invalid role. Allowed roles: user, admin"
        }

    
    if user.id == admin.id and role != "admin":
        return {
            "status": "error",
            "message": "You cannot remove your own admin role"
        }

    user.role = role

    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "message": "User role updated successfully",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active
        }
    }
