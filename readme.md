# INCAS

## Local

```bash
python -m venv .venv
source .venv/bin/activate
pip install --no-cache-dir -r requirements.txt
python run.py
````

```bash
http://127.0.0.1:5000
```

## Local reset

```bash
rm -f instance/incas.db incas.db
python run.py
```

## Admin access

```bash
dev-admin
```

## Docker deps

```bash
pip install --no-cache-dir -r requirements-docker.txt
```
