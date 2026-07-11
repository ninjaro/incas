"""reconcile databases created before Alembic was introduced

Revision ID: 20260711_02
Revises: 1e2379697b4a
Create Date: 2026-07-11

Existing deployments first stamp ``1e2379697b4a`` and then upgrade. Fresh
databases run the generated baseline revision first, making this revision a
no-op. Every operation is inspected explicitly; failures are not swallowed.
"""

from alembic import op
import sqlalchemy as sa


revision = "20260711_02"
down_revision = "1e2379697b4a"
branch_labels = None
depends_on = None


def _columns(table_name):
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def _add_missing_columns(table_name, columns):
    existing = _columns(table_name)
    for column in columns:
        if column.name not in existing:
            op.add_column(table_name, column)


def upgrade():
    # Create React-era tables that do not exist in the legacy schema. The
    # metadata is the same frozen model contract used to generate revision 1.
    from app.models import db

    bind = op.get_bind()
    for table in db.metadata.sorted_tables:
        table.create(bind=bind, checkfirst=True)

    _add_missing_columns(
        "posts",
        [
            sa.Column("publish_at", sa.DateTime(), nullable=True),
            sa.Column("registration_limit_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("registration_limit", sa.Integer(), nullable=True),
            sa.Column("registration_price_cents", sa.Integer(), nullable=True),
            sa.Column("registration_is_deposit", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("status", sa.String(32), nullable=False, server_default="published"),
            sa.Column("ends_at", sa.DateTime(), nullable=True),
            sa.Column("duration_minutes", sa.Integer(), nullable=True),
            sa.Column("registration_mode", sa.String(32), nullable=False, server_default="none"),
            sa.Column("deposit_explanation", sa.String(500), nullable=False, server_default=""),
            sa.Column("venue", sa.String(200), nullable=False, server_default=""),
            sa.Column("address", sa.String(300), nullable=False, server_default=""),
            sa.Column("city", sa.String(120), nullable=False, server_default=""),
            sa.Column("meeting_point", sa.String(300), nullable=False, server_default=""),
            sa.Column("destination", sa.String(200), nullable=False, server_default=""),
            sa.Column("country_code", sa.String(2), nullable=False, server_default=""),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("destination_latitude", sa.Float(), nullable=True),
            sa.Column("destination_longitude", sa.Float(), nullable=True),
            sa.Column("map_config", sa.Text(), nullable=False, server_default="{}"),
            sa.Column("feature_flags", sa.Text(), nullable=False, server_default="[]"),
        ],
    )
    _add_missing_columns(
        "language_tandem_requests",
        [sa.Column("offered_language_levels", sa.Text(), nullable=False, server_default="{}")],
    )
    _add_missing_columns(
        "tandem_match_review_states",
        [
            sa.Column("contacted_at", sa.DateTime(), nullable=True),
            sa.Column("final_pair_at", sa.DateTime(), nullable=True),
        ],
    )
    inbox_columns = [
        sa.Column("is_viewed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(32), nullable=False, server_default="new"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    ]
    _add_missing_columns("contact_requests", inbox_columns)
    _add_missing_columns(
        "event_suggestions",
        [
            sa.Column("is_viewed", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("status", sa.String(32), nullable=False, server_default="new"),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        ],
    )
    _add_missing_columns(
        "access_keys",
        [
            sa.Column("label", sa.String(160), nullable=False, server_default=""),
            sa.Column("key_prefix", sa.String(16), nullable=False, server_default=""),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column("last_used_at", sa.DateTime(), nullable=True),
        ],
    )


def downgrade():
    # The reconciliation revision intentionally has no destructive downgrade.
    # Restore a pre-migration backup if an old release must be redeployed.
    pass
