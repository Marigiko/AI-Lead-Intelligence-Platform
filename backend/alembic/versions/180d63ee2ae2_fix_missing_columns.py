"""fix_missing_columns

Revision ID: 180d63ee2ae2
Revises: ce1804cf4723
Create Date: 2026-07-11 02:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '180d63ee2ae2'
down_revision: Union[str, None] = 'ce1804cf4723'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('deals', sa.Column('extra_data', postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False))


def downgrade() -> None:
    op.drop_column('deals', 'extra_data')
