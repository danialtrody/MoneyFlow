from typing import Generator
from unittest.mock import MagicMock, patch

import pytest

from enums import TransactionType
from schemas.category import CategoryCreate, CategoryUpdate
from services import category_service


@pytest.fixture
def mock_cat_repo() -> Generator[MagicMock, None, None]:
    with patch("services.category_service.category_repository") as m:
        yield m


@pytest.fixture
def mock_tx_repo() -> Generator[MagicMock, None, None]:
    with patch("services.category_service.transaction_repository") as m:
        yield m


@pytest.fixture
def mock_db() -> MagicMock:
    return MagicMock()


def _make_category(**kwargs: object) -> MagicMock:
    cat = MagicMock()
    defaults: dict = {
        "id": 1,
        "user_id": 1,
        "name": "Salary",
        "type": TransactionType.income,
    }
    defaults.update(kwargs)
    for key, value in defaults.items():
        setattr(cat, key, value)
    return cat


def test_get_categories_without_type_delegates_to_list_for_user(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_cat_repo.list_for_user.return_value = []

    result = category_service.get_categories(mock_db, user_id=1)

    mock_cat_repo.list_for_user.assert_called_once_with(mock_db, 1)
    assert result == []


def test_get_categories_with_type_delegates_to_list_by_type(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_cat_repo.list_for_user_by_type.return_value = []

    category_service.get_categories(
        mock_db, user_id=1, transaction_type=TransactionType.income
    )

    mock_cat_repo.list_for_user_by_type.assert_called_once_with(
        mock_db, 1, TransactionType.income
    )


def test_create_category_adds_commits_and_refreshes(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    data = CategoryCreate(name="Salary", type=TransactionType.income)

    category_service.create_category(mock_db, user_id=1, data=data)

    mock_cat_repo.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()


def test_update_category_raises_when_not_found(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_cat_repo.get_by_id.return_value = None

    with pytest.raises(ValueError, match="Category not found"):
        category_service.update_category(
            mock_db, category_id=99, user_id=1, data=CategoryUpdate()
        )

    mock_db.commit.assert_not_called()


def test_update_category_raises_permission_error_for_global(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    global_cat = _make_category(user_id=None)
    mock_cat_repo.get_by_id.return_value = global_cat

    with pytest.raises(PermissionError, match="Cannot modify a global category"):
        category_service.update_category(
            mock_db, category_id=1, user_id=1, data=CategoryUpdate(name="New")
        )

    mock_db.commit.assert_not_called()


def test_update_category_raises_permission_error_for_another_users_category(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    other_users_cat = _make_category(user_id=2)
    mock_cat_repo.get_by_id.return_value = other_users_cat

    with pytest.raises(PermissionError):
        category_service.update_category(
            mock_db, category_id=1, user_id=1, data=CategoryUpdate(name="Stolen")
        )

    mock_db.commit.assert_not_called()


def test_update_category_applies_changes_and_commits(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    cat = _make_category(user_id=1, name="Old Name")
    mock_cat_repo.get_by_id.return_value = cat
    data = CategoryUpdate(name="New Name")

    category_service.update_category(mock_db, category_id=1, user_id=1, data=data)

    assert cat.name == "New Name"
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()


def test_delete_category_raises_when_not_found(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_cat_repo.get_by_id.return_value = None

    with pytest.raises(ValueError, match="Category not found"):
        category_service.delete_category(mock_db, category_id=99, user_id=1)

    mock_db.commit.assert_not_called()


def test_delete_category_raises_permission_error_for_global(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    global_cat = _make_category(user_id=None)
    mock_cat_repo.get_by_id.return_value = global_cat

    with pytest.raises(PermissionError, match="Cannot modify a global category"):
        category_service.delete_category(mock_db, category_id=1, user_id=1)

    mock_db.commit.assert_not_called()


def test_delete_category_raises_when_transactions_linked(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    cat = _make_category(user_id=1)
    mock_cat_repo.get_by_id.return_value = cat
    mock_tx_repo.exists_for_category.return_value = True

    with pytest.raises(ValueError, match="Category has linked transactions"):
        category_service.delete_category(mock_db, category_id=1, user_id=1)

    mock_db.commit.assert_not_called()


def test_delete_category_calls_repo_delete_and_commits(
    mock_cat_repo: MagicMock, mock_tx_repo: MagicMock, mock_db: MagicMock
) -> None:
    cat = _make_category(user_id=1)
    mock_cat_repo.get_by_id.return_value = cat
    mock_tx_repo.exists_for_category.return_value = False

    category_service.delete_category(mock_db, category_id=1, user_id=1)

    mock_cat_repo.delete.assert_called_once_with(mock_db, cat)
    mock_db.commit.assert_called_once()
