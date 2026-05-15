from typing import Optional

from sqlalchemy import Enum as SAEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from enums import TransactionType


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[TransactionType] = mapped_column(
        SAEnum(TransactionType, values_callable=lambda x: [e.value for e in x], native_enum=False),
        nullable=False,
    )

