"""remove color from categories

Revision ID: c3e5f7a9b1d2
Revises: b2d4f6a8c0e1
Create Date: 2026-05-15 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c3e5f7a9b1d2'
down_revision: Union[str, None] = 'b2d4f6a8c0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('categories', 'color')


def downgrade() -> None:
    op.add_column(
        'categories',
        sa.Column('color', sa.String(length=7), nullable=False, server_default='#6366f1'),
    )
