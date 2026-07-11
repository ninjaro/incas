"""Write the canonical demo event catalog consumed by the static React app."""

import json
from pathlib import Path

from app.demo_events import build_demo_event_catalog


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "src" / "content" / "demo-events.generated.json"


def build_demo_events_snapshot():
    return build_demo_event_catalog()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(build_demo_events_snapshot(), ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
