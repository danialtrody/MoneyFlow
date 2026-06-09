import io
from decimal import Decimal

import openpyxl
import pytest
from sqlalchemy.orm import Session

from enums import AccountType, TransactionType
from repositories import account_repository, transaction_repository, user_repository
from services import import_service


def _make_user(db: Session, email: str = "user@example.com") -> int:
    return user_repository.create(db, email, "hashed_pw", "Test User").id


def _make_account(db: Session, user_id: int, balance: float = 0.0) -> object:
    return account_repository.create(
        db, user_id, "Bank", AccountType.bank, Decimal(str(balance)), "USD"
    )


def _csv(content: str) -> bytes:
    return content.encode("utf-8")


def _xlsx(rows: list[list[str]]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


_HEADER = "date,description,debit,credit\n"


def test_import_income_row_creates_income_transaction(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _csv(_HEADER + "15/05/2026,Salary,,1000.00\n")

    result = import_service.import_transactions(db, user_id, account.id, content)

    assert result.imported == 1
    assert result.skipped == 0
    assert result.errors == []
    txs = transaction_repository.get_all(db, user_id)
    assert len(txs) == 1
    assert txs[0].type == TransactionType.income
    assert txs[0].amount == Decimal("1000.00")


def test_import_expense_row_creates_expense_transaction(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _csv(_HEADER + "15/05/2026,Coffee,50.00,\n")

    result = import_service.import_transactions(db, user_id, account.id, content)

    assert result.imported == 1
    txs = transaction_repository.get_all(db, user_id)
    assert txs[0].type == TransactionType.expense
    assert txs[0].amount == Decimal("50.00")


def test_import_duplicate_row_is_skipped_on_second_import(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _csv(_HEADER + "15/05/2026,Coffee,50.00,\n")

    import_service.import_transactions(db, user_id, account.id, content)
    result = import_service.import_transactions(db, user_id, account.id, content)

    assert result.imported == 0
    assert result.skipped == 1


def test_import_invalid_date_recorded_as_error(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _csv(_HEADER + "not-a-date,Coffee,50.00,\n")

    result = import_service.import_transactions(db, user_id, account.id, content)

    assert result.imported == 0
    assert len(result.errors) == 1
    assert "not-a-date" in result.errors[0].reason


def test_import_row_with_no_amount_is_skipped(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _csv(_HEADER + "15/05/2026,Pending,,\n")

    result = import_service.import_transactions(db, user_id, account.id, content)

    assert result.imported == 0
    assert result.skipped == 1


def test_import_updates_account_balance_from_balance_column(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id, balance=0.0)
    content = _csv(
        "date,description,debit,credit,balance\n"
        "15/05/2026,Coffee,50.00,,750.00\n"
    )

    import_service.import_transactions(db, user_id, account.id, content)

    db.refresh(account)
    assert account.balance == Decimal("750.00")


def test_import_account_not_found_raises_value_error(db: Session) -> None:
    user_id = _make_user(db)
    content = _csv(_HEADER + "15/05/2026,Coffee,50.00,\n")

    with pytest.raises(ValueError, match="Account not found"):
        import_service.import_transactions(db, user_id, 99999, content)


def test_import_auto_creates_category_from_description(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _csv(_HEADER + "15/05/2026,BrandNewCafe,50.00,\n")

    import_service.import_transactions(db, user_id, account.id, content)

    txs = transaction_repository.get_all(db, user_id)
    assert txs[0].category.name == "BrandNewCafe"


def test_import_reuses_existing_category_for_same_description(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _csv(
        _HEADER
        + "15/05/2026,Coffee,50.00,\n"
        + "14/05/2026,Coffee,30.00,\n"
    )

    result = import_service.import_transactions(db, user_id, account.id, content)

    assert result.imported == 2
    txs = transaction_repository.get_all(db, user_id)
    assert txs[0].category_id == txs[1].category_id


def test_import_extracts_merchant_from_hebrew_description(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _csv(_HEADER + "15/05/2026,מתאריך 01/01/26 ב-CafeMerchant,50.00,\n")

    import_service.import_transactions(db, user_id, account.id, content)

    txs = transaction_repository.get_all(db, user_id)
    assert txs[0].category.name == "CafeMerchant"


def test_import_multiple_rows_mixed_types(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _csv(
        _HEADER
        + "15/05/2026,Salary,,2000.00\n"
        + "14/05/2026,Rent,800.00,\n"
        + "13/05/2026,Groceries,150.00,\n"
    )

    result = import_service.import_transactions(db, user_id, account.id, content)

    assert result.imported == 3
    txs = transaction_repository.get_all(db, user_id)
    types = {tx.type for tx in txs}
    assert TransactionType.income in types
    assert TransactionType.expense in types


def test_import_no_header_raises_value_error(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _csv("garbage,data,with,no,header\n")

    with pytest.raises(ValueError, match="Could not find header row"):
        import_service.import_transactions(db, user_id, account.id, content)


def test_import_xlsx_expense_row_creates_transaction(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _xlsx([
        ["date", "description", "debit", "credit"],
        ["15/05/2026", "Coffee", "50.00", ""],
    ])

    result = import_service.import_transactions(db, user_id, account.id, content)

    assert result.imported == 1
    assert result.skipped == 0
    assert result.errors == []
    txs = transaction_repository.get_all(db, user_id)
    assert txs[0].type == TransactionType.expense
    assert txs[0].amount == Decimal("50.00")


def test_import_xlsx_income_row_creates_transaction(db: Session) -> None:
    user_id = _make_user(db)
    account = _make_account(db, user_id)
    content = _xlsx([
        ["date", "description", "debit", "credit"],
        ["15/05/2026", "Salary", "", "2000.00"],
    ])

    result = import_service.import_transactions(db, user_id, account.id, content)

    assert result.imported == 1
    txs = transaction_repository.get_all(db, user_id)
    assert txs[0].type == TransactionType.income
    assert txs[0].amount == Decimal("2000.00")
