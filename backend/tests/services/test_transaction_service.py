from datetime import date
from decimal import Decimal
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest

from enums import TransactionType
from schemas.transaction import TransactionCreate, TransactionUpdate
from services import transaction_service


@pytest.fixture
def mock_tx_repo() -> Generator[MagicMock, None, None]:
    with patch("services.transaction_service.transaction_repository") as m:
        yield m


@pytest.fixture
def mock_account_repo() -> Generator[MagicMock, None, None]:
    with patch("services.transaction_service.account_repository") as m:
        yield m


@pytest.fixture
def mock_cat_repo() -> Generator[MagicMock, None, None]:
    with patch("services.transaction_service.category_repository") as m:
        m.get_by_id.return_value = MagicMock()
        yield m


@pytest.fixture
def mock_db() -> MagicMock:
    return MagicMock()


def _make_account(balance: Decimal = Decimal("1000.00")) -> MagicMock:
    account = MagicMock()
    account.balance = balance
    return account


def _make_transaction(**kwargs: object) -> MagicMock:
    tx = MagicMock()
    defaults = {
        "type": TransactionType.income,
        "amount": Decimal("100.00"),
        "account_id": 1,
    }
    defaults.update(kwargs)
    for key, value in defaults.items():
        setattr(tx, key, value)
    return tx


def test_list_transactions_returns_all(
    mock_tx_repo: MagicMock, mock_account_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_tx_repo.get_all.return_value = []

    result = transaction_service.list_transactions(mock_db, user_id=1)

    mock_tx_repo.get_all.assert_called_once_with(mock_db, 1, None)
    assert result == []


def test_list_transactions_filtered_by_account(
    mock_tx_repo: MagicMock, mock_account_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_tx_repo.get_all.return_value = []

    transaction_service.list_transactions(mock_db, user_id=1, account_id=5)

    mock_tx_repo.get_all.assert_called_once_with(mock_db, 1, 5)


def test_create_income_adds_to_balance(
    mock_tx_repo: MagicMock,
    mock_account_repo: MagicMock,
    mock_cat_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    account = _make_account(balance=Decimal("500.00"))
    mock_account_repo.get_by_id.return_value = account
    data = TransactionCreate(
        account_id=1,
        type=TransactionType.income,
        amount=Decimal("200.00"),
        category_id=1,
        date=date.today(),
    )

    transaction_service.create_transaction(mock_db, user_id=1, data=data)

    assert account.balance == Decimal("700.00")
    mock_db.commit.assert_called_once()


def test_create_expense_subtracts_from_balance(
    mock_tx_repo: MagicMock,
    mock_account_repo: MagicMock,
    mock_cat_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    account = _make_account(balance=Decimal("500.00"))
    mock_account_repo.get_by_id.return_value = account
    data = TransactionCreate(
        account_id=1,
        type=TransactionType.expense,
        amount=Decimal("150.00"),
        category_id=1,
        date=date.today(),
    )

    transaction_service.create_transaction(mock_db, user_id=1, data=data)

    assert account.balance == Decimal("350.00")


def test_create_raises_when_account_not_found(
    mock_tx_repo: MagicMock,
    mock_account_repo: MagicMock,
    mock_cat_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_by_id.return_value = None
    data = TransactionCreate(
        account_id=99,
        type=TransactionType.income,
        amount=Decimal("100.00"),
        category_id=1,
        date=date.today(),
    )

    with pytest.raises(ValueError, match="Account not found"):
        transaction_service.create_transaction(mock_db, user_id=1, data=data)

    mock_db.commit.assert_not_called()


def test_update_reverses_and_reapplies_balance_delta(
    mock_tx_repo: MagicMock, mock_account_repo: MagicMock, mock_db: MagicMock
) -> None:
    tx = _make_transaction(type=TransactionType.income, amount=Decimal("100.00"), account_id=1)
    account = _make_account(balance=Decimal("600.00"))
    mock_tx_repo.get_by_id.return_value = tx
    mock_account_repo.get_by_id.return_value = account
    data = TransactionUpdate(amount=Decimal("200.00"))

    transaction_service.update_transaction(mock_db, id=1, user_id=1, data=data)

    assert account.balance == Decimal("700.00")
    mock_db.commit.assert_called_once()


def test_update_raises_when_not_found(
    mock_tx_repo: MagicMock, mock_account_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_tx_repo.get_by_id.return_value = None

    with pytest.raises(ValueError, match="Transaction not found"):
        transaction_service.update_transaction(
            mock_db, id=99, user_id=1, data=TransactionUpdate()
        )

    mock_db.commit.assert_not_called()


def test_delete_reverses_income_balance(
    mock_tx_repo: MagicMock, mock_account_repo: MagicMock, mock_db: MagicMock
) -> None:
    tx = _make_transaction(type=TransactionType.income, amount=Decimal("300.00"), account_id=1)
    account = _make_account(balance=Decimal("800.00"))
    mock_tx_repo.get_by_id.return_value = tx
    mock_account_repo.get_by_id.return_value = account

    transaction_service.delete_transaction(mock_db, id=1, user_id=1)

    assert account.balance == Decimal("500.00")
    mock_db.commit.assert_called_once()


def test_delete_reverses_expense_balance(
    mock_tx_repo: MagicMock, mock_account_repo: MagicMock, mock_db: MagicMock
) -> None:
    tx = _make_transaction(type=TransactionType.expense, amount=Decimal("100.00"), account_id=1)
    account = _make_account(balance=Decimal("400.00"))
    mock_tx_repo.get_by_id.return_value = tx
    mock_account_repo.get_by_id.return_value = account

    transaction_service.delete_transaction(mock_db, id=1, user_id=1)

    assert account.balance == Decimal("500.00")


def test_delete_raises_when_not_found(
    mock_tx_repo: MagicMock, mock_account_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_tx_repo.get_by_id.return_value = None

    with pytest.raises(ValueError, match="Transaction not found"):
        transaction_service.delete_transaction(mock_db, id=99, user_id=1)

    mock_db.commit.assert_not_called()
