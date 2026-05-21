import json
from typing import Iterator
from unittest.mock import patch

from fastapi.testclient import TestClient

_CHAT = "/ai/chat"
_REGISTER = "/auth/register"
_LOGIN = "/auth/login"

_USER = {"email": "advisor@example.com", "password": "password123", "full_name": "Advisor"}


def _login(client: TestClient) -> None:
    client.post(_REGISTER, json=_USER)
    client.post(_LOGIN, json={"email": _USER["email"], "password": _USER["password"]})


def _mock_stream(*chunks: str) -> Iterator[str]:
    yield from chunks
    yield "[DONE]"


def test_chat_requires_auth(client: TestClient) -> None:
    response = client.post(_CHAT, json={"message": "hello"})

    assert response.status_code == 401


def test_chat_returns_200_with_sse_content_type(client: TestClient) -> None:
    _login(client)

    with patch(
        "services.ai_service.stream_chat",
        return_value=_mock_stream("Hi there"),
    ):
        response = client.post(_CHAT, json={"message": "hello"})

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]


def test_chat_sse_contains_data_events_for_each_chunk(client: TestClient) -> None:
    _login(client)

    with patch(
        "services.ai_service.stream_chat",
        return_value=_mock_stream("Hello", " world"),
    ):
        response = client.post(_CHAT, json={"message": "hello"})

    events = [
        line for line in response.text.splitlines() if line.startswith("data:")
    ]
    payloads = [json.loads(line[len("data: "):]) for line in events]
    assert "Hello" in payloads
    assert " world" in payloads


def test_chat_sse_ends_with_done_sentinel(client: TestClient) -> None:
    _login(client)

    with patch(
        "services.ai_service.stream_chat",
        return_value=_mock_stream("Some text"),
    ):
        response = client.post(_CHAT, json={"message": "hello"})

    assert json.dumps("[DONE]") in response.text


def test_chat_returns_error_event_when_api_key_missing(client: TestClient) -> None:
    _login(client)

    with patch(
        "services.ai_service.stream_chat",
        side_effect=ValueError("GROQ_API_KEY is not set"),
    ):
        response = client.post(_CHAT, json={"message": "hello"})

    assert response.status_code == 200
    assert "[ERROR]" in response.text
    assert "[DONE]" in response.text


def test_chat_accepts_optional_period_days(client: TestClient) -> None:
    _login(client)

    with patch(
        "services.ai_service.stream_chat",
        return_value=_mock_stream("Ok"),
    ) as mock_stream:
        client.post(_CHAT, json={"message": "hello", "period_days": 30})

    _, _, _, _, period_days = mock_stream.call_args[0]
    assert period_days == 30


def test_chat_accepts_conversation_history(client: TestClient) -> None:
    _login(client)
    history = [{"role": "user", "content": "What is my balance?"}]

    with patch(
        "services.ai_service.stream_chat",
        return_value=_mock_stream("Your balance is..."),
    ) as mock_stream:
        client.post(_CHAT, json={"message": "tell me more", "history": history})

    _, _, _, passed_history, _ = mock_stream.call_args[0]
    assert len(passed_history) == 1
    assert passed_history[0].content == "What is my balance?"
