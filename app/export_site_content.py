"""Emit a static snapshot of site_content for the no-Python demo build.

Run after editing app/site_content.py:  python -m app.export_site_content
"""
import json
import os

from app.api.public import SUPPORTED_LOCALES, serialize_content, serialize_site
from app.site_content import SITE_PAGES

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "frontend", "src", "content", "site.generated.json",
)


def build_site_snapshot():
    snapshot = {}
    for locale in sorted(SUPPORTED_LOCALES):
        site = serialize_site(locale)
        pages = {}
        for key in SITE_PAGES["en"]:
            slug = key.replace("_", "-")
            pages[key] = serialize_content(slug, locale)
        snapshot[locale] = {
            "strings": site["strings"],
            "nav": site["nav"],
            "offers": site["offers"],
            "footer": site["footer"],
            "pages": pages,
        }
    return snapshot


def main():
    snapshot = build_site_snapshot()
    with open(OUTPUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(snapshot, fh, ensure_ascii=False, indent=2, sort_keys=True)
        fh.write("\n")
    print(f"wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
