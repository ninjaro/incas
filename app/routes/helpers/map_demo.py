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

MAP_DEMO_EVENTS = [
    {
        "id": "country-evening-poland",
        "title": "Country Evening: Poland",
        "summary": "Direct single-country target with a clean ISO mapping and a regional Europe-context viewport.",
        "target": {
            "kind": "country",
            "label": "Poland",
            "country_name": "Poland",
            "country_codes": ["PL"],
            "center": [18.8, 52.1],
            "view": {
                "zoom": 2.35,
            },
            "mapping_note": (
                "Single-country mapping using ISO 3166-1 alpha-2 code PL, centered on the country "
                "with a regional zoom so nearby countries remain visible."
            ),
        },
    },
    {
        "id": "international-breakfast-turkey",
        "title": "International Breakfast: Turkish cuisine",
        "summary": "Cuisine-focused title, but still cleanly representable as Turkey with surrounding countries kept in view.",
        "target": {
            "kind": "country",
            "label": "Turkey",
            "country_name": "Turkey",
            "country_codes": ["TR"],
            "center": [35.1, 39.0],
            "view": {
                "zoom": 2.0,
            },
            "mapping_note": (
                "Cuisine term resolved to the country Turkey for the demo because the title names a nationally "
                "specific cuisine, using a regional zoom instead of a tight country fit."
            ),
        },
    },
    {
        "id": "international-weekend-luxembourg",
        "title": "International Weekend: Luxembourg City",
        "summary": "City-trip example with Aachen as the origin, Luxembourg City as the target, and a visual line between both points.",
        "target": {
            "kind": "trip",
            "label": "Aachen to Luxembourg City",
            "center": [6.07, 50.24],
            "view": {
                "zoom": 4.2,
            },
            "origin": {
                "name": "Aachen",
                "coordinates": [6.0839, 50.7753],
            },
            "destination": {
                "name": "Luxembourg City",
                "coordinates": [6.1319, 49.6116],
            },
            "mapping_note": (
                "Trip events should focus on the destination city and show travel context. "
                "This demo uses Aachen as the starting point, Luxembourg City as the target, "
                "and a regional viewport that includes both without highlighting the whole country."
            ),
        },
    },
    {
        "id": "international-breakfast-arab-culture",
        "title": "International Breakfast: Arab culture",
        "summary": "Broad cultural labels are only map-safe if they resolve to an explicit editorial country set instead of an implied single state.",
        "target": {
            "kind": "country_group",
            "label": "Arabic-speaking countries",
            "country_codes": ARABIC_SPEAKING_COUNTRY_CODES,
            "center": [21.0, 25.0],
            "view": {
                "zoom": 1.55,
            },
            "mapping_note": (
                "This demo treats 'Arab culture' as an explicit editorial grouping of Arabic-speaking countries. "
                "If production content cannot choose a specific region model like this, the label should be rejected "
                "instead of forcing a misleading country highlight."
            ),
        },
    },
]

MAP_DEMO_PROVIDERS = [
    {
        "id": "amcharts-maps",
        "name": "amCharts Maps",
        "runtime": "amCharts 5 + geodata",
        "description": "World map with smooth zooming, bundled geodata, and support for point and line series in the same scene.",
        "docs_url": "https://www.amcharts.com/docs/v5/charts/map-chart/",
        "license_url": "https://www.amcharts.com/",
        "usage_note": "amCharts allows free use, including commercial use, with a small backlink. Removing branding requires a paid license.",
    },
]


def get_event_map_demo_context():
    return {
        "demo_events": MAP_DEMO_EVENTS,
        "demo_providers": MAP_DEMO_PROVIDERS,
        "demo_checked_on": "2026-05-01",
    }
