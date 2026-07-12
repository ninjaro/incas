"""Central registry of theme-enabled pages and their available themes.

The registry is the single source of truth shared by the public config
endpoint (which resolves the active public theme) and the admin theme panel
(preview, voting, forcing). Adding a theme to a page only requires a new
entry here plus a matching React variant registered under the same ids.
"""

THEME_FORCE_COOLDOWN_HOURS = 24

THEME_PAGES = {
    "landing": {
        "name": "Landing Page",
        "default": "hero",
        "themes": {
            "hero": {
                "name": "Hero",
                "description": "Full-bleed hero with event cards, the current production look.",
                "enabled": True,
                "legacyVariants": ["poster", "showcase", "scroll"],
                "decision": "merged",
            },
            "editorial": {
                "name": "Editorial",
                "description": "Magazine-style layout that leads with the story and reads top to bottom.",
                "enabled": True,
                "legacyVariants": ["magazine", "studio"],
                "decision": "merged",
            },
            "event-first": {
                "name": "Event First",
                "description": "Puts the next events above the fold with a compact intro.",
                "enabled": True,
                "legacyVariants": ["board", "timeline"],
                "decision": "merged",
            },
            "portal": {
                "name": "Portal",
                "description": "Offer-led landing page with concise navigation and upcoming events.",
                "enabled": True,
                "legacyVariants": ["portal", "classic"],
                "decision": "migrated",
            },
        },
    },
    "calendar": {
        "name": "Calendar",
        "default": "month",
        "themes": {
            "month": {
                "name": "Month Grid",
                "description": "Classic month grid with event chips.",
                "enabled": True,
                "legacyVariants": ["classic"],
                "decision": "migrated",
            },
            "public-grid": {
                "name": "Public Month Grid",
                "description": "Large highlighted day cells with accessible event popovers.",
                "enabled": True,
                "legacyVariants": ["grid"],
                "decision": "migrated",
            },
            "agenda": {
                "name": "Agenda",
                "description": "Chronological agenda list, optimized for mobile.",
                "enabled": True,
                "legacyVariants": ["agenda", "bulletin"],
                "decision": "merged",
            },
            "timeline": {
                "name": "Timeline",
                "description": "Vertical timeline grouped by week.",
                "enabled": True,
                "legacyVariants": ["timeline"],
                "decision": "migrated",
            },
            "board": {
                "name": "Board",
                "description": "Asymmetric editorial board with large date blocks and concise event stories.",
                "enabled": True,
                "legacyVariants": ["board"],
                "decision": "migrated",
            },
            "cards": {
                "name": "Cards",
                "description": "Responsive event cards with payment and availability information.",
                "enabled": True,
                "legacyVariants": ["cards"],
                "decision": "migrated",
            },
            "table": {
                "name": "Table",
                "description": "Compact accessible event table.",
                "enabled": True,
                "legacyVariants": ["table", "hardcore"],
                "decision": "merged",
            },
            "mini": {
                "name": "Mini (retired)",
                "description": "Retired because the compact grid duplicated the full month view with weaker mobile behavior.",
                "enabled": False,
                "legacyVariants": ["mini"],
                "decision": "retired",
            },
        },
    },
    "language_tandem": {
        "name": "Language Tandem Form",
        "default": "steps",
        "themes": {
            "steps": {
                "name": "Guided Steps",
                "description": "Multi-step wizard with progress indicator.",
                "enabled": True,
            },
            "classic": {
                "name": "Single Page",
                "description": "One long accessible form, no steps.",
                "enabled": True,
            },
        },
    },
    "team": {
        "name": "Team Page",
        "default": "grid",
        "themes": {
            "grid": {
                "name": "Card Grid",
                "description": "Responsive card grid with photos and roles.",
                "enabled": True,
            },
            "spotlight": {
                "name": "Spotlight",
                "description": "Large alternating rows, one member in focus at a time.",
                "enabled": True,
            },
        },
    },
    "admin_dashboard": {
        "name": "Admin Dashboard",
        "default": "cards",
        "themes": {
            "cards": {
                "name": "Cards",
                "description": "Capability cards with quick stats.",
                "enabled": True,
            },
            "compact": {
                "name": "Compact",
                "description": "Dense utility list for small screens.",
                "enabled": True,
            },
        },
    },
}


def get_page(page_id):
    return THEME_PAGES.get(page_id)


def get_default_theme(page_id):
    page = get_page(page_id)
    return page["default"] if page else None


def is_valid_theme(page_id, theme_id):
    page = get_page(page_id)
    if not page:
        return False
    theme = page["themes"].get(theme_id)
    return bool(theme and theme.get("enabled"))


def resolve_public_theme(page_id, selected_theme_id):
    """An invalid, disabled, or missing selection falls back to the default."""
    if selected_theme_id and is_valid_theme(page_id, selected_theme_id):
        return selected_theme_id
    return get_default_theme(page_id)


def serialize_registry():
    return [
        {
            "pageId": page_id,
            "name": page["name"],
            "defaultTheme": page["default"],
            "themes": [
                {
                    "themeId": theme_id,
                    "name": theme["name"],
                    "description": theme["description"],
                    "enabled": theme["enabled"],
                    "isDefault": theme_id == page["default"],
                    "legacyVariants": theme.get("legacyVariants", []),
                    "decision": theme.get("decision", "migrated"),
                }
                for theme_id, theme in page["themes"].items()
            ],
        }
        for page_id, page in THEME_PAGES.items()
    ]
