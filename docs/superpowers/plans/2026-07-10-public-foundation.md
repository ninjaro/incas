# Public Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the INCAS public shell to functional parity in React — en/de localization, full nav/footer, light/dark preference, and the 13 information pages — served from `site_content.py` with no links back to Jinja.

**Architecture:** Two new read-only endpoints under `/api/v1/public` serialize the existing `site_content.py` data (nav strings, offers, footer, and per-slug HTML bodies), rewriting legacy Flask URLs to React routes. A committed generated JSON snapshot lets the static demo serve the identical shapes with no Python. React gains a hand-rolled `LocaleContext`/`useT` (no i18n dependency), a rewritten `PublicLayout`, and a generic `ContentPage`.

**Tech Stack:** Flask (Python 3.11) + pytest; React 18 + TypeScript + react-router (HashRouter) + vitest.

## Global Constraints

- All new API endpoints live under `/api/v1`; errors use `{"error": {"code","message","details"}}` via `api_error`.
- Supported locales: `en`, `de`; default/fallback `en` (`app/routes/public.py:SUPPORTED_LOCALES`/`DEFAULT_LOCALE`).
- Brand primary orange stays exactly `#ff6600` (`global.css` note).
- No new frontend runtime dependency (no i18next). Match existing hand-rolled context style.
- No React link may point at a legacy Jinja path. Unbuilt targets (contact/suggest-event forms) point at their eventual React route as a stub.
- Team members stay out of the DB, in `frontend/src/content/team.ts`, with image/description fallbacks.
- Content slug allowlist is derived from `SITE_PAGES["en"].keys()` — never hardcode a divergent list.
- `frontend/src/content/site.generated.json` is committed and must equal a fresh `python -m app.export_site_content`.
- Backend tests run with `DATABASE_URL="sqlite://" pytest tests/ -q`; frontend with `npx vitest run` / `npm run typecheck`.
- Content HTML is authored/trusted; rendering via `dangerouslySetInnerHTML` inside `.site-content` is acceptable.

---

## File Structure

- `app/api/public.py` — add `serialize_site(locale)`, `serialize_content(slug, locale)`, URL-rewrite helper, and the two routes.
- `app/export_site_content.py` — new; CLI that writes `frontend/src/content/site.generated.json`.
- `tests/test_api_site.py` — new; endpoint tests.
- `tests/test_export_site_content.py` — new; snapshot-sync test.
- `frontend/src/api/types.ts` — add `Locale`, `SiteResponse`, `ContentPageResponse` and sub-types.
- `frontend/src/data/DataProvider.ts` — add `getSite`, `getContent`.
- `frontend/src/data/ApiDataProvider.ts` — implement both against the API.
- `frontend/src/data/DemoDataProvider.ts` — implement both from the JSON snapshot.
- `frontend/src/content/site.generated.json` — new; committed snapshot.
- `frontend/src/i18n/LocaleContext.tsx` — new; provider + `useLocale`/`useT`.
- `frontend/src/i18n/LocaleContext.test.tsx` — new.
- `frontend/src/app/App.tsx` — wrap with `LocaleProvider`.
- `frontend/src/layouts/PublicLayout.tsx` — rewrite (nav tree, locale switch, appearance toggle, footer).
- `frontend/src/pages/ContentPage.tsx` — new; generic content renderer.
- `frontend/src/pages/OffersPage.tsx` — new; offers overview.
- `frontend/src/pages/ContentPage.test.tsx` — new.
- `frontend/src/router/index.tsx` — add content routes.
- `frontend/src/styles/site-content.css` — new; scoped Bootstrap-subset styles.
- `frontend/src/styles/global.css` — add `[data-theme="dark"]` block; import `site-content.css`.
- `readme.md` — document the regen step.

---

## Task 1: `/api/v1/public/site` endpoint

**Files:**
- Modify: `app/api/public.py`
- Test: `tests/test_api_site.py` (create)

**Interfaces:**
- Produces: `GET /api/v1/public/site?locale=` → `{locale, strings, nav, offers, footer}`. `nav` is a list of `{label, to, children?}`; `offers` is `{title, subtitle, pages:[{title,to,icon}], forms:[{title,to}]}`; `footer` is `{copy, social:[{platform,url}], offerLinks:[{title,to}]}`. All `to`/`url` values are React routes or absolute external URLs — never legacy Flask paths.

- [ ] **Step 1: Write the failing test**

Create `tests/test_api_site.py`:

```python
def test_public_site_en(client):
    payload = client.get("/api/v1/public/site?locale=en").get_json()
    assert payload["locale"] == "en"
    assert payload["strings"]["nav.home"] == "Home"
    labels = [item["label"] for item in payload["nav"]]
    assert "Home" in labels and "About Us" in labels
    about = next(item for item in payload["nav"] if item["label"] == "About Us")
    assert {c["to"] for c in about["children"]} == {
        "/about", "/about/working-groups", "/about/team-meetings"
    }
    # No nav/offers/footer link points at a legacy Flask path.
    urls = [i.get("to") for i in payload["nav"]]
    urls += [p["to"] for p in payload["offers"]["pages"]]
    urls += [f["to"] for f in payload["offers"]["forms"]]
    urls += [l["to"] for l in payload["footer"]["offerLinks"]]
    for u in urls:
        assert u is None or not u.startswith("/language-tandem")
        assert u is None or not u.startswith("/contact-form")
        assert u is None or "/suggest-event" not in u or u.startswith("/suggest-event")
    platforms = {s["platform"]: s["url"] for s in payload["footer"]["social"]}
    assert platforms["facebook"] == "https://www.facebook.com/INCASAachen/"
    assert platforms["instagram"] == "https://www.instagram.com/incas_aachen/"
    assert platforms["youtube"] is None


def test_public_site_de_localizes(client):
    payload = client.get("/api/v1/public/site?locale=de").get_json()
    assert payload["locale"] == "de"
    assert payload["strings"]["nav.home"] == "Start"


def test_public_site_invalid_locale_falls_back_to_en(client):
    payload = client.get("/api/v1/public/site?locale=xx").get_json()
    assert payload["locale"] == "en"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL="sqlite://" pytest tests/test_api_site.py -q`
Expected: FAIL (404 / KeyError — route not defined).

- [ ] **Step 3: Implement the serializer and route**

In `app/api/public.py`, add imports at top:

```python
from app.site_content import SITE_UI, get_footer_offer_links, get_site_offers, t
```

Define the locale constants locally (do **not** import them from `app.routes.public` — that risks a circular import). Add a URL-rewrite map and helpers, then the route:

```python
# Kept in sync with app/routes/public.py; defined locally to avoid a
# circular import between the API and legacy route modules.
SUPPORTED_LOCALES = {"en", "de"}
DEFAULT_LOCALE = "en"

# Legacy Flask path -> React (HashRouter) route. Values are react-router
# "to" paths (no leading "#"); query strings are preserved.
_LEGACY_TO_APP = {
    "/language-tandem": "/tandem",
    "/contact-form": "/contact",
    "/contacts": "/contact",
}


def _app_route(url):
    if not url:
        return url
    path, _, query = url.partition("?")
    path = _LEGACY_TO_APP.get(path, path)
    return f"{path}?{query}" if query else path


def _coerce_locale(raw):
    return raw if raw in SUPPORTED_LOCALES else DEFAULT_LOCALE


def _serialize_nav(locale):
    return [
        {"label": t(locale, "nav.home"), "to": "/"},
        {"label": t(locale, "nav.calendar"), "to": "/calendar"},
        {
            "label": t(locale, "nav.about"),
            "to": None,
            "children": [
                {"label": t(locale, "nav.about_us"), "to": "/about"},
                {"label": t(locale, "nav.working_groups"), "to": "/about/working-groups"},
                {"label": t(locale, "nav.team_meetings"), "to": "/about/team-meetings"},
            ],
        },
        {"label": t(locale, "nav.forms"), "to": "/offers"},
        {"label": t(locale, "nav.language_tandem"), "to": "/tandem"},
        {"label": t(locale, "nav.karaoke"), "to": "/karaoke"},
        {"label": t(locale, "nav.contacts"), "to": "/contact"},
        {"label": t(locale, "nav.team"), "to": "/team"},
    ]


def _serialize_offers(locale):
    offers = get_site_offers(locale)
    return {
        "title": offers["title"],
        "subtitle": offers["subtitle"],
        "pages": [
            {"title": p["title"], "to": _app_route(p["url"]), "icon": p["icon"]}
            for p in offers["pages"]
        ],
        "forms": [
            {"title": f["title"], "to": _app_route(f["url"])} for f in offers["forms"]
        ],
    }


def _serialize_footer(locale):
    return {
        "copy": "INCAS — Intercultural Centre of Aachen Students",
        "social": [
            {"platform": "facebook", "url": "https://www.facebook.com/INCASAachen/"},
            {"platform": "instagram", "url": "https://www.instagram.com/incas_aachen/"},
            {"platform": "youtube", "url": None},
            {"platform": "linkedin", "url": None},
        ],
        "offerLinks": [
            {"title": link["title"], "to": _app_route(link["url"])}
            for link in get_footer_offer_links(locale)
        ],
    }


def serialize_site(locale):
    locale = _coerce_locale(locale)
    return {
        "locale": locale,
        "strings": SITE_UI.get(locale, SITE_UI["en"]),
        "nav": _serialize_nav(locale),
        "offers": _serialize_offers(locale),
        "footer": _serialize_footer(locale),
    }


@api_bp.get("/public/site")
def api_public_site():
    return jsonify(serialize_site(request.args.get("locale", DEFAULT_LOCALE)))
```

Add `nav.karaoke` and `nav.team` to both locales in `app/site_content.py` `SITE_UI` (`"en"`: `"nav.karaoke": "Karaoke"`, `"nav.team": "Team"`; `"de"`: `"nav.karaoke": "Karaoke"`, `"nav.team": "Team"`).

- [ ] **Step 4: Run test to verify it passes**

Run: `DATABASE_URL="sqlite://" pytest tests/test_api_site.py -q`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/public.py app/site_content.py tests/test_api_site.py
git commit -m "feat(api): add /public/site endpoint with legacy URL rewriting

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `/api/v1/public/content/<slug>` endpoint

**Files:**
- Modify: `app/api/public.py`
- Test: `tests/test_api_site.py`

**Interfaces:**
- Consumes: `get_site_page(slug, locale)` from `app.site_content`.
- Produces: `GET /api/v1/public/content/<slug>?locale=` → `{slug, title, image, bodyHtml}`. `slug` is the public hyphenated form (e.g. `working-groups`); unknown slug → 404 `{"error":{"code":"not_found",...}}`. Missing/invalid locale → en fallback.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_api_site.py`:

```python
def test_public_content_about_en(client):
    payload = client.get("/api/v1/public/content/about?locale=en").get_json()
    assert payload["slug"] == "about"
    assert payload["title"] == "About us"
    assert "INtercultural" in payload["bodyHtml"] or "IN" in payload["bodyHtml"]


def test_public_content_hyphen_slug(client):
    payload = client.get("/api/v1/public/content/working-groups?locale=en").get_json()
    assert payload["slug"] == "working-groups"
    assert "work group" in payload["bodyHtml"].lower()


def test_public_content_de(client):
    en = client.get("/api/v1/public/content/about?locale=en").get_json()
    de = client.get("/api/v1/public/content/about?locale=de").get_json()
    assert en["bodyHtml"] != de["bodyHtml"]


def test_public_content_unknown_slug_404(client):
    response = client.get("/api/v1/public/content/nope?locale=en")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL="sqlite://" pytest tests/test_api_site.py -q`
Expected: FAIL (new 4 tests error/404).

- [ ] **Step 3: Implement the serializer and route**

Add to `app/api/public.py` (import `SITE_PAGES, get_site_page` from `app.site_content`):

```python
def _content_key(slug):
    return slug.replace("-", "_")


def serialize_content(slug, locale):
    key = _content_key(slug)
    if key not in SITE_PAGES["en"]:
        return None
    page = get_site_page(key, _coerce_locale(locale))
    return {
        "slug": slug,
        "title": page["title"],
        "image": page.get("image"),
        "bodyHtml": page["body_html"],
    }


@api_bp.get("/public/content/<slug>")
def api_public_content(slug):
    payload = serialize_content(slug, request.args.get("locale", DEFAULT_LOCALE))
    if payload is None:
        return api_error("not_found", "Page not found.", status=404)
    return jsonify(payload)
```

Ensure `api_error` is imported (`from app.api import api_bp, api_error`).

- [ ] **Step 4: Run test to verify it passes**

Run: `DATABASE_URL="sqlite://" pytest tests/test_api_site.py -q`
Expected: PASS (7 tests total).

- [ ] **Step 5: Commit**

```bash
git add app/api/public.py tests/test_api_site.py
git commit -m "feat(api): add /public/content/<slug> endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Content export generator + committed snapshot

**Files:**
- Create: `app/export_site_content.py`
- Create: `frontend/src/content/site.generated.json`
- Test: `tests/test_export_site_content.py`

**Interfaces:**
- Produces: `build_site_snapshot()` → `{locale: {strings, nav, offers, footer, pages: {slug: {title, image, bodyHtml}}}}` for each supported locale, reusing Task 1/2 serializers. `python -m app.export_site_content` writes the pretty JSON to `frontend/src/content/site.generated.json`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_export_site_content.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `DATABASE_URL="sqlite://" pytest tests/test_export_site_content.py -q`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the generator**

Create `app/export_site_content.py`:

```python
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
```

Note: `serialize_site`/`serialize_content` do not touch the DB, so no app context is needed. `pages[key]` is keyed by the underscore `SITE_PAGES` key but its `slug` field holds the hyphenated public slug the frontend routes use.

- [ ] **Step 4: Generate the committed snapshot and verify tests pass**

Run:
```bash
DATABASE_URL="sqlite://" python -m app.export_site_content
DATABASE_URL="sqlite://" pytest tests/test_export_site_content.py -q
```
Expected: writes `frontend/src/content/site.generated.json`; both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/export_site_content.py frontend/src/content/site.generated.json tests/test_export_site_content.py
git commit -m "feat: add site content export generator + committed snapshot

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Frontend types + DataProvider interface + ApiDataProvider

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/data/DataProvider.ts`
- Modify: `frontend/src/data/ApiDataProvider.ts`

**Interfaces:**
- Produces: `Locale = "en" | "de"`; `SiteResponse`, `ContentPageResponse`; `DataProvider.getSite(locale)`, `DataProvider.getContent(slug, locale)`.

- [ ] **Step 1: Add the types**

Append to `frontend/src/api/types.ts`:

```typescript
export type Locale = "en" | "de";

export interface SiteNavItem {
  label: string;
  to: string | null;
  children?: SiteNavItem[];
}

export interface SiteOfferPage {
  title: string;
  to: string;
  icon: string;
}

export interface SiteOfferForm {
  title: string;
  to: string;
}

export interface SiteFooterSocial {
  platform: string;
  url: string | null;
}

export interface SiteFooterLink {
  title: string;
  to: string;
}

export interface SiteResponse {
  locale: Locale;
  strings: Record<string, string>;
  nav: SiteNavItem[];
  offers: {
    title: string;
    subtitle: string;
    pages: SiteOfferPage[];
    forms: SiteOfferForm[];
  };
  footer: {
    copy: string;
    social: SiteFooterSocial[];
    offerLinks: SiteFooterLink[];
  };
}

export interface ContentPageResponse {
  slug: string;
  title: string;
  image: string | null;
  bodyHtml: string;
}
```

- [ ] **Step 2: Extend the DataProvider interface**

In `frontend/src/data/DataProvider.ts`, add `ContentPageResponse, Locale, SiteResponse` to the type import list, and add to the interface (near `getPublicConfig`):

```typescript
  getSite(locale: Locale): Promise<SiteResponse>;
  getContent(slug: string, locale: Locale): Promise<ContentPageResponse>;
```

- [ ] **Step 3: Implement in ApiDataProvider**

In `frontend/src/data/ApiDataProvider.ts`, add `ContentPageResponse, Locale, SiteResponse` to imports and add methods:

```typescript
  getSite(locale: Locale) {
    return http.get<SiteResponse>(`/public/site?locale=${locale}`);
  }

  getContent(slug: string, locale: Locale) {
    return http.get<ContentPageResponse>(
      `/public/content/${encodeURIComponent(slug)}?locale=${locale}`,
    );
  }
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS for these files (DemoDataProvider will error — it doesn't implement the new methods yet; that's Task 5. If typecheck blocks, proceed to Task 5 before running it clean.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/types.ts frontend/src/data/DataProvider.ts frontend/src/data/ApiDataProvider.ts
git commit -m "feat(frontend): add site/content types and ApiDataProvider methods

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: DemoDataProvider serves the snapshot

**Files:**
- Modify: `frontend/src/data/DemoDataProvider.ts`
- Test: `frontend/src/data/DemoDataProvider.test.ts`

**Interfaces:**
- Consumes: `frontend/src/content/site.generated.json`, `SiteResponse`, `ContentPageResponse`, `Locale`.
- Produces: `DemoDataProvider.getSite`, `getContent` from the snapshot.

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/data/DemoDataProvider.test.ts` (inside the `describe`):

```typescript
  it("serves localized site chrome from the snapshot", async () => {
    const en = await provider.getSite("en");
    expect(en.strings["nav.home"]).toBe("Home");
    const de = await provider.getSite("de");
    expect(de.strings["nav.home"]).toBe("Start");
  });

  it("serves content pages and rejects unknown slugs", async () => {
    const about = await provider.getContent("about", "en");
    expect(about.title).toBe("About us");
    expect(about.bodyHtml.length).toBeGreaterThan(0);
    await expect(provider.getContent("nope", "en")).rejects.toMatchObject({
      code: "not_found",
      status: 404,
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/DemoDataProvider.test.ts`
Expected: FAIL (`getSite` not a function).

- [ ] **Step 3: Implement**

In `frontend/src/data/DemoDataProvider.ts`, add imports:

```typescript
import siteSnapshot from "../content/site.generated.json";
import type { ContentPageResponse, Locale, SiteResponse } from "../api/types";
```

Add methods to the class:

```typescript
  async getSite(locale: Locale): Promise<SiteResponse> {
    const snap = (siteSnapshot as Record<string, { strings: Record<string, string>; nav: unknown; offers: unknown; footer: unknown }>)[locale] ?? (siteSnapshot as Record<string, never>)["en"];
    return {
      locale,
      strings: snap.strings,
      nav: snap.nav,
      offers: snap.offers,
      footer: snap.footer,
    } as SiteResponse;
  }

  async getContent(slug: string, locale: Locale): Promise<ContentPageResponse> {
    const key = slug.replace(/-/g, "_");
    const localeSnap = (siteSnapshot as Record<string, { pages: Record<string, ContentPageResponse | null> }>)[locale]
      ?? (siteSnapshot as Record<string, { pages: Record<string, ContentPageResponse | null> }>)["en"];
    const page = localeSnap.pages[key];
    if (!page) {
      throw new DemoError("not_found", "Page not found.", 404);
    }
    return page;
  }
```

Add `"resolveJsonModule": true` to `tsconfig.json` `compilerOptions` if not already enabled.

- [ ] **Step 4: Run test + typecheck**

Run:
```bash
npx vitest run src/data/DemoDataProvider.test.ts
npm run typecheck
```
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/data/DemoDataProvider.ts frontend/src/data/DemoDataProvider.test.ts tsconfig.json
git commit -m "feat(frontend): DemoDataProvider serves site snapshot

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: LocaleContext + useT, wired into App

**Files:**
- Create: `frontend/src/i18n/LocaleContext.tsx`
- Create: `frontend/src/i18n/LocaleContext.test.tsx`
- Modify: `frontend/src/app/App.tsx`

**Interfaces:**
- Consumes: `useData().getSite(locale)`, `Locale`, `SiteResponse`.
- Produces: `LocaleProvider`, `useLocale()` → `{locale, setLocale, site, loading}`, `useT()` → `(key: string) => string`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/i18n/LocaleContext.test.tsx`:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { LocaleProvider, useLocale, useT } from "./LocaleContext";

function Probe() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="home">{t("nav.home")}</span>
      <span data-testid="missing">{t("nope.key")}</span>
      <span data-testid="locale">{locale}</span>
      <button onClick={() => setLocale("de")}>de</button>
    </div>
  );
}

describe("LocaleContext", () => {
  it("provides translations and falls back to the key", async () => {
    render(
      <DataProviderProvider provider={new DemoDataProvider()}>
        <LocaleProvider>
          <Probe />
        </LocaleProvider>
      </DataProviderProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("home").textContent).toBe("Home"));
    expect(screen.getByTestId("missing").textContent).toBe("nope.key");
  });
});
```

If `@testing-library/react` is not installed, add it: `npm i -D @testing-library/react @testing-library/dom` (jsdom is already present). Include this in the commit.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/LocaleContext.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `frontend/src/i18n/LocaleContext.tsx`:

```typescript
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Locale, SiteResponse } from "../api/types";
import { useData } from "../data/DataProviderContext";

const SUPPORTED: Locale[] = ["en", "de"];
const STORAGE_KEY = "incas.locale";

function readCookieLocale(): Locale | null {
  const match = document.cookie.match(/(?:^|;\s*)locale=(en|de)/);
  return match ? (match[1] as Locale) : null;
}

function initialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && SUPPORTED.includes(stored)) return stored;
  const cookie = readCookieLocale();
  if (cookie) return cookie;
  const browser = navigator.language.slice(0, 2) as Locale;
  return SUPPORTED.includes(browser) ? browser : "en";
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  site: SiteResponse | null;
  loading: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [site, setSite] = useState<SiteResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    data.getSite(locale).then((next) => {
      if (active) {
        setSite(next);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [data, locale]);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    document.documentElement.lang = next;
    setLocaleState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, site, loading }),
    [locale, setLocale, site, loading],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}

export function useT(): (key: string) => string {
  const { site } = useLocale();
  return useCallback((key: string) => site?.strings[key] ?? key, [site]);
}
```

In `frontend/src/app/App.tsx`, wrap the router with `LocaleProvider` (inside `DataProviderProvider`, around `SessionProvider`):

```typescript
import { LocaleProvider } from "../i18n/LocaleContext";
// ...
    <DataProviderProvider>
      <LocaleProvider>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </LocaleProvider>
    </DataProviderProvider>
```

- [ ] **Step 4: Run test + typecheck**

Run:
```bash
npx vitest run src/i18n/LocaleContext.test.tsx
npm run typecheck
```
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n/ frontend/src/app/App.tsx package.json package-lock.json
git commit -m "feat(frontend): add LocaleContext/useT i18n and wire into App

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Rewrite PublicLayout (nav, locale switch, appearance, footer)

**Files:**
- Modify: `frontend/src/layouts/PublicLayout.tsx`
- Modify: `frontend/src/styles/global.css`

**Interfaces:**
- Consumes: `useLocale()`, `useT()`, `useSession()`, `useData().isDemo`, `SiteResponse.nav/footer`.

- [ ] **Step 1: Add dark-theme CSS + appearance bootstrap**

In `frontend/src/styles/global.css`, after the `:root {...}` block add:

```css
:root[data-theme="dark"] {
  color-scheme: dark;
  --ink: #f2ede6;
  --ink-soft: #c3bcb2;
  --ink-faint: #8f887e;
  --paper: #1a1714;
  --paper-warm: #211d19;
  --line: #38322b;
  --incas-orange-soft: #3a2416;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.5);
}
```

Add `@import "./site-content.css";` as the first line of `global.css` (Task 8 creates that file; the import resolves once it exists — create an empty `site-content.css` now if implementing Task 7 first).

- [ ] **Step 2: Rewrite the layout**

Replace `frontend/src/layouts/PublicLayout.tsx` with:

```typescript
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import type { Locale, SiteNavItem } from "../api/types";
import { useSession } from "../auth/SessionContext";
import { useData } from "../data/DataProviderContext";
import { useLocale, useT } from "../i18n/LocaleContext";

const APPEARANCE_KEY = "incas.appearance";

function initialAppearance(): "light" | "dark" {
  const stored = localStorage.getItem(APPEARANCE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function NavItem({ item }: { item: SiteNavItem }) {
  if (item.children?.length) {
    return (
      <div className="site-nav-group">
        <span className="site-nav-group-label">{item.label}</span>
        <div className="site-nav-group-menu">
          {item.children.map((child) => (
            <NavLink key={child.to} to={child.to ?? "#"}>
              {child.label}
            </NavLink>
          ))}
        </div>
      </div>
    );
  }
  return (
    <NavLink to={item.to ?? "#"} end={item.to === "/"}>
      {item.label}
    </NavLink>
  );
}

export function PublicLayout() {
  const data = useData();
  const session = useSession();
  const { locale, setLocale, site } = useLocale();
  const t = useT();
  const [appearance, setAppearance] = useState<"light" | "dark">(initialAppearance);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", appearance);
    localStorage.setItem(APPEARANCE_KEY, appearance);
  }, [appearance]);

  const nav = site?.nav ?? [];
  const footer = site?.footer;

  return (
    <div className="shell">
      {data.isDemo ? (
        <div className="demo-banner" role="note">
          <strong>Demo mode</strong> — synthetic data, no real backend. Actions are simulated.
        </div>
      ) : null}
      <nav className="site-nav" aria-label="Main navigation">
        <div className="site-nav-inner">
          <NavLink to="/" className="site-nav-brand">
            IN<em>CAS</em>
          </NavLink>
          <div className="site-nav-links">
            {nav.map((item) => (
              <NavItem key={item.label} item={item} />
            ))}
            {session.capabilities.length > 0 || data.isDemo ? (
              <NavLink to="/admin">{t("nav.admin")}</NavLink>
            ) : null}
          </div>
          <div className="site-nav-controls">
            <div className="locale-switch" role="group" aria-label="Language">
              {(["en", "de"] as Locale[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={locale === code ? "is-active" : ""}
                  aria-pressed={locale === code}
                  onClick={() => setLocale(code)}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="appearance-toggle"
              aria-label="Toggle light or dark appearance"
              onClick={() => setAppearance((prev) => (prev === "dark" ? "light" : "dark"))}
            >
              {appearance === "dark" ? "☀︎" : "☾"}
            </button>
          </div>
        </div>
      </nav>
      <main className="shell-main">
        <Outlet />
      </main>
      {footer ? (
        <footer className="site-footer">
          <div className="site-footer-inner">
            <p className="site-footer-copy">{footer.copy}</p>
            <div className="site-footer-socials" aria-label="Social media">
              {footer.social
                .filter((s) => s.url)
                .map((s) => (
                  <a key={s.platform} href={s.url ?? "#"} target="_blank" rel="noreferrer">
                    {s.platform}
                  </a>
                ))}
            </div>
            <ul className="site-footer-links">
              {footer.offerLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to}>{link.title}</NavLink>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      ) : (
        <footer className="site-footer">INCAS</footer>
      )}
    </div>
  );
}
```

Add minimal styles for `.site-nav-group`, `.site-nav-group-menu` (absolute dropdown, shown on `:hover`/`:focus-within`), `.site-nav-controls`, `.locale-switch button.is-active`, `.appearance-toggle`, and `.site-footer-inner/-socials/-links` to `global.css`, following existing `.site-nav` conventions.

- [ ] **Step 3: Verify build + typecheck**

Run:
```bash
npm run typecheck
npx vitest run
```
Expected: PASS.

- [ ] **Step 4: Manual smoke (optional but recommended)**

Run `npm run dev` (with `python run.py` for the API) or `npm run build:demo` and open the demo. Confirm: nav shows all items, About/Offers dropdowns work, EN/DE switch changes labels, dark toggle flips appearance, footer shows Facebook/Instagram links.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/layouts/PublicLayout.tsx frontend/src/styles/global.css frontend/src/styles/site-content.css
git commit -m "feat(frontend): rewrite PublicLayout with nav tree, locale switch, dark mode, footer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: ContentPage + OffersPage + routes + scoped styles

**Files:**
- Create: `frontend/src/pages/ContentPage.tsx`
- Create: `frontend/src/pages/OffersPage.tsx`
- Create: `frontend/src/pages/ContentPage.test.tsx`
- Create/replace: `frontend/src/styles/site-content.css`
- Modify: `frontend/src/router/index.tsx`

**Interfaces:**
- Consumes: `useData().getContent(slug, locale)`, `useLocale()`, `SiteResponse.offers`.
- Produces: `ContentPage` (route element, reads `slug` from props or `useParams`), `OffersPage`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/ContentPage.test.tsx`:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DataProviderProvider } from "../data/DataProviderContext";
import { DemoDataProvider } from "../data/DemoDataProvider";
import { LocaleProvider } from "../i18n/LocaleContext";
import { ContentPage } from "./ContentPage";

function renderPage(slug: string) {
  return render(
    <DataProviderProvider provider={new DemoDataProvider()}>
      <LocaleProvider>
        <MemoryRouter>
          <ContentPage slug={slug} />
        </MemoryRouter>
      </LocaleProvider>
    </DataProviderProvider>,
  );
}

describe("ContentPage", () => {
  it("renders the page title and body", async () => {
    renderPage("about");
    await waitFor(() => expect(screen.getByText("About us")).toBeTruthy());
  });

  it("shows a not-found state for unknown slugs", async () => {
    renderPage("nope");
    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/ContentPage.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement ContentPage**

Create `frontend/src/pages/ContentPage.tsx`:

```typescript
import { useParams } from "react-router-dom";

import type { ContentPageResponse } from "../api/types";
import { Loading } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";

export function ContentPage({ slug: fixedSlug }: { slug?: string }) {
  const data = useData();
  const { locale } = useLocale();
  const params = useParams();
  const slug = fixedSlug ?? params.slug ?? "";
  const state = useAsync<ContentPageResponse>(
    () => data.getContent(slug, locale),
    [slug, locale],
  );

  if (state.loading) return <Loading />;
  if (state.error) {
    return (
      <div className="state-box">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>
      </div>
    );
  }
  const page = state.value!;
  return (
    <article className="content-page">
      <h1 className="content-page-title">{page.title}</h1>
      {page.image ? (
        <img className="content-page-image" src={`/static/${page.image}`} alt="" loading="lazy" />
      ) : null}
      <div className="site-content" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
    </article>
  );
}
```

Confirm the `useAsync` signature in `frontend/src/hooks/useAsync.ts` returns `{loading, error, value}`; adapt property names if they differ (e.g. `data` instead of `value`). Adjust image base path if legacy images are served elsewhere than `/static/`.

- [ ] **Step 4: Implement OffersPage**

Create `frontend/src/pages/OffersPage.tsx`:

```typescript
import { NavLink } from "react-router-dom";

import { useLocale } from "../i18n/LocaleContext";
import { ContentPage } from "./ContentPage";

export function OffersPage() {
  const { site } = useLocale();
  const offers = site?.offers;
  return (
    <div className="offers-page">
      <ContentPage slug="offers" />
      {offers ? (
        <>
          <div className="offers-grid">
            {offers.pages.map((page) => (
              <NavLink key={page.to} to={page.to} className="offers-card">
                {page.title}
              </NavLink>
            ))}
          </div>
          <ul className="offers-forms">
            {offers.forms.map((form) => (
              <li key={form.to}>
                <NavLink to={form.to}>{form.title}</NavLink>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Add routes**

In `frontend/src/router/index.tsx`, import the pages and add these child routes to the `PublicLayout` children (before `{ path: "*" }`):

```typescript
      { path: "/about", element: <ContentPage slug="about" /> },
      { path: "/about/working-groups", element: <ContentPage slug="working-groups" /> },
      { path: "/about/team-meetings", element: <ContentPage slug="team-meetings" /> },
      { path: "/offers", element: <OffersPage /> },
      { path: "/offers/:slug", element: <ContentPage /> },
      { path: "/contact", element: <ContentPage slug="language-tandem" /> },
```

(`/contact` is a temporary target so nav never dead-ends; §4 replaces it with the real contact form. Use whatever stub the reviewer prefers — a placeholder page is fine — but it must not link to Jinja.)

- [ ] **Step 6: Write the scoped Bootstrap-subset CSS**

Replace `frontend/src/styles/site-content.css` with rules scoped under `.site-content` covering the utilities the 13 pages use. Grep the committed bodies first to confirm the class set:

```bash
grep -oE 'class="[^"]+"' frontend/src/content/site.generated.json | tr ' ' '\n' | grep -oE '[a-z][a-z0-9-]+' | sort -u
```

Then author `.site-content` rules for at least: `vstack`/`hstack` + `gap-1..5`, `lead`, `fw-bold`, `text-primary`/`text-primary-emphasis`/`text-body-emphasis`/`text-body-secondary`, `mb-0..5`/`mt-*`/`p-*`/`py-*`, `list-group`/`list-group-flush`/`list-group-item`, `border`/`border-start`/`border-4`, `rounded-2`, `bg-body-tertiary`, `link-primary`, `h5`, and `accordion`/`accordion-item`/`accordion-header`/`accordion-button`/`accordion-collapse`/`accordion-body`. Render accordions statically expanded:

```css
.site-content .accordion-collapse { display: block !important; height: auto !important; }
.site-content .accordion-button { pointer-events: none; }
.site-content .accordion-button::after { display: none; }
```

Map colors to existing tokens (e.g. `.site-content .text-primary { color: var(--incas-orange-deep); }`, `.site-content .bg-body-tertiary { background: var(--paper-warm); }`, `.site-content .text-body-secondary { color: var(--ink-soft); }`). Every rule must be prefixed `.site-content ` so it cannot leak into the app chrome.

- [ ] **Step 7: Run tests + typecheck + build**

Run:
```bash
npx vitest run
npm run typecheck
npm run build:demo
```
Expected: all PASS; demo builds.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/ContentPage.tsx frontend/src/pages/OffersPage.tsx frontend/src/pages/ContentPage.test.tsx frontend/src/styles/site-content.css frontend/src/router/index.tsx
git commit -m "feat(frontend): add ContentPage/OffersPage, content routes, scoped styles

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Placeholder cleanup + no-legacy-link audit + docs

**Files:**
- Modify: `frontend/src/pages/LandingPage.tsx`, `frontend/src/pages/TeamPage.tsx` (verify only), `frontend/src/content/team.ts` (verify)
- Modify: `readme.md`

**Interfaces:** none (content/audit task).

- [ ] **Step 1: Audit for React→legacy links and placeholder copy**

Run:
```bash
grep -rnE 'href="/(about|offers|contact-form|language-tandem|suggest-event|calendar|events)|url_for|/language-tandem"' frontend/src --include=*.tsx --include=*.ts
grep -rniE 'lorem|placeholder|fake|slogan|coming soon|1000\+|500\+|todo' frontend/src/pages --include=*.tsx
```
Expected: identify any hardcoded legacy `href`s and any invented statistics/slogans on public pages.

- [ ] **Step 2: Fix findings**

- Replace any raw `<a href="/legacy...">` in public pages with react-router `<NavLink to="...">` targets from the site payload.
- Remove invented statistics/slogans from `LandingPage.tsx` (Acceptance §2: "Remove unfinished public placeholder text such as demo slogans or fake statistics"). Replace with real INCAS copy or delete the block.
- Confirm `TeamPage.tsx` keeps graceful fallbacks for missing member image/description and that `team.ts` holds real, maintainable content (no `sample`/`demo` names). If sample names remain, that's a content edit for the maintainer — leave a clearly marked `// TODO(maintainer): replace with real team roster` only if real data is unavailable, and note it in the handoff.

- [ ] **Step 3: Document the regen step**

Add to `readme.md` (near the Static demo section):

```markdown
### Regenerating site content for the demo

The React app reads public site copy from `app/site_content.py`. After editing
it, regenerate the committed demo snapshot:

    DATABASE_URL="sqlite://" python -m app.export_site_content

`tests/test_export_site_content.py` fails if the committed
`frontend/src/content/site.generated.json` is out of sync.
```

- [ ] **Step 4: Full verification**

Run:
```bash
DATABASE_URL="sqlite://" pytest tests/ -q
npx vitest run
npm run typecheck
npm run build && npm run build:demo
```
Expected: all PASS; both builds succeed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/LandingPage.tsx frontend/src/pages/TeamPage.tsx frontend/src/content/team.ts readme.md
git commit -m "chore(frontend): remove placeholder copy, drop legacy links, document regen

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage §1:** localization (Tasks 1,6), locale persistence incl. cookie mirror (Task 6), full nav (Tasks 1,7), footer + social (Tasks 1,7), light/dark separate from page-theme (Task 7, distinct storage key/control), no legacy links (Task 9). ✓
- **Spec coverage §2:** all 13 content pages served with preserved en/de copy (Tasks 2,3,8), Contact/Offers indexes (Task 8), team fallbacks + real content + out-of-DB (Task 9), placeholder removal (Task 9). ✓
- **Demo:** committed snapshot + sync test (Task 3,5). ✓
- **Assumptions to verify during execution:** `useAsync` return shape (Task 8 Step 3); static image base path `/static/` (Task 8); presence of `@testing-library/react` (Task 6). Each has an inline note to adapt.
- **Accordion interactivity** intentionally dropped (static-expanded) per approved design.
