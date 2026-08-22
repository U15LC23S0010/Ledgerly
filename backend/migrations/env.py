from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

import sys
import os

# =========================================================
# PYTHON PATH
# =========================================================

sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )
)

# =========================================================
# DATABASE BASE
# =========================================================

from app.db.database import Base

# =========================================================
# IMPORT ALL MODELS
# =========================================================

from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.expense import Expense
from app.models.category import Category
from app.models.budget import Budget
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.vendor import Vendor

# =========================================================
# APPLICATION SETTINGS
# =========================================================

from app.core.config import settings

# =========================================================
# ALEMBIC CONFIG
# =========================================================

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# =========================================================
# ALEMBIC METADATA
# =========================================================

target_metadata = Base.metadata

# =========================================================
# DATABASE URL
# =========================================================

DATABASE_URL = settings.DATABASE_URL

# =========================================================
# OFFLINE MIGRATIONS
# =========================================================

def run_migrations_offline() -> None:

    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named"
        },
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# =========================================================
# ONLINE MIGRATIONS
# =========================================================

def run_migrations_online() -> None:

    configuration = config.get_section(
        config.config_ini_section
    )

    configuration["sqlalchemy.url"] = DATABASE_URL

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# =========================================================
# RUN MIGRATIONS
# =========================================================

if context.is_offline_mode():

    run_migrations_offline()

else:

    run_migrations_online()