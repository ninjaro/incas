"""follow-up security and workflow hardening

Revision ID: 20260716_06
Revises: 20260712_05
Create Date: 2026-07-16
"""

from datetime import datetime, timedelta, timezone
import os
from zoneinfo import ZoneInfo

from alembic import op
import sqlalchemy as sa


revision = "20260716_06"
down_revision = "20260712_05"
branch_labels = None
depends_on = None


def _as_datetime(value):
    if value is None or isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value))


def _convert_local_columns_to_utc(table, columns):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if table not in inspector.get_table_names():
        return
    existing_columns = {column["name"] for column in inspector.get_columns(table)}
    columns = tuple(column for column in columns if column in existing_columns)
    if not columns:
        return
    local_timezone = ZoneInfo(os.getenv("LOCAL_TIMEZONE", "Europe/Berlin"))
    rows = bind.execute(
        sa.text(f"SELECT id, {', '.join(columns)} FROM {table}")
    ).mappings()
    for row in rows:
        values = {}
        for column in columns:
            value = _as_datetime(row[column])
            if value is None:
                continue
            if value.tzinfo is None:
                value = value.replace(tzinfo=local_timezone)
            values[column] = value.astimezone(timezone.utc).replace(tzinfo=None)
        if values:
            assignments = ", ".join(f"{column} = :{column}" for column in values)
            bind.execute(
                sa.text(f"UPDATE {table} SET {assignments} WHERE id = :row_id"),
                {**values, "row_id": row["id"]},
            )


def _normalize_karaoke_positions():
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE karaoke_song_requests
            SET position = NULL
            WHERE status NOT IN ('approved', 'performing')
            """
        )
    )
    rows = bind.execute(
        sa.text(
            """
            SELECT id, post_id
            FROM karaoke_song_requests
            WHERE status IN ('approved', 'performing') AND post_id IS NOT NULL
            ORDER BY post_id, position, created_at, id
            """
        )
    ).mappings()
    positions = {}
    for row in rows:
        positions[row["post_id"]] = positions.get(row["post_id"], 0) + 1
        bind.execute(
            sa.text(
                "UPDATE karaoke_song_requests SET position = :position WHERE id = :row_id"
            ),
            {"position": positions[row["post_id"]], "row_id": row["id"]},
        )


def upgrade():
    with op.batch_alter_table("event_registrations", schema=None) as batch_op:
        batch_op.add_column(sa.Column("payment_expires_at", sa.DateTime(), nullable=True))
        batch_op.create_index(
            "ix_event_registrations_payment_expires_at",
            ["payment_expires_at"],
            unique=False,
        )

    with op.batch_alter_table("payment_transactions", schema=None) as batch_op:
        batch_op.add_column(sa.Column("expires_at", sa.DateTime(), nullable=True))
        batch_op.create_index(
            "ix_payment_transactions_expires_at", ["expires_at"], unique=False
        )

    bind = op.get_bind()
    registration_columns = {
        column["name"] for column in sa.inspect(bind).get_columns("event_registrations")
    }
    if "status" in registration_columns:
        timestamp_column = (
            "updated_at"
            if "updated_at" in registration_columns
            else "created_at"
            if "created_at" in registration_columns
            else None
        )
        selected_timestamp = f", {timestamp_column}" if timestamp_column else ""
        registrations = bind.execute(
            sa.text(
                f"""
                SELECT id{selected_timestamp}
                FROM event_registrations
                WHERE status = 'waiting_payment'
                """
            )
        ).mappings()
        for row in registrations:
            timestamp = (
                _as_datetime(row[timestamp_column])
                if timestamp_column
                else datetime.now(timezone.utc).replace(tzinfo=None)
            )
            bind.execute(
                sa.text(
                    """
                    UPDATE event_registrations
                    SET payment_expires_at = :deadline
                    WHERE id = :row_id
                    """
                ),
                {"deadline": timestamp + timedelta(minutes=20), "row_id": row["id"]},
            )
    bind.execute(
        sa.text(
            """
            UPDATE payment_transactions
            SET expires_at = (
                SELECT payment_expires_at
                FROM event_registrations
                WHERE event_registrations.id = payment_transactions.registration_id
            )
            WHERE status = 'pending' AND registration_id IS NOT NULL
            """
        )
    )

    op.create_table(
        "post_slug_redirects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("old_slug", sa.String(length=160), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("old_slug"),
    )
    with op.batch_alter_table("post_slug_redirects", schema=None) as batch_op:
        batch_op.create_index(
            "ix_post_slug_redirects_old_slug", ["old_slug"], unique=True
        )
        batch_op.create_index(
            "ix_post_slug_redirects_post_id", ["post_id"], unique=False
        )

    op.create_table(
        "access_unlock_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("session_audit_id", sa.String(length=32), nullable=False),
        sa.Column("succeeded", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("access_unlock_attempts", schema=None) as batch_op:
        batch_op.create_index(
            "ix_access_unlock_attempts_source_hash", ["source_hash"], unique=False
        )
        batch_op.create_index(
            "ix_access_unlock_attempts_session_audit_id",
            ["session_audit_id"],
            unique=False,
        )
        batch_op.create_index(
            "ix_access_unlock_attempts_succeeded", ["succeeded"], unique=False
        )
        batch_op.create_index(
            "ix_access_unlock_attempts_created_at", ["created_at"], unique=False
        )

    _normalize_karaoke_positions()
    with op.batch_alter_table("karaoke_song_requests", schema=None) as batch_op:
        batch_op.create_unique_constraint(
            "uq_karaoke_queue_post_position", ["post_id", "position"]
        )

    _convert_local_columns_to_utc(
        "posts", ("starts_at", "ends_at", "publish_at")
    )
    _convert_local_columns_to_utc(
        "access_keys", ("expires_at", "revoked_at", "last_used_at")
    )
    _convert_local_columns_to_utc(
        "social_publications", ("scheduled_for", "last_attempt_at")
    )
    _convert_local_columns_to_utc(
        "event_registrations", ("payment_expires_at",)
    )
    _convert_local_columns_to_utc(
        "payment_transactions", ("expires_at",)
    )


def downgrade():
    with op.batch_alter_table("karaoke_song_requests", schema=None) as batch_op:
        batch_op.drop_constraint(
            "uq_karaoke_queue_post_position", type_="unique"
        )

    with op.batch_alter_table("access_unlock_attempts", schema=None) as batch_op:
        batch_op.drop_index("ix_access_unlock_attempts_created_at")
        batch_op.drop_index("ix_access_unlock_attempts_succeeded")
        batch_op.drop_index("ix_access_unlock_attempts_session_audit_id")
        batch_op.drop_index("ix_access_unlock_attempts_source_hash")
    op.drop_table("access_unlock_attempts")

    with op.batch_alter_table("post_slug_redirects", schema=None) as batch_op:
        batch_op.drop_index("ix_post_slug_redirects_post_id")
        batch_op.drop_index("ix_post_slug_redirects_old_slug")
    op.drop_table("post_slug_redirects")

    with op.batch_alter_table("payment_transactions", schema=None) as batch_op:
        batch_op.drop_index("ix_payment_transactions_expires_at")
        batch_op.drop_column("expires_at")

    with op.batch_alter_table("event_registrations", schema=None) as batch_op:
        batch_op.drop_index("ix_event_registrations_payment_expires_at")
        batch_op.drop_column("payment_expires_at")
