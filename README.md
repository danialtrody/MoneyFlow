<div align="center">

# MoneyFlow

**A clean, modern personal finance tracker built to give you full control over your money.**

Track accounts, log income and expenses, organise transactions by category — all in one dark, minimal interface.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## What is MoneyFlow?

MoneyFlow is a **personal finance dashboard** designed for people who want a simple, no-noise way to stay on top of their finances. Instead of bloated spreadsheets or complex apps, MoneyFlow gives you:

- A clear view of all your **accounts and their balances** (bank, cash, credit card, savings)
- A fast way to **log income and expenses** tied to specific accounts
- **Custom categories** so transactions are always meaningful, not just numbers
- **Real-time balance updates** — every transaction immediately reflects on your account

The idea is straightforward: open the app, see where your money is, log what you spent or earned, and close it. No subscriptions, no trackers, no noise.


---

## Features

### Accounts
- Create multiple accounts: **Bank**, **Cash**, **Credit Card**, **Savings**
- See live balances per account, formatted with your chosen currency
- Edit name, type, and currency inline — directly on the card
- Double-click to delete with a confirmation step (prevents accidents)

### Transactions
- Log **income** (green) and **expenses** (red) against any account
- Each transaction is linked to a **category**, has an optional description, and a date
- Balances update automatically — no manual recalculation needed
- Edit or delete any transaction inline in the list
- Balance is reversed correctly on edit or delete

### Categories
- Full **CRUD** for your own categories — create, rename, delete
- **Global (seed) categories** are always available to every user and cannot be modified
- Categories are typed (`income` or `expense`) — the dropdown filters itself based on transaction type
- Inline rename inside the category dropdown — no separate settings page needed

### Auth & Sessions
- Register and log in with email + password
- Session is stored in a secure **httpOnly cookie** — no localStorage tokens
- On page refresh, the session is **automatically restored** via `GET /auth/me`
- Any 401 from the API instantly redirects to the login page

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4 |
| Backend | FastAPI, SQLAlchemy (ORM), Alembic (migrations) |
| Database | PostgreSQL |
| Auth | JWT via `python-jose`, bcrypt via `passlib` |
| Styling | Tailwind CSS v4 (utility-first, no component libraries) |

---

## Project Structure

```
MoneyFlow/
├── backend/
│   ├── models/          # SQLAlchemy ORM models
│   ├── repositories/    # DB queries (no business logic)
│   ├── services/        # Business logic (no HTTP)
│   ├── routers/         # FastAPI route handlers
│   ├── schemas/         # Pydantic request/response DTOs
│   ├── alembic/         # Database migrations
│   ├── tests/           # Unit + integration tests
│   ├── database.py      # DB session + engine
│   ├── dependencies.py  # Auth dependency (JWT → User)
│   ├── enums.py         # Shared enums (AccountType, TransactionType)
│   └── main.py          # App factory + router registration
│
└── frontend/
    └── src/
        ├── components/  # Shared UI (Icons, Toast)
        ├── hooks/       # useToast
        ├── pages/       # LoginPage, RegisterPage, DashboardPage
        ├── services/    # All API calls (one file per resource)
        ├── App.jsx      # Root — routing + session restore
        └── index.css    # Tailwind + global animations
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL running locally

### 1. Clone

```bash
git clone https://github.com/your-username/MoneyFlow.git
cd MoneyFlow
```

### 2. Backend setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/moneyFlow
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
COOKIE_SECURE=false
```

Run migrations and start the server:

```powershell
alembic upgrade head
uvicorn main:app --reload
# → http://localhost:8000
```

### 3. Frontend setup

```powershell
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Start the dev server:

```powershell
npm run dev
# → http://localhost:5173
```

### 4. Open the app

Go to [http://localhost:5173](http://localhost:5173), register an account, and start tracking.

---


