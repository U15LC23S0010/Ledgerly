from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db

from app.models.category import Category
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse
)

from app.core.dependencies import (
    get_current_user,
    get_current_admin
)


router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)


# =========================================================
# CREATE CATEGORY
# ADMIN ONLY
# =========================================================

@router.post(
    "/",
    response_model=CategoryResponse
)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    # Check duplicate category
    existing_category = db.query(Category).filter(
        Category.name.ilike(category.name)
    ).first()

    if existing_category:
        raise HTTPException(
            status_code=400,
            detail="Category already exists"
        )

    new_category = Category(
        name=category.name
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category


# =========================================================
# GET ALL CATEGORIES
# LOGIN REQUIRED
# =========================================================

@router.get(
    "/",
    response_model=list[CategoryResponse]
)
def get_categories(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(Category).order_by(
        Category.name.asc()
    ).all()


# =========================================================
# GET CATEGORY BY ID
# LOGIN REQUIRED
# =========================================================

@router.get(
    "/{category_id}",
    response_model=CategoryResponse
)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    category = db.query(Category).filter(
        Category.id == category_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    return category


# =========================================================
# UPDATE CATEGORY
# ADMIN ONLY
# =========================================================

@router.put(
    "/{category_id}",
    response_model=CategoryResponse
)
def update_category(
    category_id: int,
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    category = db.query(Category).filter(
        Category.id == category_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    # Check duplicate name
    duplicate = db.query(Category).filter(
        Category.name.ilike(category_data.name),
        Category.id != category_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Category already exists"
        )

    category.name = category_data.name

    db.commit()
    db.refresh(category)

    return category


# =========================================================
# DELETE CATEGORY
# ADMIN ONLY
# =========================================================

@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    category = db.query(Category).filter(
        Category.id == category_id
    ).first()

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    # Check whether expenses use this category
    if category.expenses:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete category because expenses use it"
        )

    db.delete(category)
    db.commit()

    return {
        "message": "Category deleted successfully"
    }