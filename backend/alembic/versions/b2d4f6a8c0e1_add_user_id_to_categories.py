"""add user_id to categories

Revision ID: b2d4f6a8c0e1
Revises: a0c69d792092
Create Date: 2026-05-12 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2d4f6a8c0e1'
down_revision: Union[str, None] = 'a0c69d792092'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'categories',
        sa.Column('user_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_categories_user_id_users",
        'categories', 'users', ['user_id'], ['id'],
        ondelete='CASCADE',
    )
    op.create_index('ix_categories_user_id', 'categories', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_categories_user_id', table_name='categories')
    op.drop_constraint(
        "fk_categories_user_id_users", 'categories', type_='foreignkey'
    )
    op.drop_column('categories', 'user_id')
