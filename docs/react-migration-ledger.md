# React Migration Ledger

This ledger is the source of truth for legacy retirement. `Parity` means the React/API flow preserves the useful behavior; `redesign` means the replacement intentionally changes presentation while preserving product meaning. No primary area remains legacy-only.

| Area | Legacy source | React replacement | Status | Decision | Test coverage |
|---|---|---|---|---|---|
| Public shell and navigation | Jinja base/nav | `PublicLayout` | parity | React primary; mobile and accessible dropdowns | unit, E2E, visual, axe |
| Landing Poster/Showcase/Scroll | legacy landing modes | Hero | redesign | merged | visual |
| Landing Magazine/Studio | legacy landing modes | Editorial | redesign | merged | visual |
| Landing Board/Timeline | legacy landing modes | Event First | redesign | merged | visual |
| Landing Portal/Classic | legacy landing modes | Portal | parity | migrated | visual |
| Calendar Classic | Jinja calendar | Month Grid | parity | migrated | unit, E2E, visual |
| Calendar Grid | reference/public grid | Public Month Grid | parity | migrated | keyboard, visual, axe |
| Calendar Agenda/Bulletin | legacy modes | Agenda | redesign | merged | visual |
| Calendar Timeline | legacy mode | week-grouped Timeline | parity | migrated | semantic unit, visual |
| Calendar Board | legacy mode | Editorial Board | redesign | distinct renderer | semantic unit, visual |
| Calendar Cards | legacy mode | Cards | parity | migrated | visual |
| Calendar Table/Hardcore | legacy modes | Table | redesign | merged | visual |
| Calendar Mini | legacy mode | none | retired | duplicates Month with weaker mobile behavior | registry test |
| Event domain and API | model/template helpers | generated event registry and typed `/api/v1` contract | parity | Python source, generated TypeScript snapshot | contract tests |
| Event detail | Jinja post detail | `EventDetailPage` | parity | complete metadata and feature slots | unit, E2E, visual |
| Event maps | demo libraries | shared `EventMap` | redesign | OpenLayers for trips; amCharts for country/region/venue | contract, failure E2E, visual |
| Contact and suggestion forms | Jinja forms | React forms plus Flask validation | parity | migrated | API, E2E, axe |
| Language Tandem form | Jinja variants | guided and classic React forms | parity | migrated | API, E2E, visual |
| Event registration and tracking | Jinja form/status | React form, status page, QR | parity | explicit server transition matrix | lifecycle, E2E, visual |
| Payments and refunds | partial mock workflow | registration-bound adapter and admin audit | parity | payment drives confirmation | lifecycle, webhook, E2E |
| Karaoke | standalone public page | event-scoped feature and admin queue | redesign | no global public product | API and demo scoping tests, E2E |
| Offers | authored/duplicated grids | one structured React grid | parity | explicit icon system and embedded forms | unit, E2E, visual |
| Board Games and Dance | offer-only cards | dedicated content routes | redesign | placeholder information pages | route crawl, visual |
| Team | standalone Jinja page | About section | redesign | `/team` compatibility redirect | unit, visual |
| Posts and templates admin | Jinja admin | `PostsPanel` | parity | explicit clears and scheduled defaults | API and unit |
| Forms Inbox | separate admin lists | shared `DataViews` panel | parity | synchronized table/grid/list preference | unit, E2E, visual |
| Registration admin | Jinja queues | `EventRegistrationsPanel` | parity | API-provided actions only | lifecycle, E2E, visual |
| Tandem admin | multiple capability pages | one progressive panel | parity | blind/private/corrections capabilities | API, merge, demo tests |
| Access keys | Jinja admin | React key/QR/scanner panel | parity | secret visible once | API, E2E |
| Social publications | request-triggered mock | admin panel and dedicated worker | redesign | idempotent worker with bounded backoff | worker/API tests |
| Theme governance | mixed registries | generated registry and React review panel | parity | cooldown/audit preserved | registry/API/E2E/visual |
| Appearance | theme-coupled styles | persistent light/dark semantic palette | redesign | independent of page layout themes | E2E, visual, axe |
| Localization | partial Jinja translations | EN/DE React locale context | parity for public routes | admin operational surfaces are English-only for v1 | key, route, E2E |
| Demo fixtures | independent offsets | canonical generated Tuesday/Saturday catalog | parity | same contracts and business rules | snapshot and demo-provider tests |
| Database evolution | startup mutation | frozen Alembic revisions | parity | PostgreSQL production; explicit legacy stamp path | fresh/legacy migration tests |
| Production routing and SEO | Jinja URLs and `/app/#` | BrowserRouter canonical URLs | redesign | HashRouter only in static demo | route crawl/direct-load/meta tests |
| Legacy templates and widgets | Jinja UI | React primary frontend | retired from primary use | retained temporarily as compatibility code only; no React link targets it | route matrix |

## Operational Decisions

- PostgreSQL is the only supported production database. A locked `Post` row serializes capacity decisions across workers. SQLite receives an additional process lock for local/test determinism but is not a supported multi-worker deployment.
- Rate-limit buckets are atomically stored in the shared production database. Forwarded addresses are trusted only when `TRUST_PROXY_HEADERS` and the exact proxy count are configured.
- The static demo deliberately keeps HashRouter because it has no rewrite-capable server. Production uses BrowserRouter and Flask shell responses with per-event metadata.
- Admin copy remains English-only in the first migrated release. Public navigation, landing, calendar, event, forms, registration, karaoke, Team, errors, map fallback, dates, and shared event states support English and German.
- Map dependency, license, attribution, CSP, integrity, and fallback decisions are recorded in `docs/map-delivery.md`.
