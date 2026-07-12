"""enforce one social publication per post and provider

Revision ID: 20260712_05
Revises: 20260712_04
Create Date: 2026-07-12
"""

from alembic import op
import sqlalchemy as sa


revision = "20260712_05"
down_revision = "20260712_04"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        sa.text(
            """
            DELETE FROM social_publications
            WHERE id NOT IN (
                SELECT MIN(id) FROM social_publications GROUP BY post_id, provider
            )
            """
        )
    )
    with op.batch_alter_table("social_publications", schema=None) as batch_op:
        batch_op.create_unique_constraint(
            "uq_social_publication_post_provider", ["post_id", "provider"]
        )


def downgrade():
    with op.batch_alter_table("social_publications", schema=None) as batch_op:
        batch_op.drop_constraint("uq_social_publication_post_provider", type_="unique")
