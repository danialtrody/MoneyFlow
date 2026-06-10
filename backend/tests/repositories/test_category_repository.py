from sqlalchemy.orm import Session

from enums import TransactionType
from models.category import Category
from repositories import category_repository, user_repository


def _create_user(db: Session, email: str = "user@example.com") -> int:
    user = user_repository.create(db, email, "Test User", "hashed_pw")
    return user.id


def _add_category(
    db: Session,
    name: str,
    category_type: TransactionType,
    user_id: int = None,
) -> Category:
    cat = Category(user_id=user_id, name=name, type=category_type)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def test_list_for_user_returns_own_and_global_categories(db: Session) -> None:
    user_id = _create_user(db)
    _add_category(db, "Salary", TransactionType.income, user_id=None)
    _add_category(db, "Freelance", TransactionType.income, user_id=user_id)

    result = category_repository.list_for_user(db, user_id)

    assert len(result) == 2
    names = {c.name for c in result}
    assert names == {"Salary", "Freelance"}


def test_list_for_user_excludes_other_users_categories(db: Session) -> None:
    user_a = _create_user(db, "a@example.com")
    user_b = _create_user(db, "b@example.com")
    _add_category(db, "A's Category", TransactionType.expense, user_id=user_a)
    _add_category(db, "B's Category", TransactionType.expense, user_id=user_b)

    result = category_repository.list_for_user(db, user_b)

    assert len(result) == 1
    assert result[0].name == "B's Category"


def test_list_for_user_includes_global_categories(db: Session) -> None:
    user_id = _create_user(db)
    _add_category(db, "Global Expense", TransactionType.expense, user_id=None)

    result = category_repository.list_for_user(db, user_id)

    assert len(result) == 1
    assert result[0].user_id is None


def test_list_for_user_returns_empty_when_no_categories(db: Session) -> None:
    user_id = _create_user(db)

    result = category_repository.list_for_user(db, user_id)

    assert result == []


def test_list_for_user_by_type_returns_matching_type_only(db: Session) -> None:
    user_id = _create_user(db)
    _add_category(db, "Salary", TransactionType.income, user_id=user_id)
    _add_category(db, "Food", TransactionType.expense, user_id=user_id)

    result = category_repository.list_for_user_by_type(db, user_id, TransactionType.income)

    assert len(result) == 1
    assert result[0].name == "Salary"


def test_list_for_user_by_type_includes_global_categories(db: Session) -> None:
    user_id = _create_user(db)
    _add_category(db, "Global Salary", TransactionType.income, user_id=None)
    _add_category(db, "Global Food", TransactionType.expense, user_id=None)

    result = category_repository.list_for_user_by_type(db, user_id, TransactionType.income)

    assert len(result) == 1
    assert result[0].name == "Global Salary"


def test_get_by_id_returns_category_when_found(db: Session) -> None:
    user_id = _create_user(db)
    cat = _add_category(db, "Salary", TransactionType.income, user_id=user_id)

    result = category_repository.get_by_id(db, cat.id)

    assert result is not None
    assert result.id == cat.id
    assert result.name == "Salary"


def test_get_by_id_returns_none_when_not_found(db: Session) -> None:
    result = category_repository.get_by_id(db, 99999)

    assert result is None


def test_add_persists_category(db: Session) -> None:
    user_id = _create_user(db)
    cat = Category(user_id=user_id, name="Rent", type=TransactionType.expense)

    category_repository.add(db, cat)
    db.commit()
    db.refresh(cat)

    assert cat.id is not None
    assert category_repository.get_by_id(db, cat.id) is not None


def test_delete_removes_category(db: Session) -> None:
    user_id = _create_user(db)
    cat = _add_category(db, "Bonus", TransactionType.income, user_id=user_id)
    cat_id = cat.id

    category_repository.delete(db, cat)
    db.commit()

    assert category_repository.get_by_id(db, cat_id) is None
