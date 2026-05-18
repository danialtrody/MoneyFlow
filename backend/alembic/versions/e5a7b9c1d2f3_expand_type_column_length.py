"""expand type column length for transfer support

Revision ID: e5a7b9c1d2f3
Revises: d4f6a8b2c0e3
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = 'e5a7b9c1d2f3'
down_revision: Union[str, None] = 'd4f6a8b2c0e3'
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.alter_column(
        'transactions', 'type',
        existing_type=sa.String(7),
        type_=sa.String(20),
        existing_nullable=False,
    )
    op.alter_column(
        'categories', 'type',
        existing_type=sa.String(7),
        type_=sa.String(20),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'categories', 'type',
        existing_type=sa.String(20),
        type_=sa.String(7),
        existing_nullable=False,
    )
    op.alter_column(
        'transactions', 'type',
        existing_type=sa.String(20),
        type_=sa.String(7),
        existing_nullable=False,
    )
