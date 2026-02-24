"""Phase 6: Audit log table; clients.care_level as Text for encryption at rest.

Revision ID: 005
Revises: 004
Create Date: 2025-02-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN CREATE TYPE auditaction AS ENUM ('VIEW', 'CREATE', 'UPDATE', 'DELETE');"
        " EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    op.execute(
        "DO $$ BEGIN CREATE TYPE audittargettype AS ENUM ('Client');"
        " EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
    )
    # Use IF NOT EXISTS so migration is idempotent when audit_logs was created in a previous partial run.
    # asyncpg allows only one command per execute(), so we run each statement separately.
    op.execute(
        "CREATE TABLE IF NOT EXISTS audit_logs ("
        "id SERIAL NOT NULL, user_id INTEGER, action auditaction NOT NULL, "
        "target_type audittargettype NOT NULL, target_id INTEGER NOT NULL, details TEXT, "
        "created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, "
        "PRIMARY KEY (id), FOREIGN KEY(user_id) REFERENCES workers (id) ON DELETE SET NULL)"
    )
    op.execute("COMMENT ON TABLE audit_logs IS 'GDPR audit trail; append-only, read-only via API'")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_target_type_target_id ON audit_logs (target_type, target_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs (created_at);")

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
