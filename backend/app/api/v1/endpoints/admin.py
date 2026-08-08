from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.expense import Expense
from app.core.dependencies import get_current_user

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


def require_admin(
    current_user=Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user


# -----------------------------------------
# ADMIN DASHBOARD
# -----------------------------------------

@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    total_users = db.query(User).count()
    total_expenses = db.query(Expense).count()

    return {
        "message": "Admin Dashboard",
        "total_users": total_users,
        "total_expenses": total_expenses
    }


# -----------------------------------------
# VIEW ALL USERS
# -----------------------------------------

@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
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