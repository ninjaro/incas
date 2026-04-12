import calendar

from datetime import datetime
from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for

from app.models import Post, db

bp = Blueprint("main", __name__)



def require_admin():
    if not session.get("admin_open"):
        return redirect(url_for("main.admin_login"))
    return None


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


def parse_starts_at(value):
    value = (value or "").strip()
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%dT%H:%M")

def parse_calendar_month(raw_value):
    raw_value = (raw_value or "").strip()

    if not raw_value:
        now = datetime.utcnow()
        return now.year, now.month

    try:
        parsed = datetime.strptime(raw_value, "%Y-%m")
        return parsed.year, parsed.month
    except ValueError:
        now = datetime.utcnow()
        return now.year, now.month


@bp.route("/")
def index():
    items = Post.query.order_by(Post.created_at.desc()).all()

    live_events = [item for item in items if item.is_event and item.is_live]
    live_posts = [item for item in items if not item.is_event and item.is_live]
    archived_items = [item for item in items if not item.is_live]

    live_events.sort(key=lambda item: item.starts_at)
    live_posts.sort(key=lambda item: item.updated_at, reverse=True)
    archived_items.sort(
        key=lambda item: item.ends_at if item.is_event else item.updated_at,
        reverse=True,
    )

    active_items = live_events + live_posts

    return render_template(
        "index.html",
        active_items=active_items,
        archived_items=archived_items,
    )


@bp.route("/about")
def about():
    return render_template("about.html")


@bp.route("/contacts")
def contacts():
    return render_template("contacts.html")


@bp.route("/posts")
def posts():
    items = Post.query.order_by(Post.created_at.desc()).all()
    return render_template("posts.html", items=items, page_title="Posts")


@bp.route("/events")
def events():
    items = (
        Post.query
        .filter(Post.starts_at.isnot(None))
        .order_by(Post.starts_at.asc())
        .all()
    )
    return render_template("posts.html", items=items, page_title="Events")


@bp.route("/content/<slug>")
def post_detail(slug):
    item = Post.query.filter_by(slug=slug).first_or_404()
    return render_template("post_detail.html", item=item)

@bp.route("/calendar")
def calendar_view():
    year, month = parse_calendar_month(request.args.get("month"))

    month_matrix = calendar.Calendar(firstweekday=0).monthdatescalendar(year, month)
    month_start = datetime(year, month, 1)
    month_end_day = calendar.monthrange(year, month)[1]
    month_end = datetime(year, month, month_end_day, 23, 59, 59)

    items = (
        Post.query
        .filter(Post.starts_at.isnot(None))
        .filter(Post.starts_at >= month_start)
        .filter(Post.starts_at <= month_end)
        .order_by(Post.starts_at.asc())
        .all()
    )

    events_by_day = {}

    for item in items:
        key = item.starts_at.date()
        events_by_day.setdefault(key, []).append(item)

    prev_year = year
    prev_month = month - 1
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1

    next_year = year
    next_month = month + 1
    if next_month == 13:
        next_month = 1
        next_year += 1

    return render_template(
        "calendar.html",
        month_matrix=month_matrix,
        events_by_day=events_by_day,
        current_year=year,
        current_month=month,
        month_label=datetime(year, month, 1).strftime("%B %Y"),
        prev_month_value=f"{prev_year:04d}-{prev_month:02d}",
        next_month_value=f"{next_year:04d}-{next_month:02d}",
    )


@bp.route("/admin", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        phrase = request.form.get("phrase", "").strip()
        if phrase == current_app.config["ADMIN_PHRASE"]:
            session["admin_open"] = True
            return redirect(url_for("main.admin_corridor"))
        flash("Invalid access phrase.")
    return render_template("admin_login.html")


@bp.route("/admin/corridor")
def admin_corridor():
    guard = require_admin()
    if guard:
        return guard

    stats = {
        "unread_forms": 0,
        "posts_today": 0,
        "visits_today": 17,
    }

    return render_template("admin_corridor.html", stats=stats)

@bp.route("/admin/posts")
def admin_posts():
    guard = require_admin()
    if guard:
        return guard

    items = Post.query.order_by(Post.updated_at.desc()).all()
    return render_template("admin_posts.html", items=items)


@bp.route("/admin/posts/new", methods=["GET", "POST"])
def admin_post_create():
    guard = require_admin()
    if guard:
        return guard

    values = {
        "title": "",
        "summary": "",
        "body": "",
        "starts_at": "",
        "is_active": True,
    }

    if request.method == "POST":
        values["title"] = request.form.get("title", "").strip()
        values["summary"] = request.form.get("summary", "").strip()
        values["body"] = request.form.get("body", "").strip()
        values["starts_at"] = request.form.get("starts_at", "").strip()
        values["is_active"] = request.form.get("is_active") == "on"

        if not values["title"]:
            flash("Title is required.")
            return render_template("admin_post_form.html", values=values, item=None)

        item = Post(
            slug=unique_slug(values["title"]),
            title=values["title"],
            summary=values["summary"],
            body=values["body"],
            starts_at=parse_starts_at(values["starts_at"]),
            is_active=values["is_active"],
        )
        db.session.add(item)
        db.session.commit()
        return redirect(url_for("main.admin_posts"))

    return render_template("admin_post_form.html", values=values, item=None)


@bp.route("/admin/posts/<int:post_id>/edit", methods=["GET", "POST"])
def admin_post_edit(post_id):
    guard = require_admin()
    if guard:
        return guard

    item = Post.query.get_or_404(post_id)

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        summary = request.form.get("summary", "").strip()
        body = request.form.get("body", "").strip()
        starts_at_raw = request.form.get("starts_at", "").strip()
        is_active = request.form.get("is_active") == "on"

        if not title:
            flash("Title is required.")
            values = {
                "title": title,
                "summary": summary,
                "body": body,
                "starts_at": starts_at_raw,
                "is_active": is_active,
            }
            return render_template("admin_post_form.html", values=values, item=item)

        item.title = title
        item.slug = unique_slug(title, current_id=item.id)
        item.summary = summary
        item.body = body
        item.starts_at = parse_starts_at(starts_at_raw)
        item.is_active = is_active

        db.session.commit()
        return redirect(url_for("main.admin_posts"))

    values = {
        "title": item.title,
        "summary": item.summary,
        "body": item.body,
        "starts_at": item.starts_at.strftime("%Y-%m-%dT%H:%M") if item.starts_at else "",
        "is_active": item.is_active,
    }

    return render_template("admin_post_form.html", values=values, item=item)

@bp.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for("main.index"))


