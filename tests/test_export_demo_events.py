import json

from app.export_demo_events import OUTPUT, build_demo_events_snapshot


def test_committed_demo_event_snapshot_is_in_sync():
    assert json.loads(OUTPUT.read_text(encoding="utf-8")) == build_demo_events_snapshot(), (
        "demo-events.generated.json is stale; run python -m app.export_demo_events"
    )
