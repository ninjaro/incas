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


def _create_index(table_name, name, columns, *, unique=False):
    with op.batch_alter_table(table_name, schema=None) as batch_op:
        batch_op.create_index(name, columns, unique=unique)


def _create_react_era_tables():
    """Create the frozen set of tables absent from the pre-Alembic schema."""
    existing = set(sa.inspect(op.get_bind()).get_table_names())

    if "page_theme_audits" not in existing:
        op.create_table(
            "page_theme_audits",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("page_id", sa.String(64), nullable=False),
            sa.Column("previous_theme", sa.String(64), nullable=False),
            sa.Column("new_theme", sa.String(64), nullable=False),
            sa.Column("action", sa.String(32), nullable=False),
            sa.Column("actor", sa.String(64), nullable=False),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        _create_index("page_theme_audits", "ix_page_theme_audits_action", ["action"])
        _create_index("page_theme_audits", "ix_page_theme_audits_created_at", ["created_at"])
        _create_index("page_theme_audits", "ix_page_theme_audits_page_id", ["page_id"])

    if "page_theme_selections" not in existing:
        op.create_table(
            "page_theme_selections",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("page_id", sa.String(64), nullable=False),
            sa.Column("theme_id", sa.String(64), nullable=False),
            sa.Column("last_forced_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        _create_index(
            "page_theme_selections", "ix_page_theme_selections_page_id", ["page_id"], unique=True
        )

    if "page_theme_votes" not in existing:
        op.create_table(
            "page_theme_votes",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("page_id", sa.String(64), nullable=False),
            sa.Column("theme_id", sa.String(64), nullable=False),
            sa.Column("voter_id", sa.String(64), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("page_id", "voter_id", name="uq_page_theme_vote_voter"),
        )
        _create_index("page_theme_votes", "ix_page_theme_votes_page_id", ["page_id"])
        _create_index("page_theme_votes", "ix_page_theme_votes_voter_id", ["voter_id"])

    if "post_templates" not in existing:
        op.create_table(
            "post_templates",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(160), nullable=False),
            sa.Column("title_pattern", sa.String(160), nullable=False),
            sa.Column("summary", sa.String(256), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("event_kind", sa.String(64), nullable=True),
            sa.Column("registration_limit_enabled", sa.Boolean(), nullable=False),
            sa.Column("registration_limit", sa.Integer(), nullable=True),
            sa.Column("registration_price_cents", sa.Integer(), nullable=True),
            sa.Column("registration_is_deposit", sa.Boolean(), nullable=False),
            sa.Column("image_url", sa.String(500), nullable=False),
            sa.Column("social_settings", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    if "karaoke_song_requests" not in existing:
        op.create_table(
            "karaoke_song_requests",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("public_id", sa.String(24), nullable=False),
            sa.Column("post_id", sa.Integer(), nullable=True),
            sa.Column("display_name", sa.String(120), nullable=False),
            sa.Column("song_title", sa.String(200), nullable=False),
            sa.Column("artist", sa.String(200), nullable=False),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("contact", sa.String(255), nullable=False),
            sa.Column("status", sa.String(32), nullable=False),
            sa.Column("position", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["post_id"], ["posts.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        for name, columns, unique in (
            ("ix_karaoke_song_requests_position", ["position"], False),
            ("ix_karaoke_song_requests_post_id", ["post_id"], False),
            ("ix_karaoke_song_requests_public_id", ["public_id"], True),
            ("ix_karaoke_song_requests_status", ["status"], False),
        ):
            _create_index("karaoke_song_requests", name, columns, unique=unique)

    if "social_publications" not in existing:
        op.create_table(
            "social_publications",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("post_id", sa.Integer(), nullable=False),
            sa.Column("provider", sa.String(32), nullable=False),
            sa.Column("status", sa.String(32), nullable=False),
            sa.Column("provider_post_id", sa.String(64), nullable=False),
            sa.Column("permalink", sa.String(500), nullable=False),
            sa.Column("media_url", sa.String(500), nullable=False),
            sa.Column("error_code", sa.String(64), nullable=False),
            sa.Column("error_message", sa.Text(), nullable=False),
            sa.Column("attempt_count", sa.Integer(), nullable=False),
            sa.Column("is_simulated", sa.Boolean(), nullable=False),
            sa.Column("scheduled_for", sa.DateTime(), nullable=True),
            sa.Column("last_attempt_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["post_id"], ["posts.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        for name, columns in (
            ("ix_social_publications_post_id", ["post_id"]),
            ("ix_social_publications_provider", ["provider"]),
            ("ix_social_publications_scheduled_for", ["scheduled_for"]),
            ("ix_social_publications_status", ["status"]),
        ):
            _create_index("social_publications", name, columns)

    if "karaoke_queue_audits" not in existing:
        op.create_table(
            "karaoke_queue_audits",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("request_id", sa.Integer(), nullable=False),
            sa.Column("action", sa.String(32), nullable=False),
            sa.Column("detail", sa.Text(), nullable=False),
            sa.Column("actor", sa.String(64), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["request_id"], ["karaoke_song_requests.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        _create_index("karaoke_queue_audits", "ix_karaoke_queue_audits_created_at", ["created_at"])
        _create_index("karaoke_queue_audits", "ix_karaoke_queue_audits_request_id", ["request_id"])

    if "payment_transactions" not in existing:
        op.create_table(
            "payment_transactions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("public_id", sa.String(32), nullable=False),
            sa.Column("post_id", sa.Integer(), nullable=True),
            sa.Column("registration_id", sa.Integer(), nullable=True),
            sa.Column("amount_cents", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(8), nullable=False),
            sa.Column("status", sa.String(32), nullable=False),
            sa.Column("provider", sa.String(32), nullable=False),
            sa.Column("provider_session_id", sa.String(128), nullable=False),
            sa.Column("is_simulated", sa.Boolean(), nullable=False),
            sa.Column("error_message", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["post_id"], ["posts.id"]),
            sa.ForeignKeyConstraint(["registration_id"], ["event_registrations.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        for name, columns, unique in (
            ("ix_payment_transactions_post_id", ["post_id"], False),
            ("ix_payment_transactions_public_id", ["public_id"], True),
            ("ix_payment_transactions_registration_id", ["registration_id"], False),
            ("ix_payment_transactions_status", ["status"], False),
        ):
            _create_index("payment_transactions", name, columns, unique=unique)


def upgrade():
    _create_react_era_tables()

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
