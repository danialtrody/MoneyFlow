from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from jose import jwt

import os

_ACCOUNTS = "/accounts"
_REGISTER = "/auth/register"
_LOGIN = "/auth/login"

_USER_A = {
    "email": "a@example.com",
    "password": "password123",
    "full_name": "User A",
}
_USER_B = {
    "email": "b@example.com",
    "password": "password123",
    "full_name": "User B",
}
_VALID_ACCOUNT = {"name": "Main Bank", "type": "bank"}


def _login(client: TestClient, user: dict) -> None:
    client.post(_REGISTER, json=user)
    client.post(_LOGIN, json={"email": user["email"], "password": user["password"]})


def test_get_accounts_requires_auth(client: TestClient) -> None:
    response = client.get(_ACCOUNTS)

    assert response.status_code == 401


def test_get_accounts_returns_empty_list_after_login(client: TestClient) -> None:
    _login(client, _USER_A)

    response = client.get(_ACCOUNTS)

    assert response.status_code == 200
    assert response.json() == []


def test_create_account_requires_auth(client: TestClient) -> None:
    response = client.post(_ACCOUNTS, json=_VALID_ACCOUNT)

    assert response.status_code == 401


def test_create_account_returns_201_with_correct_fields(client: TestClient) -> None:
    _login(client, _USER_A)

    response = client.post(_ACCOUNTS, json=_VALID_ACCOUNT)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Main Bank"
    assert data["type"] == "bank"
    assert "id" in data
    assert "created_at" in data


def test_create_account_applies_default_balance_and_currency(
    client: TestClient,
) -> None:
    _login(client, _USER_A)

    response = client.post(_ACCOUNTS, json={"name": "Cash Wallet", "type": "cash"})

    assert response.status_code == 201
    data = response.json()
    assert float(data["balance"]) == 0.00
    assert data["currency"] == "USD"


def test_create_account_accepts_custom_balance_and_currency(
    client: TestClient,
) -> None:
    _login(client, _USER_A)

    response = client.post(
        _ACCOUNTS,
        json={"name": "Euro Savings", "type": "savings", "balance": 250.50, "currency": "EUR"},
    )

    assert response.status_code == 201
    data = response.json()
    assert float(data["balance"]) == 250.50
    assert data["currency"] == "EUR"


def test_create_account_invalid_type_returns_422(client: TestClient) -> None:
    _login(client, _USER_A)

    response = client.post(_ACCOUNTS, json={"name": "Bad", "type": "invalid_type"})

    assert response.status_code == 422


def test_create_account_missing_name_returns_422(client: TestClient) -> None:
    _login(client, _USER_A)

    response = client.post(_ACCOUNTS, json={"type": "bank"})

    assert response.status_code == 422


def test_get_accounts_returns_created_accounts(client: TestClient) -> None:
    _login(client, _USER_A)
    client.post(_ACCOUNTS, json={"name": "Bank", "type": "bank"})
    client.post(_ACCOUNTS, json={"name": "Cash", "type": "cash"})

    response = client.get(_ACCOUNTS)

    assert response.status_code == 200
    names = {a["name"] for a in response.json()}
    assert names == {"Bank", "Cash"}


def test_delete_account_returns_204(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = client.post(_ACCOUNTS, json=_VALID_ACCOUNT).json()["id"]

    response = client.delete(f"{_ACCOUNTS}/{account_id}")

    assert response.status_code == 204


def test_delete_account_removes_it_from_list(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = client.post(_ACCOUNTS, json=_VALID_ACCOUNT).json()["id"]

    client.delete(f"{_ACCOUNTS}/{account_id}")

    accounts = client.get(_ACCOUNTS).json()
    assert all(a["id"] != account_id for a in accounts)


def test_delete_account_not_found_returns_404(client: TestClient) -> None:
    _login(client, _USER_A)

    response = client.delete(f"{_ACCOUNTS}/99999")

    assert response.status_code == 404


def test_delete_account_requires_auth(client: TestClient) -> None:
    response = client.delete(f"{_ACCOUNTS}/1")

    assert response.status_code == 401


def test_update_account_returns_200_with_updated_fields(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = client.post(_ACCOUNTS, json=_VALID_ACCOUNT).json()["id"]

    response = client.put(
        f"{_ACCOUNTS}/{account_id}",
        json={"name": "Renamed", "balance": 999.99},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Renamed"
    assert float(data["balance"]) == 999.99


def test_update_account_not_found_returns_404(client: TestClient) -> None:
    _login(client, _USER_A)

    response = client.put(f"{_ACCOUNTS}/99999", json={"name": "X"})

    assert response.status_code == 404


def test_update_account_requires_auth(client: TestClient) -> None:
    response = client.put(f"{_ACCOUNTS}/1", json={"name": "X"})

    assert response.status_code == 401


def test_invalid_jwt_cookie_returns_401(client: TestClient) -> None:
    client.cookies.set("access_token", "this.is.not.a.valid.jwt")

    assert client.get(_ACCOUNTS).status_code == 401


def test_expired_jwt_cookie_returns_401(client: TestClient) -> None:
    expired_token = jwt.encode(
        {"sub": "user@example.com", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        os.environ["SECRET_KEY"],
        algorithm="HS256",
    )
    client.cookies.set("access_token", expired_token)

    assert client.get(_ACCOUNTS).status_code == 401


def test_accounts_are_scoped_to_user(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = client.post(_ACCOUNTS, json=_VALID_ACCOUNT).json()["id"]

    _login(client, _USER_B)

    assert client.get(_ACCOUNTS).json() == []
    assert client.delete(f"{_ACCOUNTS}/{account_id}").status_code == 404
    assert client.put(f"{_ACCOUNTS}/{account_id}", json={"name": "X"}).status_code == 404
