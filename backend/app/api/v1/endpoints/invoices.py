from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.dependencies import get_current_user

from app.models.user import User
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem

from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceResponse,
    InvoiceStatusUpdate,
)


router = APIRouter(
    tags=["Invoices"]
)


# =========================================================
# GENERATE INVOICE NUMBER
# =========================================================

def generate_invoice_number(db: Session) -> str:

    last_invoice = (
        db.query(Invoice)
        .order_by(Invoice.id.desc())
        .first()
    )

    if not last_invoice:
        next_number = 1
    else:
        next_number = last_invoice.id + 1

    return f"INV-{next_number:05d}"


# =========================================================
# CREATE INVOICE
# =========================================================

@router.post(
    "/",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED
)
def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # -----------------------------------------------------
    # CHECK CUSTOMER
    # -----------------------------------------------------

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == invoice_data.customer_id,
            Customer.user_id == current_user.id
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    # -----------------------------------------------------
    # VALIDATE DATES
    # -----------------------------------------------------

    if invoice_data.due_date < invoice_data.issue_date:
        raise HTTPException(
            status_code=400,
            detail="Due date cannot be before issue date"
        )

    # -----------------------------------------------------
    # CALCULATE SUBTOTAL
    # -----------------------------------------------------

    subtotal = 0.0

    for item in invoice_data.items:

        amount = item.quantity * item.unit_price

        subtotal += amount

    # -----------------------------------------------------
    # CALCULATE TOTAL
    # -----------------------------------------------------

    total = (
        subtotal
        + invoice_data.tax
        - invoice_data.discount
    )

    if total < 0:
        raise HTTPException(
            status_code=400,
            detail="Discount cannot make invoice total negative"
        )

    # -----------------------------------------------------
    # CREATE INVOICE
    # -----------------------------------------------------

    invoice = Invoice(
        invoice_number=generate_invoice_number(db),

        customer_id=invoice_data.customer_id,

        user_id=current_user.id,

        issue_date=invoice_data.issue_date,

        due_date=invoice_data.due_date,

        subtotal=subtotal,

        tax=invoice_data.tax,

        discount=invoice_data.discount,

        total=total,

        status="draft",

        notes=invoice_data.notes
    )

    db.add(invoice)
    db.flush()

    # -----------------------------------------------------
    # CREATE ITEMS
    # -----------------------------------------------------

    for item in invoice_data.items:

        amount = (
            item.quantity *
            item.unit_price
        )

        invoice_item = InvoiceItem(

            invoice_id=invoice.id,

            description=item.description,

            quantity=item.quantity,

            unit_price=item.unit_price,

            amount=amount
        )

        db.add(invoice_item)

    db.commit()

    db.refresh(invoice)

    return invoice


# =========================================================
# GET ALL INVOICES
# =========================================================

@router.get(
    "/",
    response_model=list[InvoiceResponse]
)
def get_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.user_id == current_user.id
        )
        .order_by(
            Invoice.id.desc()
        )
        .all()
    )

    return invoices


# =========================================================
# GET SINGLE INVOICE
# =========================================================

@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse
)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    return invoice


# =========================================================
# UPDATE INVOICE STATUS
# =========================================================

@router.patch(
    "/{invoice_id}/status",
    response_model=InvoiceResponse
)
def update_invoice_status(
    invoice_id: int,
    status_data: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    allowed_statuses = {
        "draft",
        "sent",
        "paid",
        "overdue",
        "cancelled"
    }

    if status_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. "
                "Allowed: draft, sent, paid, "
                "overdue, cancelled"
            )
        )

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    invoice.status = status_data.status

    db.commit()
    db.refresh(invoice)

    return invoice


# =========================================================
# DELETE INVOICE
# =========================================================

@router.delete(
    "/{invoice_id}"
)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
            Invoice.user_id == current_user.id
        )
        .first()
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    db.delete(invoice)

    db.commit()

    return {
        "message": "Invoice deleted successfully"
    }
