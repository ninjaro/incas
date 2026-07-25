from pathlib import Path

import sqlalchemy as sa
from flask_migrate import stamp, upgrade

from app import create_app
from app.models import Post, db


MIGRATIONS = str(Path(__file__).resolve().parents[1] / "migrations")
BASELINE_REVISION = "1e2379697b4a"


def migration_app(database_path):
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path}",
            "AUTO_CREATE_SCHEMA": False,
            "SEED_DEMO_DATA": False,
            "REACT_PRIMARY_FRONTEND": False,
        }
    )


def test_fresh_database_upgrades_to_current_schema(tmp_path):
    app = migration_app(tmp_path / "fresh.sqlite")
    with app.app_context():
        upgrade(directory=MIGRATIONS)
        inspector = sa.inspect(db.engine)
        assert {
            "posts",
            "post_slug_redirects",
            "event_registrations",
            "payment_transactions",
            "access_keys",
            "access_unlock_attempts",
            "alembic_version",
        } <= set(inspector.get_table_names())
        post_columns = {column["name"] for column in inspector.get_columns("posts")}
        assert {"ends_at", "registration_mode", "map_config", "feature_flags"} <= post_columns
        registration_columns = {
            column["name"] for column in inspector.get_columns("event_registrations")
        }
        payment_columns = {
            column["name"] for column in inspector.get_columns("payment_transactions")
        }
        assert "payment_expires_at" in registration_columns
        assert "expires_at" in payment_columns


def test_legacy_database_reconciles_without_losing_rows(tmp_path):
    database_path = tmp_path / "legacy.sqlite"
    engine = sa.create_engine(f"sqlite:///{database_path}")
    with engine.begin() as connection:
        connection.execute(
            sa.text(
                """
                CREATE TABLE posts (
                    id INTEGER PRIMARY KEY,
                    slug VARCHAR(160) NOT NULL UNIQUE,
                    title VARCHAR(160) NOT NULL,
                    summary VARCHAR(256) NOT NULL DEFAULT '',
                    body TEXT NOT NULL DEFAULT '',
                    starts_at DATETIME,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    is_pinned BOOLEAN NOT NULL DEFAULT 0,
                    event_kind VARCHAR(64),
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    image_url VARCHAR(500) NOT NULL DEFAULT '',
                    instagram_media_id VARCHAR(64) NOT NULL DEFAULT '',
                    instagram_permalink VARCHAR(500) NOT NULL DEFAULT ''
                )
                """
            )
        )
        # These tables existed in the last pre-Alembic application schema.
        # Only columns touched by the reconciliation revision are needed here;
        # the preservation assertion below remains focused on real post data.
        for statement in (
            "CREATE TABLE language_tandem_requests (id INTEGER PRIMARY KEY)",
            "CREATE TABLE tandem_match_review_states (id INTEGER PRIMARY KEY)",
            "CREATE TABLE contact_requests (id INTEGER PRIMARY KEY)",
            "CREATE TABLE event_suggestions (id INTEGER PRIMARY KEY)",
            "CREATE TABLE access_keys (id INTEGER PRIMARY KEY)",
            "CREATE TABLE event_registrations (id INTEGER PRIMARY KEY, public_id VARCHAR(24) NOT NULL)",
        ):
            connection.execute(sa.text(statement))
        connection.execute(
            sa.text(
                """
                INSERT INTO posts (
                    id, slug, title, summary, body, is_active, is_pinned,
                    created_at, updated_at, image_url, instagram_media_id, instagram_permalink
                ) VALUES (
                    1, 'legacy-post', 'Legacy post', 'kept', '<p>kept</p>', 1, 0,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '', '', ''
                )
                """
            )
        )
    engine.dispose()

    app = migration_app(database_path)
    with app.app_context():
        stamp(directory=MIGRATIONS, revision=BASELINE_REVISION)
        upgrade(directory=MIGRATIONS)
        item = db.session.get(Post, 1)
        assert item.slug == "legacy-post"
        assert item.status == "published"
        assert item.registration_mode == "none"
        assert item.map_config_dict == {}


def test_reconciliation_revision_does_not_import_live_models():
    revision = Path(MIGRATIONS) / "versions" / "20260711_02_reconcile_legacy_schema.py"
    source = revision.read_text(encoding="utf-8")
    assert "app.models" not in source
    assert "db.metadata" not in source
