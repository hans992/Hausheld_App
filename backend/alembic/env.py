"""Alembic environment: load app config and run migrations (sync for Alembic)."""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine
from sqlalchemy.engine import Connection
from sqlalchemy.pool import NullPool

from app.config import settings
from app.database import Base
from app.models import Client, Shift, Worker  # noqa: F401 - register models

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
# Sync URL for Alembic (psycopg2)
db_url = settings.database_url.replace("postgresql+asyncpg", "postgresql+psycopg2", 1)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (SQL script only)."""
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (connect to DB). Requires psycopg2 or psycopg."""
    connectable = create_engine(db_url, poolclass=NullPool)
    with connectable.connect() as connection:
        do_run_migrations(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
