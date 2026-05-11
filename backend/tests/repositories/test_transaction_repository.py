from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from enums import AccountType, TransactionType
from repositories import account_repository, transaction_repository, user_repository


def _create_user(db: Session, email: str = "user@example.com") -> int:
    user = user_repository.create(db, email, "hashed_pw", "Test User")
    return user.id


def _create_account(db: Session, user_id: int) -> object:
    return account_repository.create(
        db, user_id, "Main Bank", AccountType.bank, Decimal("1000.00"), "USD"
    )


def _create_transaction(
    db: Session,
    account_id: int,
    user_id: int,
    type: TransactionType = TransactionType.income,
    amount: Decimal = Decimal("100.00"),
    category: str = "Salary",
) -> object:
    from models.transaction import Transaction

    tx = Transaction(
        account_id=account_id,
        user_id=user_id,
        type=type,
        amount=amount,
        category=category,
        description=None,
        date=date.today(),
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def test_get_all_returns_empty_for_new_user(db: Session) -> None:
    user_id = _create_user(db)

    result = transaction_repository.get_all(db, user_id)

    assert result == []


def test_get_all_returns_transactions_belonging_to_user(db: Session) -> None:
    user_id = _create_user(db)
    account = _create_account(db, user_id)
    _create_transaction(db, account.id, user_id, category="A")
    _create_transaction(db, account.id, user_id, category="B")

    result = transaction_repository.get_all(db, user_id)

    assert len(result) == 2
    categories = {t.category for t in result}
    assert categories == {"A", "B"}


def test_get_all_does_not_return_other_users_transactions(db: Session) -> None:
    user_a = _create_user(db, "a@example.com")
    user_b = _create_user(db, "b@example.com")
    account_a = _create_account(db, user_a)
    account_b = _create_account(db, user_b)
    _create_transaction(db, account_a.id, user_a, category="A's")
    _create_transaction(db, account_b.id, user_b, category="B's")

    result = transaction_repository.get_all(db, user_a)

    assert len(result) == 1
    assert result[0].category == "A's"


def test_get_all_filtered_by_account_id(db: Session) -> None:
    user_id = _create_user(db)
    acc1 = _create_account(db, user_id)
    acc2 = account_repository.create(
        db, user_id, "Savings", AccountType.savings, Decimal("0.00"), "USD"
    )
    _create_transaction(db, acc1.id, user_id, category="From acc1")
    _create_transaction(db, acc2.id, user_id, category="From acc2")

    result = transaction_repository.get_all(db, user_id, account_id=acc1.id)

    assert len(result) == 1
    assert result[0].category == "From acc1"


def test_get_by_id_returns_transaction_when_found(db: Session) -> None:
    user_id = _create_user(db)
    account = _create_account(db, user_id)
    tx = _create_transaction(db, account.id, user_id)

    result = transaction_repository.get_by_id(db, tx.id, user_id)

    assert result is not None
    assert result.id == tx.id


def test_get_by_id_returns_none_when_not_found(db: Session) -> None:
    user_id = _create_user(db)

    result = transaction_repository.get_by_id(db, 99999, user_id)

    assert result is None


def test_get_by_id_returns_none_for_wrong_user(db: Session) -> None:
    owner = _create_user(db, "owner@example.com")
    other = _create_user(db, "other@example.com")
    account = _create_account(db, owner)
    tx = _create_transaction(db, account.id, owner)

    result = transaction_repository.get_by_id(db, tx.id, other)

    assert result is None


def test_delete_removes_transaction(db: Session) -> None:
    user_id = _create_user(db)
    account = _create_account(db, user_id)
    tx = _create_transaction(db, account.id, user_id)
    tx_id = tx.id

    transaction_repository.delete(db, tx)
    db.commit()

    assert transaction_repository.get_by_id(db, tx_id, user_id) is None
