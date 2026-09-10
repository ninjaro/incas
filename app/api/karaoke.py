import secrets

from flask import jsonify, request
from sqlalchemy.exc import IntegrityError

from app.api import api_bp, api_error, get_json_body, rate_limited, require_capability, validation_error
from app.datetime_utils import serialize_utc
from app.models import (
    KARAOKE_QUEUE_STATUSES,
    KARAOKE_STATUS_APPROVED,
    KARAOKE_STATUS_CANCELLED,
    KARAOKE_STATUS_COMPLETED,
    KARAOKE_STATUS_PENDING,
    KARAOKE_STATUS_PERFORMING,
    KARAOKE_STATUS_REJECTED,
    KARAOKE_STATUSES,
    KaraokeQueueAudit,
    KaraokeSongRequest,
    Post,
    db,
)
from app.routes.helpers.access import get_session_audit_id

# Allowed transitions; "restore" is only safe from cancelled/rejected back to
# pending so it re-enters moderation instead of jumping into the live queue.
TRANSITIONS = {
    "approve": ({KARAOKE_STATUS_PENDING}, KARAOKE_STATUS_APPROVED),
    "reject": ({KARAOKE_STATUS_PENDING}, KARAOKE_STATUS_REJECTED),
    "cancel": (
        {KARAOKE_STATUS_PENDING, KARAOKE_STATUS_APPROVED, KARAOKE_STATUS_PERFORMING},
        KARAOKE_STATUS_CANCELLED,
    ),
    "restore": ({KARAOKE_STATUS_CANCELLED, KARAOKE_STATUS_REJECTED}, KARAOKE_STATUS_PENDING),
    "performing": ({KARAOKE_STATUS_APPROVED}, KARAOKE_STATUS_PERFORMING),
    "complete": ({KARAOKE_STATUS_PERFORMING, KARAOKE_STATUS_APPROVED}, KARAOKE_STATUS_COMPLETED),
}

def new_public_id():
    return f"KRQ-{secrets.token_urlsafe(16)}"


def queue_position(item):
    if item.status not in KARAOKE_QUEUE_STATUSES or item.position is None:
        return None
    ahead = (
        KaraokeSongRequest.query
        .filter(KaraokeSongRequest.status.in_(KARAOKE_QUEUE_STATUSES))
        .filter(KaraokeSongRequest.post_id == item.post_id)
        .filter(KaraokeSongRequest.position < item.position)
        .count()
    )
    return ahead + 1


def serialize_public(item):
    event = db.session.get(Post, item.post_id) if item.post_id else None
    return {
        "publicId": item.public_id,
        "displayName": item.display_name,
        "songTitle": item.song_title,
        "artist": item.artist,
        "status": item.status,
        "queuePosition": queue_position(item),
        "eventSlug": event.slug if event else None,
        "eventTitle": event.display_title if event else None,
    }


def serialize_admin(item):
    payload = serialize_public(item)
    payload.update(
        {
            "id": item.id,
            "postId": item.post_id,
            "note": item.note,
            "position": item.position,
            "createdAt": serialize_utc(item.created_at),
        }
    )
    return payload


def audit(item, action, detail=""):
    db.session.add(
        KaraokeQueueAudit(
            request_id=item.id,
            action=action,
            detail=detail,
            actor=get_session_audit_id(),
        )
    )


def next_queue_position(post_id):
    Post.query.filter_by(id=post_id).with_for_update().first()
    queue = (
        KaraokeSongRequest.query
        .filter(KaraokeSongRequest.post_id == post_id)
        .filter(KaraokeSongRequest.status.in_(KARAOKE_QUEUE_STATUSES))
        .with_for_update()
        .all()
    )
    current_max = max(
        (entry.position or 0 for entry in queue),
        default=0,
    )
    return current_max + 1


def resolve_event(slug_or_none, *, required=False):
    if not slug_or_none:
        if required:
            return None, api_error("event_required", "Select a karaoke event.", status=422)
        return None, None
    event = Post.query.filter_by(slug=slug_or_none).first()
    if event is None or not event.is_publicly_accessible or event.event_kind != "karaoke":
        return None, api_error("event_unknown", "Unknown karaoke event.", status=422)
    return event, None


@api_bp.post("/public/karaoke/requests")
@rate_limited("karaoke.submit", limit=10)
def api_karaoke_submit():
    body = get_json_body()
    errors = {}
    display_name = (body.get("displayName") or "").strip()
    song_title = (body.get("songTitle") or "").strip()
    if not display_name:
        errors["displayName"] = "Enter a name or nickname."
    if not song_title:
        errors["songTitle"] = "Enter a song title."
    if errors:
        return validation_error(errors)

    event, error = resolve_event((body.get("eventSlug") or "").strip(), required=True)
    if error:
        return error

    item = KaraokeSongRequest(
        public_id=new_public_id(),
        post_id=event.id if event else None,
        display_name=display_name[:120],
        song_title=song_title[:200],
        artist=(body.get("artist") or "").strip()[:200],
        note=(body.get("note") or "").strip(),
    )
    db.session.add(item)
    db.session.flush()
    audit(item, "submitted")
    db.session.commit()

    return jsonify({"publicId": item.public_id, "status": item.status}), 201


@api_bp.get("/public/karaoke/requests/<public_id>")
@rate_limited("karaoke.track", limit=60)
def api_karaoke_track(public_id):
    item = KaraokeSongRequest.query.filter_by(public_id=public_id).first()
    if item is None:
        return api_error("not_found", "Request not found.", status=404)
    return jsonify(serialize_public(item))


@api_bp.post("/public/karaoke/requests/track")
@rate_limited("karaoke.track.batch", limit=60)
def api_karaoke_track_batch():
    body = get_json_body()
    raw_ids = body.get("publicIds")
    if not isinstance(raw_ids, list):
        return validation_error({"publicIds": "Provide a list of tracking codes."})
    public_ids = list(dict.fromkeys(
        str(public_id).strip() for public_id in raw_ids if str(public_id).strip()
    ))
    if not public_ids or len(public_ids) > 20:
        return validation_error({"publicIds": "Provide between 1 and 20 tracking codes."})
    items = KaraokeSongRequest.query.filter(KaraokeSongRequest.public_id.in_(public_ids)).all()
    by_id = {item.public_id: item for item in items}
    return jsonify({
        "items": [serialize_public(by_id[public_id]) for public_id in public_ids if public_id in by_id],
        "missing": [public_id for public_id in public_ids if public_id not in by_id],
    })


@api_bp.get("/public/karaoke/queue")
def api_karaoke_public_queue():
    event, error = resolve_event(request.args.get("event", "").strip(), required=True)
    if error:
        return error

    query = (
        KaraokeSongRequest.query
        .filter(KaraokeSongRequest.status.in_(KARAOKE_QUEUE_STATUSES))
        .filter(KaraokeSongRequest.post_id == (event.id if event else None))
        .order_by(KaraokeSongRequest.position.asc())
    )
    return jsonify({"items": [serialize_public(item) for item in query.all()]})


@api_bp.get("/admin/karaoke")
@require_capability("karaoke_queue")
def api_admin_karaoke_list():
    query = KaraokeSongRequest.query
    status = request.args.get("status", "").strip()
    if status:
        if status not in KARAOKE_STATUSES:
            return api_error("status_unknown", "Unknown status.", status=422)
        query = query.filter(KaraokeSongRequest.status == status)
    event_slug = request.args.get("event", "").strip()
    if event_slug:
        event = Post.query.filter_by(slug=event_slug, event_kind="karaoke").first()
        if event is None:
            return api_error("event_unknown", "Unknown karaoke event.", status=422)
        query = query.filter(KaraokeSongRequest.post_id == event.id)

    items = query.order_by(
        KaraokeSongRequest.position.asc().nullslast(),
        KaraokeSongRequest.created_at.asc(),
    ).all()
    events = Post.query.filter_by(event_kind="karaoke").order_by(Post.starts_at.desc()).all()
    return jsonify(
        {
            "items": [serialize_admin(item) for item in items],
            "events": [
                {"slug": event.slug, "title": event.display_title, "startsAt": serialize_utc(event.starts_at)}
                for event in events
            ],
        }
    )


@api_bp.post("/admin/karaoke/<int:request_id>/<action>")
@require_capability("karaoke_queue")
def api_admin_karaoke_action(request_id, action):
    if action not in TRANSITIONS:
        return api_error("action_unknown", "Unknown queue action.", status=404)

    item = (
        KaraokeSongRequest.query
        .filter_by(id=request_id)
        .with_for_update()
        .first()
    )
    if item is None:
        return api_error("not_found", "Request not found.", status=404)

    allowed_from, target = TRANSITIONS[action]
    if item.status not in allowed_from:
        return api_error(
            "invalid_transition",
            f"Cannot {action} a request in status '{item.status}'.",
            status=409,
        )

    previous = item.status
    item.status = target
    if target == KARAOKE_STATUS_APPROVED:
        item.position = next_queue_position(item.post_id)
    if target in (KARAOKE_STATUS_COMPLETED, KARAOKE_STATUS_CANCELLED, KARAOKE_STATUS_REJECTED, KARAOKE_STATUS_PENDING):
        item.position = None

    audit(item, action, detail=f"{previous} -> {target}")
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return api_error(
            "queue_changed",
            "The queue changed while approving this request. Reload and try again.",
            status=409,
        )
    return jsonify(serialize_admin(item))


@api_bp.post("/admin/karaoke/reorder")
@require_capability("karaoke_queue")
def api_admin_karaoke_reorder():
    body = get_json_body()
    order = body.get("order")
    if not isinstance(order, list) or not all(isinstance(entry, int) for entry in order):
        return validation_error({"order": "Provide the full ordered list of request ids."})
    if not order or len(order) != len(set(order)):
        return api_error(
            "queue_changed",
            "The queue changed while reordering. Reload and try again.",
            status=409,
        )

    items = (
        KaraokeSongRequest.query
        .filter(KaraokeSongRequest.id.in_(order))
        .filter(KaraokeSongRequest.status.in_(KARAOKE_QUEUE_STATUSES))
        .with_for_update()
        .all()
    )
    items_by_id = {item.id: item for item in items}
    if set(items_by_id) != set(order):
        # An id vanished or changed status since the admin loaded the queue;
        # reject so concurrent moderation cannot corrupt positions.
        return api_error(
            "queue_changed",
            "The queue changed while reordering. Reload and try again.",
            status=409,
        )

    event_ids = {item.post_id for item in items}
    if len(event_ids) != 1 or None in event_ids:
        return api_error(
            "event_scope_required",
            "Reordering must contain requests from exactly one karaoke event.",
            status=409,
        )

    event_id = next(iter(event_ids))
    Post.query.filter_by(id=event_id).with_for_update().first()
    complete_queue = (
        KaraokeSongRequest.query
        .filter(KaraokeSongRequest.post_id == event_id)
        .filter(KaraokeSongRequest.status.in_(KARAOKE_QUEUE_STATUSES))
        .with_for_update()
        .all()
    )
    if {item.id for item in complete_queue} != set(order):
        return api_error(
            "queue_changed",
            "The queue changed while reordering. Reload and try again.",
            status=409,
        )

    # Move every row out of the final position range first. A direct reversal
    # can otherwise violate the unique (post_id, position) constraint halfway
    # through the UPDATE sequence even though the final order is valid.
    temporary_base = max((item.position or 0 for item in complete_queue), default=0) + len(order)
    for offset, request_id in enumerate(order, start=1):
        items_by_id[request_id].position = temporary_base + offset
    db.session.flush()

    for position, request_id in enumerate(order, start=1):
        item = items_by_id[request_id]
        item.position = position
        audit(item, "reorder", detail=f"position {position}")
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return api_error(
            "queue_changed",
            "The queue changed while reordering. Reload and try again.",
            status=409,
        )

    ordered = sorted(items_by_id.values(), key=lambda entry: entry.position or 0)
    return jsonify({"items": [serialize_admin(item) for item in ordered]})


@api_bp.get("/admin/karaoke/audit")
@require_capability("karaoke_queue")
def api_admin_karaoke_audit():
    entries = (
        KaraokeQueueAudit.query.order_by(KaraokeQueueAudit.created_at.desc()).limit(200).all()
    )
    return jsonify(
        {
            "entries": [
                {
                    "requestId": entry.request_id,
                    "action": entry.action,
                    "detail": entry.detail,
                    "actor": entry.actor,
                    "createdAt": serialize_utc(entry.created_at),
                }
                for entry in entries
            ]
        }
    )
