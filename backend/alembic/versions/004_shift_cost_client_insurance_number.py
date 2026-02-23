"""Phase 5: Shift.cost for budget tracking, Client.insurance_number for SGB XI export.

Revision ID: 004
Revises: 003
Create Date: 2025-02-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("shifts", sa.Column("cost", sa.Numeric(10, 2), nullable=True))
    op.add_column("clients", sa.Column("insurance_number", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("clients", "insurance_number")
    op.drop_column("shifts", "cost")
