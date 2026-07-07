"""Social publishing adapters for Facebook and Instagram.

Tokens are read from environment variables on the server and never reach the
frontend. When credentials are absent the mock adapter is used: it returns
deterministic simulated provider responses so the whole publish/retry flow
stays testable, and it never performs network requests.

Environment variables:
    FACEBOOK_PAGE_ACCESS_TOKEN  - Facebook Page token (real adapter)
    FACEBOOK_PAGE_ID            - Facebook Page id
    INSTAGRAM_ACCESS_TOKEN      - Instagram Graph API token (real adapter)
    INSTAGRAM_USER_ID           - Instagram business account id
"""

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from app.models import (
    SOCIAL_STATUS_FAILED,
    SOCIAL_STATUS_PUBLISHED,
    SOCIAL_STATUS_SCHEDULED,
    SocialPublication,
    db,
    get_configured_local_now,
)

SOCIAL_PROVIDERS = ("facebook", "instagram")


@dataclass
class PublishResult:
    ok: bool
    provider_post_id: str = ""
    permalink: str = ""
    media_url: str = ""
    error_code: str = ""
    error_message: str = ""
    simulated: bool = False
    extra: dict = field(default_factory=dict)


class SocialPublisher(ABC):
    provider = ""

    @abstractmethod
    def publish_post(self, post) -> PublishResult: ...

    def schedule_post(self, post, publish_at) -> PublishResult:
        # Scheduling is stored locally; the actual publish happens when the
        # due-job processor runs at/after publish_at.
        return PublishResult(ok=True, simulated=isinstance(self, MockSocialPublisher))

    def get_status(self, publication) -> str:
        return publication.status

    def retry(self, post) -> PublishResult:
        return self.publish_post(post)


class MockSocialPublisher(SocialPublisher):
    def __init__(self, provider):
        self.provider = provider

    def publish_post(self, post) -> PublishResult:
        prefix = "FB" if self.provider == "facebook" else "IG"
        provider_post_id = f"{prefix}-SIM-{post.id:06d}"
        permalink = f"https://{self.provider}.example.com/simulated/{post.slug}"
        # Simulated stable hosted media URL; real providers may not return one,
        # in which case the original image_url stays the fallback.
        media_url = (
            f"https://cdn.simulated.social/{self.provider}/{post.slug}.jpg"
            if post.image_url
            else ""
        )
        return PublishResult(
            ok=True,
            provider_post_id=provider_post_id,
            permalink=permalink,
            media_url=media_url,
            simulated=True,
        )


def has_real_credentials(provider):
    if provider == "facebook":
        return bool(os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN") and os.getenv("FACEBOOK_PAGE_ID"))
    if provider == "instagram":
        return bool(os.getenv("INSTAGRAM_ACCESS_TOKEN") and os.getenv("INSTAGRAM_USER_ID"))
    return False


def get_publisher(provider) -> SocialPublisher:
    if provider not in SOCIAL_PROVIDERS:
        raise ValueError(f"Unknown social provider: {provider}")
    # A real Graph API adapter can be slotted in here once credentials exist;
    # until then every environment gets the mock so no network calls happen.
    return MockSocialPublisher(provider)


def _apply_result(publication, result):
    publication.attempt_count = (publication.attempt_count or 0) + 1
    publication.last_attempt_at = get_configured_local_now()
    publication.is_simulated = result.simulated
    if result.ok:
        publication.status = SOCIAL_STATUS_PUBLISHED
        publication.provider_post_id = result.provider_post_id
        publication.permalink = result.permalink
        publication.media_url = result.media_url
        publication.error_code = ""
        publication.error_message = ""
    else:
        publication.status = SOCIAL_STATUS_FAILED
        publication.error_code = result.error_code or "publish_failed"
        publication.error_message = result.error_message


def publish_post_to_channels(post, channels):
    """Publish one post to the given channels, one result row per channel.

    A failure on one channel never affects the others or the local post.
    Retrying uses the same rows, so successful channels are not duplicated.
    """
    publications = []
    for provider in channels:
        if provider not in SOCIAL_PROVIDERS:
            continue
        publication = SocialPublication.query.filter_by(post_id=post.id, provider=provider).first()
        if publication and publication.status == SOCIAL_STATUS_PUBLISHED:
            publications.append(publication)
            continue
        if publication is None:
            publication = SocialPublication(post_id=post.id, provider=provider)
            db.session.add(publication)

        result = get_publisher(provider).publish_post(post)
        _apply_result(publication, result)

        if result.ok and result.media_url and not post.image_url:
            post.image_url = result.media_url

        publications.append(publication)

    db.session.commit()
    return publications


def schedule_post_channels(post, channels, publish_at):
    publications = []
    for provider in channels:
        if provider not in SOCIAL_PROVIDERS:
            continue
        publication = SocialPublication.query.filter_by(post_id=post.id, provider=provider).first()
        if publication is None:
            publication = SocialPublication(post_id=post.id, provider=provider)
            db.session.add(publication)
        if publication.status != SOCIAL_STATUS_PUBLISHED:
            publication.status = SOCIAL_STATUS_SCHEDULED
            publication.scheduled_for = publish_at
        publications.append(publication)
    db.session.commit()
    return publications


def process_due_social_publications():
    """Publish scheduled channel jobs whose time has come.

    Called opportunistically from request handlers so publication does not
    depend on an admin keeping a page open. Failed jobs stay visible with
    status "failed" and can be retried from the admin panel.
    """
    now = get_configured_local_now()
    due = (
        SocialPublication.query
        .filter(SocialPublication.status == SOCIAL_STATUS_SCHEDULED)
        .filter(SocialPublication.scheduled_for.isnot(None))
        .filter(SocialPublication.scheduled_for <= now)
        .all()
    )
    from app.models import Post

    for publication in due:
        post = db.session.get(Post, publication.post_id)
        if post is None:
            publication.status = SOCIAL_STATUS_FAILED
            publication.error_code = "post_missing"
            continue
        result = get_publisher(publication.provider).publish_post(post)
        _apply_result(publication, result)
        if result.ok and result.media_url and not post.image_url:
            post.image_url = result.media_url
    if due:
        db.session.commit()
    return due


def serialize_publication(publication):
    return {
        "id": publication.id,
        "postId": publication.post_id,
        "provider": publication.provider,
        "status": publication.status,
        "providerPostId": publication.provider_post_id,
        "permalink": publication.permalink,
        "mediaUrl": publication.media_url,
        "errorCode": publication.error_code,
        "errorMessage": publication.error_message,
        "attemptCount": publication.attempt_count,
        "isSimulated": bool(publication.is_simulated),
        "scheduledFor": publication.scheduled_for.isoformat() if publication.scheduled_for else None,
        "lastAttemptAt": publication.last_attempt_at.isoformat() if publication.last_attempt_at else None,
    }
