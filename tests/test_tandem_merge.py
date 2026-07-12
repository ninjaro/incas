from app.models import (
    LanguageTandemRequest,
    TandemDuplicateDecision,
    TandemMatchReviewState,
    db,
)
from tests.conftest import API_HEADERS, unlock


def test_tandem_merge_retargets_review_and_duplicate_state(client, app):
    unlock(client, app, "tandem-corrections", ["language_tandem_corrections"])
    items = client.get("/api/v1/admin/language-tandem").get_json()["items"]
    keep, remove, candidate = items[:3]

    review = client.post(
        f"/api/v1/admin/language-tandem/{remove['ref']}/matches/{candidate['ref']}/review",
        json={"action": "shortlist"},
        headers=API_HEADERS,
    )
    assert review.status_code == 200
    decision = client.post(
        "/api/v1/admin/language-tandem/duplicates/decision",
        json={
            "leftRef": remove["ref"],
            "rightRef": candidate["ref"],
            "decision": "different",
            "note": "Reviewed before merge",
        },
        headers=API_HEADERS,
    )
    assert decision.status_code == 200

    merged = client.post(
        "/api/v1/admin/language-tandem/duplicates/merge",
        json={"keepRef": keep["ref"], "removeRef": remove["ref"]},
        headers=API_HEADERS,
    )
    assert merged.status_code == 200, merged.get_json()
    assert merged.get_json()["ref"] == keep["ref"]

    with app.app_context():
        assert db.session.get(LanguageTandemRequest, remove["id"]) is None
        state = TandemMatchReviewState.query.filter_by(
            source_request_id=keep["id"],
            candidate_request_id=candidate["id"],
        ).one()
        assert state.is_shortlisted is True
        decision = TandemDuplicateDecision.query.filter_by(
            left_request_id=min(keep["id"], candidate["id"]),
            right_request_id=max(keep["id"], candidate["id"]),
        ).one()
        assert decision.decision == "different"
        assert decision.note == "Reviewed before merge"
