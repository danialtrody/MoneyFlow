from sqlalchemy.orm import Session

from models.account import Account
from repositories import account_repository
from schemas.account import AccountCreate, AccountUpdate


def list_accounts(db: Session, user_id: int) -> list[Account]:
    return account_repository.get_all(db, user_id)


def create_account(db: Session, user_id: int, data: AccountCreate) -> Account:
    return account_repository.create(
        db,
        user_id=user_id,
        name=data.name,
        type=data.type,
        balance=data.balance,
        currency=data.currency,
    )


def update_account(
    db: Session, id: int, user_id: int, data: AccountUpdate
) -> Account:
    account = account_repository.get_by_id(db, id, user_id)
    if account is None:
        raise ValueError("Account not found")
    updates = data.model_dump(exclude_unset=True)
    return account_repository.update(db, account, updates)


def delete_account(db: Session, id: int, user_id: int) -> None:
    account = account_repository.get_by_id(db, id, user_id)
    if account is None:
        raise ValueError("Account not found")
    account_repository.delete(db, account)
