import json
from datetime import datetime, time, timedelta, date

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Post(db.Model):
    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(160), unique=True, nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    summary = db.Column(db.String(256), nullable=False, default="")
    body = db.Column(db.Text, nullable=False, default="")
    starts_at = db.Column(db.DateTime, nullable=True, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

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
        return datetime.utcnow() < self.ends_at


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

    requested_languages = db.Column(db.Text, nullable=False, default="[]")
    requested_native_only = db.Column(db.Boolean, nullable=False, default=False)

    same_gender_only = db.Column(db.Boolean, nullable=False, default=False)
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
    def requested_languages_list(self):
        return json.loads(self.requested_languages or "[]")
