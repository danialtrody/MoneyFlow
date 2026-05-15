from typing import Optional

from sqlalchemy.orm import Session

from enums import TransactionType
from models.category import Category


def list_for_user(db: Session, user_id: int) -> list[Category]:
    return (
        db.query(Category)
        .filter((Category.user_id == None) | (Category.user_id == user_id))  # noqa: E711
        .order_by(Category.type, Category.name)
        .all()
    )


def list_for_user_by_type(
    db: Session, user_id: int, transaction_type: TransactionType
) -> list[Category]:
    return (
        db.query(Category)
        .filter(
            (Category.user_id == None) | (Category.user_id == user_id),  # noqa: E711
            Category.type == transaction_type,
        )
        .order_by(Category.name)
        .all()
    )


def get_by_id(db: Session, category_id: int) -> Optional[Category]:
    return db.query(Category).filter(Category.id == category_id).first()


def add(db: Session, category: Category) -> None:
    db.add(category)


def delete(db: Session, category: Category) -> None:
    db.delete(category)
