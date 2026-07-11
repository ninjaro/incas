# Event-Kind Registry (A1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the five scattered per-event-kind metadata sources into one canonical Python registry, mirrored to committed TypeScript via a generator + sync test, with the existing accessors refactored into behavior-preserving adapters.

**Architecture:** A pure-data `app/event_kinds.py` becomes the single source. `event_kind_meta()` (in `app/__init__.py`) and `EVENT_TITLE_PREFIXES`/`TITLE_HIGHLIGHT_KINDS` (in `app/models.py`) are refactored to derive from it, with a transitional `_LEGACY_BADGE` table preserving exact Bootstrap markup. A generator emits a committed `event-kinds.generated.json` the frontend imports through a typed `frontend/src/domain/eventKinds.ts`; a sync test guards drift.

**Tech Stack:** Flask/Python 3.11 + pytest; React + TypeScript + vitest.

## Global Constraints

- Event-kind metadata has ONE source of truth (`app/event_kinds.py`); legacy accessors read from it — no second registry without a synchronization test.
- `frontend/src/content/event-kinds.generated.json` is committed and must equal a fresh `python -m app.export_event_kinds`.
- Existing Jinja/admin behavior is preserved exactly — parity-locked by tests (`event_kind_meta`, `EVENT_TITLE_PREFIXES`, `TITLE_HIGHLIGHT_KINDS` return today's values for all 8 kinds).
- Icons are explicit string ids (rendered as SVG by A3 later) — NOT the Bootstrap-Icons runtime.
- `marker` ∈ {accent, info, ok, warn, bad, muted, ink}; `mapMode` ∈ {none, venue, country, destination}; `features` ⊆ {registration, deposit, map, karaoke_queue}.
- Weekday encoding: Monday=0 … Sunday=6 (Tuesday=1, Saturday=5).
- `app/event_kinds.py` is pure data — no imports from `app` (avoids import cycles).
- Backend tests: `DATABASE_URL="sqlite://" .venv/bin/python -m pytest tests/ -q` (bare `python` is not on PATH; the venv's `python` is 3.11). Frontend: `npx vitest run`; typecheck `npm run typecheck`.
- JSON emit conventions (match `app/export_site_content.py`): `json.dump(..., ensure_ascii=False, indent=2, sort_keys=True)` + trailing newline.

---

## File Structure

- `app/event_kinds.py` — new; canonical `EVENT_KINDS` dict + `get_event_kind`, `event_kind_ids`.
- `app/__init__.py` — modify `event_kind_meta()` into a registry+`_LEGACY_BADGE` adapter.
- `app/models.py` — modify `EVENT_TITLE_PREFIXES`/`TITLE_HIGHLIGHT_KINDS` to derive from the registry.
- `app/export_event_kinds.py` — new; generator CLI.
- `frontend/src/content/event-kinds.generated.json` — new; committed snapshot.
- `frontend/src/domain/eventKinds.ts` — new; typed frontend accessor.
- `tests/test_event_kinds.py` — new; registry validity + adapter parity + snapshot sync.
- `frontend/src/domain/eventKinds.test.ts` — new; frontend accessor.

---

## Task 1: Canonical registry module

**Files:**
- Create: `app/event_kinds.py`
- Test: `tests/test_event_kinds.py`

**Interfaces:**
- Produces: `EVENT_KINDS: dict[str, dict]`; `get_event_kind(kind_id) -> dict | None`; `event_kind_ids() -> list[str]`. Each kind dict has keys `id, label{en,de}, icon, marker, titlePrefix({en,de}|None), highlightTitle, schedule({weekday,time}|None), mapMode, features(list), registrationDefault, depositDefault`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_event_kinds.py`:

```python
from app.event_kinds import EVENT_KINDS, event_kind_ids, get_event_kind

REQUIRED_KEYS = {
    "id", "label", "icon", "marker", "titlePrefix", "highlightTitle",
    "schedule", "mapMode", "features", "registrationDefault", "depositDefault",
}
MARKERS = {"accent", "info", "ok", "warn", "bad", "muted", "ink"}
MAP_MODES = {"none", "venue", "country", "destination"}
FEATURES = {"registration", "deposit", "map", "karaoke_queue"}


def test_registry_covers_the_eight_kinds():
    assert set(event_kind_ids()) == {
        "country_evening", "cafe_lingua", "board_games", "karaoke",
        "dance", "breakfast", "trip", "housing",
    }


def test_every_kind_has_valid_shape():
    for kind_id, kind in EVENT_KINDS.items():
        assert kind["id"] == kind_id
        assert set(kind) == REQUIRED_KEYS
        assert set(kind["label"]) == {"en", "de"}
        assert kind["marker"] in MARKERS
        assert kind["mapMode"] in MAP_MODES
        assert set(kind["features"]) <= FEATURES
        assert kind["titlePrefix"] is None or set(kind["titlePrefix"]) == {"en", "de"}
        assert kind["schedule"] is None or set(kind["schedule"]) == {"weekday", "time"}


def test_get_event_kind_unknown_returns_none():
    assert get_event_kind("does_not_exist") is None
    assert get_event_kind("breakfast")["label"]["de"] == "Internationales Frühstück"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL="sqlite://" .venv/bin/python -m pytest tests/test_event_kinds.py -q`
Expected: FAIL (module `app.event_kinds` not found).

- [ ] **Step 3: Write the registry**

Create `app/event_kinds.py`:

```python
"""Canonical per-event-kind metadata. Single source of truth consolidating what
used to live in app/__init__.py, app/models.py, app/site_content.py, and
app/demo_seed.py. Pure data — do not import from `app` (avoids import cycles).

Weekday: Monday=0 … Sunday=6. `marker` is a semantic token mapped to a CSS
variable by the React EventIcon/EventMarker components (A3). `schedule` and the
`*Default` flags are default patterns/hints; real per-event values live on Post.
"""

EVENT_KINDS = {
    "country_evening": {
        "id": "country_evening",
        "label": {"en": "Country Evening", "de": "Länderabend"},
        "icon": "globe",
        "marker": "bad",
        "titlePrefix": {"en": "Country Evening", "de": "Länderabend"},
        "highlightTitle": True,
        "schedule": {"weekday": 1, "time": "20:00"},
        "mapMode": "country",
        "features": ["map"],
        "registrationDefault": False,
        "depositDefault": False,
    },
    "cafe_lingua": {
        "id": "cafe_lingua",
        "label": {"en": "Café Lingua", "de": "Café Lingua"},
        "icon": "chat",
        "marker": "accent",
        "titlePrefix": None,
        "highlightTitle": False,
        "schedule": {"weekday": 1, "time": "20:00"},
        "mapMode": "venue",
        "features": ["map"],
        "registrationDefault": False,
        "depositDefault": False,
    },
    "board_games": {
        "id": "board_games",
        "label": {"en": "Board Games", "de": "Brettspielabende"},
        "icon": "dice",
        "marker": "ok",
        "titlePrefix": None,
        "highlightTitle": False,
        "schedule": {"weekday": 1, "time": "20:00"},
        "mapMode": "venue",
        "features": ["map"],
        "registrationDefault": False,
        "depositDefault": False,
    },
    "karaoke": {
        "id": "karaoke",
        "label": {"en": "Karaoke", "de": "Karaoke"},
        "icon": "mic",
        "marker": "warn",
        "titlePrefix": None,
        "highlightTitle": False,
        "schedule": {"weekday": 1, "time": "20:00"},
        "mapMode": "venue",
        "features": ["karaoke_queue", "map"],
        "registrationDefault": False,
        "depositDefault": False,
    },
    "dance": {
        "id": "dance",
        "label": {"en": "Dance Workshops", "de": "Tanzworkshops"},
        "icon": "music",
        "marker": "info",
        "titlePrefix": None,
        "highlightTitle": False,
        "schedule": {"weekday": 1, "time": "20:00"},
        "mapMode": "venue",
        "features": ["map"],
        "registrationDefault": False,
        "depositDefault": False,
    },
    "breakfast": {
        "id": "breakfast",
        "label": {"en": "International Breakfast", "de": "Internationales Frühstück"},
        "icon": "egg",
        "marker": "muted",
        "titlePrefix": {"en": "International Breakfast", "de": "Internationales Frühstück"},
        "highlightTitle": True,
        "schedule": {"weekday": 5, "time": "10:00"},
        "mapMode": "venue",
        "features": ["registration", "deposit", "map"],
        "registrationDefault": True,
        "depositDefault": True,
    },
    "trip": {
        "id": "trip",
        "label": {"en": "International Weekend", "de": "Internationales Wochenende"},
        "icon": "signpost",
        "marker": "ink",
        "titlePrefix": {"en": "International Weekend", "de": "Internationales Wochenende"},
        "highlightTitle": False,
        "schedule": {"weekday": 5, "time": "09:00"},
        "mapMode": "destination",
        "features": ["registration", "map"],
        "registrationDefault": True,
        "depositDefault": False,
    },
    "housing": {
        "id": "housing",
        "label": {"en": "Housing", "de": "Wohnen"},
        "icon": "house",
        "marker": "muted",
        "titlePrefix": None,
        "highlightTitle": False,
        "schedule": None,
        "mapMode": "none",
        "features": [],
        "registrationDefault": False,
        "depositDefault": False,
    },
}


def get_event_kind(kind_id):
    return EVENT_KINDS.get(kind_id)


def event_kind_ids():
    return list(EVENT_KINDS.keys())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `DATABASE_URL="sqlite://" .venv/bin/python -m pytest tests/test_event_kinds.py -q`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/event_kinds.py tests/test_event_kinds.py
git commit -m "feat: add canonical event-kind registry

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Refactor legacy accessors into registry-backed adapters

**Files:**
- Modify: `app/__init__.py` (function `event_kind_meta`, ~lines 21-31)
- Modify: `app/models.py` (`EVENT_TITLE_PREFIXES` ~line 11, `TITLE_HIGHLIGHT_KINDS` ~line 46)
- Test: `tests/test_event_kinds.py` (append)

**Interfaces:**
- Consumes: `app.event_kinds.EVENT_KINDS`, `get_event_kind`.
- Produces: unchanged public signatures — `event_kind_meta(kind) -> {"label","badge","color"} | None`; module-level `EVENT_TITLE_PREFIXES: dict[str,str]`, `TITLE_HIGHLIGHT_KINDS: set[str]`.

- [ ] **Step 1: Write the failing parity test**

Append to `tests/test_event_kinds.py`:

```python
def test_event_kind_meta_parity():
    from app import event_kind_meta

    expected = {
        "karaoke": {"label": "Karaoke", "badge": "text-bg-warning", "color": "warning"},
        "country_evening": {"label": "Country Evening", "badge": "text-bg-danger", "color": "danger"},
        "board_games": {"label": "Board Games", "badge": "text-bg-success", "color": "success"},
        "cafe_lingua": {"label": "Café Lingua", "badge": "text-bg-primary", "color": "primary"},
        "dance": {"label": "Dance Workshops", "badge": "text-bg-info", "color": "info"},
        "breakfast": {"label": "International Breakfast", "badge": "text-bg-secondary", "color": "secondary"},
        "trip": {"label": "International Weekend", "badge": "text-bg-dark", "color": "dark"},
        "housing": {"label": "Housing", "badge": "text-bg-light", "color": "secondary"},
    }
    for kind, meta in expected.items():
        assert event_kind_meta(kind) == meta, kind
    assert event_kind_meta("nope") is None


def test_title_prefix_parity():
    from app.models import EVENT_TITLE_PREFIXES, TITLE_HIGHLIGHT_KINDS

    assert EVENT_TITLE_PREFIXES == {
        "country_evening": "Country Evening",
        "breakfast": "International Breakfast",
        "trip": "International Weekend",
    }
    assert TITLE_HIGHLIGHT_KINDS == {"country_evening", "breakfast"}
```

- [ ] **Step 2: Run test to verify it fails or passes-by-accident**

Run: `DATABASE_URL="sqlite://" .venv/bin/python -m pytest tests/test_event_kinds.py -k parity -q`
Expected: PASS currently (the legacy hardcoded values already match). This test is a *regression lock*: it must still pass after Step 3's refactor. Proceed to Step 3 and re-run.

- [ ] **Step 3: Refactor the adapters**

In `app/__init__.py`, replace the `event_kind_meta` function (the inline `mapping` dict version) with a registry-backed adapter. Add the import near the top of the file (alongside `from config import Config`):

```python
from app.event_kinds import get_event_kind

# Transitional Bootstrap display values for the legacy Jinja UI. badge/color
# are not a clean function of the registry `marker` (housing is text-bg-light
# but color secondary), so they are kept here, in the one legacy consumer, and
# deleted when the Jinja UI is removed (Phase D). The canonical registry stays
# clean with only `marker`.
_LEGACY_BADGE = {
    "karaoke": ("text-bg-warning", "warning"),
    "country_evening": ("text-bg-danger", "danger"),
    "board_games": ("text-bg-success", "success"),
    "cafe_lingua": ("text-bg-primary", "primary"),
    "dance": ("text-bg-info", "info"),
    "breakfast": ("text-bg-secondary", "secondary"),
    "trip": ("text-bg-dark", "dark"),
    "housing": ("text-bg-light", "secondary"),
}


def event_kind_meta(kind):
    ek = get_event_kind(kind)
    badge_color = _LEGACY_BADGE.get(kind)
    if ek is None or badge_color is None:
        return None
    badge, color = badge_color
    return {"label": ek["label"]["en"], "badge": badge, "color": color}
```

In `app/models.py`, add near the top imports (after the existing `from datetime import ...` / db imports):

```python
from app.event_kinds import EVENT_KINDS
```

Then replace the hardcoded `EVENT_TITLE_PREFIXES` dict and `TITLE_HIGHLIGHT_KINDS` set with derived versions (keep `EVENT_TITLE_SUFFIX_OVERRIDES` and `DANCE_TITLE_ALIASES` exactly as they are — those are per-title, not per-kind):

```python
EVENT_TITLE_PREFIXES = {
    kind_id: kind["titlePrefix"]["en"]
    for kind_id, kind in EVENT_KINDS.items()
    if kind["titlePrefix"] is not None
}

TITLE_HIGHLIGHT_KINDS = {
    kind_id for kind_id, kind in EVENT_KINDS.items() if kind["highlightTitle"]
}
```

Note: `from app.event_kinds import EVENT_KINDS` is safe — `app/event_kinds.py` imports nothing from `app`, so there is no cycle even though `models.py` is imported early during app init.

- [ ] **Step 4: Run the parity test and the full backend suite**

Run:
```bash
DATABASE_URL="sqlite://" .venv/bin/python -m pytest tests/ -q
```
Expected: all pass (previously 32 + the new event-kind tests), including both parity tests. If any existing test that uses `event_kind_meta` or the title functions fails, the refactor changed behavior — fix to restore parity.

- [ ] **Step 5: Commit**

```bash
git add app/__init__.py app/models.py tests/test_event_kinds.py
git commit -m "refactor: derive event_kind_meta and title prefixes from registry

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Generator + committed snapshot + sync test

**Files:**
- Create: `app/export_event_kinds.py`
- Create: `frontend/src/content/event-kinds.generated.json`
- Test: `tests/test_event_kinds.py` (append)

**Interfaces:**
- Produces: `build_event_kinds_snapshot() -> dict` (returns `EVENT_KINDS`); `OUTPUT_PATH`; `python -m app.export_event_kinds` writes the committed JSON.

- [ ] **Step 1: Write the failing sync test**

Append to `tests/test_event_kinds.py`:

```python
import json
import os


def test_committed_snapshot_is_in_sync():
    from app.export_event_kinds import OUTPUT_PATH, build_event_kinds_snapshot

    assert os.path.exists(OUTPUT_PATH), "run: python -m app.export_event_kinds"
    with open(OUTPUT_PATH, encoding="utf-8") as fh:
        on_disk = json.load(fh)
    assert on_disk == build_event_kinds_snapshot(), (
        "event-kinds.generated.json is stale; run python -m app.export_event_kinds"
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL="sqlite://" .venv/bin/python -m pytest tests/test_event_kinds.py::test_committed_snapshot_is_in_sync -q`
Expected: FAIL (module `app.export_event_kinds` not found).

- [ ] **Step 3: Write the generator**

Create `app/export_event_kinds.py`:

```python
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
```

- [ ] **Step 4: Generate the snapshot and verify the test passes**

Run:
```bash
DATABASE_URL="sqlite://" .venv/bin/python -m app.export_event_kinds
DATABASE_URL="sqlite://" .venv/bin/python -m pytest tests/test_event_kinds.py -q
```
Expected: writes `frontend/src/content/event-kinds.generated.json`; all event-kind tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/export_event_kinds.py frontend/src/content/event-kinds.generated.json tests/test_event_kinds.py
git commit -m "feat: add event-kind export generator and committed snapshot

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Frontend typed accessor

**Files:**
- Create: `frontend/src/domain/eventKinds.ts`
- Test: `frontend/src/domain/eventKinds.test.ts`

**Interfaces:**
- Consumes: `frontend/src/content/event-kinds.generated.json`.
- Produces: `EventKind` type; `EVENT_KINDS: Record<string, EventKind>`; `getEventKind(id: string): EventKind | undefined`; exported `EventKindMarker`, `EventKindMapMode` unions.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/domain/eventKinds.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { EVENT_KINDS, getEventKind } from "./eventKinds";

describe("eventKinds", () => {
  it("exposes all eight kinds with both locale labels", () => {
    expect(Object.keys(EVENT_KINDS).sort()).toEqual(
      [
        "board_games", "breakfast", "cafe_lingua", "country_evening",
        "dance", "housing", "karaoke", "trip",
      ],
    );
    expect(EVENT_KINDS.breakfast.label.de).toBe("Internationales Frühstück");
  });

  it("getEventKind returns the kind or undefined", () => {
    expect(getEventKind("trip")?.mapMode).toBe("destination");
    expect(getEventKind("nope")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/eventKinds.test.ts`
Expected: FAIL (module `./eventKinds` not found).

- [ ] **Step 3: Write the accessor**

Create `frontend/src/domain/eventKinds.ts`:

```typescript
import snapshot from "../content/event-kinds.generated.json";

export type EventKindMarker = "accent" | "info" | "ok" | "warn" | "bad" | "muted" | "ink";
export type EventKindMapMode = "none" | "venue" | "country" | "destination";
export type EventKindFeature = "registration" | "deposit" | "map" | "karaoke_queue";

export interface EventKind {
  id: string;
  label: { en: string; de: string };
  icon: string;
  marker: EventKindMarker;
  titlePrefix: { en: string; de: string } | null;
  highlightTitle: boolean;
  schedule: { weekday: number; time: string } | null;
  mapMode: EventKindMapMode;
  features: EventKindFeature[];
  registrationDefault: boolean;
  depositDefault: boolean;
}

export const EVENT_KINDS = snapshot as unknown as Record<string, EventKind>;

export function getEventKind(id: string): EventKind | undefined {
  return EVENT_KINDS[id];
}
```

- [ ] **Step 4: Run the test and typecheck**

Run:
```bash
npx vitest run src/domain/eventKinds.test.ts
npm run typecheck
```
Expected: both PASS. (`resolveJsonModule` is already enabled in `tsconfig.json` from Slice 1.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/domain/eventKinds.ts frontend/src/domain/eventKinds.test.ts
git commit -m "feat(frontend): typed event-kind registry accessor

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** registry module + shape (Task 1); consolidation of the 4 legacy accessors into registry-backed adapters with parity locks (Task 2); generator + committed snapshot + sync test (Task 3); frontend typed accessor (Task 4). Covers the A1 acceptance (one source, Python↔TS sync test, no behavior change). ✓
- **Out of scope confirmed:** no new event API fields, no SVG components, no fixture changes, no Alembic — those are A2–A5.
- **Type consistency:** `EventKind` fields in Task 4 match the Python dict keys emitted in Task 1/3 (`titlePrefix`, `highlightTitle`, `mapMode`, `registrationDefault`, `depositDefault`). `marker`/`mapMode`/`features` enums match the Global Constraints.
- **Parity risk:** Task 2 Step 4 runs the full suite so any hidden consumer of `event_kind_meta`/title constants that breaks is caught. The parity tests hardcode today's exact 8 values.
