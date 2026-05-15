"""add categories table, category_id fk on transactions

Revision ID: a0c69d792092
Revises: 953cae57e738
Create Date: 2026-05-12 14:12:29.503531

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0c69d792092'
down_revision: Union[str, None] = '953cae57e738'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_CATEGORIES = [
    ("Salary", "income", "#4ade80"),
    ("Freelance", "income", "#34d399"),
    ("Investment", "income", "#60a5fa"),
    ("Gift", "income", "#a78bfa"),
    ("Other Income", "income", "#94a3b8"),
    ("Food & Dining", "expense", "#f87171"),
    ("Transport", "expense", "#fb923c"),
    ("Housing", "expense", "#facc15"),
    ("Entertainment", "expense", "#e879f9"),
    ("Shopping", "expense", "#f472b6"),
    ("Health", "expense", "#38bdf8"),
    ("Education", "expense", "#818cf8"),
    ("Utilities", "expense", "#6ee7b7"),
    ("Other Expense", "expense", "#94a3b8"),
]


def upgrade() -> None:
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column(
            'type',
            sa.Enum('income', 'expense', name='transactiontype', native_enum=False),
            nullable=False,
        ),
        sa.Column('color', sa.String(length=7), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    categories_table = sa.table(
        'categories',
        sa.column('name', sa.String),
        sa.column('type', sa.String),
        sa.column('color', sa.String),
    )
    op.bulk_insert(
        categories_table,
        [{"name": n, "type": t, "color": c} for n, t, c in SEED_CATEGORIES],
    )

    # Resolve the id of "Other Expense" to use as the default for existing rows.
    conn = op.get_bind()
    row = conn.execute(
        sa.text("SELECT id FROM categories WHERE name = 'Other Expense' LIMIT 1")
    ).fetchone()
    default_id = row[0]

    op.add_column('transactions', sa.Column('category_id', sa.Integer(), nullable=True))
    conn.execute(
        sa.text("UPDATE transactions SET category_id = :cid WHERE category_id IS NULL"),
        {"cid": default_id},
    )
    op.alter_column('transactions', 'category_id', nullable=False)
    op.create_foreign_key(
        "fk_transactions_category_id_categories",
        'transactions', 'categories', ['category_id'], ['id']
    )
    op.drop_column('transactions', 'category')


def downgrade() -> None:
    op.add_column(
        'transactions',
        sa.Column('category', sa.VARCHAR(length=100), autoincrement=False, nullable=True),
    )
    conn = op.get_bind()
    conn.execute(
        sa.text(
            "UPDATE transactions t SET category = c.name "
            "FROM categories c WHERE t.category_id = c.id"
        )
    )
    op.alter_column('transactions', 'category', nullable=False)
    op.drop_constraint(
        "fk_transactions_category_id_categories",
        'transactions', type_='foreignkey'
    )
    op.drop_column('transactions', 'category_id')
    op.drop_table('categories')
