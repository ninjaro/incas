import calendar
from datetime import datetime, timedelta

from app.models import Post, get_configured_local_now


def slugify(value):
    value = (value or "").strip().lower()
    result = []
    last_dash = False

    for char in value:
        if char.isalnum():
            result.append(char)
            last_dash = False
        else:
            if not last_dash:
                result.append("-")
                last_dash = True

    slug = "".join(result).strip("-")
    return slug or "post"


def unique_slug(title, current_id=None):
    base = slugify(title)
    slug = base
    index = 2

    while True:
        query = Post.query.filter_by(slug=slug)
        if current_id is not None:
            query = query.filter(Post.id != current_id)
        if query.first() is None:
            return slug
        slug = f"{base}-{index}"
        index += 1


def parse_datetime_local(value):
    value = (value or "").strip()
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%dT%H:%M")


def parse_starts_at(value):
    return parse_datetime_local(value)


def parse_publish_at(value):
    return parse_datetime_local(value)


def format_datetime_local(value):
    if value is None:
        return ""
    return value.strftime("%Y-%m-%dT%H:%M")


def get_default_event_start(event_kind=""):
    now_local = get_configured_local_now()
    default_date = (now_local + timedelta(days=1)).date()
    time_by_kind = {
        "breakfast": (10, 0),
        "trip": (9, 30),
    }
    hour, minute = time_by_kind.get((event_kind or "").strip(), (20, 0))
    return datetime(default_date.year, default_date.month, default_date.day, hour, minute)


def parse_month_value(raw_value, fallback=None):
    fallback = fallback or get_configured_local_now()
    raw_value = (raw_value or "").strip()

    if not raw_value:
        return fallback.year, fallback.month

    try:
        parsed = datetime.strptime(raw_value, "%Y-%m")
        return parsed.year, parsed.month
    except ValueError:
        return fallback.year, fallback.month


def build_monthly_overview_slug(year, month):
    return f"monthly-overview-{year:04d}-{month:02d}"


def build_monthly_overview_title(year, month):
    return f"{calendar.month_name[month]} {year} at INCAS"


def build_monthly_overview_publish_at(year, month):
    month_start = datetime(year, month, 1, 0, 5)
    return month_start if month_start > get_configured_local_now() else None


def build_monthly_overview_body(year, month, items, refreshed_at=None):
    refreshed_at = refreshed_at or get_configured_local_now()
    lines = [
        f"Planned INCAS events for {calendar.month_name[month]} {year}.",
        "",
        "Refresh this pinned post after adding, changing, or removing events in this month.",
        f"Last refreshed: {refreshed_at.strftime('%Y-%m-%d %H:%M')}",
        "",
    ]

    if not items:
        lines.append("No events are scheduled for this month yet.")
        return "\n".join(lines)

    current_day = None
    for item in items:
        item_day = item.starts_at.date()
        if item_day != current_day:
            if current_day is not None:
                lines.append("")
            lines.append(item.starts_at.strftime("%A, %d %B"))
            current_day = item_day

        lines.append(f"- {item.starts_at.strftime('%H:%M')} {item.display_title}")
        if item.summary:
            lines.append(f"  {item.summary}")

    return "\n".join(lines)

def parse_calendar_month(raw_value):
    return parse_month_value(raw_value)
