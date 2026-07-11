import json

from app.export_themes import OUTPUT, build_theme_snapshot


def test_committed_theme_snapshot_is_in_sync():
    assert json.loads(OUTPUT.read_text(encoding="utf-8")) == build_theme_snapshot(), (
        "themes.generated.json is stale; run python -m app.export_themes"
    )
