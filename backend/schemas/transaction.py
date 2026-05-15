from datetime import date as DateType
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, computed_field

from enums import TransactionType
from schemas.category import CategoryResponse


class TransactionCreate(BaseModel):
    account_id: int
    type: TransactionType
    amount: Decimal = Field(gt=0)
    category_id: int
    description: Optional[str] = Field(default=None, max_length=500)
    date: DateType = Field(default_factory=DateType.today)


class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = Field(default=None, gt=0)
    category_id: Optional[int] = None
    description: Optional[str] = Field(default=None, max_length=500)
    date: Optional[DateType] = None


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    user_id: int
    type: TransactionType
    amount: Decimal
    category_id: int
    category: CategoryResponse = Field(exclude=True)
    description: Optional[str]
    date: DateType
    created_at: datetime

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def category_name(self) -> str:
        return self.category.name
