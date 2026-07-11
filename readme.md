# INCAS

Python/Flask backend + React/TypeScript frontend.

- Flask owns business logic, validation, permissions, the database, and the
  versioned JSON API under `/api/v1`.
- The React SPA (in `frontend/`) covers the public pages and the unified
  admin panel, and is served by Flask at `/app` in production.
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

Or build once (`npm run build`) and open `http://127.0.0.1:5000/app`.

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
calls. Environment variables for real adapters (never commit tokens):

```bash
FACEBOOK_PAGE_ACCESS_TOKEN=…  FACEBOOK_PAGE_ID=…
INSTAGRAM_ACCESS_TOKEN=…      INSTAGRAM_USER_ID=…
PAYMENT_PROVIDER=stripe       STRIPE_SECRET_KEY=…
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

```bash
dev-posts
dev-language-tandem
dev-language-tandem-corrections
dev-forms
dev-access-keys
```

Access keys unlock capability scopes. New scopes: `theme_review` (preview and
vote for page themes), `theme_force` (additionally force the public theme, at
most once per page per 24 hours), `karaoke_queue` (moderate the karaoke song
queue), and the graduated tandem scopes `language_tandem_blind` /
`language_tandem_private` / `language_tandem_corrections`. Legacy
`language_tandem*` keys map to the closest new capabilities automatically.

## Docker

Docker runs the app with Postgres via `docker-compose.yml`.

```bash
docker compose up --build
```

```bash
http://127.0.0.1:5000
```

Useful environment overrides:

```bash
INCAS_PORT=8080 POSTGRES_PASSWORD=change-me SECRET_KEY=change-me docker compose up --build
```

To stop the containers:

```bash
docker compose down
```

To remove the Postgres data volume as well:

```bash
docker compose down -v
```

## Optional local Postgres deps

The Docker image installs these automatically. Install them locally only if you want to run without Docker while pointing `DATABASE_URL` at Postgres.

```bash
pip install --no-cache-dir -r requirements-docker.txt
```
