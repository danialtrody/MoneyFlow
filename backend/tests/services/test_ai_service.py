from datetime import date
from decimal import Decimal
from typing import Generator
from unittest.mock import MagicMock, patch

import httpx
import pytest
from groq import APIStatusError, RateLimitError

from schemas.ai_schema import ChatMessage
from services import ai_service


@pytest.fixture
def mock_account_repo() -> Generator[MagicMock, None, None]:
    with patch("services.ai_service.account_repository") as m:
        yield m


@pytest.fixture
def mock_tx_repo() -> Generator[MagicMock, None, None]:
    with patch("services.ai_service.transaction_repository") as m:
        yield m


@pytest.fixture
def mock_db() -> MagicMock:
    return MagicMock()


def _make_account(
    name: str = "Main",
    currency: str = "ILS",
    balance: float = 1000.0,
    account_type: str = "bank",
) -> MagicMock:
    account = MagicMock()
    account.name = name
    account.type.value = account_type
    account.currency = currency
    account.balance = Decimal(str(balance))
    return account


def _make_transaction(
    type_val: str = "income",
    amount: float = 100.0,
    category_name: str = "Salary",
    description: str = "",
) -> MagicMock:
    tx = MagicMock()
    tx.type.value = type_val
    tx.amount = Decimal(str(amount))
    tx.category.name = category_name
    tx.description = description
    tx.date = date.today()
    return tx


def _make_groq_request() -> httpx.Request:
    return httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")


# --- _get_client ---


def test_get_client_raises_when_api_key_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    with pytest.raises(ValueError, match="GROQ_API_KEY"):
        ai_service._get_client()


def test_get_client_returns_groq_instance_when_key_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "test-key-123")

    client = ai_service._get_client()

    assert client is not None


# --- _build_financial_context ---


def test_build_context_contains_account_name_and_currency(
    mock_account_repo: MagicMock,
    mock_tx_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_all.return_value = [_make_account("Savings", "ILS", 500.0)]
    mock_tx_repo.get_since.return_value = []

    result = ai_service._build_financial_context(mock_db, 1, None)

    assert "Savings" in result
    assert "ILS" in result
    assert "500.00" in result


def test_build_context_no_division_by_zero_when_expense_amounts_are_zero(
    mock_account_repo: MagicMock,
    mock_tx_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_all.return_value = [_make_account()]
    zero_expense = _make_transaction(type_val="expense", amount=0.0, category_name="Ghost")
    mock_tx_repo.get_since.return_value = [zero_expense]

    result = ai_service._build_financial_context(mock_db, 1, None)

    assert "no expense transactions" in result


def test_build_context_shows_top_expense_categories(
    mock_account_repo: MagicMock,
    mock_tx_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_all.return_value = [_make_account()]
    tx = _make_transaction(type_val="expense", amount=300.0, category_name="Rent")
    mock_tx_repo.get_since.return_value = [tx]

    result = ai_service._build_financial_context(mock_db, 1, None)

    assert "Rent" in result
    assert "300.00" in result
    assert "100.0%" in result


def test_build_context_passes_date_filter_to_repository(
    mock_account_repo: MagicMock,
    mock_tx_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_all.return_value = []
    mock_tx_repo.get_since.return_value = []

    ai_service._build_financial_context(mock_db, 1, 30)

    _, _, date_from = mock_tx_repo.get_since.call_args[0]
    assert date_from is not None


def test_build_context_mixed_currencies_shows_mixed_label(
    mock_account_repo: MagicMock,
    mock_tx_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_all.return_value = [
        _make_account("A", "ILS"),
        _make_account("B", "USD"),
    ]
    mock_tx_repo.get_since.return_value = []

    result = ai_service._build_financial_context(mock_db, 1, None)

    assert "mixed" in result


# --- stream_chat ---


def test_stream_chat_yields_text_chunks_and_sentinel(
    mock_account_repo: MagicMock,
    mock_tx_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_all.return_value = [_make_account()]
    mock_tx_repo.get_since.return_value = []

    chunk1 = MagicMock()
    chunk1.choices[0].delta.content = "Hello "
    chunk2 = MagicMock()
    chunk2.choices[0].delta.content = "world"

    with patch("services.ai_service._get_client") as mock_client:
        mock_client.return_value.chat.completions.create.return_value = [chunk1, chunk2]
        result = list(ai_service.stream_chat(mock_db, 1, "hi", [], None))

    assert "Hello " in result
    assert "world" in result
    assert result[-1] == "[DONE]"


def test_stream_chat_yields_error_and_sentinel_on_rate_limit(
    mock_account_repo: MagicMock,
    mock_tx_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_all.return_value = [_make_account()]
    mock_tx_repo.get_since.return_value = []

    req = _make_groq_request()
    error = RateLimitError(
        message="rate limit exceeded",
        response=httpx.Response(429, request=req),
        body=None,
    )

    with patch("services.ai_service._get_client") as mock_client:
        mock_client.return_value.chat.completions.create.side_effect = error
        result = list(ai_service.stream_chat(mock_db, 1, "hi", [], None))

    assert any("[ERROR]" in c for c in result)
    assert result[-1] == "[DONE]"


def test_stream_chat_yields_error_and_sentinel_on_api_status_error(
    mock_account_repo: MagicMock,
    mock_tx_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_all.return_value = [_make_account()]
    mock_tx_repo.get_since.return_value = []

    req = _make_groq_request()
    error = APIStatusError(
        message="internal server error",
        response=httpx.Response(500, request=req),
        body=None,
    )

    with patch("services.ai_service._get_client") as mock_client:
        mock_client.return_value.chat.completions.create.side_effect = error
        result = list(ai_service.stream_chat(mock_db, 1, "hi", [], None))

    assert any("[ERROR]" in c for c in result)
    assert result[-1] == "[DONE]"


def test_stream_chat_propagates_value_error_for_missing_key(
    mock_account_repo: MagicMock,
    mock_tx_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_all.return_value = [_make_account()]
    mock_tx_repo.get_since.return_value = []

    with patch(
        "services.ai_service._get_client",
        side_effect=ValueError("GROQ_API_KEY is not set"),
    ):
        with pytest.raises(ValueError, match="GROQ_API_KEY"):
            list(ai_service.stream_chat(mock_db, 1, "hi", [], None))


def test_stream_chat_maps_model_role_to_assistant(
    mock_account_repo: MagicMock,
    mock_tx_repo: MagicMock,
    mock_db: MagicMock,
) -> None:
    mock_account_repo.get_all.return_value = [_make_account()]
    mock_tx_repo.get_since.return_value = []
    history = [ChatMessage(role="model", content="Sure!")]

    with patch("services.ai_service._get_client") as mock_client:
        mock_client.return_value.chat.completions.create.return_value = []
        list(ai_service.stream_chat(mock_db, 1, "hi", history, None))

    call_args = mock_client.return_value.chat.completions.create.call_args
    messages = call_args[1]["messages"]
    history_msg = next(m for m in messages if m["content"] == "Sure!")
    assert history_msg["role"] == "assistant"
