import csv
import io
from datetime import date as DateType, datetime
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from typing import Optional

import openpyxl

from sqlalchemy.orm import Session

from enums import TransactionType
from models.category import Category
from models.transaction import Transaction
from repositories import account_repository, category_repository, transaction_repository
from schemas.import_schema import ImportResponse, RowError
from schemas.transaction import TransactionCreate
from services import transaction_service

_DATE_COLS = {"תאריך", "date"}
_DEBIT_COLS = {"בחובה", "חובה", "debit", "charge"}
_CREDIT_COLS = {"בזכות", "זכות", "credit"}
_AMOUNT_COLS = {"ש' זכות/חובה", "זכות/חובה", "סכום"}  # single signed column
_DESC_COLS = {"תיאור", "description", "פרטים", "תיאור התנועה"}
_EXT_DESC_COLS = {"תאור מורחב"}
_BALANCE_COLS = {"היתרה בש\"ח", "יתרה", "ש' יתרה", "balance", "running balance"}

_FALLBACK_CATEGORY = "Imported"
_MAX_CAT_NAME = 100


class _TableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: list[list[str]] = []
        self._current_row: Optional[list[str]] = None
        self._current_cell: Optional[list[str]] = None
        self._skip = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if tag in ("script", "style"):
            self._skip = True
        elif tag == "tr":
            self._current_row = []
        elif tag in ("td", "th") and self._current_row is not None:
            self._current_cell = []

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style"):
            self._skip = False
        elif tag in ("td", "th") and self._current_cell is not None:
            cell = "".join(self._current_cell).strip()
            if self._current_row is not None:
                self._current_row.append(cell)
            self._current_cell = None
        elif tag == "tr" and self._current_row is not None:
            if any(c.strip() for c in self._current_row):
                self.rows.append(self._current_row)
            self._current_row = None

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        if self._current_cell is not None:
            self._current_cell.append(data)


def _decode(content: bytes) -> str:
    for encoding in ("utf-8-sig", "cp1255", "utf-8", "iso-8859-8"):
        try:
            return content.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            continue
    raise ValueError("Could not decode file — unsupported encoding")


def _is_html(text: str) -> bool:
    sample = text.lstrip()[:200]
    return "<HTML" in sample or "<html" in sample


def _extract_rows_html(text: str) -> list[list[str]]:
    parser = _TableParser()
    parser.feed(text)
    return parser.rows


def _extract_rows_csv(text: str) -> list[list[str]]:
    return list(csv.reader(io.StringIO(text)))


def _extract_rows_xlsx(content: bytes) -> list[list[str]]:
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    ws = wb.active
    if ws is None:
        raise ValueError("XLSX file contains no active worksheet")
    rows: list[list[str]] = []
    for row in ws.iter_rows(values_only=True):
        str_row: list[str] = []
        for cell in row:
            if cell is None:
                str_row.append("")
            elif isinstance(cell, (DateType, datetime)):
                str_row.append(cell.strftime("%d/%m/%Y"))
            else:
                str_row.append(str(cell))
        if any(c.strip() for c in str_row):
            rows.append(str_row)
    return rows


_APOSTROPHE_VARIANTS = (
    "׳",  # Hebrew geresh
    "’",  # right single quotation mark
    "‘",  # left single quotation mark
)


def _normalize_col(name: str) -> str:
    """Normalize column name: strip, collapse spaces, unify apostrophe variants."""
    name = name.strip()
    for ch in _APOSTROPHE_VARIANTS:
        name = name.replace(ch, "’")
    return " ".join(name.split())


def _find_header(
    rows: list[list[str]],
) -> tuple[int, dict[str, int]]:
    for idx, row in enumerate(rows):
        normalized = [_normalize_col(c) for c in row]
        if any(cell in _DATE_COLS for cell in normalized):
            col_map = {cell: i for i, cell in enumerate(normalized) if cell}
            return idx, col_map
    raise ValueError("Could not find header row")


def _parse_amount(value: str) -> Optional[Decimal]:
    cleaned = value.strip().replace(",", "").replace("\xa0", "").replace("‏", "")
    if not cleaned or cleaned == "0.00":
        return None
    try:
        result = Decimal(cleaned).quantize(Decimal("0.01"))
        return result if result > 0 else None
    except InvalidOperation:
        return None


def _parse_signed_amount(value: str) -> Optional[Decimal]:
    """Parse a combined debit/credit cell where negative = expense, positive = income."""
    cleaned = value.strip().replace(",", "").replace("\xa0", "").replace("‏", "")
    if not cleaned or cleaned in ("0.00", "0"):
        return None
    try:
        result = Decimal(cleaned).quantize(Decimal("0.01"))
        return result if result != 0 else None
    except InvalidOperation:
        return None


def _parse_balance(value: str) -> Optional[Decimal]:
    cleaned = value.strip().replace(",", "").replace("\xa0", "").replace("‏", "")
    if not cleaned:
        return None
    try:
        return Decimal(cleaned).quantize(Decimal("0.01"))
    except InvalidOperation:
        return None


def _parse_date(value: str) -> Optional[DateType]:
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _extract_category_name(description: str) -> str:
    """Extract merchant name from bank descriptions of the form:
    'מתאריך DD/MM/YY HH:MM בכרטיס המסתיים ב-XXXX ב-<merchant>'
    Returns the part after the last 'ב-', or the full description if not found.
    """
    marker = "ב-"
    idx = description.rfind(marker)
    if idx != -1:
        extracted = description[idx + len(marker) :].strip()
        if extracted:
            return extracted[:_MAX_CAT_NAME]
    return description[:_MAX_CAT_NAME].strip() or _FALLBACK_CATEGORY


def _get_cell(row: list[str], idx: Optional[int]) -> str:
    if idx is None or idx >= len(row):
        return ""
    return row[idx].strip()


def _first_col(col_map: dict[str, int], names: set[str]) -> Optional[int]:
    for name in names:
        if name in col_map:
            return col_map[name]
    return None


def _resolve_category(
    db: Session,
    user_id: int,
    name: str,
    transaction_type: TransactionType,
    cache: dict[tuple[str, TransactionType], Category],
) -> Category:
    """Return a matching category, creating a user-owned one if none exists."""
    cache_key = (name.lower(), transaction_type)
    if cache_key in cache:
        return cache[cache_key]
    new_cat = Category(user_id=user_id, name=name, type=transaction_type)
    category_repository.add(db, new_cat)
    category_repository.flush(db)  # populates new_cat.id before create_transaction
    cache[cache_key] = new_cat
    return new_cat


def import_transactions(
    db: Session, user_id: int, account_id: int, content: bytes
) -> ImportResponse:
    account = account_repository.get_by_id(db, account_id, user_id)
    if account is None:
        raise ValueError("Account not found")

    if content[:2] == b"PK":  # xlsx is a ZIP archive
        rows = _extract_rows_xlsx(content)
    else:
        text = _decode(content)
        rows = _extract_rows_html(text) if _is_html(text) else _extract_rows_csv(text)
    header_idx, col_map = _find_header(rows)

    date_idx = _first_col(col_map, _DATE_COLS)
    debit_idx = _first_col(col_map, _DEBIT_COLS)
    credit_idx = _first_col(col_map, _CREDIT_COLS)
    amount_idx = _first_col(col_map, _AMOUNT_COLS)
    # Fuzzy fallback: any column whose header contains both זכות and חובה
    if amount_idx is None:
        for col_name, col_i in col_map.items():
            if "זכות" in col_name and "חובה" in col_name:
                amount_idx = col_i
                break
    ext_desc_idx = _first_col(col_map, _EXT_DESC_COLS)
    desc_idx = _first_col(col_map, _DESC_COLS)
    # Fuzzy fallback: any column whose header contains תיאור
    if desc_idx is None:
        for col_name, col_i in col_map.items():
            if "תיאור" in col_name:
                desc_idx = col_i
                break
    balance_idx = _first_col(col_map, _BALANCE_COLS)
    # Fuzzy fallback: any column whose header contains יתרה
    if balance_idx is None:
        for col_name, col_i in col_map.items():
            if "יתרה" in col_name:
                balance_idx = col_i
                break

    if date_idx is None:
        raise ValueError("Missing date column")
    if debit_idx is None and credit_idx is None and amount_idx is None:
        raise ValueError("Missing debit/credit columns")

    # Pre-load all categories visible to this user into a name→category cache.
    # User-owned categories take precedence over global ones with the same name.
    all_cats = category_repository.list_for_user(db, user_id)
    cat_cache: dict[tuple[str, TransactionType], Category] = {}
    for cat in all_cats:
        key = (cat.name.lower(), cat.type)
        if key not in cat_cache or cat.user_id == user_id:
            cat_cache[key] = cat

    imported = 0
    skipped = 0
    errors: list[RowError] = []
    bank_balance: Optional[Decimal] = None  # captured from the first (newest) data row

    for row_num, row in enumerate(rows[header_idx + 1 :], start=header_idx + 2):
        if not any(c.strip() for c in row):
            continue

        if bank_balance is None and balance_idx is not None:
            bank_balance = _parse_balance(_get_cell(row, balance_idx))

        raw_date = _get_cell(row, date_idx)
        parsed_date = _parse_date(raw_date)
        if parsed_date is None:
            # Repeated header row — date cell contains the column name itself
            if _normalize_col(raw_date) in _DATE_COLS:
                skipped += 1
                continue
            # Footer/section label with no amount — skip silently
            has_amount = any(
                _get_cell(row, i)
                for i in [debit_idx, credit_idx, amount_idx]
                if i is not None
            )
            if not has_amount:
                skipped += 1
                continue
            errors.append(RowError(row=row_num, reason=f"Invalid date: {raw_date!r}"))
            continue

        if amount_idx is not None:
            signed = _parse_signed_amount(_get_cell(row, amount_idx))
            if signed is not None and signed < 0:
                debit_amount: Optional[Decimal] = abs(signed)
                credit_amount: Optional[Decimal] = None
            elif signed is not None and signed > 0:
                debit_amount = None
                credit_amount = signed
            else:
                debit_amount = None
                credit_amount = None
        else:
            debit_amount = (
                _parse_amount(_get_cell(row, debit_idx)) if debit_idx is not None else None
            )
            credit_amount = (
                _parse_amount(_get_cell(row, credit_idx)) if credit_idx is not None else None
            )

        ext = _get_cell(row, ext_desc_idx)
        desc = _get_cell(row, desc_idx)
        description: Optional[str] = (ext if ext else desc) or None
        if description:
            description = description[:500]

        # Internal bank operations (e.g. securities) — store but don't affect balance
        is_internal = description is not None and "שם נייר ערך" in description

        if is_internal:
            amount = debit_amount or credit_amount
            if amount is None:
                skipped += 1
                continue
            tx_type = TransactionType.transfer
        elif debit_amount is not None:
            amount = debit_amount
            tx_type = TransactionType.expense
        elif credit_amount is not None:
            amount = credit_amount
            tx_type = TransactionType.income
        else:
            skipped += 1
            continue

        if transaction_repository.find_duplicate(db, account_id, parsed_date, amount, tx_type):
            skipped += 1
            continue

        cat_name = _extract_category_name(description) if description else _FALLBACK_CATEGORY
        category = _resolve_category(db, user_id, cat_name, tx_type, cat_cache)

        try:
            if tx_type == TransactionType.transfer:
                # Bypass the public-API schema (which rejects transfer) and
                # create the row directly — transfer transactions don't touch balance.
                tx = Transaction(
                    account_id=account_id,
                    user_id=user_id,
                    type=tx_type,
                    amount=amount,
                    category_id=category.id,
                    description=description,
                    date=parsed_date,
                )
                transaction_repository.add(db, tx)
                db.commit()
            else:
                data = TransactionCreate(
                    account_id=account_id,
                    type=tx_type,
                    amount=amount,
                    category_id=category.id,
                    description=description,
                    date=parsed_date,
                )
                transaction_service.create_transaction(db, user_id, data)
            imported += 1
        except ValueError as exc:
            errors.append(RowError(row=row_num, reason=str(exc)))

    if bank_balance is not None:
        refreshed = account_repository.get_by_id(db, account_id, user_id)
        if refreshed is not None:
            refreshed.balance = bank_balance
            db.commit()

    return ImportResponse(imported=imported, skipped=skipped, errors=errors)
