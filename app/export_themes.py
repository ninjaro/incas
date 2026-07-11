"""Export the canonical Flask theme registry for the static React build."""

import json
from pathlib import Path

from app.themes_registry import serialize_registry


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "src" / "content" / "themes.generated.json"


def build_theme_snapshot():
    return {"pages": serialize_registry()}


def main():
    OUTPUT.write_text(
        json.dumps(build_theme_snapshot(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUTPUT}")


if __name__ == "__main__":
    main()
