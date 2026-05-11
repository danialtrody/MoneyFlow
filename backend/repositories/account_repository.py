from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from models.account import Account, AccountType


def get_all(db: Session, user_id: int) -> list[Account]:
    return db.query(Account).filter(Account.user_id == user_id).all()


def get_by_id(db: Session, id: int, user_id: int) -> Optional[Account]:
    return (
        db.query(Account)
        .filter(Account.id == id, Account.user_id == user_id)
        .first()
    )


def create(
    db: Session,
    user_id: int,
    name: str,
    type: AccountType,
    balance: Decimal,
    currency: str,
) -> Account:
    account = Account(
        user_id=user_id,
        name=name,
        type=type,
        balance=balance,
        currency=currency,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update(db: Session, account: Account, data: dict[str, object]) -> Account:
    for key, value in data.items():
        setattr(account, key, value)
    db.commit()
    db.refresh(account)
    return account


def delete(db: Session, account: Account) -> None:
    db.delete(account)
    db.commit()
