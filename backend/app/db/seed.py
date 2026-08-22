
from sqlalchemy.orm import Session

from app.models.category import Category


DEFAULT_CATEGORIES = [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Healthcare",
    "Education",
    "Travel",
    "Salary",
    "Other",
]


def seed_default_categories(db: Session):
    """
    Insert default categories if they do not already exist.
    """

    for category_name in DEFAULT_CATEGORIES:

        existing_category = (
            db.query(Category)
            .filter(Category.name.ilike(category_name))
            .first()
        )

        if existing_category:
            continue

        category = Category(
            name=category_name
        )

        db.add(category)

    db.commit()
