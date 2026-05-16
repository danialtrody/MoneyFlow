from typing import Optional

from sqlalchemy.orm import Session

from enums import TransactionType
from models.transaction import Transaction
from repositories import account_repository, category_repository, transaction_repository
from schemas.transaction import TransactionCreate, TransactionUpdate


def list_transactions(
    db: Session, user_id: int, account_id: Optional[int] = None
) -> list[Transaction]:
    return transaction_repository.get_all(db, user_id, account_id)


def create_transaction(
    db: Session, user_id: int, data: TransactionCreate
) -> Transaction:
    account = account_repository.get_by_id(db, data.account_id, user_id)
    if account is None:
        raise ValueError("Account not found")

    if category_repository.get_by_id(db, data.category_id) is None:
        raise ValueError("Category not found")

    transaction = Transaction(
        account_id=data.account_id,
        user_id=user_id,
        type=data.type,
        amount=data.amount,
        category_id=data.category_id,
        description=data.description,
        date=data.date,
    )
    transaction_repository.add(db, transaction)

    if data.type == TransactionType.income:
        account.balance += data.amount
    else:
        account.balance -= data.amount

    db.commit()
    db.refresh(transaction)
    return transaction


def update_transaction(
    db: Session, id: int, user_id: int, data: TransactionUpdate
) -> Transaction:
    transaction = transaction_repository.get_by_id(db, id, user_id)
    if transaction is None:
        raise ValueError("Transaction not found")

    if data.category_id is not None:
        if category_repository.get_by_id(db, data.category_id) is None:
            raise ValueError("Category not found")

    account = account_repository.get_by_id(db, transaction.account_id, user_id)
    if account is None:
        raise ValueError("Account not found")

    if transaction.type == TransactionType.income:
        account.balance -= transaction.amount
    else:
        account.balance += transaction.amount

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(transaction, key, value)

    if transaction.type == TransactionType.income:
        account.balance += transaction.amount
    else:
        account.balance -= transaction.amount

    db.commit()
    db.refresh(transaction)
    return transaction


def clear_account_transactions(db: Session, account_id: int, user_id: int) -> None:
    account = account_repository.get_by_id(db, account_id, user_id)
    if account is None:
        raise ValueError("Account not found")

    transactions = transaction_repository.get_all(db, user_id, account_id)
    for tx in transactions:
        if tx.type == TransactionType.income:
            account.balance -= tx.amount
        else:
            account.balance += tx.amount

    transaction_repository.delete_all_for_account(db, account_id, user_id)
    db.commit()


def delete_transaction(db: Session, id: int, user_id: int) -> None:
    transaction = transaction_repository.get_by_id(db, id, user_id)
    if transaction is None:
        raise ValueError("Transaction not found")

    account = account_repository.get_by_id(db, transaction.account_id, user_id)
    if account is None:
        raise ValueError("Account not found")

    if transaction.type == TransactionType.income:
        account.balance -= transaction.amount
    else:
        account.balance += transaction.amount

    transaction_repository.delete(db, transaction)
    db.commit()
