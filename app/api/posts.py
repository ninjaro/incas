import json
from datetime import datetime

from flask import jsonify, request

from app.api import api_bp, api_error, get_json_body, require_capability, validation_error
from app.event_kinds import get_event_kind
from app.models import (
    POST_STATUS_DRAFT,
    POST_STATUS_PUBLISHED,
    POST_STATUS_SCHEDULED,
    POST_STATUSES,
    Post,
    PostTemplate,
    SocialPublication,
    db,
    get_configured_local_now,
)
from app.routes.helpers.content import unique_slug
from app.social import (
    SOCIAL_PROVIDERS,
    publish_post_to_channels,
    schedule_post_channels,
    serialize_publication,
)


def serialize_admin_post(item):
    return {
        "id": item.id,
        "slug": item.slug,
        "title": item.title,
        "summary": item.summary,
        "body": item.body,
        "eventKind": item.event_kind,
        "startsAt": item.starts_at.isoformat() if item.starts_at else None,
        "endsAt": item.ends_at_override.isoformat() if item.ends_at_override else None,
        "durationMinutes": item.duration_minutes,
        "publishAt": item.publish_at.isoformat() if item.publish_at else None,
        "status": item.publication_status,
        "storedStatus": item.status,
        "isActive": bool(item.is_active),
        "isPinned": bool(item.is_pinned),
        "imageUrl": item.image_url,
        "registrationLimitEnabled": bool(item.registration_limit_enabled),
        "registrationLimit": item.registration_limit,
        "registrationPriceCents": item.registration_price_cents,
        "registrationIsDeposit": bool(item.registration_is_deposit),
        "registrationMode": item.registration_mode,
        "depositExplanation": item.deposit_explanation,
        "venue": item.venue,
        "address": item.address,
        "city": item.city,
        "meetingPoint": item.meeting_point,
        "destination": item.destination,
        "countryCode": item.country_code,
        "latitude": item.latitude,
        "longitude": item.longitude,
        "destinationLatitude": item.destination_latitude,
        "destinationLongitude": item.destination_longitude,
        "mapConfig": item.map_config_dict,
        "featureFlags": item.feature_flags_list,
        "createdAt": item.created_at.isoformat() if item.created_at else None,
        "updatedAt": item.updated_at.isoformat() if item.updated_at else None,
    }


def parse_datetime_field(value, field, errors):
    if value in (None, ""):
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        errors[field] = "Enter a valid date and time."
        return None


def apply_post_fields(item, body, errors, *, creating=False):
    title = (body.get("title") or "").strip()
    if creating or "title" in body:
        if not title:
            errors["title"] = "Title is required."
        else:
            item.title = title
            item.slug = unique_slug(title, current_id=item.id)

    for source, attr in (
        ("summary", "summary"),
        ("body", "body"),
        ("imageUrl", "image_url"),
    ):
        if source in body:
            setattr(item, attr, (body.get(source) or "").strip())

    if "eventKind" in body:
        event_kind = (body.get("eventKind") or "").strip() or None
        if event_kind and get_event_kind(event_kind) is None:
            errors["eventKind"] = "Unknown event kind."
        else:
            item.event_kind = event_kind

    if "startsAt" in body:
        item.starts_at = parse_datetime_field(body.get("startsAt"), "startsAt", errors)
    if "endsAt" in body:
        item.ends_at_override = parse_datetime_field(body.get("endsAt"), "endsAt", errors)

    if "durationMinutes" in body:
        raw_duration = body.get("durationMinutes")
        if raw_duration in (None, ""):
            item.duration_minutes = None
        else:
            try:
                duration = int(raw_duration)
                if duration <= 0:
                    raise ValueError
                item.duration_minutes = duration
            except (TypeError, ValueError):
                errors["durationMinutes"] = "Enter a positive duration in minutes."

    if "isPinned" in body:
        item.is_pinned = bool(body.get("isPinned"))

    if "registrationLimitEnabled" in body:
        item.registration_limit_enabled = bool(body.get("registrationLimitEnabled"))
    if "registrationLimit" in body:
        raw_limit = body.get("registrationLimit")
        if raw_limit in (None, ""):
            item.registration_limit = None
        else:
            try:
                item.registration_limit = max(int(raw_limit), 0)
            except (TypeError, ValueError):
                errors["registrationLimit"] = "Enter a whole number."
    if "registrationPriceCents" in body:
        raw_price = body.get("registrationPriceCents")
        if raw_price in (None, ""):
            item.registration_price_cents = None
        else:
            try:
                price = int(raw_price)
                if price < 0:
                    raise ValueError
                item.registration_price_cents = price
            except (TypeError, ValueError):
                errors["registrationPriceCents"] = "Enter a non-negative amount in cents."
    if "registrationIsDeposit" in body:
        item.registration_is_deposit = bool(body.get("registrationIsDeposit"))

    for source, attr in (
        ("registrationMode", "registration_mode"),
        ("depositExplanation", "deposit_explanation"),
        ("venue", "venue"),
        ("address", "address"),
        ("city", "city"),
        ("meetingPoint", "meeting_point"),
        ("destination", "destination"),
        ("countryCode", "country_code"),
    ):
        if source in body:
            setattr(item, attr, (body.get(source) or "").strip())

    for source, attr in (
        ("latitude", "latitude"),
        ("longitude", "longitude"),
        ("destinationLatitude", "destination_latitude"),
        ("destinationLongitude", "destination_longitude"),
    ):
        if source not in body:
            continue
        raw_value = body.get(source)
        if raw_value in (None, ""):
            setattr(item, attr, None)
            continue
        try:
            setattr(item, attr, float(raw_value))
        except (TypeError, ValueError):
            errors[source] = "Enter a valid coordinate."

    if "mapConfig" in body:
        if not isinstance(body.get("mapConfig"), dict):
            errors["mapConfig"] = "Map configuration must be an object."
        else:
            item.map_config = json.dumps(body["mapConfig"])
    if "featureFlags" in body:
        flags = body.get("featureFlags")
        if not isinstance(flags, list) or not all(isinstance(flag, str) for flag in flags):
            errors["featureFlags"] = "Feature flags must be a list of strings."
        else:
            item.feature_flags = json.dumps(list(dict.fromkeys(flags)))

    if creating and item.event_kind:
        kind = get_event_kind(item.event_kind) or {}
        if "durationMinutes" not in body:
            item.duration_minutes = kind.get("defaultDurationMinutes")
        if "registrationMode" not in body:
            item.registration_mode = kind.get("registrationMode", "none")
        if kind.get("registrationDefault") and "registrationLimitEnabled" not in body:
            item.registration_limit_enabled = True
        if "registrationLimit" not in body:
            item.registration_limit = kind.get("defaultCapacity")
        if "registrationPriceCents" not in body:
            item.registration_price_cents = kind.get("defaultPriceCents")
        if "registrationIsDeposit" not in body:
            item.registration_is_deposit = bool(kind.get("depositDefault"))

    if item.ends_at_override and item.starts_at and item.ends_at_override <= item.starts_at:
        errors["endsAt"] = "End time must be after the start time."
    item.registration_mode = item.registration_mode or "none"
    if item.registration_mode not in {"none", "queue", "karaoke"}:
        errors["registrationMode"] = "Use none, queue, or karaoke."
    if item.registration_limit_enabled and (item.registration_limit or 0) <= 0:
        errors["registrationLimit"] = "A registration queue needs at least one place."
    if item.registration_is_deposit and not item.registration_price_cents:
        errors["registrationPriceCents"] = "A deposit event needs a positive amount."
    if item.country_code:
        item.country_code = item.country_code.upper()
        if len(item.country_code) != 2:
            errors["countryCode"] = "Use a two-letter country code."
    if item.latitude is not None and not -90 <= item.latitude <= 90:
        errors["latitude"] = "Latitude must be between -90 and 90."
    if item.longitude is not None and not -180 <= item.longitude <= 180:
        errors["longitude"] = "Longitude must be between -180 and 180."


def apply_post_status(item, body, errors):
    status = (body.get("status") or "").strip()
    if not status:
        return
    if status not in POST_STATUSES:
        errors["status"] = "Unknown publication status."
        return

    publish_at = parse_datetime_field(body.get("publishAt"), "publishAt", errors)

    if status == POST_STATUS_SCHEDULED:
        if publish_at is None:
            errors["publishAt"] = "Scheduled posts need a publication date and time."
            return
        item.publish_at = publish_at
    else:
        item.publish_at = None
    item.status = status
    item.is_active = status in (POST_STATUS_PUBLISHED, POST_STATUS_SCHEDULED)


@api_bp.get("/admin/posts")
@require_capability("posts")
def api_admin_posts():
    query = Post.query
    status = request.args.get("status", "").strip()
    if status:
        if status not in POST_STATUSES:
            return api_error("status_unknown", "Unknown publication status.", status=422)
        query = query.filter(Post.status == status)

    try:
        page = max(int(request.args.get("page", 1)), 1)
        per_page = min(max(int(request.args.get("perPage", 20)), 1), 100)
    except (TypeError, ValueError):
        page, per_page = 1, 20

    pagination = query.order_by(Post.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify(
        {
            "items": [serialize_admin_post(item) for item in pagination.items],
            "page": pagination.page,
            "perPage": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        }
    )


@api_bp.post("/admin/posts")
@require_capability("posts")
def api_admin_post_create():
    body = get_json_body()
    errors = {}
    item = Post(status=POST_STATUS_DRAFT, is_active=False, title="", slug="")
    apply_post_fields(item, body, errors, creating=True)
    apply_post_status(item, body, errors)
    if errors:
        return validation_error(errors)

    db.session.add(item)
    db.session.commit()

    template_social = body.get("socialChannels")
    if item.status == POST_STATUS_SCHEDULED and isinstance(template_social, list):
        schedule_post_channels(item, template_social, item.publish_at)

    return jsonify(serialize_admin_post(item)), 201


@api_bp.get("/admin/posts/<int:post_id>")
@require_capability("posts")
def api_admin_post_detail(post_id):
    item = db.session.get(Post, post_id)
    if item is None:
        return api_error("not_found", "Post not found.", status=404)
    payload = serialize_admin_post(item)
    payload["social"] = [
        serialize_publication(publication)
        for publication in SocialPublication.query.filter_by(post_id=item.id).all()
    ]
    return jsonify(payload)


@api_bp.put("/admin/posts/<int:post_id>")
@require_capability("posts")
def api_admin_post_update(post_id):
    item = db.session.get(Post, post_id)
    if item is None:
        return api_error("not_found", "Post not found.", status=404)

    body = get_json_body()
    errors = {}
    apply_post_fields(item, body, errors)
    apply_post_status(item, body, errors)
    if errors:
        db.session.rollback()
        return validation_error(errors)

    db.session.commit()
    return jsonify(serialize_admin_post(item))


@api_bp.post("/admin/posts/<int:post_id>/social")
@require_capability("posts")
def api_admin_post_social_publish(post_id):
    item = db.session.get(Post, post_id)
    if item is None:
        return api_error("not_found", "Post not found.", status=404)

    body = get_json_body()
    channels = body.get("channels")
    if not isinstance(channels, list) or not channels:
        return validation_error({"channels": "Select at least one channel."})
    unknown = [channel for channel in channels if channel not in SOCIAL_PROVIDERS]
    if unknown:
        return validation_error({"channels": f"Unknown channels: {', '.join(unknown)}."})

    if item.publication_status == POST_STATUS_SCHEDULED and item.publish_at:
        publications = schedule_post_channels(item, channels, item.publish_at)
    else:
        publications = publish_post_to_channels(item, channels)

    return jsonify({"results": [serialize_publication(publication) for publication in publications]})


@api_bp.post("/admin/social/<int:publication_id>/retry")
@require_capability("posts")
def api_admin_social_retry(publication_id):
    publication = db.session.get(SocialPublication, publication_id)
    if publication is None:
        return api_error("not_found", "Publication not found.", status=404)
    item = db.session.get(Post, publication.post_id)
    if item is None:
        return api_error("not_found", "Post not found.", status=404)

    publications = publish_post_to_channels(item, [publication.provider])
    return jsonify({"results": [serialize_publication(entry) for entry in publications]})


@api_bp.get("/admin/social")
@require_capability("posts")
def api_admin_social_publications():
    query = SocialPublication.query
    status = request.args.get("status", "").strip()
    provider = request.args.get("provider", "").strip()
    if status:
        query = query.filter(SocialPublication.status == status)
    if provider:
        query = query.filter(SocialPublication.provider == provider)
    items = []
    for publication in query.order_by(SocialPublication.created_at.desc()).limit(500).all():
        payload = serialize_publication(publication)
        post = db.session.get(Post, publication.post_id)
        payload.update({"postTitle": post.title if post else "", "postSlug": post.slug if post else ""})
        items.append(payload)
    return jsonify({"items": items})


def serialize_template(template):
    return {
        "id": template.id,
        "name": template.name,
        "titlePattern": template.title_pattern,
        "summary": template.summary,
        "body": template.body,
        "eventKind": template.event_kind,
        "registrationLimitEnabled": bool(template.registration_limit_enabled),
        "registrationLimit": template.registration_limit,
        "registrationPriceCents": template.registration_price_cents,
        "registrationIsDeposit": bool(template.registration_is_deposit),
        "imageUrl": template.image_url,
        "socialSettings": template.social_settings_dict,
        "updatedAt": template.updated_at.isoformat() if template.updated_at else None,
    }


def apply_template_fields(template, body, errors, *, creating=False):
    name = (body.get("name") or "").strip()
    if creating or "name" in body:
        if not name:
            errors["name"] = "Template name is required."
        else:
            template.name = name

    for source, attr in (
        ("titlePattern", "title_pattern"),
        ("summary", "summary"),
        ("body", "body"),
        ("imageUrl", "image_url"),
    ):
        if source in body:
            setattr(template, attr, (body.get(source) or "").strip())

    if "eventKind" in body:
        template.event_kind = (body.get("eventKind") or "").strip() or None
    if "registrationLimitEnabled" in body:
        template.registration_limit_enabled = bool(body.get("registrationLimitEnabled"))
    if "registrationLimit" in body:
        raw_limit = body.get("registrationLimit")
        template.registration_limit = int(raw_limit) if raw_limit not in (None, "") else None
    if "registrationPriceCents" in body:
        raw_price = body.get("registrationPriceCents")
        template.registration_price_cents = int(raw_price) if raw_price not in (None, "") else None
    if "registrationIsDeposit" in body:
        template.registration_is_deposit = bool(body.get("registrationIsDeposit"))
    if "socialSettings" in body and isinstance(body.get("socialSettings"), dict):
        template.social_settings = json.dumps(body["socialSettings"])


@api_bp.get("/admin/post-templates")
@require_capability("posts")
def api_admin_templates():
    templates = PostTemplate.query.order_by(PostTemplate.updated_at.desc()).all()
    return jsonify({"items": [serialize_template(template) for template in templates]})


@api_bp.post("/admin/post-templates")
@require_capability("posts")
def api_admin_template_create():
    body = get_json_body()
    errors = {}
    template = PostTemplate(name="")
    apply_template_fields(template, body, errors, creating=True)
    if errors:
        return validation_error(errors)
    db.session.add(template)
    db.session.commit()
    return jsonify(serialize_template(template)), 201


@api_bp.put("/admin/post-templates/<int:template_id>")
@require_capability("posts")
def api_admin_template_update(template_id):
    template = db.session.get(PostTemplate, template_id)
    if template is None:
        return api_error("not_found", "Template not found.", status=404)
    body = get_json_body()
    errors = {}
    apply_template_fields(template, body, errors)
    if errors:
        db.session.rollback()
        return validation_error(errors)
    db.session.commit()
    return jsonify(serialize_template(template))


@api_bp.delete("/admin/post-templates/<int:template_id>")
@require_capability("posts")
def api_admin_template_delete(template_id):
    template = db.session.get(PostTemplate, template_id)
    if template is None:
        return api_error("not_found", "Template not found.", status=404)
    db.session.delete(template)
    db.session.commit()
    return jsonify({"deleted": True})


@api_bp.post("/admin/post-templates/<int:template_id>/duplicate")
@require_capability("posts")
def api_admin_template_duplicate(template_id):
    template = db.session.get(PostTemplate, template_id)
    if template is None:
        return api_error("not_found", "Template not found.", status=404)
    copy = PostTemplate(
        name=f"{template.name} (copy)",
        title_pattern=template.title_pattern,
        summary=template.summary,
        body=template.body,
        event_kind=template.event_kind,
        registration_limit_enabled=template.registration_limit_enabled,
        registration_limit=template.registration_limit,
        registration_price_cents=template.registration_price_cents,
        registration_is_deposit=template.registration_is_deposit,
        image_url=template.image_url,
        social_settings=template.social_settings,
    )
    db.session.add(copy)
    db.session.commit()
    return jsonify(serialize_template(copy)), 201


@api_bp.post("/admin/posts/from-template")
@require_capability("posts")
def api_admin_post_from_template():
    body = get_json_body()
    template = db.session.get(PostTemplate, body.get("templateId") or 0)
    if template is None:
        return api_error("not_found", "Template not found.", status=404)

    now = get_configured_local_now()
    title = template.title_pattern or template.name
    item = Post(
        title=title,
        slug=unique_slug(f"{title}-{now:%Y-%m-%d}"),
        summary=template.summary,
        body=template.body,
        event_kind=template.event_kind,
        registration_limit_enabled=template.registration_limit_enabled,
        registration_limit=template.registration_limit,
        registration_price_cents=template.registration_price_cents,
        registration_is_deposit=template.registration_is_deposit,
        image_url=template.image_url,
        status=POST_STATUS_DRAFT,
        is_active=False,
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(serialize_admin_post(item)), 201
