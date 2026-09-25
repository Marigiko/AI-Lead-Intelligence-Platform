"""add company justification

Revision ID: 6f2d1c9a4b31
Revises: 180d63ee2ae2
Create Date: 2026-09-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '6f2d1c9a4b31'
down_revision: Union[str, None] = '180d63ee2ae2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('companies', sa.Column('justification', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('companies', 'justification')
