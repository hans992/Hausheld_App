"""Phase 3: Worker is_available, Client address_location for substitution engine.

Revision ID: 002
Revises: 001
Create Date: 2025-02-23

"""
from typing import Sequence, Union

import geoalchemy2
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("workers", sa.Column("is_available", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column(
        "clients",
        sa.Column(
            "address_location",
            geoalchemy2.types.Geography(geometry_type="POINT", srid=4326),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("clients", "address_location")
    op.drop_column("workers", "is_available")
