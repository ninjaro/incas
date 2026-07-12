"""Database-backed fixed-window limits shared by every application worker."""

import hashlib
import time
from datetime import datetime

from flask import request
from sqlalchemy import delete

from app.models import RateLimitBucket, db


def _client_identifier():
    # ProxyFix rewrites remote_addr only when trusted proxy handling is enabled.
    return request.remote_addr or "unknown"


def consume_rate_limit(scope, limit, window_seconds, *, now_epoch=None):
    now_epoch = time.time() if now_epoch is None else now_epoch
    window = int(now_epoch // window_seconds)
    raw_key = f"{scope}\0{_client_identifier()}\0{window}".encode("utf-8")
    bucket_key = hashlib.sha256(raw_key).hexdigest()
    expires_epoch = (window + 1) * window_seconds
    now_datetime = datetime.fromtimestamp(now_epoch)
    expires_at = datetime.fromtimestamp(expires_epoch)

    # Expired rows cannot be reused because the window is part of the key.
    # Opportunistic cleanup keeps the shared table bounded without a worker.
    db.session.execute(delete(RateLimitBucket).where(RateLimitBucket.expires_at < now_datetime))
    dialect = db.session.get_bind().dialect.name
    values = {"key": bucket_key, "count": 1, "expires_at": expires_at}
    if dialect == "postgresql":
        from sqlalchemy.dialects.postgresql import insert

        statement = insert(RateLimitBucket).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=[RateLimitBucket.key],
            set_={"count": RateLimitBucket.count + 1},
        ).returning(RateLimitBucket.count)
    elif dialect == "sqlite":
        from sqlalchemy.dialects.sqlite import insert

        statement = insert(RateLimitBucket).values(**values)
        statement = statement.on_conflict_do_update(
            index_elements=[RateLimitBucket.key],
            set_={"count": RateLimitBucket.count + 1},
        ).returning(RateLimitBucket.count)
    else:
        bucket = db.session.get(RateLimitBucket, bucket_key)
        if bucket is None:
            bucket = RateLimitBucket(**values)
            db.session.add(bucket)
        else:
            bucket.count += 1
        db.session.commit()
        return bucket.count <= limit, max(1, int(expires_epoch - now_epoch))

    count = db.session.execute(statement).scalar_one()
    db.session.commit()
    return count <= limit, max(1, int(expires_epoch - now_epoch))
