# A1 — Canonical Event-Kind Registry (design)

Part of Phase A ("Contracts and shared primitives") of the full migration in
`final_fixes.md` (§2 registry). Phase A is decomposed into A1 registry (this
doc), A2 expanded event API, A3 shared event components, A4 canonical
fixtures/seed, A5 Alembic migrations. A1 is the first domino — A2/A3/A4 read
from it.

Baseline: `1a3b4da` (branch `react`, after Slice 1 Public Foundation).

## Goal

Replace the five scattered per-kind metadata sources with one canonical Python
registry, mirrored to committed TypeScript via a generator + sync test (the
proven `site.generated.json` pattern from Slice 1). Existing per-kind accessors
become thin adapters that derive from the registry — one source, no duplication,
behavior preserved.

## Current scattered sources (consolidated by A1)

- `app/__init__.py` `event_kind_meta(kind)` — `{label, badge, color}` for 8 kinds.
- `app/models.py` `EVENT_TITLE_PREFIXES`, `TITLE_HIGHLIGHT_KINDS` — title prefix + highlight.
- `app/site_content.py` `SITE_OFFERS` — offer icons (`bi-*`) and German labels.
- `app/routes/helpers/event_post_maps.py` — per-EVENT map coords (stays; A2 owns per-event map data).
- `app/demo_seed.py` — schedule/time/deposit defaults (A4 will read the registry).

## Scope

**In:** the registry module, the generator + committed JSON + sync test, the
frontend typed accessor, and refactoring `event_kind_meta` / `EVENT_TITLE_PREFIXES`
/ `TITLE_HIGHLIGHT_KINDS` into registry-backed adapters (behavior-preserving).

**Out (later A-chunks):** per-event coordinates/capacity/dates (A2), the SVG
`EventIcon`/`EventMarker` components (A3), fixture schedule generation (A4),
Alembic (A5). A1 ships no new event API fields and no new components.

## Registry shape (per kind)

```
id                    str, stable, == existing Post.event_kind values
label                 {en, de}
icon                  str icon id (explicit; rendered as SVG by A3's EventIcon — NOT bootstrap-icons runtime)
marker                str token in {accent, info, ok, warn, bad, muted, ink}
titlePrefix           {en, de} | null
highlightTitle        bool
schedule              {weekday: 0-6 (Mon=0) , time: "HH:MM"} | null
mapMode               "none" | "venue" | "country" | "destination"
features              subset of ["registration", "deposit", "map", "karaoke_queue"]
registrationDefault   bool
depositDefault        bool
```

`marker` is a semantic app token (A3 maps each to a CSS variable). `schedule`
and `*Default` are DEFAULT patterns/hints (real per-event values live on `Post`);
A4 seeding consumes them.

## Seed values (the 8 existing kinds)

| id | label en / de | icon | marker | titlePrefix en/de | highlight | schedule | mapMode | features | reg/deposit default |
|---|---|---|---|---|---|---|---|---|---|
| country_evening | Country Evening / Länderabend | globe | bad | Country Evening / Länderabend | yes | Tue 20:00 | country | map | no / no |
| cafe_lingua | Café Lingua / Café Lingua | chat | accent | — | no | Tue 20:00 | venue | map | no / no |
| board_games | Board Games / Brettspielabende | dice | ok | — | no | Tue 20:00 | venue | map | no / no |
| karaoke | Karaoke / Karaoke | mic | warn | — | no | Tue 20:00 | venue | karaoke_queue, map | no / no |
| dance | Dance Workshops / Tanzworkshops | music | info | — | no | Tue 20:00 | venue | map | no / no |
| breakfast | International Breakfast / Internationales Frühstück | egg | muted | International Breakfast / Internationales Frühstück | yes | Sat 10:00 | venue | registration, deposit, map | yes / yes |
| trip | International Weekend / Internationales Wochenende | signpost | ink | International Weekend / Internationales Wochenende | no | Sat 09:00 | destination | registration, map | yes / no |
| housing | Housing / Wohnen | house | muted | — | no | null | none | — | no / no |

German labels for the first 7 are taken verbatim from `SITE_OFFERS["de"]`;
`housing` "Wohnen" has no existing source and is flagged for native-speaker
review in the implementation report. `trip` schedule time (09:00) is a default
hint only; real trip start times come from event data (A4).

`titlePrefix`/`highlightTitle` reproduce today's `EVENT_TITLE_PREFIXES`
(country_evening, breakfast, trip) and `TITLE_HIGHLIGHT_KINDS` (country_evening,
breakfast) exactly — the adapter-parity test locks this.

## Architecture

- **`app/event_kinds.py`** (new) — canonical `EVENT_KINDS: dict[str, dict]` +
  `get_event_kind(id) -> dict | None`, `event_kind_ids() -> list[str]`. No DB,
  no app context.
- **Adapters (consolidate, don't duplicate):**
  - `app/__init__.py` `event_kind_meta(kind)` returns `{label, badge, color}`
    with `label` derived from the registry (`label["en"]`). `badge`/`color`
    are Bootstrap-specific legacy display values that are NOT a clean function
    of `marker` (e.g. `housing` is `badge="text-bg-light"` but
    `color="secondary"`), so the adapter keeps a small local
    `_LEGACY_BADGE = {id: (badge, color)}` table to reproduce today's Jinja
    markup byte-for-byte. This transitional table is the ONE legacy consumer
    (not a second registry) and is deleted when the Jinja UI is removed in
    Phase D. The canonical registry stays clean with only the forward-looking
    `marker` token, which A3's React components consume.
  - `app/models.py` `EVENT_TITLE_PREFIXES` / `TITLE_HIGHLIGHT_KINDS` become
    values computed from the registry (module-level, e.g.
    `EVENT_TITLE_PREFIXES = {k: v["titlePrefix"]["en"] for k,v in ... if titlePrefix}`).
    `EVENT_TITLE_SUFFIX_OVERRIDES` and title compose/split logic stay as-is
    (per-title data, not per-kind).
- **Generator `app/export_event_kinds.py`** — `build_event_kinds_snapshot()` →
  the registry as JSON; `python -m app.export_event_kinds` writes committed
  `frontend/src/content/event-kinds.generated.json` (pretty, sorted, trailing
  newline — same conventions as `export_site_content`).
- **Frontend `frontend/src/domain/eventKinds.ts`** — imports the JSON; exports
  `EventKind` type, `EVENT_KINDS: Record<string, EventKind>`, `getEventKind(id)`.
  Consumed by A3 components and A4 fixtures later; A1 only adds the module.

## Testing

- pytest `tests/test_event_kinds.py`:
  - registry has all 8 ids with all required keys and valid enum values
    (`marker`, `mapMode`, `features`);
  - **adapter parity:** for every existing kind, `event_kind_meta(kind)` equals
    its pre-refactor value (hardcode the current 8 dicts in the test), and
    `EVENT_TITLE_PREFIXES` / `TITLE_HIGHLIGHT_KINDS` equal today's values;
  - snapshot sync: committed JSON equals a fresh `build_event_kinds_snapshot()`.
- vitest `frontend/src/domain/eventKinds.test.ts`: `getEventKind("breakfast")`
  returns the expected shape; unknown id → `undefined`; both-locale labels present.
- Full existing suites (pytest 32, vitest 25) stay green — the adapter parity
  guarantees no Jinja/behavior regression.

## Acceptance (A1 slice of §2)

- Event-kind metadata has ONE source; the four legacy accessors read from it.
- Python↔TS synchronized via a committed generated file guarded by a sync test
  ("event-kind metadata is not manually duplicated in multiple registries
  without a synchronization test").
- No behavior change for existing Jinja/admin surfaces (parity-locked).

## Files (indicative)

- Backend: `app/event_kinds.py`, `app/export_event_kinds.py`,
  `frontend/src/content/event-kinds.generated.json`, edits to
  `app/__init__.py` + `app/models.py`, `tests/test_event_kinds.py`.
- Frontend: `frontend/src/domain/eventKinds.ts`,
  `frontend/src/domain/eventKinds.test.ts`.
