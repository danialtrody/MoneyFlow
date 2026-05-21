import os
from collections import defaultdict
from datetime import date, timedelta
from typing import Generator, Optional

from groq import APIStatusError, Groq, RateLimitError
from sqlalchemy.orm import Session

from repositories import account_repository, transaction_repository
from schemas.ai_schema import ChatMessage

_SYSTEM_INSTRUCTION = (
    "You are a personal financial advisor embedded in MoneyFlow, a personal finance app. "
    "You have access to the user's real financial data provided below. "
    "Always give specific, data-driven, and actionable advice. "
    "Be concise and friendly. Reference actual numbers and categories from the data. "
    "Format monetary values clearly with their currency code. "
    "At the very end of every response, on a new line, write exactly: "
    "FOLLOWUPS: <question 1> | <question 2> | <question 3> "
    "(3 short relevant follow-up questions, each under 8 words, based on your answer)."
)

_MODEL = "llama-3.3-70b-versatile"
_SENTINEL = "[DONE]"


def _get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is not set. Add it to your .env file."
        )
    return Groq(api_key=api_key)


def _build_financial_context(
    db: Session, user_id: int, period_days: Optional[int]
) -> str:
    accounts = account_repository.get_all(db, user_id)
    date_from = (
        date.today() - timedelta(days=period_days) if period_days else None
    )
    transactions = transaction_repository.get_since(db, user_id, date_from)

    period_label = (
        f"Last {period_days} days ({date_from} → {date.today()})"
        if date_from
        else f"All time (up to {date.today()})"
    )

    account_lines = "\n".join(
        f"  • {a.name} ({a.type.value}) — {float(a.balance):,.2f} {a.currency}"
        for a in accounts
    )
    currencies = list({a.currency for a in accounts})
    portfolio_currency = currencies[0] if len(currencies) == 1 else "mixed"
    portfolio_total = sum(float(a.balance) for a in accounts)

    total_income = sum(
        float(t.amount) for t in transactions if t.type.value == "income"
    )
    total_expenses = sum(
        float(t.amount) for t in transactions if t.type.value == "expense"
    )
    net = total_income - total_expenses

    category_totals: dict[str, float] = defaultdict(float)
    for t in transactions:
        if t.type.value == "expense":
            name = t.category.name if t.category else "Uncategorized"
            category_totals[name] += float(t.amount)

    sorted_cats = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    cat_lines = "\n".join(
        f"  • {name} — {amount:,.2f} ({amount / total_expenses * 100:.1f}%)"
        for name, amount in sorted_cats[:7]
    ) if (sorted_cats and total_expenses) else "  (no expense transactions)"

    tx_lines_list = []
    for t in transactions[:25]:
        cat_name = t.category.name if t.category else "—"
        desc = f" | {t.description[:35]}" if t.description else ""
        tx_lines_list.append(
            f"  {t.date} | {t.type.value} | {float(t.amount):,.2f} | {cat_name}{desc}"
        )
    tx_lines = "\n".join(tx_lines_list) if tx_lines_list else "  (no transactions)"

    return f"""=== FINANCIAL DATA ===
Period: {period_label}

ACCOUNTS:
{account_lines}
Portfolio total: {portfolio_total:,.2f} {portfolio_currency}

PERIOD SUMMARY:
  • Income:   {total_income:,.2f}
  • Expenses: {total_expenses:,.2f}
  • Net:      {'+' if net >= 0 else ''}{net:,.2f}

TOP EXPENSE CATEGORIES:
{cat_lines}

TRANSACTIONS ({len(transactions)} total, newest first — showing up to 25):
{tx_lines}
"""


def stream_chat(
    db: Session,
    user_id: int,
    message: str,
    history: list[ChatMessage],
    period_days: Optional[int],
) -> Generator[str, None, None]:
    client = _get_client()
    context = _build_financial_context(db, user_id, period_days)

    messages = [{"role": "system", "content": _SYSTEM_INSTRUCTION + "\n\n" + context}]
    for msg in history:
        role = "assistant" if msg.role == "model" else "user"
        messages.append({"role": role, "content": msg.content})
    messages.append({"role": "user", "content": message})

    try:
        stream = client.chat.completions.create(
            model=_MODEL,
            messages=messages,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
    except RateLimitError:
        yield "[ERROR] Daily token limit reached. Please try again tomorrow or upgrade your Groq plan."
    except APIStatusError as e:
        yield f"[ERROR] API error: {e.message}"

    yield _SENTINEL
