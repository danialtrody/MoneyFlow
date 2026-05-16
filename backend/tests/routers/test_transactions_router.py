from datetime import date

from fastapi.testclient import TestClient

_ACCOUNTS = "/accounts"
_CATEGORIES = "/categories"
_TRANSACTIONS = "/transactions"
_REGISTER = "/auth/register"
_LOGIN = "/auth/login"

_USER_A = {"email": "a@example.com", "password": "password123", "full_name": "User A"}
_USER_B = {"email": "b@example.com", "password": "password123", "full_name": "User B"}
_VALID_ACCOUNT = {"name": "Main Bank", "type": "bank", "balance": 1000.00}


def _login(client: TestClient, user: dict) -> None:
    client.post(_REGISTER, json=user)
    client.post(_LOGIN, json={"email": user["email"], "password": user["password"]})


def _create_account(client: TestClient) -> int:
    return client.post(_ACCOUNTS, json=_VALID_ACCOUNT).json()["id"]


def _create_category(client: TestClient, type: str = "income") -> int:
    return client.post(_CATEGORIES, json={"name": "Test", "type": type}).json()["id"]


def _tx_payload(
    account_id: int,
    category_id: int,
    type: str = "income",
    amount: float = 100.0,
) -> dict:
    return {
        "account_id": account_id,
        "type": type,
        "amount": amount,
        "category_id": category_id,
        "date": str(date.today()),
    }


def test_create_transaction_requires_auth(client: TestClient) -> None:
    response = client.post(
        _TRANSACTIONS,
        json={
            "account_id": 1,
            "type": "income",
            "amount": 100,
            "category_id": 1,
            "date": str(date.today()),
        },
    )

    assert response.status_code == 401


def test_get_transactions_requires_auth(client: TestClient) -> None:
    assert client.get(_TRANSACTIONS).status_code == 401


def test_create_income_increases_account_balance(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    category_id = _create_category(client, "income")

    response = client.post(_TRANSACTIONS, json=_tx_payload(account_id, category_id, "income", 250.00))

    assert response.status_code == 201
    account = client.get(_ACCOUNTS).json()[0]
    assert float(account["balance"]) == 1250.00


def test_create_expense_decreases_account_balance(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    category_id = _create_category(client, "expense")

    client.post(_TRANSACTIONS, json=_tx_payload(account_id, category_id, "expense", 200.00))

    account = client.get(_ACCOUNTS).json()[0]
    assert float(account["balance"]) == 800.00


def test_create_transaction_returns_correct_fields(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    category_id = _create_category(client)

    response = client.post(_TRANSACTIONS, json=_tx_payload(account_id, category_id))

    data = response.json()
    assert data["account_id"] == account_id
    assert data["type"] == "income"
    assert float(data["amount"]) == 100.00
    assert data["category_id"] == category_id
    assert "id" in data
    assert "created_at" in data


def test_list_transactions_returns_all(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    income_cat = _create_category(client, "income")
    expense_cat = _create_category(client, "expense")
    client.post(_TRANSACTIONS, json=_tx_payload(account_id, income_cat, "income", 100))
    client.post(_TRANSACTIONS, json=_tx_payload(account_id, expense_cat, "expense", 50))

    response = client.get(_TRANSACTIONS)

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_list_transactions_filtered_by_account(client: TestClient) -> None:
    _login(client, _USER_A)
    acc1 = _create_account(client)
    acc2 = client.post(_ACCOUNTS, json={"name": "Savings", "type": "savings"}).json()["id"]
    cat_id = _create_category(client)
    client.post(_TRANSACTIONS, json=_tx_payload(acc1, cat_id, "income", 100))
    client.post(_TRANSACTIONS, json=_tx_payload(acc2, cat_id, "income", 200))

    response = client.get(f"{_TRANSACTIONS}?account_id={acc1}")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert float(response.json()[0]["amount"]) == 100.00


def test_update_transaction_reverses_and_reapplies_balance(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    cat_id = _create_category(client)
    tx_id = client.post(_TRANSACTIONS, json=_tx_payload(account_id, cat_id, "income", 100)).json()["id"]

    response = client.put(f"{_TRANSACTIONS}/{tx_id}", json={"amount": 300.00})

    assert response.status_code == 200
    account = client.get(_ACCOUNTS).json()[0]
    assert float(account["balance"]) == 1300.00


def test_delete_transaction_reverses_balance(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    cat_id = _create_category(client)
    tx_id = client.post(_TRANSACTIONS, json=_tx_payload(account_id, cat_id, "income", 500)).json()["id"]

    response = client.delete(f"{_TRANSACTIONS}/{tx_id}")

    assert response.status_code == 204
    account = client.get(_ACCOUNTS).json()[0]
    assert float(account["balance"]) == 1000.00


def test_delete_transaction_not_found_returns_404(client: TestClient) -> None:
    _login(client, _USER_A)

    assert client.delete(f"{_TRANSACTIONS}/99999").status_code == 404


def test_update_transaction_not_found_returns_404(client: TestClient) -> None:
    _login(client, _USER_A)

    assert client.put(f"{_TRANSACTIONS}/99999", json={"amount": 50}).status_code == 404


def test_wrong_user_cannot_access_transaction(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    cat_id = _create_category(client)
    tx_id = client.post(_TRANSACTIONS, json=_tx_payload(account_id, cat_id)).json()["id"]

    _login(client, _USER_B)

    assert client.delete(f"{_TRANSACTIONS}/{tx_id}").status_code == 404
    assert client.put(f"{_TRANSACTIONS}/{tx_id}", json={"amount": 50}).status_code == 404


def test_create_transaction_negative_amount_returns_422(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    cat_id = _create_category(client)
    payload = _tx_payload(account_id, cat_id)
    payload["amount"] = -50

    assert client.post(_TRANSACTIONS, json=payload).status_code == 422


def test_create_transaction_missing_fields_returns_422(client: TestClient) -> None:
    _login(client, _USER_A)

    assert client.post(_TRANSACTIONS, json={"type": "income", "amount": 100}).status_code == 422


def test_create_transaction_account_not_found_returns_404(client: TestClient) -> None:
    _login(client, _USER_A)
    cat_id = _create_category(client)
    payload = _tx_payload(99999, cat_id)

    assert client.post(_TRANSACTIONS, json=payload).status_code == 404


def test_clear_transactions_requires_auth(client: TestClient) -> None:
    assert client.delete(f"{_TRANSACTIONS}?account_id=1").status_code == 401


def test_clear_transactions_removes_all_and_reverses_balance(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    cat_id = _create_category(client, "expense")
    client.post(_TRANSACTIONS, json=_tx_payload(account_id, cat_id, "expense", 200))
    client.post(_TRANSACTIONS, json=_tx_payload(account_id, cat_id, "expense", 300))

    response = client.delete(f"{_TRANSACTIONS}?account_id={account_id}")

    assert response.status_code == 204
    assert client.get(f"{_TRANSACTIONS}?account_id={account_id}").json() == []
    account = client.get(_ACCOUNTS).json()[0]
    assert float(account["balance"]) == 1000.00


def test_clear_transactions_account_not_found_returns_404(client: TestClient) -> None:
    _login(client, _USER_A)

    assert client.delete(f"{_TRANSACTIONS}?account_id=99999").status_code == 404


def test_clear_transactions_wrong_user_cannot_clear_other_users_account(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    _login(client, _USER_B)

    assert client.delete(f"{_TRANSACTIONS}?account_id={account_id}").status_code == 404
