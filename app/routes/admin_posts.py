from datetime import datetime

from flask import current_app, flash, redirect, render_template, request, url_for

from app.models import InstagramConnection, Post, compose_event_display_title, db, get_configured_local_now
from app.routes import bp
from app.routes.helpers.access import require_scope
from app.routes.helpers.content import (
    build_monthly_overview_body,
    build_monthly_overview_publish_at,
    build_monthly_overview_slug,
    build_monthly_overview_title,
    format_datetime_local,
    get_default_event_start,
    parse_month_value,
    parse_publish_at,
    parse_starts_at,
    unique_slug,
)


def build_post_form_values(item=None):
    if item is not None:
        return {
            "title": item.title,
            "image_url": item.image_url,
            "body": item.body,
            "starts_at": format_datetime_local(item.starts_at),
            "publish_at": format_datetime_local(item.publish_at),
            "is_active": item.is_active,
            "is_pinned": item.is_pinned,
            "event_kind": item.event_kind or "",
            "instagram_media_id": item.instagram_media_id,
            "instagram_permalink": item.instagram_permalink,
        }

    return {
        "title": "",
        "image_url": "",
        "body": "",
        "starts_at": "",
        "publish_at": "",
        "is_active": True,
        "is_pinned": False,
        "event_kind": "",
        "instagram_media_id": "",
        "instagram_permalink": "",
    }


def render_post_form(*, values, item):
    return render_template(
        "admin/posts/form.html",
        values=values,
        item=item,
        title_preview=compose_event_display_title(values.get("event_kind"), values.get("title")),
        default_start_date=get_default_event_start(values.get("event_kind")).strftime("%Y-%m-%d"),
    )


def parse_monthly_overview_slug(slug):
    raw_value = (slug or "").strip()
    if not raw_value.startswith("monthly-overview-"):
        return None

    try:
        parsed = datetime.strptime(raw_value.removeprefix("monthly-overview-"), "%Y-%m")
    except ValueError:
        return None

    return parsed.year, parsed.month


@bp.route("/admin/posts")
def admin_posts():
    guard = require_scope("posts")
    if guard:
        return guard

    items = Post.query.order_by(Post.updated_at.desc()).all()
    now_local = get_configured_local_now()
    instagram_connection = (
        InstagramConnection.query
        .filter_by(is_active=True)
        .order_by(InstagramConnection.updated_at.desc())
        .first()
    )
    return render_template(
        "admin/posts/index.html",
        items=items,
        instagram_connection=instagram_connection,
        now_local=now_local,
        overview_month_default=f"{now_local.year:04d}-{now_local.month:02d}",
    )

@bp.route("/admin/posts/instagram/connect")
def admin_posts_instagram_connect():
    guard = require_scope("posts")
    if guard:
        return guard

    if not current_app.config.get("INSTAGRAM_APP_ID"):
        flash("Missing INSTAGRAM_APP_ID.")
        return redirect(url_for("main.admin_posts"))

    if not current_app.config.get("INSTAGRAM_APP_SECRET"):
        flash("Missing INSTAGRAM_APP_SECRET.")
        return redirect(url_for("main.admin_posts"))

    if not current_app.config.get("INSTAGRAM_REDIRECT_URI"):
        flash("Missing INSTAGRAM_REDIRECT_URI.")
        return redirect(url_for("main.admin_posts"))

    flash("Instagram OAuth redirect not wired yet.")
    return redirect(url_for("main.admin_posts"))


@bp.route("/admin/posts/instagram/disconnect", methods=["POST"])
def admin_posts_instagram_disconnect():
    guard = require_scope("posts")
    if guard:
        return guard

    item = (
        InstagramConnection.query
        .filter_by(is_active=True)
        .order_by(InstagramConnection.updated_at.desc())
        .first()
    )
    if item:
        item.is_active = False
        db.session.commit()
        flash("Instagram disconnected.")
    else:
        flash("No active Instagram connection.")

    return redirect(url_for("main.admin_posts"))

@bp.route("/admin/posts/new", methods=["GET", "POST"])
def admin_post_create():
    guard = require_scope("posts")
    if guard:
        return guard

    values = build_post_form_values()

    if request.method == "POST":
        values["title"] = request.form.get("title", "").strip()
        values["image_url"] = request.form.get("image_url", "").strip()
        values["body"] = request.form.get("body", "").strip()
        values["starts_at"] = request.form.get("starts_at", "").strip()
        values["publish_at"] = request.form.get("publish_at", "").strip()
        values["is_active"] = request.form.get("is_active") == "on"
        values["is_pinned"] = request.form.get("is_pinned") == "on"
        values["event_kind"] = request.form.get("event_kind", "").strip()
        values["instagram_media_id"] = request.form.get("instagram_media_id", "").strip()
        values["instagram_permalink"] = request.form.get("instagram_permalink", "").strip()

        if not values["title"]:
            flash("Title is required.")
            return render_post_form(values=values, item=None)

        try:
            starts_at = parse_starts_at(values["starts_at"])
            publish_at = parse_publish_at(values["publish_at"])
        except ValueError:
            flash("Enter valid date and time values.")
            return render_post_form(values=values, item=None)

        item = Post(
            slug=unique_slug(values["title"]),
            title=values["title"],
            image_url=values["image_url"],
            body=values["body"],
            starts_at=starts_at,
            publish_at=publish_at,
            is_active=values["is_active"],
            is_pinned=values["is_pinned"],
            event_kind=values["event_kind"] or None,
            instagram_media_id=values["instagram_media_id"],
            instagram_permalink=values["instagram_permalink"],
        )
        db.session.add(item)
        db.session.commit()
        return redirect(url_for("main.admin_posts"))

    return render_post_form(values=values, item=None)


@bp.route("/admin/posts/<int:post_id>/edit", methods=["GET", "POST"])
def admin_post_edit(post_id):
    guard = require_scope("posts")
    if guard:
        return guard

    item = Post.query.get_or_404(post_id)
    values = build_post_form_values(item)

    if request.method == "POST":
        values["title"] = request.form.get("title", "").strip()
        values["image_url"] = request.form.get("image_url", "").strip()
        values["body"] = request.form.get("body", "").strip()
        values["starts_at"] = request.form.get("starts_at", "").strip()
        values["publish_at"] = request.form.get("publish_at", "").strip()
        values["is_active"] = request.form.get("is_active") == "on"
        values["is_pinned"] = request.form.get("is_pinned") == "on"
        values["event_kind"] = request.form.get("event_kind", "").strip()
        values["instagram_media_id"] = request.form.get("instagram_media_id", "").strip()
        values["instagram_permalink"] = request.form.get("instagram_permalink", "").strip()

        if not values["title"]:
            flash("Title is required.")
            return render_post_form(values=values, item=item)

        try:
            starts_at = parse_starts_at(values["starts_at"])
            publish_at = parse_publish_at(values["publish_at"])
        except ValueError:
            flash("Enter valid date and time values.")
            return render_post_form(values=values, item=item)

        item.title = values["title"]
        item.slug = unique_slug(values["title"], current_id=item.id)
        item.image_url = values["image_url"]
        item.body = values["body"]
        item.starts_at = starts_at
        item.publish_at = publish_at
        item.is_active = values["is_active"]
        item.is_pinned = values["is_pinned"]
        item.event_kind = values["event_kind"] or None
        item.instagram_media_id = values["instagram_media_id"]
        item.instagram_permalink = values["instagram_permalink"]

        db.session.commit()
        return redirect(url_for("main.admin_posts"))

    return render_post_form(values=values, item=item)


@bp.route("/admin/posts/monthly-overview", methods=["POST"])
def admin_posts_monthly_overview():
    guard = require_scope("posts")
    if guard:
        return guard

    now_local = get_configured_local_now()
    year, month = parse_month_value(request.form.get("month"), fallback=now_local)

    month_start = datetime(year, month, 1)
    if month == 12:
        month_end = datetime(year + 1, 1, 1)
    else:
        month_end = datetime(year, month + 1, 1)

    overview_slug = build_monthly_overview_slug(year, month)
    items = (
        Post.query
        .filter(Post.is_active.is_(True))
        .filter(Post.starts_at.isnot(None))
        .filter(Post.starts_at >= month_start)
        .filter(Post.starts_at < month_end)
        .filter(Post.slug != overview_slug)
        .order_by(Post.starts_at.asc())
        .all()
    )

    item = Post.query.filter_by(slug=overview_slug).first()
    is_new = item is None
    if is_new:
        item = Post(slug=overview_slug)
        db.session.add(item)

    item.title = build_monthly_overview_title(year, month)
    item.summary = f"Monthly overview for {item.title}."
    item.body = build_monthly_overview_body(year, month, items, refreshed_at=now_local)
    item.starts_at = None
    item.is_active = True
    item.is_pinned = True
    item.event_kind = None
    if is_new and item.publish_at is None:
        item.publish_at = build_monthly_overview_publish_at(year, month)

    other_overviews = (
        Post.query
        .filter(Post.slug.like("monthly-overview-%"))
        .filter(Post.slug != overview_slug)
        .all()
    )
    for other in other_overviews:
        other.is_pinned = False
        overview_month = parse_monthly_overview_slug(other.slug)
        if overview_month and overview_month < (now_local.year, now_local.month):
            other.is_active = False

    db.session.commit()
    flash("Monthly pinned overview created." if is_new else "Monthly pinned overview refreshed.")
    return redirect(url_for("main.admin_posts"))
