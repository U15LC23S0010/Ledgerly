from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.customer import Customer
from app.models.user import User
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
)
from app.core.dependencies import get_current_user


router = APIRouter(
    tags=["Customers"],
)


# =========================================================
# CREATE CUSTOMER
# =========================================================

@router.post(
    "/",
    response_model=CustomerResponse,
)
def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer_name = customer_data.name.strip()

    if not customer_name:
        raise HTTPException(
            status_code=400,
            detail="Customer name is required.",
        )

    customer = Customer(
        name=customer_name,
        email=customer_data.email,
        phone=customer_data.phone,
        address=customer_data.address,
        notes=customer_data.notes,
        user_id=current_user.id,
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)

    return customer


# =========================================================
# GET ALL CUSTOMERS
# =========================================================

@router.get(
    "/",
    response_model=list[CustomerResponse],
)
def get_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Customer)
        .filter(
            Customer.user_id == current_user.id
        )
        .order_by(Customer.id.desc())
        .all()
    )


# =========================================================
# BULK DELETE CUSTOMERS
#
# IMPORTANT:
# This route MUST appear before /{customer_id}
# so "bulk-delete" is not interpreted as an integer ID.
# =========================================================

@router.delete("/bulk-delete")
def bulk_delete_customers(
    customer_ids: list[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # -----------------------------------------------------
    # Validate request
    # -----------------------------------------------------

    if not customer_ids:
        raise HTTPException(
            status_code=400,
            detail="No customers selected for deletion.",
        )

    # Remove duplicate IDs
    customer_ids = list(set(customer_ids))

    # -----------------------------------------------------
    # Find only customers belonging to current user
    # -----------------------------------------------------

    customers = (
        db.query(Customer)
        .filter(
            Customer.id.in_(customer_ids),
            Customer.user_id == current_user.id,
        )
        .all()
    )

    if not customers:
        raise HTTPException(
            status_code=404,
            detail="No selected customers were found.",
        )

    # -----------------------------------------------------
    # Make sure all requested IDs belong to current user
    # -----------------------------------------------------

    found_ids = {customer.id for customer in customers}
    missing_ids = set(customer_ids) - found_ids

    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail="One or more selected customers were not found.",
        )

    # -----------------------------------------------------
    # Delete
    #
    # Customer model has:
    #
    # invoices = relationship(
    #     "Invoice",
    #     back_populates="customer",
    #     cascade="all, delete-orphan"
    # )
    #
    # Therefore associated invoices may also be deleted.
    # -----------------------------------------------------

    try:
        for customer in customers:
            db.delete(customer)

        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to delete selected customers.",
        )

    return {
        "message": f"{len(customers)} customer(s) deleted successfully.",
        "deleted_count": len(customers),
        "deleted_ids": list(found_ids),
    }


# =========================================================
# GET CUSTOMER BY ID
# =========================================================

@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.user_id == current_user.id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    return customer


# =========================================================
# UPDATE CUSTOMER
# =========================================================

@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
)
def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.user_id == current_user.id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    customer_name = customer_data.name.strip()

    if not customer_name:
        raise HTTPException(
            status_code=400,
            detail="Customer name is required.",
        )

    customer.name = customer_name
    customer.email = customer_data.email
    customer.phone = customer_data.phone
    customer.address = customer_data.address
    customer.notes = customer_data.notes

    db.commit()
    db.refresh(customer)

    return customer


# =========================================================
# DELETE SINGLE CUSTOMER
# =========================================================

@router.delete(
    "/{customer_id}"
)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.user_id == current_user.id,
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    try:
        db.delete(customer)
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to delete customer.",
        )

    return {
        "message": "Customer deleted successfully",
        "deleted_id": customer_id,
    }