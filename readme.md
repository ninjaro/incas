# INCAS

Python/Flask backend + React/TypeScript frontend.

- Flask owns business logic, validation, permissions, the database, and the
  versioned JSON API under `/api/v1`.
- The React SPA (in `frontend/`) covers the public pages and the unified
  admin panel. Production uses stable BrowserRouter URLs such as `/calendar`
  and `/events/<slug>`; Flask serves the application shell on direct loads.
- A static demo build runs the same React pages against synthetic in-memory
  fixtures — no Python, database, or tokens required.

## Frontend

```bash
npm install
npm run dev          # Vite dev server (proxies /api to 127.0.0.1:5000)
npm run typecheck    # tsc --noEmit (required CI step)
npm test             # vitest
npm run build        # SPA -> static/app + legacy widget -> static/dist
npm run build:demo   # static demo -> dist-demo
```

For full local development run Flask and Vite together:

```bash
python run.py        # terminal 1: backend on :5000
npm run dev          # terminal 2: frontend with API proxy
```

Or build once (`npm run build`) and open `http://127.0.0.1:5000/`.

## Static demo

`npm run build:demo` produces `dist-demo/`, a fully static site using the
`DemoDataProvider` with synthetic fixtures. Open `dist-demo/index.html` via
any static file server. The `.github/workflows/deploy-demo.yml` workflow
builds and deploys it to GitHub Pages on every push; `ci.yml` runs type
checking, frontend and backend tests, and all builds.

Demo access keys (demo build only): `demo-admin`, `demo-review`,
`demo-karaoke`, `demo-tandem-blind`.

### Regenerating site content for the demo

The React app reads public site copy from `app/site_content.py`. After editing
it, regenerate the committed demo snapshot:

    DATABASE_URL="sqlite://" python -m app.export_site_content

`tests/test_export_site_content.py` fails if the committed
`frontend/src/content/site.generated.json` is out of sync.

## API

JSON endpoints live under `/api/v1` (session, access unlock, public
config/posts/calendar, admin themes/votes/forces, posts and templates,
language tandem, karaoke queue, social publishing, payments). Errors use a
consistent shape:

```json
{"error": {"code": "theme_force_locked", "message": "…", "details": {}}}
```

Write requests must send the `X-INCAS-Api: 1` header (CSRF protection).
Every protected endpoint enforces capabilities server-side and returns 403.

### Social publishing and payments

Both integrations are adapter-based and run in **mock mode** without
credentials: simulated provider responses, flagged `isSimulated`, no network
calls. The production adapters are not implemented yet, so selecting
`PAYMENT_PROVIDER=stripe` or `SOCIAL_PROVIDER_MODE=graph` fails fast instead
of silently behaving like a real integration. See
[`docs/integrations.md`](docs/integrations.md) for the adapter contracts.

```bash
PAYMENT_PROVIDER=mock
SOCIAL_PROVIDER_MODE=mock
PAYMENT_RESERVATION_MINUTES=20
```

## Backend tests

```bash
pip install pytest
DATABASE_URL="sqlite://" pytest tests/ -q
```

## Local

```bash
python -m venv .venv
source .venv/bin/activate
pip install --no-cache-dir -r requirements.txt
python run.py
```

```bash
http://127.0.0.1:5000
```

The local run path uses SQLite by default through `sqlite:///incas.db`.

## Local reset

```bash
rm -f instance/incas.db incas.db
python run.py
```

## Admin access

Only the bootstrap `access_keys` credential is configured outside the
database. In development its phrase is `dev-access-keys`. Use it once at
`/admin` to create short-lived, scoped keys; Posts, Forms, Tandem, Karaoke,
Themes, Payments, and Registration keys are never hardcoded.

Production must set `ACCESS_KEYS_ROOT_HASH` to the SHA-256 digest of a strong,
unique bootstrap phrase. Do not reuse the development phrase:

```bash
printf '%s' 'replace-with-a-long-random-phrase' | sha256sum
```

Access keys unlock capability scopes. New scopes: `theme_review` (preview and
vote for page themes), `theme_force` (additionally force the public theme, at
most once per page per 24 hours), `karaoke_queue` (moderate the karaoke song
queue), and the graduated tandem scopes `language_tandem_blind` /
`language_tandem_private` / `language_tandem_corrections`. Legacy
`language_tandem*` keys map to the closest new capabilities automatically.

Event registration and form access follow least privilege. Registrations split
into `event_registrations_view` (capacity monitoring, no identities),
`event_registrations_checkin` (door check-in and status changes),
`event_registrations_private` (participant contact and free-text data) and
`event_registrations_export` (bulk CSV download — a distinct privilege). Forms
split into `forms_triage` (status workflow with identities redacted) and
`forms_full` (name, email, phone, message). The legacy broad `event_registrations`
and `forms` scopes still work and expand to all of the above.

## Data retention

`app/retention.py` enforces lifecycle-based deletion (contact/suggestion 180d
after resolution, tandem 90d after a finalised pair or departure date, event
registrations 180d after the event ends, karaoke 30d after the event, access
attempts 90d; unmatched form/tandem records fall back to 365d after
submission). Dependent rows — tandem match/duplicate state, payment records,
karaoke audit — are deleted with the parent. Run `flask --app run:app
purge-personal-data` once, or the `retention-worker` service (in
`docker-compose.yml`) continuously.

## Docker

Docker runs the app with Postgres via `docker-compose.yml`.

Set production secrets first. `SECRET_KEY` must contain at least 32 random
characters, and the root hash is the digest described above.

```bash
export SECRET_KEY='replace-with-at-least-32-random-characters'
export ACCESS_KEYS_ROOT_HASH='replace-with-a-sha256-hex-digest'
export POSTGRES_PASSWORD='replace-with-a-database-password'
docker compose up --build
```

```bash
http://127.0.0.1:5000
```

The image entrypoint runs `flask db upgrade` before Gunicorn starts. Separate
`social-worker` and `reservation-worker` services process scheduled
publications and expired unpaid registrations every 30 seconds. Publication,
capacity release, and waiting-list promotion do not depend on web traffic.

Useful environment overrides:

```bash
INCAS_PORT=8080 docker compose up --build
```

To stop the containers:

```bash
docker compose down
```

To remove the Postgres data volume as well:

```bash
docker compose down -v
```

## Local PostgreSQL

The standard requirements include the PostgreSQL driver. Point `DATABASE_URL`
at PostgreSQL and run migrations before starting the application.

## Database migrations

PostgreSQL is the supported production database. Event capacity uses a locked
event row and shared rate limits use atomic database upserts, so SQLite is for
single-process local development and tests only.

For a fresh database:

```bash
flask --app run:app db upgrade
```

For an existing deployment created before Alembic was introduced:

1. Stop all web and worker processes and create a verified database backup.
2. Deploy this release without starting the application.
3. Run `flask --app run:app db stamp 1e2379697b4a` exactly once.
4. Run `flask --app run:app db upgrade` and restart the services.
5. Verify posts, access keys, registrations, payments, and Tandem data before removing the backup.

Do not stamp a fresh database. Historical revisions contain frozen schema
operations and migration errors are intentionally fatal.

## Production settings

`APP_ENV=production` fails startup unless all safety requirements hold:

- `SECRET_KEY`: explicit and at least 32 characters;
- `ACCESS_KEYS_ROOT_HASH`: non-development SHA-256 digest;
- `DATABASE_URL`: PostgreSQL;
- `AUTO_CREATE_SCHEMA=0` and `SEED_DEMO_DATA=0`;
- `SESSION_COOKIE_SECURE=1`.

Admin sessions are HTTP-only, SameSite=Lax, secure in production, and expire
after eight hours by default (`ADMIN_SESSION_HOURS`). Forwarded IP, host, and
scheme headers are ignored unless `TRUST_PROXY_HEADERS=1`; set
`TRUSTED_PROXY_COUNT` to the exact number of trusted proxies when enabling it.
