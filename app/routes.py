import calendar
import hashlib
import hmac
import json

from collections import Counter
from functools import lru_cache

import pycountry
from babel import Locale
from babel.languages import get_official_languages

from datetime import datetime, date
from flask import Blueprint, abort, current_app, flash, redirect, render_template, request, session, url_for

from app.models import Post, LanguageTandemRequest, db

bp = Blueprint("main", __name__)


LANGUAGE_OPTIONS = [
    "* any",
    "Arabic",
    "Chinese (Mandarin)",
    "English",
    "French",
    "German",
    "Hindi",
    "Italian",
    "Japanese",
    "Portuguese",
    "Spanish",
    "Urdu",
    "Russian",
    "Ukrainian",
    "Dutch",
    "Turkish",
    "Polish",
]

COUNTRY_OPTIONS = [
    "Germany",
    "Ukraine",
    "France",
    "Italy",
    "Spain",
    "Turkey",
    "China",
    "India",
    "United States",
    "United Kingdom",
    "Poland",
    "Netherlands",
    "Other",
]

ACCESS_TARGETS = {
    "posts": "main.admin_posts",
    "language_tandem": "main.admin_language_tandem",
}

ACCESS_LABELS = {
    "posts": "Posts and Events",
    "language_tandem": "Language Tandem",
}


def get_access_scopes():
    return session.get("access_scopes", [])


def has_any_access():
    return len(get_access_scopes()) > 0


def has_scope(scope):
    return scope in get_access_scopes()


def grant_scope(scope):
    scopes = list(get_access_scopes())
    if scope not in scopes:
        scopes.append(scope)
        session["access_scopes"] = scopes

def get_scope_target(scope):
    endpoint = ACCESS_TARGETS.get(scope)
    if endpoint is None:
        return url_for("main.admin_corridor")
    return url_for(endpoint)

@lru_cache(maxsize=1)
def get_country_label_map():
    locale = Locale("en")

    labels = {}
    for country in pycountry.countries:
        code = getattr(country, "alpha_2", None)
        if not code:
            continue
        labels[code] = locale.territories.get(code, country.name)

    return labels

@lru_cache(maxsize=1)
def get_country_options():
    labels = get_country_label_map()
    return [
        {"code": code, "label": label}
        for code, label in sorted(labels.items(), key=lambda item: item[1])
    ]

@lru_cache(maxsize=1)
def get_language_label_map():
    locale = Locale("en")

    labels = {}
    for language in pycountry.languages:
        code = getattr(language, "alpha_2", None)
        if not code or len(code) != 2:
            continue
        if code in labels:
            continue

        fallback = getattr(language, "name", code)
        labels[code] = locale.languages.get(code, fallback)

    return labels

def normalize_country_code(value):
    code = (value or "").strip().upper()
    if code not in get_country_label_map():
        return ""
    return code

def normalize_language_codes(values):
    labels = get_language_label_map()

    cleaned = []
    seen = set()

    for value in values:
        code = (value or "").strip().lower()
        if not code or code not in labels or code in seen:
            continue
        seen.add(code)
        cleaned.append(code)

    return cleaned


def get_offered_language_counts():
    counts = Counter()
    rows = (
        LanguageTandemRequest.query
        .with_entities(LanguageTandemRequest.offered_languages)
        .all()
    )

    for row in rows:
        raw_value = row[0] or "[]"

        try:
            codes = json.loads(raw_value)
        except (TypeError, ValueError):
            continue

        for code in set(codes):
            if code in get_language_label_map():
                counts[code] += 1

    return counts


def get_signal_level(count, max_count):
    if count <= 0 or max_count <= 0:
        return 0

    ratio = count / max_count

    if ratio >= 0.75:
        return 4
    if ratio >= 0.50:
        return 3
    if ratio >= 0.25:
        return 2
    return 1

def get_country_recommended_language_codes(country_code):
    if not country_code:
        return []

    allowed_codes = get_language_label_map()

    try:
        codes = get_official_languages(
            country_code,
            regional=False,
            de_facto=True,
        )
    except Exception:
        return []

    return [code for code in codes if code in allowed_codes]


def build_language_field_context(selected_codes, hint_codes, popularity_counts):
    labels = get_language_label_map()
    hint_set = set(hint_codes)
    max_count = max(popularity_counts.values(), default=0)

    all_choices = []
    for code, label in labels.items():
        popularity = popularity_counts.get(code, 0)
        all_choices.append(
            {
                "code": code,
                "label": label,
                "popularity": popularity,
                "signal_level": get_signal_level(popularity, max_count),
                "is_hint": code in hint_set,
                "is_selected": code in selected_codes,
            }
        )

    all_choices.sort(key=lambda item: item["label"].lower())
    by_code = {item["code"]: item for item in all_choices}

    hint_choices = []
    for code in hint_codes:
        choice = by_code.get(code)
        if choice is not None:
            hint_choices.append(choice)

    return {
        "hint_choices": hint_choices,
        "all_choices": all_choices,
    }

def render_language_tandem_form_page(values):
    offered_counts = get_offered_language_counts()

    offered_field = build_language_field_context(
        selected_codes=values["offered_languages"],
        hint_codes=get_country_recommended_language_codes(values["country_of_origin"]),
        popularity_counts=offered_counts,
    )

    requested_field = build_language_field_context(
        selected_codes=values["requested_languages"],
        hint_codes=[code for code, _count in offered_counts.most_common(8)],
        popularity_counts=offered_counts,
    )

    return render_template(
        "language_tandem_form.html",
        values=values,
        country_options=get_country_options(),
        offered_field=offered_field,
        requested_field=requested_field,
    )

def format_language_codes(codes):
    labels = get_language_label_map()
    return [labels.get(code, code) for code in codes]

def resolve_scope_by_phrase(phrase):
    phrase = (phrase or "").strip()
    if not phrase:
        return None

    digest = hashlib.sha256(phrase.encode("utf-8")).hexdigest()

    for scope, expected_digest in current_app.config["ACCESS_HASHES"].items():
        if hmac.compare_digest(digest, expected_digest):
            return scope

    return None


def require_any_access():
    if has_any_access():
        return None
    return redirect(url_for("main.admin_login"))


def require_scope(scope):
    if has_scope(scope):
        return None

    flash(f"Access required: {ACCESS_LABELS.get(scope, scope)}.")

    if has_any_access():
        return redirect(url_for("main.admin_corridor"))

    return redirect(url_for("main.admin_login"))


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

def parse_birth_year(value):
    value = (value or "").strip()
    if not value:
        return None

    try:
        year = int(value)
    except ValueError:
        return None

    current_year = datetime.utcnow().year
    if year < 1900 or year > current_year:
        return None

    return year

def parse_departure_date(value):
    value = (value or "").strip()
    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None

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

def build_counter_rows(counter, label_map=None, limit=8):
    rows = []

    for key, count in counter.most_common(limit):
        if label_map is None:
            label = key
        elif callable(label_map):
            label = label_map(key)
        else:
            label = label_map.get(key, key)

        rows.append({
            "key": key,
            "label": label,
            "count": count,
        })

    return rows

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

@bp.route("/language-tandem", methods=["GET", "POST"])
def language_tandem_form():
    values = {
        "first_name": "",
        "last_name": "",
        "email": "",
        "occupation": "",
        "gender": "",
        "birth_year": "",
        "departure_date": "",
        "country_of_origin": "",
        "offered_languages": [],
        "requested_languages": [],
        "requested_native_only": False,
        "same_gender_only": False,
        "comment": "",
    }

    if request.method == "POST":
        values["first_name"] = request.form.get("first_name", "").strip()
        values["last_name"] = request.form.get("last_name", "").strip()
        values["email"] = request.form.get("email", "").strip()
        values["occupation"] = request.form.get("occupation", "").strip()
        values["gender"] = request.form.get("gender", "").strip()
        values["birth_year"] = request.form.get("birth_year", "").strip()
        values["departure_date"] = request.form.get("departure_date", "").strip()
        values["country_of_origin"] = normalize_country_code(request.form.get("country_of_origin"))
        values["offered_languages"] = normalize_language_codes(request.form.getlist("offered_languages"))
        values["requested_languages"] = normalize_language_codes(request.form.getlist("requested_languages"))
        values["requested_native_only"] = request.form.get("requested_native_only") == "on"
        values["same_gender_only"] = request.form.get("same_gender_only") == "on"
        values["comment"] = request.form.get("comment", "").strip()

        birth_year = parse_birth_year(values["birth_year"])
        departure_date = parse_departure_date(values["departure_date"])

        if not values["first_name"] or not values["last_name"] or not values["email"]:
            flash("First name, last name, and email are required.")
            return render_language_tandem_form_page(values)

        if not values["occupation"] or not values["gender"] or not values["country_of_origin"]:
            flash("Occupation, gender, and country of origin are required.")
            return render_language_tandem_form_page(values)

        if birth_year is None:
            flash("Enter a valid birth year.")
            return render_language_tandem_form_page(values)

        if departure_date is None:
            flash("Enter a valid departure date.")
            return render_language_tandem_form_page(values)

        if not values["offered_languages"]:
            flash("Select at least one offered language.")
            return render_language_tandem_form_page(values)

        if not values["requested_languages"]:
            flash("Select at least one requested language.")
            return render_language_tandem_form_page(values)

        item = LanguageTandemRequest(
            first_name=values["first_name"],
            last_name=values["last_name"],
            email=values["email"],
            occupation=values["occupation"],
            gender=values["gender"],
            birth_year=birth_year,
            departure_date=departure_date,
            country_of_origin=values["country_of_origin"],
            offered_languages=json.dumps(values["offered_languages"]),
            requested_languages=json.dumps(values["requested_languages"]),
            requested_native_only=values["requested_native_only"],
            same_gender_only=values["same_gender_only"],
            comment=values["comment"],
        )

        db.session.add(item)
        db.session.commit()

        flash("Your request has been submitted.")
        return redirect(url_for("main.language_tandem_form"))

    return render_language_tandem_form_page(values)

@bp.route("/admin", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        phrase = request.form.get("phrase", "").strip()
        scope = resolve_scope_by_phrase(phrase)

        if scope is not None:
            grant_scope(scope)
            return redirect(url_for("main.admin_corridor"))

        flash("Invalid access phrase.")

        if has_any_access():
            return redirect(url_for("main.admin_corridor"))

    if has_any_access():
        return redirect(url_for("main.admin_corridor"))

    return render_template("admin_login.html")


@bp.route("/admin/access/<scope>", methods=["GET", "POST"])
def admin_scope_access(scope):
    if scope not in ACCESS_LABELS:
        abort(404)

    if has_scope(scope):
        return redirect(get_scope_target(scope))

    if request.method == "POST":
        phrase = request.form.get("phrase", "").strip()
        resolved_scope = resolve_scope_by_phrase(phrase)

        if resolved_scope == scope:
            grant_scope(scope)
            return redirect(get_scope_target(scope))

        if resolved_scope is not None:
            flash(f"This phrase unlocks {ACCESS_LABELS.get(resolved_scope, resolved_scope)}, not {ACCESS_LABELS[scope]}.")
        else:
            flash("Invalid access phrase.")

    return render_template(
        "admin_scope_access.html",
        scope=scope,
        scope_label=ACCESS_LABELS[scope],
    )

@bp.route("/admin/corridor")
def admin_corridor():
    guard = require_any_access()
    if guard:
        return guard

    stats = {
        "unread_forms": 0,
        "posts_today": 0,
        "visits_today": 17,
    }

    doors = [
        {
            "label": "Posts and Events",
            "scope": "posts",
            "is_open": has_scope("posts"),
            "url": url_for("main.admin_posts") if has_scope("posts") else None,
        },
        {
            "label": "Language Tandem",
            "scope": "language_tandem",
            "is_open": has_scope("language_tandem"),
            "url": url_for("main.admin_language_tandem") if has_scope("language_tandem") else None,
        },
    ]

    return render_template(
        "admin_corridor.html",
        stats=stats,
        doors=doors,
        access_scopes=get_access_scopes(),
        access_labels=ACCESS_LABELS,
    )

@bp.route("/admin/posts")
def admin_posts():
    guard = require_scope("posts")
    if guard:
        return guard

    items = Post.query.order_by(Post.updated_at.desc()).all()
    return render_template("admin_posts.html", items=items)


@bp.route("/admin/posts/new", methods=["GET", "POST"])
def admin_post_create():
    guard = require_scope("posts")
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
    guard = require_scope("posts")
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

@bp.route("/admin/language-tandem")
def admin_language_tandem():
    guard = require_scope("language_tandem")
    if guard:
        return guard

    status = (request.args.get("status") or "all").strip()
    gender = (request.args.get("gender") or "").strip()
    occupation = (request.args.get("occupation") or "").strip()
    country = normalize_country_code(request.args.get("country"))

    items = (
        LanguageTandemRequest.query
        .order_by(LanguageTandemRequest.created_at.desc())
        .all()
    )

    country_labels = get_country_label_map()
    language_labels = get_language_label_map()

    for item in items:
        item.country_of_origin_display = country_labels.get(
            item.country_of_origin,
            item.country_of_origin,
        )
        item.offered_languages_display = format_language_codes(item.offered_languages_list)
        item.requested_languages_display = format_language_codes(item.requested_languages_list)

    filtered_items = items

    if status == "viewed":
        filtered_items = [item for item in filtered_items if item.is_viewed]
    elif status == "unviewed":
        filtered_items = [item for item in filtered_items if not item.is_viewed]

    if gender:
        filtered_items = [item for item in filtered_items if item.gender == gender]

    if occupation:
        filtered_items = [item for item in filtered_items if item.occupation == occupation]

    if country:
        filtered_items = [item for item in filtered_items if item.country_of_origin == country]

    gender_counter = Counter(item.gender for item in filtered_items if item.gender)
    occupation_counter = Counter(item.occupation for item in filtered_items if item.occupation)
    country_counter = Counter(item.country_of_origin for item in filtered_items if item.country_of_origin)

    offered_language_counter = Counter()
    requested_language_counter = Counter()

    for item in filtered_items:
        offered_language_counter.update(set(item.offered_languages_list))
        requested_language_counter.update(set(item.requested_languages_list))

    stats = {
        "total_requests": len(items),
        "unviewed_requests": sum(1 for item in items if not item.is_viewed),
        "viewed_requests": sum(1 for item in items if item.is_viewed),
        "filtered_requests": len(filtered_items),
    }

    available_genders = sorted({item.gender for item in items if item.gender})
    available_occupations = sorted({item.occupation for item in items if item.occupation})
    available_country_codes = sorted(
        {item.country_of_origin for item in items if item.country_of_origin},
        key=lambda code: country_labels.get(code, code),
    )

    filters = {
        "status": status,
        "gender": gender,
        "occupation": occupation,
        "country": country,
    }

    filter_options = {
        "genders": available_genders,
        "occupations": available_occupations,
        "countries": [
            {"code": code, "label": country_labels.get(code, code)}
            for code in available_country_codes
        ],
    }

    breakdowns = {
        "genders": build_counter_rows(gender_counter),
        "occupations": build_counter_rows(occupation_counter),
        "countries": build_counter_rows(country_counter, label_map=country_labels),
        "offered_languages": build_counter_rows(offered_language_counter, label_map=language_labels),
        "requested_languages": build_counter_rows(requested_language_counter, label_map=language_labels),
    }

    return render_template(
        "admin_language_tandem.html",
        stats=stats,
        items=filtered_items,
        filters=filters,
        filter_options=filter_options,
        breakdowns=breakdowns,
    )

@bp.route("/admin/language-tandem/<int:request_id>/toggle-viewed", methods=["POST"])
def admin_language_tandem_toggle_viewed(request_id):
    guard = require_scope("language_tandem")
    if guard:
        return guard

    item = LanguageTandemRequest.query.get_or_404(request_id)
    item.is_viewed = not item.is_viewed
    db.session.commit()

    return_to = (request.form.get("return_to") or "").strip()
    if return_to.startswith("/admin/language-tandem"):
        return redirect(return_to)

    return redirect(url_for("main.admin_language_tandem"))

@bp.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for("main.index"))


