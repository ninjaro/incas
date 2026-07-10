import json
import os

from app.export_site_content import OUTPUT_PATH, build_site_snapshot


def test_snapshot_has_both_locales():
    snap = build_site_snapshot()
    assert set(snap) == {"en", "de"}
    assert snap["en"]["strings"]["nav.home"] == "Home"
    assert "about" in snap["en"]["pages"]
    assert snap["en"]["pages"]["about"]["title"] == "About us"


def test_committed_snapshot_is_in_sync():
    assert os.path.exists(OUTPUT_PATH), "run: python -m app.export_site_content"
    with open(OUTPUT_PATH, encoding="utf-8") as fh:
        on_disk = json.load(fh)
    assert on_disk == build_site_snapshot(), (
        "site.generated.json is stale; run python -m app.export_site_content"
    )
