# INCAS

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

# Local, SQLite
  python run.py

  # Docker, Postgres
  docker compose up --build
