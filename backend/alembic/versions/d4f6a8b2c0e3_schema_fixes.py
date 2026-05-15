"""schema fixes: restrict category fk, account balance server_default

Revision ID: d4f6a8b2c0e3
Revises: c3e5f7a9b1d2
Create Date: 2026-05-15 16:30:00.000000

"""
from typing import Union

import sqlalchemy as sa
from alembic import op


revision: str = 'd4f6a8b2c0e3'
down_revision: Union[str, None] = 'c3e5f7a9b1d2'
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.drop_constraint(
        'transactions_category_id_fkey',
        'transactions',
        type_='foreignkey',
    )
    op.create_foreign_key(
        'transactions_category_id_fkey',
        'transactions',
        'categories',
        ['category_id'],
        ['id'],
        ondelete='RESTRICT',
    )

    op.alter_column(
        'accounts',
        'balance',
        existing_type=sa.Numeric(10, 2),
        server_default='0.00',
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'accounts',
        'balance',
        existing_type=sa.Numeric(10, 2),
        server_default=None,
        existing_nullable=False,
    )

    op.drop_constraint(
        'transactions_category_id_fkey',
        'transactions',
        type_='foreignkey',
    )
    op.create_foreign_key(
        'transactions_category_id_fkey',
        'transactions',
        'categories',
        ['category_id'],
        ['id'],
    )
