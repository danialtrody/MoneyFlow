from datetime import date as DateType
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, computed_field, field_validator

from enums import TransactionType
from schemas.category import CategoryResponse

_PUBLIC_TYPES = {TransactionType.income, TransactionType.expense}


class TransactionCreate(BaseModel):
    account_id: int
    type: TransactionType
    amount: Decimal = Field(gt=0)
    category_id: int
    description: Optional[str] = Field(default=None, max_length=500)
    date: DateType = Field(default_factory=DateType.today)

    @field_validator("type")
    @classmethod
    def type_must_be_public(cls, v: TransactionType) -> TransactionType:
        if v not in _PUBLIC_TYPES:
            raise ValueError("type must be income or expense")
        return v


class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = Field(default=None, gt=0)
    category_id: Optional[int] = None
    description: Optional[str] = Field(default=None, max_length=500)
    date: Optional[DateType] = None

    @field_validator("type")
    @classmethod
    def type_must_be_public(cls, v: Optional[TransactionType]) -> Optional[TransactionType]:
        if v is not None and v not in _PUBLIC_TYPES:
            raise ValueError("type must be income or expense")
        return v


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
