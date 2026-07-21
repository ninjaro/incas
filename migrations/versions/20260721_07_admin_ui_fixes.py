"""preserve complete post template registration settings

Revision ID: 20260721_07
Revises: 20260716_06
Create Date: 2026-07-21
"""

from alembic import op
import sqlalchemy as sa


revision = "20260721_07"
down_revision = "20260716_06"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("post_templates") as batch_op:
        batch_op.add_column(
            sa.Column(
                "registration_mode",
                sa.String(length=32),
                nullable=False,
                server_default="none",
            )
        )
        batch_op.add_column(
            sa.Column(
                "deposit_explanation",
                sa.String(length=500),
                nullable=False,
                server_default="",
            )
        )


def downgrade():
    with op.batch_alter_table("post_templates") as batch_op:
        batch_op.drop_column("deposit_explanation")
        batch_op.drop_column("registration_mode")
