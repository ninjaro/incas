# Slice 1 — Public Foundation (design)

Part of the larger effort in `INCAS_REACT_FUNCTIONAL_PARITY_MIGRATION.md`. This
slice covers **§1 (Public Application Shell and Localization)** and **§2
(Information and Organization Content)**. It is the backbone the other public
slices (§3 posts/calendar, §4 forms, §5 admin) build on.

Baseline commit: `c1320f9`. Branch: `react`.

## Goal

Public visitors can browse all INCAS information/organization pages in React,
in English and German, with a complete navigation structure, real footer and
social links, a persisted locale, and a light/dark preference — with no link
sending them back to a legacy Jinja page.

## Non-goals for this slice

- The public forms themselves (contact, event suggestion, tandem, registration)
  — §4, a later slice. Nav links to them may point at existing routes or
  temporary in-React stubs, never at Jinja.
- Posts/calendar parity (§3), admin parity (§5).
- Storing team members in the database (explicit program non-goal). Team stays
  in `frontend/src/content/team.ts` with graceful image/description fallbacks,
  as it already is.

## Source of truth

Bilingual copy stays authored in Python `app/site_content.py`:

- `SITE_UI[locale]` — flat nav/label strings.
- `SITE_OFFERS[locale]` — `{title, subtitle, pages:[{title,url,icon}], forms:[{title,url}]}`.
- `get_footer_offer_links(locale)`, footer social links, copy.
- `SITE_PAGES[locale][slug]` — `{title, image, body_html}` for the 14 pages.
- `get_site_page(slug, locale)` with en fallback.

`site_content.py` remains the single source. React consumes it two ways:
production via new JSON endpoints; static demo via a committed generated JSON
snapshot produced from the same Python.

## Backend — two new public endpoints

Added to `app/api/public.py` (versioned under `/api/v1`, existing error shape).

- `GET /public/site?locale=en|de` →
  ```json
  {
    "locale": "en",
    "strings": { "nav.home": "Home", ... },
    "nav": [ /* structured nav tree, see below */ ],
    "offers": { "title": "...", "subtitle": "...", "pages": [...], "forms": [...] },
    "footer": {
      "copy": "...",
      "social": [ {"platform":"facebook","url":"https://www.facebook.com/INCASAachen/"},
                  {"platform":"instagram","url":"https://www.instagram.com/incas_aachen/"},
                  {"platform":"youtube","url":null}, {"platform":"linkedin","url":null} ],
      "offerLinks": [ {"title":"...","url":"..."} ]
    }
  }
  ```
- `GET /public/content/<slug>?locale=en|de` → `{ slug, title, image, bodyHtml }`.
  `slug` restricted to the 14 known keys; unknown slug → 404 in the standard
  `{"error": {...}}` shape. Missing locale falls back to `en` (matches
  `get_site_page`). Invalid locale coerced to `en` (matches
  `SUPPORTED_LOCALES`/`DEFAULT_LOCALE`).

**URL rewriting.** `SITE_OFFERS`/nav/footer URLs in `site_content.py` are legacy
Flask paths (`/offers/...`, `/language-tandem`, `/contact-form`). The
serializers rewrite them to React hash routes (e.g. `/offers/cafe-lingua`,
`/tandem`, `/contact`) via a small path map so nothing points at Jinja. Legacy
targets not yet migrated map to the eventual React route (stub until its slice).

The 14 content slugs (nav + offers): `about`, `working_groups`,
`team_meetings`, `international_tuesday`, `country_evening`, `cafe_lingua`,
`international_breakfast`, `international_weekend`, `incas_active`,
`board_game_nights`, `dance_workshops`, `language_tandem` (info). "Contact /
Join Us" and "Offers overview" are the contacts/offers index views, not
`SITE_PAGES` bodies — rendered from the `/public/site` `offers` payload +
static React copy (no fake stats/slogans).

## Frontend

### i18n

No i18n dependency (matches the app's hand-rolled `SessionContext`/`DataProvider`
style; only en/de, mostly static). Add:

- `frontend/src/i18n/LocaleContext.tsx` — `LocaleProvider`, `useLocale()`
  (`{locale, setLocale}`), `useT()` returning `t(key) -> string`. Catalog is the
  `strings` map from `/public/site` for the active locale; unknown key returns
  the key (dev-visible). Provider fetches the site payload via the data provider
  and re-fetches on locale change.
- `<LocaleProvider>` added in `app/App.tsx`, inside `DataProviderProvider`.

### Layout

Rewrite `frontend/src/layouts/PublicLayout.tsx`:

- Structured nav from `/public/site`: Home, Events (calendar), About ▾
  (About us / Working Groups / Team Meetings), Offers ▾ (8 offer pages + the
  forms group), Language Tandem, Karaoke, Contact, Team, and Admin (conditional
  on capabilities/demo, as today).
- Locale switcher (EN / DE).
- Light/dark toggle.
- Footer: brand + copy, social icons (Facebook/Instagram active, YouTube/
  LinkedIn placeholder, matching legacy), Links + Offers columns.
- Dropdown menus keyboard-accessible; mobile-collapsible.

### Content pages

- `frontend/src/pages/ContentPage.tsx` — reads `:slug` from the route, fetches
  `/public/content/<slug>` for the active locale via the data provider, renders
  `title`, optional `image` (with graceful fallback when null), and `bodyHtml`
  inside `<div className="site-content" dangerouslySetInnerHTML=...>`. Content is
  authored server-side and trusted, so HTML injection is acceptable here.
  Loading/error/empty states use existing `ui.tsx` helpers.
- Routes in `router/index.tsx`: `/about`, `/about/working-groups`,
  `/about/team-meetings`, `/offers/:slug`. An `offers` index page lists the 8
  offer cards + forms from the site payload.

### Persistence

- **Locale:** stored in `localStorage["incas.locale"]`; on change also written to
  the `locale` cookie (365d) so any still-live legacy page renders the same
  language during migration. Initial value: localStorage → cookie → browser
  language → `en`.
- **Light/dark:** stored in `localStorage["incas.appearance"]`; applied as
  `data-theme="light|dark"` on `<html>`; seeded from `prefers-color-scheme`.
  This is deliberately **separate** from the page-theme voting/forcing system
  (§1 requirement) — different storage key, different UI control, no overlap.

### Scoped content styles

`frontend/src/styles/site-content.css`, scoped under `.site-content`, reproduces
the Bootstrap utility/component subset the 14 pages actually use: `vstack`/`hstack`
+ `gap-*`, `lead`, `text-body-emphasis`/`text-body-secondary`/`text-primary(-emphasis)`,
`fw-bold`, `mb-*`/`mt-*`/`py-*`/`p-*`, `list-group(-flush/-item)`, `border`/
`border-start`/`border-4`, `rounded-2`, `bg-body-tertiary`, `link-primary`, and
the `accordion` structure. Only what these pages use — not all of Bootstrap.

**Accordions render statically expanded.** The injected markup has no Bootstrap
JS, so `.accordion-collapse` is shown open via CSS. This preserves content
parity, not collapse interaction — a conscious, approved trade-off, not a silent
regression.

## Demo (static, no Python)

- `python -m app.export_site_content` writes
  `frontend/src/content/site.generated.json`:
  `{ "en": {strings, nav, offers, footer, pages:{slug:{title,image,bodyHtml}}},
     "de": {...} }`. Committed to git.
- `ApiDataProvider` implements new `getSite(locale)` / `getContent(slug, locale)`
  against the endpoints. `DemoDataProvider` implements them from the committed
  JSON. Both satisfy the same extended `DataProvider` interface; pages never know
  which they got.
- Optional CI check: run the export and fail if `site.generated.json` differs
  from committed (keeps demo in sync with `site_content.py`). Documented as a
  regen step in `readme.md` regardless.

## Testing

- Backend (pytest): `/public/site` both locales (strings/nav/offers/footer,
  URL rewriting away from legacy), `/public/content/<slug>` both locales, en
  fallback, unknown-slug 404, invalid-locale coercion.
- Frontend (vitest): `useT` returns catalog value / falls back to key; locale
  switch re-renders; `DemoDataProvider.getSite/getContent`; `ContentPage`
  renders title/body and handles null image + not-found.
- Sync: a test (or the CI check) asserting `site.generated.json` equals a fresh
  export.

## Acceptance mapping

- §1: en/de localization of nav/content/status/empty (labels + content bodies
  bilingual from one source); locale persisted across navigation and revisits;
  full nav (info/offers/contact/event/tandem/karaoke/team); footer + external
  social links; light/dark preserved and kept separate from page-theme; no
  React link points back to Jinja.
- §2: all 14 pages present with preserved en/de copy (not shortened
  placeholders); team names/descriptions stay real + manually maintainable in
  `team.ts` with image/description fallbacks; team kept out of DB; placeholder
  slogans/fake stats removed from production public pages.

## Files (indicative, not prescriptive)

- Backend: `app/api/public.py` (+serializers), `app/export_site_content.py`,
  tests under `tests/`.
- Frontend: `i18n/LocaleContext.tsx`, `pages/ContentPage.tsx`,
  `pages/OffersPage.tsx`, `layouts/PublicLayout.tsx` (rewrite),
  `data/DataProvider.ts` (+2 methods), `data/ApiDataProvider.ts`,
  `data/DemoDataProvider.ts`, `content/site.generated.json`,
  `styles/site-content.css`, `router/index.tsx`, `app/App.tsx`, tests.
