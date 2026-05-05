from __future__ import annotations

import re

import pycountry

from app.models import normalize_event_title_suffix

AACHEN_POINT = {
    "name": "Aachen",
    "coordinates": [6.0839, 50.7753],
}

ARABIC_SPEAKING_COUNTRY_CODES = [
    "DZ",
    "BH",
    "KM",
    "DJ",
    "EG",
    "IQ",
    "JO",
    "KW",
    "LB",
    "LY",
    "MR",
    "MA",
    "OM",
    "QA",
    "SA",
    "SO",
    "SD",
    "SY",
    "TN",
    "AE",
    "YE",
]

NORTH_AMERICAN_COUNTRY_CODES = [
    "CA",
    "MX",
    "US",
]

LATIN_AMERICAN_COUNTRY_CODES = [
    "AR",
    "BO",
    "BR",
    "CL",
    "CO",
    "CR",
    "CU",
    "DO",
    "EC",
    "GT",
    "HN",
    "MX",
    "NI",
    "PA",
    "PE",
    "PY",
    "SV",
    "UY",
    "VE",
]

COUNTRY_VIEW_OVERRIDES = {
    "PL": {"center": [18.8, 52.1], "zoom": 2.35},
    "TR": {"center": [35.1, 39.0], "zoom": 2.0},
    "DE": {"center": [10.4, 51.1], "zoom": 2.25},
    "ES": {"center": [-3.7, 40.3], "zoom": 2.15},
    "JP": {"center": [138.2, 37.7], "zoom": 2.05},
    "BR": {"center": [-52.8, -10.0], "zoom": 1.7},
    "IT": {"center": [12.6, 42.8], "zoom": 2.35},
    "MX": {"center": [-102.5, 23.9], "zoom": 1.85},
}

TRIP_DESTINATIONS = {
    "maastricht, netherlands": {
        "name": "Maastricht",
        "coordinates": [5.6900, 50.8514],
        "center": [5.89, 50.81],
        "zoom": 7.0,
    },
    "maastricht": {
        "name": "Maastricht",
        "coordinates": [5.6900, 50.8514],
        "center": [5.89, 50.81],
        "zoom": 7.0,
    },
    "cologne, germany": {
        "name": "Cologne",
        "coordinates": [6.9603, 50.9375],
        "center": [6.52, 50.86],
        "zoom": 7.0,
    },
    "cologne": {
        "name": "Cologne",
        "coordinates": [6.9603, 50.9375],
        "center": [6.52, 50.86],
        "zoom": 7.0,
    },
    "mons, belgium": {
        "name": "Mons",
        "coordinates": [3.9523, 50.4542],
        "center": [5.02, 50.61],
        "zoom": 6.45,
    },
    "mons": {
        "name": "Mons",
        "coordinates": [3.9523, 50.4542],
        "center": [5.02, 50.61],
        "zoom": 6.45,
    },
    "bonn, germany": {
        "name": "Bonn",
        "coordinates": [7.0982, 50.7374],
        "center": [6.59, 50.76],
        "zoom": 7.2,
    },
    "bonn": {
        "name": "Bonn",
        "coordinates": [7.0982, 50.7374],
        "center": [6.59, 50.76],
        "zoom": 7.2,
    },
    "liège, belgium": {
        "name": "Liège",
        "coordinates": [5.5797, 50.6326],
        "center": [5.83, 50.7],
        "zoom": 7.15,
    },
    "liege, belgium": {
        "name": "Liège",
        "coordinates": [5.5797, 50.6326],
        "center": [5.83, 50.7],
        "zoom": 7.15,
    },
    "liège": {
        "name": "Liège",
        "coordinates": [5.5797, 50.6326],
        "center": [5.83, 50.7],
        "zoom": 7.15,
    },
    "liege": {
        "name": "Liège",
        "coordinates": [5.5797, 50.6326],
        "center": [5.83, 50.7],
        "zoom": 7.15,
    },
    "drachenfels, germany": {
        "name": "Drachenfels",
        "coordinates": [7.2114, 50.6678],
        "center": [6.65, 50.73],
        "zoom": 6.95,
    },
    "drachenfels": {
        "name": "Drachenfels",
        "coordinates": [7.2114, 50.6678],
        "center": [6.65, 50.73],
        "zoom": 6.95,
    },
    "luxembourg city, luxembourg": {
        "name": "Luxembourg City",
        "coordinates": [6.1319, 49.6116],
        "center": [6.07, 50.24],
        "zoom": 4.2,
    },
    "luxembourg, luxembourg": {
        "name": "Luxembourg City",
        "coordinates": [6.1319, 49.6116],
        "center": [6.07, 50.24],
        "zoom": 4.2,
    },
    "luxembourg city": {
        "name": "Luxembourg City",
        "coordinates": [6.1319, 49.6116],
        "center": [6.07, 50.24],
        "zoom": 4.2,
    },
    "luxembourg": {
        "name": "Luxembourg City",
        "coordinates": [6.1319, 49.6116],
        "center": [6.07, 50.24],
        "zoom": 4.2,
    },
}

COUNTRY_CODE_ALIASES = {
    "turkey": "TR",
    "uk": "GB",
    "usa": "US",
    "u.s.a.": "US",
    "uae": "AE",
}

BREAKFAST_LABEL_ALIASES = {
    "turkish cuisine": "Turkey",
    "turkish breakfast table": "Turkey",
    "waffle breakfast": "Belgium",
}

BREAKFAST_GROUP_MAPPINGS = {
    "arab culture": {
        "label": "Arabic-speaking countries",
        "country_codes": ARABIC_SPEAKING_COUNTRY_CODES,
        "center": [21.0, 25.0],
        "zoom": 1.55,
    },
    "north american culture": {
        "label": "North America",
        "country_codes": NORTH_AMERICAN_COUNTRY_CODES,
        "center": [-101.0, 45.0],
        "zoom": 1.55,
    },
    "latin american culture": {
        "label": "Latin America",
        "country_codes": LATIN_AMERICAN_COUNTRY_CODES,
        "center": [-70.0, -4.0],
        "zoom": 1.25,
    },
}

OPENING_CEREMONY_RE = re.compile(r"\bopening ceremony\b", re.IGNORECASE)


def normalize_lookup_key(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().casefold())


def resolve_country_code(country_name: str) -> str | None:
    raw_name = (country_name or "").strip()
    if not raw_name:
        return None

    alias = COUNTRY_CODE_ALIASES.get(normalize_lookup_key(raw_name))
    if alias:
        return alias

    try:
        return pycountry.countries.lookup(raw_name).alpha_2
    except LookupError:
        return None


def build_country_evening_map_context(post):
    if post.event_kind != "country_evening":
        return None

    country_name = normalize_event_title_suffix(post.event_kind, post.title)
    country_code = resolve_country_code(country_name)
    if not country_code:
        return None

    view = COUNTRY_VIEW_OVERRIDES.get(country_code, {"center": [15.0, 30.0], "zoom": 1.55})
    return {
        "provider_id": "amcharts-maps",
        "provider_name": "amCharts 5 + geodata",
        "title": "Country Focus",
        "description": f"{country_name} highlighted in orange with world-context geography.",
        "note": "This map uses amCharts geodata to highlight the represented country without losing regional context.",
        "target": {
            "kind": "country",
            "country_name": country_name,
            "country_codes": [country_code],
            "center": view["center"],
            "zoom": view["zoom"],
        },
    }


def build_breakfast_map_context(post):
    if post.event_kind != "breakfast":
        return None

    raw_label = normalize_event_title_suffix(post.event_kind, post.title)
    lookup_key = normalize_lookup_key(raw_label)

    region_target = BREAKFAST_GROUP_MAPPINGS.get(lookup_key)
    if region_target is not None:
        return {
            "provider_id": "amcharts-maps",
            "provider_name": "amCharts 5 + geodata",
            "title": "Culture Region",
            "description": f"{region_target['label']} highlighted in orange as the editorial region model for this breakfast.",
            "note": "This breakfast map uses an explicit editorial country group instead of forcing a misleading single-country interpretation.",
            "target": {
                "kind": "country_group",
                "label": region_target["label"],
                "country_codes": region_target["country_codes"],
                "center": region_target["center"],
                "zoom": region_target["zoom"],
            },
        }

    country_name = BREAKFAST_LABEL_ALIASES.get(lookup_key, raw_label)
    country_code = resolve_country_code(country_name)
    if not country_code:
        return None

    view = COUNTRY_VIEW_OVERRIDES.get(country_code, {"center": [15.0, 30.0], "zoom": 1.55})
    return {
        "provider_id": "amcharts-maps",
        "provider_name": "amCharts 5 + geodata",
        "title": "Breakfast Focus",
        "description": f"{country_name} highlighted in orange with regional context for this breakfast event.",
        "note": "This breakfast map uses the represented country when the cuisine or culture label can be resolved cleanly.",
        "target": {
            "kind": "country",
            "country_name": country_name,
            "country_codes": [country_code],
            "center": view["center"],
            "zoom": view["zoom"],
        },
    }


def build_trip_map_context(post):
    if post.event_kind != "trip":
        return None

    destination_label = normalize_event_title_suffix(post.event_kind, post.title)
    destination = TRIP_DESTINATIONS.get(normalize_lookup_key(destination_label))
    if destination is None:
        return None

    return {
        "provider_id": "openlayers",
        "provider_name": "OpenLayers + OSM + TopoJSON",
        "title": "Trip Route",
        "description": f"Aachen as origin, {destination['name']} as destination, with a visual trip line.",
        "note": "This trip map uses OSM tiles for context, TopoJSON country boundaries, and a decorative route line between Aachen and the destination city.",
        "target": {
            "kind": "trip",
            "origin": AACHEN_POINT,
            "destination": {
                "name": destination["name"],
                "coordinates": destination["coordinates"],
            },
            "center": destination["center"],
            "zoom": destination["zoom"],
        },
    }


def build_opening_ceremony_map_context(post):
    title = post.display_title or post.title or ""
    if not OPENING_CEREMONY_RE.search(title):
        return None

    return {
        "provider_id": "amcharts-maps",
        "provider_name": "amCharts 5 + geodata",
        "title": "Opening Location",
        "description": "Aachen highlighted as the host city for the opening ceremony.",
        "note": "This map keeps the opening ceremony anchored to Aachen with a city marker on top of the world geodata layer.",
        "target": {
            "kind": "marker",
            "label": "Aachen",
            "center": [6.0839, 50.7753],
            "zoom": 4.6,
            "marker": AACHEN_POINT,
        },
    }


def build_event_post_map_context(post):
    if not getattr(post, "is_event", False):
        return None

    return (
        build_trip_map_context(post)
        or build_breakfast_map_context(post)
        or build_country_evening_map_context(post)
        or build_opening_ceremony_map_context(post)
    )
