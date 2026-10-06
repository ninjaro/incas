"""privacy hardening: tandem data minimisation, retention anchors, karaoke contact drop

Revision ID: 20260910_08
Revises: 20260721_07
Create Date: 2026-09-10
"""

from alembic import op
import sqlalchemy as sa


revision = "20260910_08"
down_revision = "20260721_07"
branch_labels = None
depends_on = None


def _columns(table):
    bind = op.get_bind()
    return {column["name"] for column in sa.inspect(bind).get_columns(table)}


def upgrade():
    contact_columns = _columns("contact_requests")
    if "resolved_at" not in contact_columns:
        with op.batch_alter_table("contact_requests") as batch_op:
            batch_op.add_column(sa.Column("resolved_at", sa.DateTime(), nullable=True))
            batch_op.create_index(
                "ix_contact_requests_resolved_at", ["resolved_at"], unique=False
            )

    suggestion_columns = _columns("event_suggestions")
    if "resolved_at" not in suggestion_columns:
        with op.batch_alter_table("event_suggestions") as batch_op:
            batch_op.add_column(sa.Column("resolved_at", sa.DateTime(), nullable=True))
            batch_op.create_index(
                "ix_event_suggestions_resolved_at", ["resolved_at"], unique=False
            )

    tandem_columns = _columns("language_tandem_requests")
    with op.batch_alter_table("language_tandem_requests") as batch_op:
        if "birth_year" in tandem_columns:
            batch_op.drop_column("birth_year")
        if "preferred_gender" in tandem_columns:
            batch_op.drop_column("preferred_gender")
        if "occupation" in tandem_columns:
            batch_op.alter_column(
                "occupation",
                existing_type=sa.String(length=120),
                nullable=True,
                server_default="",
            )

    if "contact" in _columns("karaoke_song_requests"):
        with op.batch_alter_table("karaoke_song_requests") as batch_op:
            batch_op.drop_column("contact")


def downgrade():
    with op.batch_alter_table("karaoke_song_requests") as batch_op:
        batch_op.add_column(
            sa.Column(
                "contact", sa.String(length=255), nullable=False, server_default=""
            )
        )

    with op.batch_alter_table("language_tandem_requests") as batch_op:
        batch_op.alter_column(
            "occupation",
            existing_type=sa.String(length=120),
            nullable=False,
            server_default=None,
        )
        batch_op.add_column(
            sa.Column(
                "preferred_gender",
                sa.String(length=40),
                nullable=False,
                server_default="",
            )
        )
        batch_op.add_column(
            sa.Column(
                "birth_year", sa.Integer(), nullable=False, server_default="2000"
            )
        )

    with op.batch_alter_table("event_suggestions") as batch_op:
        batch_op.drop_index("ix_event_suggestions_resolved_at")
        batch_op.drop_column("resolved_at")

    with op.batch_alter_table("contact_requests") as batch_op:
        batch_op.drop_index("ix_contact_requests_resolved_at")
        batch_op.drop_column("resolved_at")
