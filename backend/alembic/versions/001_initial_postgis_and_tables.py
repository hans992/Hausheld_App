"""Initial: PostGIS extension and workers, clients, shifts with soft deletes.

Revision ID: 001
Revises:
Create Date: 2025-02-23

"""
from typing import Sequence, Union

import geoalchemy2
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    op.create_table(
        "workers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("Admin", "Worker", name="workerrole"), nullable=False),
        sa.Column("contract_hours", sa.Integer(), nullable=False),
        sa.Column("current_location", geoalchemy2.types.Geography(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workers_email"), "workers", ["email"], unique=True)
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("address", sa.String(512), nullable=False),
        sa.Column("insurance_provider", sa.String(255), nullable=False),
        sa.Column("care_level", sa.Integer(), nullable=False),
        sa.Column("monthly_budget", sa.Numeric(10, 2), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "shifts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("worker_id", sa.Integer(), nullable=True),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.Enum("Scheduled", "In_Progress", "Completed", "Cancelled", "Unassigned", name="shiftstatus"), nullable=False),
        sa.Column("tasks", sa.String(255), nullable=False),
        sa.Column("check_in_location", geoalchemy2.types.Geography(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("check_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("check_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signature_storage_key", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["worker_id"], ["workers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("shifts")
    op.drop_table("clients")
    op.drop_index(op.f("ix_workers_email"), table_name="workers")
    op.drop_table("workers")
    op.execute("DROP TYPE IF EXISTS shiftstatus;")
    op.execute("DROP TYPE IF EXISTS workerrole;")
    # Do not drop PostGIS extension; other DBs may use it
    # op.execute("DROP EXTENSION IF EXISTS postgis;")
