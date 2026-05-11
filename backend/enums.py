import enum


class AccountType(str, enum.Enum):
    bank = "bank"
    cash = "cash"
    credit_card = "credit_card"
    savings = "savings"


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"
