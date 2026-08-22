from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """
    Database operations for User model.
    """

    @staticmethod
    def get_by_id(
        db: Session,
        user_id: int,
    ):
        return (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

    @staticmethod
    def get_by_email(
        db: Session,
        email: str,
    ):
        return (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

    @staticmethod
    def get_by_mobile(
        db: Session,
        mobile_number: str,
    ):
        return (
            db.query(User)
            .filter(
                User.mobile_number == mobile_number
            )
            .first()
        )

    @staticmethod
    def get_all(
        db: Session,
    ):
        return (
            db.query(User)
            .order_by(User.id.desc())
            .all()
        )

    @staticmethod
    def create(
        db: Session,
        user: User,
    ):
        db.add(user)
        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def update(
        db: Session,
        user: User,
    ):
        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def delete(
        db: Session,
        user: User,
    ):
        db.delete(user)
        db.commit()

        return True
