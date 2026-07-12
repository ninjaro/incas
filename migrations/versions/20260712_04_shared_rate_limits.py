"""add shared rate-limit buckets

Revision ID: 20260712_04
Revises: 20260712_03
Create Date: 2026-07-12
"""

from alembic import op
import sqlalchemy as sa


revision = "20260712_04"
down_revision = "20260712_03"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "rate_limit_buckets",
        sa.Column("key", sa.String(64), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    with op.batch_alter_table("rate_limit_buckets", schema=None) as batch_op:
        batch_op.create_index("ix_rate_limit_buckets_expires_at", ["expires_at"], unique=False)


def downgrade():
    with op.batch_alter_table("rate_limit_buckets", schema=None) as batch_op:
        batch_op.drop_index("ix_rate_limit_buckets_expires_at")
    op.drop_table("rate_limit_buckets")
