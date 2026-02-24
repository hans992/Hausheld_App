"""Alembic environment: run migrations with asyncpg (no psycopg2 required)."""
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.database import Base
from app.models import Client, Shift, Worker  # noqa: F401 - register models

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
# URL: use alembic.ini sqlalchemy.url if set, else DATABASE_URL from .env (prefer .env to avoid committing secrets)
db_url = config.get_main_option("sqlalchemy.url") or settings.database_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (SQL script only)."""
    # For offline, use a sync-style URL for script generation (no driver change needed for script)
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


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode using asyncpg."""
    connectable = create_async_engine(db_url, poolclass=NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
