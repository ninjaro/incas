"""harden public tracking identifiers and add payment audit history

Revision ID: 20260712_03
Revises: 20260711_02
Create Date: 2026-07-12
"""

from alembic import op
import sqlalchemy as sa


revision = "20260712_03"
down_revision = "20260711_02"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("event_registrations", schema=None) as batch_op:
        batch_op.alter_column(
            "public_id",
            existing_type=sa.String(24),
            type_=sa.String(64),
            existing_nullable=False,
        )
    with op.batch_alter_table("karaoke_song_requests", schema=None) as batch_op:
        batch_op.alter_column(
            "public_id",
            existing_type=sa.String(24),
            type_=sa.String(64),
            existing_nullable=False,
        )
    op.create_table(
        "payment_status_audits",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=False),
        sa.Column("previous_status", sa.String(32), nullable=False),
        sa.Column("new_status", sa.String(32), nullable=False),
        sa.Column("actor", sa.String(64), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["payment_id"], ["payment_transactions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("payment_status_audits", schema=None) as batch_op:
        batch_op.create_index("ix_payment_status_audits_created_at", ["created_at"], unique=False)
        batch_op.create_index("ix_payment_status_audits_payment_id", ["payment_id"], unique=False)


def downgrade():
    with op.batch_alter_table("payment_status_audits", schema=None) as batch_op:
        batch_op.drop_index("ix_payment_status_audits_payment_id")
        batch_op.drop_index("ix_payment_status_audits_created_at")
    op.drop_table("payment_status_audits")
    with op.batch_alter_table("karaoke_song_requests", schema=None) as batch_op:
        batch_op.alter_column(
            "public_id",
            existing_type=sa.String(64),
            type_=sa.String(24),
            existing_nullable=False,
        )
    with op.batch_alter_table("event_registrations", schema=None) as batch_op:
        batch_op.alter_column(
            "public_id",
            existing_type=sa.String(64),
            type_=sa.String(24),
            existing_nullable=False,
        )
