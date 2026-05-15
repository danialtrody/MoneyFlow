from typing import Optional

from sqlalchemy.orm import Session

from enums import TransactionType
from models.category import Category
from repositories import category_repository, transaction_repository
from schemas.category import CategoryCreate, CategoryUpdate


def get_categories(
    db: Session, user_id: int, transaction_type: Optional[TransactionType] = None
) -> list[Category]:
    if transaction_type is not None:
        return category_repository.list_for_user_by_type(db, user_id, transaction_type)
    return category_repository.list_for_user(db, user_id)


def create_category(db: Session, user_id: int, data: CategoryCreate) -> Category:
    category = Category(
        user_id=user_id,
        name=data.name,
        type=data.type,
    )
    category_repository.add(db, category)
    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session, category_id: int, user_id: int, data: CategoryUpdate
) -> Category:
    category = category_repository.get_by_id(db, category_id)
    if category is None:
        raise ValueError("Category not found")
    if category.user_id != user_id:
        raise PermissionError("Cannot modify a global category")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int, user_id: int) -> None:
    category = category_repository.get_by_id(db, category_id)
    if category is None:
        raise ValueError("Category not found")
    if category.user_id != user_id:
        raise PermissionError("Cannot modify a global category")
    if transaction_repository.exists_for_category(db, category_id):
        raise ValueError("Category has linked transactions and cannot be deleted")

    category_repository.delete(db, category)
    db.commit()
