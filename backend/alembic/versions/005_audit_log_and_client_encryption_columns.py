"""Phase 6: Audit log table; clients.care_level as Text for encryption at rest.

Revision ID: 005
Revises: 004
Create Date: 2025-02-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.Enum("VIEW", "CREATE", "UPDATE", "DELETE", name="auditaction"), nullable=False),
        sa.Column("target_type", sa.Enum("Client", name="audittargettype"), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["workers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        comment="GDPR audit trail; append-only, read-only via API",
    )
    op.create_index(op.f("ix_audit_logs_target_type_target_id"), "audit_logs", ["target_type", "target_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_user_id"), "audit_logs", ["user_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_created_at"), "audit_logs", ["created_at"], unique=False)

    # Allow care_level to store ciphertext (Text); existing data becomes "1".."5"
    op.alter_column(
        "clients",
        "care_level",
        existing_type=sa.Integer(),
        type_=sa.Text(),
        existing_nullable=False,
        postgresql_using="care_level::text",
    )
    # insurance_number already String(255); ensure it can hold longer ciphertext
    op.alter_column(
        "clients",
        "insurance_number",
        existing_type=sa.String(255),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "clients",
        "insurance_number",
        existing_type=sa.Text(),
        type_=sa.String(255),
        existing_nullable=True,
    )
    op.alter_column(
        "clients",
        "care_level",
        existing_type=sa.Text(),
        type_=sa.Integer(),
        existing_nullable=False,
        postgresql_using="NULLIF(TRIM(care_level), '')::integer",
    )
    op.drop_index(op.f("ix_audit_logs_created_at"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_user_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_target_type_target_id"), table_name="audit_logs")
    op.drop_table("audit_logs")
    op.execute("DROP TYPE auditaction")
    op.execute("DROP TYPE audittargettype")
