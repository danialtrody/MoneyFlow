import io

import openpyxl
from fastapi.testclient import TestClient

_IMPORT = "/import/transactions"
_REGISTER = "/auth/register"
_LOGIN = "/auth/login"
_ACCOUNTS = "/accounts"

_USER_A = {"email": "a@example.com", "password": "password123", "full_name": "User A"}
_VALID_ACCOUNT = {"name": "Main Bank", "type": "bank", "balance": 1000.00}

_SIMPLE_CSV = b"date,description,debit,credit\n15/05/2026,Coffee,50.00,\n"


def _login(client: TestClient, user: dict) -> None:
    client.post(_REGISTER, json=user)
    client.post(_LOGIN, json={"email": user["email"], "password": user["password"]})


def _create_account(client: TestClient) -> int:
    return client.post(_ACCOUNTS, json=_VALID_ACCOUNT).json()["id"]


def _upload(
    client: TestClient,
    account_id: int,
    content: bytes,
    filename: str = "import.csv",
) -> object:
    return client.post(
        f"{_IMPORT}?account_id={account_id}",
        files={"file": (filename, content, "text/csv")},
    )


def test_import_requires_auth(client: TestClient) -> None:
    response = client.post(
        f"{_IMPORT}?account_id=1",
        files={"file": ("import.csv", _SIMPLE_CSV, "text/csv")},
    )

    assert response.status_code == 401


def test_import_rejects_unsupported_file_extension(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)

    response = _upload(client, account_id, _SIMPLE_CSV, filename="import.txt")

    assert response.status_code == 400
    assert "csv" in response.json()["detail"].lower()


def test_import_rejects_file_exceeding_size_limit(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    large_content = b"x" * (5 * 1024 * 1024 + 1)

    response = _upload(client, account_id, large_content)

    assert response.status_code == 413


def test_import_valid_csv_returns_import_response(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)

    response = _upload(client, account_id, _SIMPLE_CSV)

    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    assert data["skipped"] == 0
    assert data["errors"] == []


def test_import_account_not_found_returns_400(client: TestClient) -> None:
    _login(client, _USER_A)

    response = _upload(client, 99999, _SIMPLE_CSV)

    assert response.status_code == 400
    assert "account" in response.json()["detail"].lower()


def test_import_deduplicates_within_same_upload(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    csv_with_duplicate = (
        b"date,description,debit,credit\n"
        b"15/05/2026,Coffee,50.00,\n"
        b"15/05/2026,Coffee,50.00,\n"
    )

    response = _upload(client, account_id, csv_with_duplicate)

    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    assert data["skipped"] == 1


def test_import_invalid_date_returns_error_entry(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    bad_csv = b"date,description,debit,credit\nnot-a-date,Coffee,50.00,\n"

    response = _upload(client, account_id, bad_csv)

    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 0
    assert len(data["errors"]) == 1


def _make_xlsx(rows: list[list[str]]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_import_valid_xlsx_returns_import_response(client: TestClient) -> None:
    _login(client, _USER_A)
    account_id = _create_account(client)
    content = _make_xlsx([
        ["date", "description", "debit", "credit"],
        ["15/05/2026", "Salary", "", "1000.00"],
    ])

    response = client.post(
        f"{_IMPORT}?account_id={account_id}",
        files={"file": (
            "import.xlsx",
            content,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    assert data["skipped"] == 0
    assert data["errors"] == []
