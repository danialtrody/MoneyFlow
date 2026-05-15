from typing import Optional

from sqlalchemy.orm import Session

from models.transaction import Transaction


def get_all(
    db: Session, user_id: int, account_id: Optional[int] = None
) -> list[Transaction]:
    query = db.query(Transaction).filter(Transaction.user_id == user_id)
    if account_id is not None:
        query = query.filter(Transaction.account_id == account_id)
    return query.order_by(Transaction.date.desc(), Transaction.created_at.desc()).all()


def get_by_id(db: Session, id: int, user_id: int) -> Optional[Transaction]:
    return (
        db.query(Transaction)
        .filter(Transaction.id == id, Transaction.user_id == user_id)
        .first()
    )


def exists_for_category(db: Session, category_id: int) -> bool:
    return db.query(Transaction.id).filter(
        Transaction.category_id == category_id
    ).first() is not None


def add(db: Session, transaction: Transaction) -> None:
    db.add(transaction)


def delete(db: Session, transaction: Transaction) -> None:
    db.delete(transaction)
