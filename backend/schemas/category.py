from typing import Optional

from pydantic import BaseModel, Field

from enums import TransactionType


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: TransactionType


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)


class CategoryResponse(BaseModel):
    id: int
    user_id: Optional[int]
    name: str
    type: TransactionType

    model_config = {"from_attributes": True}
