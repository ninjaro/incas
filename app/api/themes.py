from collections import Counter
from datetime import timedelta

from flask import jsonify, request
from sqlalchemy import or_, update

from app.api import api_bp, api_error, get_json_body, require_capability
from app.datetime_utils import serialize_utc, utc_now
from app.models import (
    PageThemeAudit,
    PageThemeSelection,
    PageThemeVote,
    db,
)
from app.routes.helpers.access import get_session_audit_id, has_capability
from app.themes_registry import (
    THEME_FORCE_COOLDOWN_HOURS,
    THEME_PAGES,
    get_page,
    is_valid_theme,
    resolve_public_theme,
    serialize_registry,
)


def get_force_lock_info(selection):
    if selection is None or selection.last_forced_at is None:
        return {"lockedUntil": None, "isLocked": False}
    available_at = selection.last_forced_at + timedelta(hours=THEME_FORCE_COOLDOWN_HOURS)
    now = utc_now()
    return {
        "lockedUntil": serialize_utc(available_at) if available_at > now else None,
        "isLocked": available_at > now,
        "lastForcedAt": serialize_utc(selection.last_forced_at),
    }


@api_bp.get("/admin/themes")
@require_capability("theme_review")
def api_admin_themes():
    selections = {row.page_id: row for row in PageThemeSelection.query.all()}
    votes = Counter()
    for vote in PageThemeVote.query.all():
        votes[(vote.page_id, vote.theme_id)] += 1

    voter_id = get_session_audit_id()
    own_votes = {
        vote.page_id: vote.theme_id
        for vote in PageThemeVote.query.filter_by(voter_id=voter_id).all()
    }

    pages = []
    for entry in serialize_registry():
        page_id = entry["pageId"]
        selection = selections.get(page_id)
        entry["publicTheme"] = resolve_public_theme(
            page_id, selection.theme_id if selection else None
        )
        entry["forceLock"] = get_force_lock_info(selection)
        entry["myVote"] = own_votes.get(page_id)
        for theme in entry["themes"]:
            theme["votes"] = votes.get((page_id, theme["themeId"]), 0)
        pages.append(entry)

    return jsonify({"pages": pages, "canForce": has_capability("theme_force")})


@api_bp.post("/admin/theme-votes")
@require_capability("theme_review")
def api_admin_theme_vote():
    body = get_json_body()
    page_id = (body.get("page") or "").strip()
    theme_id = (body.get("theme") or "").strip()

    if get_page(page_id) is None:
        return api_error("page_unknown", "Unknown theme page.", status=422)
    if not is_valid_theme(page_id, theme_id):
        return api_error("theme_unknown", "Unknown or disabled theme.", status=422)

    # One effective vote per admin session per page, regardless of how many
    # keys the session unlocked; re-voting replaces the previous vote.
    voter_id = get_session_audit_id()
    vote = PageThemeVote.query.filter_by(page_id=page_id, voter_id=voter_id).first()
    if vote is None:
        vote = PageThemeVote(page_id=page_id, voter_id=voter_id, theme_id=theme_id)
        db.session.add(vote)
    else:
        vote.theme_id = theme_id
    db.session.add(
        PageThemeAudit(
            page_id=page_id,
            previous_theme="",
            new_theme=theme_id,
            action="vote",
            actor=voter_id,
        )
    )
    db.session.commit()

    totals = Counter(
        row.theme_id for row in PageThemeVote.query.filter_by(page_id=page_id).all()
    )
    return jsonify({"page": page_id, "myVote": theme_id, "votes": dict(totals)})


@api_bp.post("/admin/theme-forces")
@require_capability("theme_force")
def api_admin_theme_force():
    body = get_json_body()
    page_id = (body.get("page") or "").strip()
    theme_id = (body.get("theme") or "").strip()
    note = (body.get("note") or "").strip()

    if get_page(page_id) is None:
        return api_error("page_unknown", "Unknown theme page.", status=422)
    if not is_valid_theme(page_id, theme_id):
        return api_error("theme_unknown", "Unknown or disabled theme.", status=422)

    now = utc_now()
    cutoff = now - timedelta(hours=THEME_FORCE_COOLDOWN_HOURS)
    selection = PageThemeSelection.query.filter_by(page_id=page_id).first()

    if selection is None:
        selection = PageThemeSelection(page_id=page_id, theme_id=theme_id, last_forced_at=now)
        db.session.add(selection)
        previous_theme = resolve_public_theme(page_id, None)
        try:
            db.session.flush()
        except Exception:
            db.session.rollback()
            return _force_locked_error(page_id)
    else:
        previous_theme = resolve_public_theme(page_id, selection.theme_id)
        # Guarded UPDATE so concurrent force attempts cannot both succeed:
        # only the request that still sees the cooldown expired wins.
        result = db.session.execute(
            update(PageThemeSelection)
            .where(PageThemeSelection.page_id == page_id)
            .where(
                or_(
                    PageThemeSelection.last_forced_at.is_(None),
                    PageThemeSelection.last_forced_at <= cutoff,
                )
            )
            .values(theme_id=theme_id, last_forced_at=now, updated_at=now)
        )
        if result.rowcount != 1:
            db.session.rollback()
            return _force_locked_error(page_id)

    db.session.add(
        PageThemeAudit(
            page_id=page_id,
            previous_theme=previous_theme or "",
            new_theme=theme_id,
            action="force",
            actor=get_session_audit_id(),
            note=note,
        )
    )
    db.session.commit()

    return jsonify(
        {
            "page": page_id,
            "publicTheme": theme_id,
            "forcedAt": serialize_utc(now),
            "nextChangeAt": serialize_utc(
                now + timedelta(hours=THEME_FORCE_COOLDOWN_HOURS)
            ),
        }
    )


def _force_locked_error(page_id):
    selection = PageThemeSelection.query.filter_by(page_id=page_id).first()
    available_at = None
    if selection is not None and selection.last_forced_at is not None:
        available_at = selection.last_forced_at + timedelta(hours=THEME_FORCE_COOLDOWN_HOURS)
    return api_error(
        "theme_force_locked",
        "This page theme cannot be changed yet.",
        status=409,
        details={"availableAt": serialize_utc(available_at)},
    )


@api_bp.get("/admin/theme-audit")
@require_capability("theme_review")
def api_admin_theme_audit():
    page_id = request.args.get("page", "").strip()
    query = PageThemeAudit.query.filter_by(action="force")
    if page_id:
        if get_page(page_id) is None:
            return api_error("page_unknown", "Unknown theme page.", status=422)
        query = query.filter_by(page_id=page_id)

    entries = query.order_by(PageThemeAudit.created_at.desc()).limit(100).all()
    return jsonify(
        {
            "entries": [
                {
                    "pageId": entry.page_id,
                    "previousTheme": entry.previous_theme,
                    "newTheme": entry.new_theme,
                    "action": entry.action,
                    "actor": entry.actor,
                    "note": entry.note,
                    "createdAt": serialize_utc(entry.created_at),
                }
                for entry in entries
            ]
        }
    )
