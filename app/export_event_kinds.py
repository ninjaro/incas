"""Emit a static snapshot of the event-kind registry for the frontend and the
no-Python demo build. Run after editing app/event_kinds.py:
    python -m app.export_event_kinds
"""
import json
import os

from app.event_kinds import EVENT_KINDS

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "frontend", "src", "content", "event-kinds.generated.json",
)


def build_event_kinds_snapshot():
    return EVENT_KINDS


def main():
    with open(OUTPUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(build_event_kinds_snapshot(), fh, ensure_ascii=False, indent=2, sort_keys=True)
        fh.write("\n")
    print(f"wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
