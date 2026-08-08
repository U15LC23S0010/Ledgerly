from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.services.insight_service import generate_insight


router = APIRouter(
    prefix="/insights",
    tags=["AI Insights"]
)


@router.get("/")
def get_insights(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return generate_insight(
        db,
        current_user.id
    )