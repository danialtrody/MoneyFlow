from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from enums import TransactionType
from models.category import Category

_CATEGORIES = "/categories"
_REGISTER = "/auth/register"
_LOGIN = "/auth/login"

_USER_A = {"email": "a@example.com", "password": "password123", "full_name": "User A"}
_USER_B = {"email": "b@example.com", "password": "password123", "full_name": "User B"}


def _login(client: TestClient, user: dict) -> None:
    client.post(_REGISTER, json=user)
    client.post(_LOGIN, json={"email": user["email"], "password": user["password"]})


def _add_global_category(
    db: Session, name: str, category_type: TransactionType
) -> Category:
    cat = Category(user_id=None, name=name, type=category_type)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def test_list_categories_requires_auth(client: TestClient) -> None:
    assert client.get(_CATEGORIES).status_code == 401


def test_create_category_requires_auth(client: TestClient) -> None:
    assert (
        client.post(_CATEGORIES, json={"name": "X", "type": "income"}).status_code == 401
    )


def test_create_category_returns_201_with_correct_fields(client: TestClient) -> None:
    _login(client, _USER_A)

    response = client.post(_CATEGORIES, json={"name": "Salary", "type": "income"})

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Salary"
    assert data["type"] == "income"
    assert "id" in data
    assert data["user_id"] is not None


def test_list_categories_returns_own_and_global(
    client: TestClient, db: Session
) -> None:
    _add_global_category(db, "Global Salary", TransactionType.income)
    _login(client, _USER_A)
    client.post(_CATEGORIES, json={"name": "My Bonus", "type": "income"})

    response = client.get(_CATEGORIES)

    assert response.status_code == 200
    names = {c["name"] for c in response.json()}
    assert "Global Salary" in names
    assert "My Bonus" in names


def test_list_categories_excludes_other_users_categories(client: TestClient) -> None:
    _login(client, _USER_A)
    client.post(_CATEGORIES, json={"name": "A's Private", "type": "expense"})

    _login(client, _USER_B)
    response = client.get(_CATEGORIES)

    names = {c["name"] for c in response.json()}
    assert "A's Private" not in names


def test_list_categories_filtered_by_type(client: TestClient) -> None:
    _login(client, _USER_A)
    client.post(_CATEGORIES, json={"name": "Salary", "type": "income"})
    client.post(_CATEGORIES, json={"name": "Food", "type": "expense"})

    response = client.get(f"{_CATEGORIES}?type=income")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["type"] == "income"


def test_update_category_returns_updated_name(client: TestClient) -> None:
    _login(client, _USER_A)
    cat_id = client.post(
        _CATEGORIES, json={"name": "Old Name", "type": "income"}
    ).json()["id"]

    response = client.put(f"{_CATEGORIES}/{cat_id}", json={"name": "New Name"})

    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


def test_update_category_not_found_returns_404(client: TestClient) -> None:
    _login(client, _USER_A)

    assert client.put(f"{_CATEGORIES}/99999", json={"name": "X"}).status_code == 404


def test_update_global_category_returns_403(
    client: TestClient, db: Session
) -> None:
    cat = _add_global_category(db, "Global Cat", TransactionType.income)
    _login(client, _USER_A)

    assert (
        client.put(f"{_CATEGORIES}/{cat.id}", json={"name": "Hacked"}).status_code == 403
    )


def test_update_another_users_category_returns_403(client: TestClient) -> None:
    _login(client, _USER_A)
    cat_id = client.post(
        _CATEGORIES, json={"name": "A's Cat", "type": "income"}
    ).json()["id"]

    _login(client, _USER_B)

    assert client.put(f"{_CATEGORIES}/{cat_id}", json={"name": "Stolen"}).status_code == 403


def test_delete_category_returns_204(client: TestClient) -> None:
    _login(client, _USER_A)
    cat_id = client.post(
        _CATEGORIES, json={"name": "Temp", "type": "expense"}
    ).json()["id"]

    assert client.delete(f"{_CATEGORIES}/{cat_id}").status_code == 204


def test_delete_category_not_found_returns_404(client: TestClient) -> None:
    _login(client, _USER_A)

    assert client.delete(f"{_CATEGORIES}/99999").status_code == 404


def test_delete_global_category_returns_403(
    client: TestClient, db: Session
) -> None:
    cat = _add_global_category(db, "Global Expense", TransactionType.expense)
    _login(client, _USER_A)

    assert client.delete(f"{_CATEGORIES}/{cat.id}").status_code == 403


def test_delete_another_users_category_returns_403(client: TestClient) -> None:
    _login(client, _USER_A)
    cat_id = client.post(
        _CATEGORIES, json={"name": "A's Cat", "type": "expense"}
    ).json()["id"]

    _login(client, _USER_B)

    assert client.delete(f"{_CATEGORIES}/{cat_id}").status_code == 403


def test_create_category_missing_name_returns_422(client: TestClient) -> None:
    _login(client, _USER_A)

    assert client.post(_CATEGORIES, json={"type": "income"}).status_code == 422


def test_create_category_empty_name_returns_422(client: TestClient) -> None:
    _login(client, _USER_A)

    assert (
        client.post(_CATEGORIES, json={"name": "", "type": "income"}).status_code == 422
    )


def test_create_category_invalid_type_returns_422(client: TestClient) -> None:
    _login(client, _USER_A)

    assert (
        client.post(
            _CATEGORIES, json={"name": "Test", "type": "invalid"}
        ).status_code
        == 422
    )
