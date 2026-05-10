from fastapi.testclient import TestClient

_REGISTER = "/auth/register"
_LOGIN = "/auth/login"
_LOGOUT = "/auth/logout"
_HEALTH = "/health"

_VALID_USER = {
    "email": "user@example.com",
    "password": "password123",
    "full_name": "Test User",
}


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get(_HEALTH)

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_register_success_returns_201_with_user_fields(client: TestClient) -> None:
    response = client.post(_REGISTER, json=_VALID_USER)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == _VALID_USER["email"]
    assert data["full_name"] == _VALID_USER["full_name"]
    assert "id" in data
    assert "created_at" in data
    assert "hashed_password" not in data


def test_register_duplicate_email_returns_400(client: TestClient) -> None:
    client.post(_REGISTER, json=_VALID_USER)

    response = client.post(_REGISTER, json=_VALID_USER)

    assert response.status_code == 400


def test_register_invalid_email_format_returns_422(client: TestClient) -> None:
    response = client.post(_REGISTER, json={**_VALID_USER, "email": "not-an-email"})

    assert response.status_code == 422


def test_register_password_too_short_returns_422(client: TestClient) -> None:
    response = client.post(_REGISTER, json={**_VALID_USER, "password": "short"})

    assert response.status_code == 422


def test_register_empty_full_name_returns_422(client: TestClient) -> None:
    response = client.post(_REGISTER, json={**_VALID_USER, "full_name": ""})

    assert response.status_code == 422


def test_register_missing_required_field_returns_422(client: TestClient) -> None:
    payload = {"email": _VALID_USER["email"], "password": _VALID_USER["password"]}

    response = client.post(_REGISTER, json=payload)

    assert response.status_code == 422


def test_register_422_uses_custom_list_format(client: TestClient) -> None:
    response = client.post(_REGISTER, json={**_VALID_USER, "email": "bad-email"})

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert isinstance(detail, list)
    assert len(detail) > 0
    assert isinstance(detail[0], str)


def test_login_success_returns_200_and_sets_httponly_cookie(
    client: TestClient,
) -> None:
    client.post(_REGISTER, json=_VALID_USER)

    response = client.post(
        _LOGIN,
        json={"email": _VALID_USER["email"], "password": _VALID_USER["password"]},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "login successful"}
    assert "access_token" in response.cookies


def test_login_wrong_password_returns_401(client: TestClient) -> None:
    client.post(_REGISTER, json=_VALID_USER)

    response = client.post(
        _LOGIN,
        json={"email": _VALID_USER["email"], "password": "wrongpassword"},
    )

    assert response.status_code == 401


def test_login_unknown_email_returns_401(client: TestClient) -> None:
    response = client.post(
        _LOGIN,
        json={"email": "ghost@example.com", "password": "password123"},
    )

    assert response.status_code == 401


def test_login_missing_password_returns_422(client: TestClient) -> None:
    response = client.post(_LOGIN, json={"email": _VALID_USER["email"]})

    assert response.status_code == 422


def test_logout_clears_cookie_and_returns_200(client: TestClient) -> None:
    client.post(_REGISTER, json=_VALID_USER)
    client.post(
        _LOGIN,
        json={"email": _VALID_USER["email"], "password": _VALID_USER["password"]},
    )

    response = client.post(_LOGOUT)

    assert response.status_code == 200
    assert response.json() == {"message": "logout successful"}


def test_logout_without_prior_login_returns_200(client: TestClient) -> None:
    response = client.post(_LOGOUT)

    assert response.status_code == 200
