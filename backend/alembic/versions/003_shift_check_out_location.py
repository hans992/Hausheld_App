"""Phase 4: Shift check_out_location for GPS at checkout.

Revision ID: 003
Revises: 002
Create Date: 2025-02-23

"""
from typing import Sequence, Union

import geoalchemy2
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "shifts",
        sa.Column(
            "check_out_location",
            geoalchemy2.types.Geography(geometry_type="POINT", srid=4326),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("shifts", "check_out_location")
