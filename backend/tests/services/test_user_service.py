from typing import Generator
from unittest.mock import MagicMock, patch

import pytest

from schemas.user import UserCreate, UserUpdate
from services import user_service


@pytest.fixture
def mock_repo() -> Generator[MagicMock, None, None]:
    with patch("services.user_service.user_repository") as m:
        yield m


@pytest.fixture
def mock_db() -> MagicMock:
    return MagicMock()


def _hashed_user(password: str = "password123") -> MagicMock:
    user = MagicMock()
    user.hashed_password = user_service.pwd_context.hash(password)
    return user


def test_register_creates_user_when_email_is_new(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_repo.get_by_email.return_value = None
    mock_repo.create.return_value = MagicMock()
    data = UserCreate(
        email="new@example.com", password="password123", full_name="New User"
    )

    result = user_service.register(mock_db, data)

    mock_repo.create.assert_called_once()
    assert result is mock_repo.create.return_value


def test_register_hashes_password_before_storing(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_repo.get_by_email.return_value = None
    mock_repo.create.return_value = MagicMock()
    data = UserCreate(
        email="hash@example.com", password="password123", full_name="Hash User"
    )

    user_service.register(mock_db, data)

    _, _, hashed, _ = mock_repo.create.call_args.args
    assert hashed != "password123"
    assert user_service.pwd_context.verify("password123", hashed)


def test_register_raises_when_email_already_registered(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_repo.get_by_email.return_value = MagicMock()
    data = UserCreate(
        email="taken@example.com", password="password123", full_name="Taken User"
    )

    with pytest.raises(ValueError, match="Email already registered"):
        user_service.register(mock_db, data)

    mock_repo.create.assert_not_called()


def test_authenticate_returns_user_on_valid_credentials(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_repo.get_by_email.return_value = _hashed_user("password123")

    result = user_service.authenticate(mock_db, "user@example.com", "password123")

    assert result is mock_repo.get_by_email.return_value


def test_authenticate_raises_when_user_not_found(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_repo.get_by_email.return_value = None

    with pytest.raises(ValueError, match="Incorrect email or password"):
        user_service.authenticate(mock_db, "ghost@example.com", "password123")


def test_authenticate_raises_when_password_is_wrong(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    mock_repo.get_by_email.return_value = _hashed_user("correct_password")

    with pytest.raises(ValueError, match="Incorrect email or password"):
        user_service.authenticate(mock_db, "user@example.com", "wrong_password")


def test_update_profile_updates_full_name(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    user = _hashed_user()
    mock_repo.update.return_value = user
    data = UserUpdate(full_name="New Name")

    result = user_service.update_profile(mock_db, user, data)

    mock_repo.update.assert_called_once_with(
        mock_db, user, full_name="New Name", hashed_password=None
    )
    assert result is user


def test_update_profile_updates_password(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    user = _hashed_user("password123")
    mock_repo.update.return_value = user
    data = UserUpdate(current_password="password123", new_password="newpassword456")

    user_service.update_profile(mock_db, user, data)

    mock_repo.update.assert_called_once()
    hashed = mock_repo.update.call_args.kwargs["hashed_password"]
    assert hashed is not None
    assert user_service.pwd_context.verify("newpassword456", hashed)


def test_update_profile_raises_when_no_fields_provided(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    user = _hashed_user()
    data = UserUpdate()

    with pytest.raises(ValueError, match="At least one field"):
        user_service.update_profile(mock_db, user, data)

    mock_repo.update.assert_not_called()


def test_update_profile_raises_when_new_password_without_current_password(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    user = _hashed_user()
    data = UserUpdate(new_password="newpassword456")

    with pytest.raises(ValueError, match="Current password is required"):
        user_service.update_profile(mock_db, user, data)

    mock_repo.update.assert_not_called()


def test_update_profile_raises_when_current_password_is_wrong(
    mock_repo: MagicMock, mock_db: MagicMock
) -> None:
    user = _hashed_user("correctpassword")
    data = UserUpdate(current_password="wrongpassword", new_password="newpassword456")

    with pytest.raises(ValueError, match="Current password is incorrect"):
        user_service.update_profile(mock_db, user, data)

    mock_repo.update.assert_not_called()
