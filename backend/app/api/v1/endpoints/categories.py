
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.category import Category
from app.schemas.category import (
    CategoryCreate,
    CategoryResponse,
)

from app.core.dependencies import (
    get_current_user,
    get_current_admin,
)


router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
)


# =========================================================
# HELPER
# =========================================================

def normalize_category_name(name: str) -> str:
    """
    Clean and validate category name.
    """

    value = (name or "").strip()

    if not value:
        raise HTTPException(
            status_code=400,
            detail="Category name cannot be empty",
        )

    if len(value) > 100:
        raise HTTPException(
            status_code=400,
            detail="Category name cannot exceed 100 characters",
        )

    return value


# =========================================================
# CREATE CATEGORY(ADMIN)
# =========================================================

@router.post(
    "/",
    response_model=CategoryResponse,
)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    name = normalize_category_name(category.name)

    existing_category = (
        db.query(Category)
        .filter(
            Category.name.ilike(name)
        )
        .first()
    )

    if existing_category:
        raise HTTPException(
            status_code=400,
            detail="Category already exists",
        )

    # -----------------------------------------------------
    # CREATE
    # -----------------------------------------------------

    new_category = Category(
        name=name,
    )

    try:
        db.add(new_category)
        db.commit()
        db.refresh(new_category)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Category already exists",
        )

    return new_category


@router.get(
    "/",
    response_model=list[CategoryResponse],
)
def get_categories(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    categories = (
        db.query(Category)
        .order_by(
            Category.name.asc()
        )
        .all()
    )

    return categories


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    return category


@router.put(
    "/{category_id}",
    response_model=CategoryResponse,
)
def update_category(
    category_id: int,
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    # -----------------------------------------------------
    # FIND CATEGORY
    # -----------------------------------------------------

    category = (
        db.query(Category)
        .filter(
            Category.id == category_id
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    # -----------------------------------------------------
    # NORMALIZE NAME
    # -----------------------------------------------------

    name = normalize_category_name(
        category_data.name
    )

    # -----------------------------------------------------
    # CHECK DUPLICATE
    # -----------------------------------------------------

    duplicate = (
        db.query(Category)
        .filter(
            Category.name.ilike(name),
            Category.id != category_id,
        )
        .first()
    )

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Category already exists",
        )

    # -----------------------------------------------------
    # UPDATE
    # -----------------------------------------------------

    category.name = name

    try:
        db.commit()
        db.refresh(category)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Category already exists",
        )

    return category


@router.delete(
    "/{category_id}",
)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    # -----------------------------------------------------
    # FIND CATEGORY
    # -----------------------------------------------------

    category = (
        db.query(Category)
        .filter(
            Category.id == category_id
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    # -----------------------------------------------------
    # CHECK EXPENSES
    # -----------------------------------------------------

    if category.expenses:
        raise HTTPException(
            status_code=400,
            detail=(
                "Cannot delete category because "
                "expenses are using it"
            ),
        )

    # -----------------------------------------------------
    # CHECK TRANSACTIONS
    # -----------------------------------------------------

    if category.transactions:
        raise HTTPException(
            status_code=400,
            detail=(
                "Cannot delete category because "
                "transactions are using it"
            ),
        )

    # -----------------------------------------------------
    # DELETE
    # -----------------------------------------------------

    try:
        db.delete(category)
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "Cannot delete category because "
                "it is being used"
            ),
        )

    return {
        "message": "Category deleted successfully",
        "category_id": category_id,
    }
