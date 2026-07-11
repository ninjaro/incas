import json
import re
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from flask import current_app
from flask_sqlalchemy import SQLAlchemy

from app.event_kinds import EVENT_KINDS

db = SQLAlchemy()

EVENT_TITLE_PREFIXES = {
    kind_id: kind["titlePrefix"]["en"]
    for kind_id, kind in EVENT_KINDS.items()
    if kind["titlePrefix"] is not None
}

EVENT_TITLE_SUFFIX_OVERRIDES = {
    "breakfast": {
        "Turkish Breakfast Table": "Turkey",
        "Pancakes & Fruit Brunch": "North American culture",
        "Latin American Breakfast": "Latin American culture",
        "European Brunch Buffet": "European culture",
        "Waffle Breakfast": "Belgium",
        "Breakfast Around the World": "Around the World",
        "Spring Brunch": "Arab culture",
    },
    "trip": {
        "Maastricht Day Out": "Maastricht, Netherlands",
        "Cologne Museum Saturday": "Cologne, Germany",
        "Mons Discovery Trip": "Mons, Belgium",
        "Bonn Riverside Day": "Bonn, Germany",
        "Liège Food & City Trip": "Liège, Belgium",
        "Drachenfels Hike Day": "Drachenfels, Germany",
        "Luxembourg Old Town Trip": "Luxembourg City, Luxembourg",
    },
}

DANCE_TITLE_ALIASES = {
    "dance",
    "dance school",
    "dance social",
    "dance workshop",
    "dance workshops",
}

TITLE_HIGHLIGHT_KINDS = {
    kind_id for kind_id, kind in EVENT_KINDS.items() if kind["highlightTitle"]
}
EVENT_REGISTRATION_STATUS_APPROVED = "approved"
EVENT_REGISTRATION_STATUS_CANCELLED = "cancelled"
EVENT_REGISTRATION_STATUS_WAITING_PAYMENT = "waiting_payment"
EVENT_REGISTRATION_STATUS_WAITING_LIST = "waiting_list"
EVENT_REGISTRATION_STATUS_WAITING_REFUND = "waiting_refund"

EVENT_REGISTRATION_STATUS_LABELS = {
    EVENT_REGISTRATION_STATUS_APPROVED: "Approved / Confirmed",
    EVENT_REGISTRATION_STATUS_CANCELLED: "Cancelled",
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT: "Waiting for Payment",
    EVENT_REGISTRATION_STATUS_WAITING_LIST: "On Waiting List",
    EVENT_REGISTRATION_STATUS_WAITING_REFUND: "Waiting for Refund",
}

EVENT_REGISTRATION_NON_CANCELLED_STATUSES = {
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
    EVENT_REGISTRATION_STATUS_WAITING_LIST,
}

EVENT_REGISTRATION_CAPACITY_STATUSES = {
    EVENT_REGISTRATION_STATUS_APPROVED,
    EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
}

CAFE_LINGUA_MONTH_RE = re.compile(
    r"\s*[·-]\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|"
    r"jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|"
    r"nov(?:ember)?|dec(?:ember)?|jan(?:uar)?|feb(?:ruar)?|mär(?:z)?|maerz|"
    r"apr(?:il)?|mai|jun(?:i)?|jul(?:i)?|aug(?:ust)?|sep(?:t(?:ember)?)?|"
    r"okt(?:ober)?|nov(?:ember)?|dez(?:ember)?)(?:\s+\d{4})?\s*$",
    re.IGNORECASE,
)

BOARD_GAMES_TUESDAY_RE = re.compile(r"\s*[·:-]?\s*tuesday\s*$", re.IGNORECASE)


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


def _strip_event_prefix(value, prefix):
    raw_value = (value or "").strip()
    if not prefix:
        return raw_value

    normalized_prefix = f"{prefix.lower()}:"
    if raw_value.lower().startswith(normalized_prefix):
        return raw_value[len(prefix) + 1:].strip(" :-")

    return raw_value


def normalize_event_title_suffix(kind, title):
    raw_title = (title or "").strip()
    if not raw_title:
        return ""

    if kind == "cafe_lingua":
        cleaned = CAFE_LINGUA_MONTH_RE.sub("", raw_title).strip(" ·-")
        return cleaned or "Café Lingua"

    prefix = EVENT_TITLE_PREFIXES.get(kind)
    suffix = _strip_event_prefix(raw_title, prefix)
    return EVENT_TITLE_SUFFIX_OVERRIDES.get(kind, {}).get(suffix, suffix).strip()


def normalize_board_games_title(title):
    raw_title = (title or "").strip()
    if not raw_title:
        return "Board Games"

    trimmed = BOARD_GAMES_TUESDAY_RE.sub("", raw_title).strip(" ·:-")
    return trimmed or raw_title


def split_event_display_title(kind, title):
    full_title = (title or "").strip()
    parts = {
        "full": full_title,
        "prefix": "",
        "focus": "",
    }

    if kind not in TITLE_HIGHLIGHT_KINDS:
        return parts

    prefix = EVENT_TITLE_PREFIXES.get(kind)
    suffix = normalize_event_title_suffix(kind, full_title)
    if not prefix or not suffix:
        return parts

    parts["prefix"] = f"{prefix}:"
    parts["focus"] = suffix
    return parts


def compose_event_display_title(kind, title):
    raw_title = (title or "").strip()

    if kind == "cafe_lingua":
        return normalize_event_title_suffix(kind, raw_title)

    if kind == "dance":
        if raw_title.lower() in DANCE_TITLE_ALIASES:
            return "Dance Workshops"
        return raw_title or "Dance Workshops"

    if kind == "board_games":
        return normalize_board_games_title(raw_title)

    prefix = EVENT_TITLE_PREFIXES.get(kind)
    if not prefix:
        return raw_title

    suffix = normalize_event_title_suffix(kind, raw_title)
    if not suffix or suffix.lower() == prefix.lower():
        return prefix
    return f"{prefix}: {suffix}"


class Post(db.Model):
    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(160), unique=True, nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    summary = db.Column(db.String(256), nullable=False, default="")
    body = db.Column(db.Text, nullable=False, default="")
    starts_at = db.Column(db.DateTime, nullable=True, index=True)
    publish_at = db.Column(db.DateTime, nullable=True, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    is_pinned = db.Column(db.Boolean, nullable=False, default=False, index=True)
    event_kind = db.Column(db.String(64), nullable=True, index=True)
    registration_limit_enabled = db.Column(db.Boolean, nullable=False, default=False, index=True)
    registration_limit = db.Column(db.Integer, nullable=True)
    registration_price_cents = db.Column(db.Integer, nullable=True)
    registration_is_deposit = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    image_url = db.Column(db.String(500), nullable=False, default="")
    instagram_media_id = db.Column(db.String(64), nullable=False, default="", index=True)
    instagram_permalink = db.Column(db.String(500), nullable=False, default="")
    status = db.Column(db.String(32), nullable=False, default="published", index=True)

    @property
    def is_event(self):
        return self.starts_at is not None

    @property
    def display_title(self):
        return compose_event_display_title(self.event_kind, self.title)

    @property
    def display_title_parts(self):
        return split_event_display_title(self.event_kind, self.display_title)

    @property
    def ends_at(self):
        if self.starts_at is None:
            return None
        next_day = (self.starts_at + timedelta(days=1)).date()
        return datetime.combine(next_day, time(6, 0, 0))

    @property
    def is_published(self):
        if self.status in ("draft", "archived"):
            return False
        if self.publish_at is None:
            return True
        return get_configured_local_now() >= self.publish_at

    @property
    def publication_status(self):
        current = self.status or "published"
        if current == "scheduled" and self.is_published:
            return "published"
        return current

    @property
    def is_publicly_accessible(self):
        return self.is_active and self.is_published

    @property
    def publication_state(self):
        if self.status == "draft":
            return "draft"
        if not self.is_active or self.status == "archived":
            return "inactive"
        if not self.is_published:
            return "scheduled"
        if not self.is_event:
            return "live"
        return "live" if get_configured_local_now() < self.ends_at else "archived"

    @property
    def is_live(self):
        if not self.is_publicly_accessible:
            return False
        if not self.is_event:
            return True
        return get_configured_local_now() < self.ends_at

    @property
    def event_public_id(self):
        return f"EVT-{self.id:05d}" if self.id is not None else ""

    @property
    def has_registration_queue(self):
        return (
            self.is_event
            and bool(self.registration_limit_enabled)
            and (self.registration_limit or 0) > 0
        )

    @property
    def registration_price_amount(self):
        if self.registration_price_cents is None:
            return None
        return self.registration_price_cents / 100

    @property
    def registration_price_display(self):
        if self.registration_price_cents is None:
            return ""

        amount = f"{self.registration_price_cents / 100:.2f}"
        if amount.endswith("00"):
            return amount[:-3]
        if amount.endswith("0"):
            return amount[:-1]
        return amount

    @property
    def registration_payment_kind_label(self):
        if not self.has_registration_queue:
            return ""
        return "Deposit" if self.registration_is_deposit else "Ticket"

    @property
    def registration_non_cancelled_count(self):
        if self.id is None:
            return 0
        return (
            EventRegistration.query
            .filter(EventRegistration.post_id == self.id)
            .filter(EventRegistration.status.in_(EVENT_REGISTRATION_NON_CANCELLED_STATUSES))
            .count()
        )

    @property
    def registration_reserved_count(self):
        if self.id is None:
            return 0
        return (
            EventRegistration.query
            .filter(EventRegistration.post_id == self.id)
            .filter(EventRegistration.status.in_(EVENT_REGISTRATION_CAPACITY_STATUSES))
            .count()
        )

    @property
    def registration_places_remaining(self):
        if not self.has_registration_queue:
            return 0
        return max((self.registration_limit or 0) - self.registration_reserved_count, 0)

    @property
    def registration_waiting_list_count(self):
        if self.id is None:
            return 0
        return (
            EventRegistration.query
            .filter(EventRegistration.post_id == self.id)
            .filter(EventRegistration.status == EVENT_REGISTRATION_STATUS_WAITING_LIST)
            .count()
        )

    @property
    def has_registration_space(self):
        if not self.has_registration_queue:
            return False
        return self.registration_reserved_count < (self.registration_limit or 0)


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


class EventRegistration(db.Model):
    __tablename__ = "event_registrations"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(24), nullable=False, unique=True, index=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False, index=True)
    first_name = db.Column(db.String(120), nullable=False)
    last_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False, index=True)
    occupation = db.Column(db.String(120), nullable=False)
    diet_preference = db.Column(db.String(32), nullable=False, default="")
    comment = db.Column(db.Text, nullable=False, default="")
    status = db.Column(
        db.String(32),
        nullable=False,
        default=EVENT_REGISTRATION_STATUS_WAITING_PAYMENT,
        index=True,
    )
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def status_label(self):
        return EVENT_REGISTRATION_STATUS_LABELS.get(self.status, self.status.replace("_", " ").title())


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


POST_STATUS_DRAFT = "draft"
POST_STATUS_SCHEDULED = "scheduled"
POST_STATUS_PUBLISHED = "published"
POST_STATUS_ARCHIVED = "archived"

POST_STATUSES = {
    POST_STATUS_DRAFT,
    POST_STATUS_SCHEDULED,
    POST_STATUS_PUBLISHED,
    POST_STATUS_ARCHIVED,
}


class PostTemplate(db.Model):
    __tablename__ = "post_templates"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    title_pattern = db.Column(db.String(160), nullable=False, default="")
    summary = db.Column(db.String(256), nullable=False, default="")
    body = db.Column(db.Text, nullable=False, default="")
    event_kind = db.Column(db.String(64), nullable=True)
    registration_limit_enabled = db.Column(db.Boolean, nullable=False, default=False)
    registration_limit = db.Column(db.Integer, nullable=True)
    registration_price_cents = db.Column(db.Integer, nullable=True)
    registration_is_deposit = db.Column(db.Boolean, nullable=False, default=False)
    image_url = db.Column(db.String(500), nullable=False, default="")
    social_settings = db.Column(db.Text, nullable=False, default="{}")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def social_settings_dict(self):
        try:
            result = json.loads(self.social_settings or "{}")
            return result if isinstance(result, dict) else {}
        except (TypeError, ValueError):
            return {}


class PageThemeSelection(db.Model):
    __tablename__ = "page_theme_selections"

    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(db.String(64), nullable=False, unique=True, index=True)
    theme_id = db.Column(db.String(64), nullable=False)
    last_forced_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class PageThemeVote(db.Model):
    __tablename__ = "page_theme_votes"
    __table_args__ = (
        db.UniqueConstraint("page_id", "voter_id", name="uq_page_theme_vote_voter"),
    )

    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(db.String(64), nullable=False, index=True)
    theme_id = db.Column(db.String(64), nullable=False)
    voter_id = db.Column(db.String(64), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class PageThemeAudit(db.Model):
    __tablename__ = "page_theme_audits"

    id = db.Column(db.Integer, primary_key=True)
    page_id = db.Column(db.String(64), nullable=False, index=True)
    previous_theme = db.Column(db.String(64), nullable=False, default="")
    new_theme = db.Column(db.String(64), nullable=False)
    action = db.Column(db.String(32), nullable=False, default="force", index=True)
    actor = db.Column(db.String(64), nullable=False, default="")
    note = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)


KARAOKE_STATUS_PENDING = "pending"
KARAOKE_STATUS_APPROVED = "approved"
KARAOKE_STATUS_PERFORMING = "performing"
KARAOKE_STATUS_COMPLETED = "completed"
KARAOKE_STATUS_REJECTED = "rejected"
KARAOKE_STATUS_CANCELLED = "cancelled"

KARAOKE_STATUSES = {
    KARAOKE_STATUS_PENDING,
    KARAOKE_STATUS_APPROVED,
    KARAOKE_STATUS_PERFORMING,
    KARAOKE_STATUS_COMPLETED,
    KARAOKE_STATUS_REJECTED,
    KARAOKE_STATUS_CANCELLED,
}

KARAOKE_QUEUE_STATUSES = {
    KARAOKE_STATUS_APPROVED,
    KARAOKE_STATUS_PERFORMING,
}


class KaraokeSongRequest(db.Model):
    __tablename__ = "karaoke_song_requests"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(24), nullable=False, unique=True, index=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=True, index=True)
    display_name = db.Column(db.String(120), nullable=False)
    song_title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200), nullable=False, default="")
    note = db.Column(db.Text, nullable=False, default="")
    contact = db.Column(db.String(255), nullable=False, default="")
    status = db.Column(db.String(32), nullable=False, default=KARAOKE_STATUS_PENDING, index=True)
    position = db.Column(db.Integer, nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class KaraokeQueueAudit(db.Model):
    __tablename__ = "karaoke_queue_audits"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("karaoke_song_requests.id"), nullable=False, index=True)
    action = db.Column(db.String(32), nullable=False)
    detail = db.Column(db.Text, nullable=False, default="")
    actor = db.Column(db.String(64), nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)


SOCIAL_STATUS_SCHEDULED = "scheduled"
SOCIAL_STATUS_PUBLISHED = "published"
SOCIAL_STATUS_FAILED = "failed"


class SocialPublication(db.Model):
    __tablename__ = "social_publications"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False, index=True)
    provider = db.Column(db.String(32), nullable=False, index=True)
    status = db.Column(db.String(32), nullable=False, default=SOCIAL_STATUS_SCHEDULED, index=True)
    provider_post_id = db.Column(db.String(64), nullable=False, default="")
    permalink = db.Column(db.String(500), nullable=False, default="")
    media_url = db.Column(db.String(500), nullable=False, default="")
    error_code = db.Column(db.String(64), nullable=False, default="")
    error_message = db.Column(db.Text, nullable=False, default="")
    attempt_count = db.Column(db.Integer, nullable=False, default=0)
    is_simulated = db.Column(db.Boolean, nullable=False, default=False)
    scheduled_for = db.Column(db.DateTime, nullable=True, index=True)
    last_attempt_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


PAYMENT_STATUS_NOT_REQUIRED = "not_required"
PAYMENT_STATUS_PENDING = "pending"
PAYMENT_STATUS_PAID = "paid"
PAYMENT_STATUS_FAILED = "failed"
PAYMENT_STATUS_CANCELLED = "cancelled"
PAYMENT_STATUS_REFUND_PENDING = "refund_pending"
PAYMENT_STATUS_REFUNDED = "refunded"

PAYMENT_STATUSES = {
    PAYMENT_STATUS_NOT_REQUIRED,
    PAYMENT_STATUS_PENDING,
    PAYMENT_STATUS_PAID,
    PAYMENT_STATUS_FAILED,
    PAYMENT_STATUS_CANCELLED,
    PAYMENT_STATUS_REFUND_PENDING,
    PAYMENT_STATUS_REFUNDED,
}


class PaymentTransaction(db.Model):
    __tablename__ = "payment_transactions"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(32), nullable=False, unique=True, index=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=True, index=True)
    registration_id = db.Column(db.Integer, db.ForeignKey("event_registrations.id"), nullable=True, index=True)
    amount_cents = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(8), nullable=False, default="EUR")
    status = db.Column(db.String(32), nullable=False, default=PAYMENT_STATUS_PENDING, index=True)
    provider = db.Column(db.String(32), nullable=False, default="mock")
    provider_session_id = db.Column(db.String(128), nullable=False, default="")
    is_simulated = db.Column(db.Boolean, nullable=False, default=True)
    error_message = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
