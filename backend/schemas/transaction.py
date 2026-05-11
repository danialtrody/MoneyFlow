from datetime import date as DateType
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from enums import TransactionType


class TransactionCreate(BaseModel):
    account_id: int
    type: TransactionType
    amount: Decimal = Field(gt=0)
    category: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    date: DateType = Field(default_factory=DateType.today)


class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = Field(default=None, gt=0)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    date: Optional[DateType] = None


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    user_id: int
    type: TransactionType
    amount: Decimal
    category: str
    description: Optional[str]
    date: DateType
    created_at: datetime

    model_config = {"from_attributes": True}
