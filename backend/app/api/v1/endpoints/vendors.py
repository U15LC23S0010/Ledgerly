from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.vendor import Vendor
from app.schemas.vendor import (
    VendorCreate,
    VendorUpdate,
    VendorResponse,
)
from app.core.dependencies import get_current_user
from app.models.user import User


router = APIRouter(
    prefix="/vendors",
    tags=["Vendors"],
)


# =========================================================
# CREATE VENDOR
# =========================================================

@router.post(
    "/",
    response_model=VendorResponse,
)
def create_vendor(
    vendor: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    new_vendor = Vendor(
        name=vendor.name.strip(),
        email=vendor.email,
        phone=vendor.phone,
        address=vendor.address,
        notes=vendor.notes,
        user_id=current_user.id,
    )

    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)

    return new_vendor


# =========================================================
# GET ALL VENDORS
# =========================================================

@router.get(
    "/",
    response_model=list[VendorResponse],
)
def get_vendors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    vendors = (
        db.query(Vendor)
        .filter(
            Vendor.user_id == current_user.id
        )
        .order_by(Vendor.name.asc())
        .all()
    )

    return vendors


# =========================================================
# BULK DELETE VENDORS
# =========================================================

@router.post(
    "/bulk-delete",
)
def delete_selected_vendors(
    vendor_ids: list[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if not vendor_ids:
        raise HTTPException(
            status_code=400,
            detail="No vendors selected.",
        )

    vendor_ids = list(set(vendor_ids))

    vendors = (
        db.query(Vendor)
        .filter(
            Vendor.id.in_(vendor_ids),
            Vendor.user_id == current_user.id,
        )
        .all()
    )

    if not vendors:
        raise HTTPException(
            status_code=404,
            detail="No selected vendors were found.",
        )

    found_ids = {vendor.id for vendor in vendors}

    missing_ids = [
        vendor_id
        for vendor_id in vendor_ids
        if vendor_id not in found_ids
    ]

    for vendor in vendors:
        db.delete(vendor)

    db.commit()

    return {
        "message": f"{len(vendors)} vendor(s) deleted successfully.",
        "deleted_count": len(vendors),
        "deleted_ids": list(found_ids),
        "missing_ids": missing_ids,
    }


# =========================================================
# GET SINGLE VENDOR
# =========================================================

@router.get(
    "/{vendor_id}",
    response_model=VendorResponse,
)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    vendor = (
        db.query(Vendor)
        .filter(
            Vendor.id == vendor_id,
            Vendor.user_id == current_user.id,
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    return vendor


# =========================================================
# UPDATE VENDOR
# =========================================================

@router.put(
    "/{vendor_id}",
    response_model=VendorResponse,
)
def update_vendor(
    vendor_id: int,
    vendor_data: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    vendor = (
        db.query(Vendor)
        .filter(
            Vendor.id == vendor_id,
            Vendor.user_id == current_user.id,
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    vendor.name = vendor_data.name.strip()
    vendor.email = vendor_data.email
    vendor.phone = vendor_data.phone
    vendor.address = vendor_data.address
    vendor.notes = vendor_data.notes

    db.commit()
    db.refresh(vendor)

    return vendor


# =========================================================
# DELETE SINGLE VENDOR
# =========================================================

@router.delete(
    "/{vendor_id}",
)
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    vendor = (
        db.query(Vendor)
        .filter(
            Vendor.id == vendor_id,
            Vendor.user_id == current_user.id,
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found",
        )

    db.delete(vendor)
    db.commit()

    return {
        "message": "Vendor deleted successfully",
        "deleted_id": vendor_id,
    }
