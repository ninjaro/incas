import json
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from flask import current_app
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def get_configured_local_now():
    timezone_name = "Europe/Berlin"

    try:
        timezone_name = current_app.config.get("LOCAL_TIMEZONE", timezone_name)
    except RuntimeError:
        pass

    try:
        timezone = ZoneInfo(timezone_name)
    except Exception:
        timezone = ZoneInfo("Europe/Berlin")

    return datetime.now(timezone).replace(tzinfo=None)


class Post(db.Model):
    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(160), unique=True, nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    summary = db.Column(db.String(256), nullable=False, default="")
    body = db.Column(db.Text, nullable=False, default="")
    starts_at = db.Column(db.DateTime, nullable=True, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    is_pinned = db.Column(db.Boolean, nullable=False, default=False, index=True)
    event_kind = db.Column(db.String(64), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    image_url = db.Column(db.String(500), nullable=False, default="")
    instagram_media_id = db.Column(db.String(64), nullable=False, default="", index=True)
    instagram_permalink = db.Column(db.String(500), nullable=False, default="")

    @property
    def is_event(self):
        return self.starts_at is not None

    @property
    def ends_at(self):
        if self.starts_at is None:
            return None
        next_day = (self.starts_at + timedelta(days=1)).date()
        return datetime.combine(next_day, time(6, 0, 0))

    @property
    def is_live(self):
        if not self.is_active:
            return False
        if not self.is_event:
            return True
        return get_configured_local_now() < self.ends_at


class InstagramConnection(db.Model):
    __tablename__ = "instagram_connections"

    id = db.Column(db.Integer, primary_key=True)
    ig_user_id = db.Column(db.String(64), nullable=False, default="", index=True)
    username = db.Column(db.String(120), nullable=False, default="")
    access_token = db.Column(db.Text, nullable=False, default="")
    token_expires_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

class ContactRequest(db.Model):
    __tablename__ = "contact_requests"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    email = db.Column(db.String(255), nullable=False, index=True)
    subject = db.Column(db.String(200), nullable=False, default="")
    message = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

class EventSuggestion(db.Model):
    __tablename__ = "event_suggestions"

    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(64), nullable=False, index=True)
    country = db.Column(db.String(120), nullable=False, default="")
    contact_name = db.Column(db.String(160), nullable=False)
    contact_email = db.Column(db.String(255), nullable=False, default="", index=True)
    contact_phone = db.Column(db.String(80), nullable=False, default="")
    comment = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)



class LanguageTandemRequest(db.Model):
    __tablename__ = "language_tandem_requests"

    id = db.Column(db.Integer, primary_key=True)

    first_name = db.Column(db.String(120), nullable=False)
    last_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False, index=True)

    occupation = db.Column(db.String(120), nullable=False)
    gender = db.Column(db.String(40), nullable=False)
    birth_year = db.Column(db.Integer, nullable=False)
    departure_date = db.Column(db.Date, nullable=False)

    country_of_origin = db.Column(db.String(120), nullable=False)

    offered_languages = db.Column(db.Text, nullable=False, default="[]")
    offered_native_languages = db.Column(db.Text, nullable=False, default="[]")
    offered_language_levels = db.Column(db.Text, nullable=False, default="{}")

    requested_languages = db.Column(db.Text, nullable=False, default="[]")
    requested_native_only = db.Column(db.Boolean, nullable=False, default=False)

    same_gender_only = db.Column(db.Boolean, nullable=False, default=False)
    preferred_gender = db.Column(db.String(40), nullable=False, default="")
    comment = db.Column(db.Text, nullable=False, default="")

    is_viewed = db.Column(db.Boolean, nullable=False, default=False, index=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    @property
    def offered_languages_list(self):
        return json.loads(self.offered_languages or "[]")

    @property
    def offered_native_languages_list(self):
        return json.loads(self.offered_native_languages or "[]")

    @property
    def offered_language_levels_dict(self):
        try:
            result = json.loads(self.offered_language_levels or "{}")
            return result if isinstance(result, dict) else {}
        except (TypeError, ValueError):
            return {}

    @property
    def requested_languages_list(self):
        return json.loads(self.requested_languages or "[]")


class TandemMatchReviewState(db.Model):
    __tablename__ = "tandem_match_review_states"
    __table_args__ = (
        db.UniqueConstraint(
            "source_request_id",
            "candidate_request_id",
            name="uq_tandem_match_review_state_pair",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    source_request_id = db.Column(
        db.Integer,
        db.ForeignKey("language_tandem_requests.id"),
        nullable=False,
        index=True,
    )
    candidate_request_id = db.Column(
        db.Integer,
        db.ForeignKey("language_tandem_requests.id"),
        nullable=False,
        index=True,
    )
    is_hidden = db.Column(db.Boolean, nullable=False, default=False)
    is_shortlisted = db.Column(db.Boolean, nullable=False, default=False)
    contacted_at = db.Column(db.DateTime, nullable=True)
    final_pair_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class TandemDuplicateDecision(db.Model):
    __tablename__ = "tandem_duplicate_decisions"

    id = db.Column(db.Integer, primary_key=True)
    left_request_id = db.Column(db.Integer, nullable=False, index=True)
    right_request_id = db.Column(db.Integer, nullable=False, index=True)
    decision = db.Column(db.String(32), nullable=False, index=True)
    note = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        db.UniqueConstraint(
            "left_request_id",
            "right_request_id",
            name="uq_tandem_duplicate_decision_pair",
        ),
    )

class AccessKey(db.Model):
    __tablename__ = "access_keys"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(255), nullable=False, unique=True, index=True)
    scopes = db.Column(db.Text, nullable=False, default="[]")
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    @property
    def scopes_list(self):
        return json.loads(self.scopes or "[]")
