from datetime import timedelta

from app.models import SocialPublication, Post, db, get_configured_local_now
from app.social import PublishResult, SOCIAL_MAX_ATTEMPTS, process_due_social_publications


class FailingPublisher:
    def publish_post(self, _post):
        return PublishResult(ok=False, error_code="provider_down", error_message="Try later")


def create_publication(app, slug, scheduled_for):
    with app.app_context():
        post = Post(slug=slug, title=slug, status="published", is_active=True)
        db.session.add(post)
        db.session.flush()
        publication = SocialPublication(
            post_id=post.id,
            provider="facebook",
            status="scheduled",
            scheduled_for=scheduled_for,
        )
        db.session.add(publication)
        db.session.commit()
        return publication.id


def test_due_social_failure_uses_bounded_exponential_retries(app, monkeypatch):
    publication_id = create_publication(
        app,
        "scheduled-failure",
        get_configured_local_now() - timedelta(seconds=1),
    )
    monkeypatch.setattr("app.social.get_publisher", lambda _provider: FailingPublisher())

    with app.app_context():
        assert [item.id for item in process_due_social_publications()] == [publication_id]
        publication = db.session.get(SocialPublication, publication_id)
        assert publication.status == "failed"
        assert publication.attempt_count == 1
        assert publication.scheduled_for > get_configured_local_now()
        assert process_due_social_publications() == []

        for _ in range(SOCIAL_MAX_ATTEMPTS - 1):
            publication.scheduled_for = get_configured_local_now() - timedelta(seconds=1)
            db.session.commit()
            process_due_social_publications()
        assert publication.attempt_count == SOCIAL_MAX_ATTEMPTS
        assert publication.scheduled_for is None
        assert process_due_social_publications() == []


def test_future_and_published_social_jobs_are_not_repeated(app):
    future_id = create_publication(
        app,
        "scheduled-future",
        get_configured_local_now() + timedelta(hours=1),
    )
    due_id = create_publication(
        app,
        "scheduled-success",
        get_configured_local_now() - timedelta(seconds=1),
    )
    with app.app_context():
        processed = process_due_social_publications()
        assert [item.id for item in processed] == [due_id]
        assert db.session.get(SocialPublication, due_id).status == "published"
        assert db.session.get(SocialPublication, future_id).status == "scheduled"
        assert process_due_social_publications() == []


def test_social_worker_cli_can_process_once(app):
    create_publication(
        app,
        "scheduled-cli",
        get_configured_local_now() - timedelta(seconds=1),
    )
    result = app.test_cli_runner().invoke(args=["social-worker", "--once"])
    assert result.exit_code == 0, result.output
    assert "processed=1" in result.output
