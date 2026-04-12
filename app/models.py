from datetime import datetime, time, timedelta

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


def seed_demo_data():
    if Post.query.count() > 0:
        return

    now = datetime.utcnow()

    upcoming_event_date = (now + timedelta(days=3)).date()
    past_event_date = (now - timedelta(days=10)).date()

    post_1 = Post(
        slug="incas-community-update",
        title="INCAS Community Update",
        summary="A regular post without a time slot.",
        body="This is a regular post. It stays live until it is manually deactivated.",
        starts_at=None,
        is_active=True,
    )

    post_2 = Post(
        slug="spring-gathering",
        title="Spring Gathering",
        summary="An upcoming event with the default evening slot.",
        body="This is an event post. It is treated as live until 06:00 on the next day.",
        starts_at=datetime.combine(upcoming_event_date, time(20, 0, 0)),
        is_active=True,
    )

    post_3 = Post(
        slug="past-meeting",
        title="Past Meeting",
        summary="A past event that stays visible in the archive section.",
        body="This event is no longer live, but it still opens normally from the wall.",
        starts_at=datetime.combine(past_event_date, time(20, 0, 0)),
        is_active=True,
    )

    db.session.add(post_1)
    db.session.add(post_2)
    db.session.add(post_3)
    db.session.commit()
