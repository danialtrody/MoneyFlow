from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from enums import AccountType


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: AccountType
    balance: Decimal = Field(default=Decimal("0.00"))
    currency: str = Field(default="USD", max_length=10)


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    type: Optional[AccountType] = None
    balance: Optional[Decimal] = None
    currency: Optional[str] = Field(default=None, max_length=10)


class AccountResponse(BaseModel):
    id: int
    user_id: int
    name: str
    type: AccountType
    balance: Decimal
    currency: str
    created_at: datetime

    model_config = {"from_attributes": True}
