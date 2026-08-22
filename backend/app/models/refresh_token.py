from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Boolean,
    ForeignKey
)

from sqlalchemy.orm import relationship

from app.db.database import Base


# =========================================================
# REFRESH TOKEN MODEL
# =========================================================

class RefreshToken(Base):

    __tablename__ = "refresh_tokens"

    # -----------------------------------------------------
    # ID
    # -----------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # -----------------------------------------------------
    # TOKEN
    # -----------------------------------------------------

    token = Column(
        String,
        unique=True,
        nullable=False
    )

    # -----------------------------------------------------
    # USER
    # -----------------------------------------------------

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    # -----------------------------------------------------
    # EXPIRATION
    # -----------------------------------------------------

    expires_at = Column(
        DateTime,
        nullable=False
    )

    # -----------------------------------------------------
    # REVOKED
    # -----------------------------------------------------

    revoked = Column(
        Boolean,
        default=False,
        nullable=False
    )

    # -----------------------------------------------------
    # RELATIONSHIP
    # -----------------------------------------------------

    user = relationship(
        "User",
        back_populates="refresh_tokens"
    )
