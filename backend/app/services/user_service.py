from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import UserRepository


class UserService:
    """
    Business logic for User operations.
    """

    @staticmethod
    def get_user_by_id(
        db: Session,
        user_id: int,
    ):
        user = UserRepository.get_by_id(
            db,
            user_id,
        )

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return user

    @staticmethod
    def get_user_by_email(
        db: Session,
        email: str,
    ):
        return UserRepository.get_by_email(
            db,
            email.strip().lower(),
        )

    @staticmethod
    def get_user_by_mobile(
        db: Session,
        mobile_number: str,
    ):
        return UserRepository.get_by_mobile(
            db,
            mobile_number.strip(),
        )

    @staticmethod
    def get_all_users(
        db: Session,
    ):
        return UserRepository.get_all(db)

    @staticmethod
    def validate_unique_user(
        db: Session,
        email: str,
        mobile_number: str,
    ):
        existing_email = (
            UserRepository.get_by_email(
                db,
                email.strip().lower(),
            )
        )

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        existing_mobile = (
            UserRepository.get_by_mobile(
                db,
                mobile_number.strip(),
            )
        )

        if existing_mobile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mobile number already registered",
            )

    @staticmethod
    def create_user(
        db: Session,
        user: User,
    ):
        UserService.validate_unique_user(
            db,
            user.email,
            user.mobile_number,
        )

        return UserRepository.create(
            db,
            user,
        )

    @staticmethod
    def update_user(
        db: Session,
        user: User,
    ):
        return UserRepository.update(
            db,
            user,
        )

    @staticmethod
    def delete_user(
        db: Session,
        user_id: int,
    ):
        user = UserService.get_user_by_id(
            db,
            user_id,
        )

        UserRepository.delete(
            db,
            user,
        )

        return True