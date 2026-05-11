from decimal import Decimal
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest

from enums import AccountType
from schemas.account import AccountCreate, AccountUpdate
from services import account_service


@pytest.fixture
def mock_repo() -> Generator[MagicMock, None, None]:
    with patch("services.account_service.account_repository") as m:
        yield m


@pytest.fixture
def mock_db() -> MagicMock:
    return MagicMock()


def _make_account(**kwargs: object) -> MagicMock:
    account = MagicMock()
    for key, value in kwargs.items():
        setattr(account, key, value)
    return account


def test_list_accounts_delegates_to_repo(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_repo.get_all.return_value = []

    result = account_service.list_accounts(mock_db, user_id=1)

    mock_repo.get_all.assert_called_once_with(mock_db, 1)
    assert result == []


def test_create_account_delegates_to_repo(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    expected = _make_account(id=1)
    mock_repo.create.return_value = expected
    data = AccountCreate(name="Main Bank", type=AccountType.bank)

    result = account_service.create_account(mock_db, user_id=1, data=data)

    mock_repo.create.assert_called_once_with(
        mock_db,
        user_id=1,
        name="Main Bank",
        type=AccountType.bank,
        balance=Decimal("0.00"),
        currency="USD",
    )
    assert result is expected


def test_update_account_returns_updated_account(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    existing = _make_account(id=7)
    updated = _make_account(id=7, name="Renamed")
    mock_repo.get_by_id.return_value = existing
    mock_repo.update.return_value = updated
    data = AccountUpdate(name="Renamed")

    result = account_service.update_account(mock_db, id=7, user_id=1, data=data)

    mock_repo.get_by_id.assert_called_once_with(mock_db, 7, 1)
    mock_repo.update.assert_called_once_with(mock_db, existing, {"name": "Renamed"})
    assert result is updated


def test_update_account_raises_when_not_found(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_repo.get_by_id.return_value = None
    data = AccountUpdate(name="Anything")

    with pytest.raises(ValueError, match="Account not found"):
        account_service.update_account(mock_db, id=99, user_id=1, data=data)

    mock_repo.update.assert_not_called()


def test_update_account_only_passes_set_fields_to_repo(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_repo.get_by_id.return_value = _make_account(id=1)
    mock_repo.update.return_value = MagicMock()
    data = AccountUpdate(currency="EUR")

    account_service.update_account(mock_db, id=1, user_id=1, data=data)

    _, _, passed_dict = mock_repo.update.call_args.args
    assert passed_dict == {"currency": "EUR"}
    assert "name" not in passed_dict
    assert "balance" not in passed_dict


def test_delete_account_calls_repo_delete(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    existing = _make_account(id=3)
    mock_repo.get_by_id.return_value = existing

    account_service.delete_account(mock_db, id=3, user_id=1)

    mock_repo.delete.assert_called_once_with(mock_db, existing)


def test_delete_account_raises_when_not_found(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_repo.get_by_id.return_value = None

    with pytest.raises(ValueError, match="Account not found"):
        account_service.delete_account(mock_db, id=99, user_id=1)

    mock_repo.delete.assert_not_called()
