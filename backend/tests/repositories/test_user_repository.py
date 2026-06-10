from sqlalchemy.orm import Session

from repositories import user_repository


def test_get_by_email_returns_none_when_not_found(db: Session) -> None:
    result = user_repository.get_by_email(db, "nobody@example.com")
    assert result is None


def test_get_by_email_returns_user_when_email_matches(db: Session) -> None:
    user_repository.create(db, "found@example.com", "Found User", "hashed_pw")

    result = user_repository.get_by_email(db, "found@example.com")

    assert result is not None
    assert result.email == "found@example.com"


def test_get_by_email_does_not_return_user_for_different_email(db: Session) -> None:
    user_repository.create(db, "a@example.com", "User A", "hashed_pw")

    result = user_repository.get_by_email(db, "b@example.com")

    assert result is None


def test_create_returns_user_with_assigned_id(db: Session) -> None:
    user = user_repository.create(db, "new@example.com", "New User", "hashed_pw")

    assert user.id is not None
    assert isinstance(user.id, int)


def test_create_stores_correct_fields(db: Session) -> None:
    user = user_repository.create(
        db, "fields@example.com", "Fields User", "hashed_pw"
    )

    assert user.email == "fields@example.com"
    assert user.hashed_password == "hashed_pw"
    assert user.full_name == "Fields User"


def test_create_user_is_retrievable_after_creation(db: Session) -> None:
    user_repository.create(db, "persist@example.com", "Persist User", "hashed_pw")

    fetched = user_repository.get_by_email(db, "persist@example.com")

    assert fetched is not None
    assert fetched.full_name == "Persist User"


def test_create_sets_created_at(db: Session) -> None:
    user = user_repository.create(db, "time@example.com", "Time User", "hashed_pw")

    assert user.created_at is not None
