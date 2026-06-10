from decimal import Decimal

from sqlalchemy.orm import Session

from enums import AccountType
from repositories import account_repository, user_repository


def _create_user(db: Session, email: str = "user@example.com") -> int:
    user = user_repository.create(db, email, "Test User", "hashed_pw")
    return user.id


def _create_account(
    db: Session,
    user_id: int,
    name: str = "Main Bank",
    type: AccountType = AccountType.bank,
    balance: Decimal = Decimal("0.00"),
    currency: str = "USD",
) -> object:
    return account_repository.create(db, user_id, name, type, balance, currency)


def test_get_all_returns_empty_for_new_user(db: Session) -> None:
    user_id = _create_user(db)

    result = account_repository.get_all(db, user_id)

    assert result == []


def test_get_all_returns_accounts_belonging_to_user(db: Session) -> None:
    user_id = _create_user(db)
    _create_account(db, user_id, name="Account A")
    _create_account(db, user_id, name="Account B")

    result = account_repository.get_all(db, user_id)

    assert len(result) == 2
    names = {a.name for a in result}
    assert names == {"Account A", "Account B"}


def test_get_all_does_not_return_other_users_accounts(db: Session) -> None:
    user_a = _create_user(db, "a@example.com")
    user_b = _create_user(db, "b@example.com")
    _create_account(db, user_a, name="A's Account")
    _create_account(db, user_b, name="B's Account")

    result = account_repository.get_all(db, user_a)

    assert len(result) == 1
    assert result[0].name == "A's Account"


def test_create_returns_account_with_assigned_id(db: Session) -> None:
    user_id = _create_user(db)

    account = _create_account(db, user_id)

    assert account.id is not None
    assert isinstance(account.id, int)


def test_create_stores_correct_fields(db: Session) -> None:
    user_id = _create_user(db)

    account = _create_account(
        db,
        user_id,
        name="Savings Pot",
        type=AccountType.savings,
        balance=Decimal("150.00"),
        currency="EUR",
    )

    assert account.user_id == user_id
    assert account.name == "Savings Pot"
    assert account.type == AccountType.savings
    assert account.balance == Decimal("150.00")
    assert account.currency == "EUR"


def test_create_sets_created_at(db: Session) -> None:
    user_id = _create_user(db)

    account = _create_account(db, user_id)

    assert account.created_at is not None


def test_get_by_id_returns_account_when_found(db: Session) -> None:
    user_id = _create_user(db)
    created = _create_account(db, user_id)

    result = account_repository.get_by_id(db, created.id, user_id)

    assert result is not None
    assert result.id == created.id


def test_get_by_id_returns_none_when_id_not_found(db: Session) -> None:
    user_id = _create_user(db)

    result = account_repository.get_by_id(db, 99999, user_id)

    assert result is None


def test_get_by_id_returns_none_for_wrong_user(db: Session) -> None:
    owner = _create_user(db, "owner@example.com")
    other = _create_user(db, "other@example.com")
    account = _create_account(db, owner)

    result = account_repository.get_by_id(db, account.id, other)

    assert result is None


def test_update_modifies_specified_fields(db: Session) -> None:
    user_id = _create_user(db)
    account = _create_account(db, user_id, name="Old Name")

    updated = account_repository.update(
        db, account, {"name": "New Name", "balance": Decimal("500.00")}
    )

    assert updated.name == "New Name"
    assert updated.balance == Decimal("500.00")


def test_update_does_not_change_unspecified_fields(db: Session) -> None:
    user_id = _create_user(db)
    account = _create_account(db, user_id, currency="GBP")

    account_repository.update(db, account, {"name": "Renamed"})

    assert account.currency == "GBP"


def test_delete_removes_account(db: Session) -> None:
    user_id = _create_user(db)
    account = _create_account(db, user_id)
    account_id = account.id

    account_repository.delete(db, account)

    assert account_repository.get_by_id(db, account_id, user_id) is None


def test_delete_does_not_remove_other_accounts(db: Session) -> None:
    user_id = _create_user(db)
    to_delete = _create_account(db, user_id, name="Delete Me")
    to_keep = _create_account(db, user_id, name="Keep Me")

    account_repository.delete(db, to_delete)

    assert account_repository.get_by_id(db, to_keep.id, user_id) is not None
