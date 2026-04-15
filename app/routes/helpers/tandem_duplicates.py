from app.duplicate_review import canonicalize_duplicate_pair
from app.models import TandemDuplicateDecision

DUPLICATE_DECISION_LABELS = {
    "ignore": "Ignored",
    "different": "Marked different",
}


def get_duplicate_decision_map_for_request(request_id):
    decisions = (
        TandemDuplicateDecision.query
        .filter(
            (TandemDuplicateDecision.left_request_id == request_id)
            | (TandemDuplicateDecision.right_request_id == request_id)
        )
        .all()
    )

    return {
        (decision.left_request_id, decision.right_request_id): decision
        for decision in decisions
    }

def get_duplicate_decision_for_pair(left_id, right_id):
    left_id, right_id = canonicalize_duplicate_pair(left_id, right_id)

    return (
        TandemDuplicateDecision.query
        .filter_by(left_request_id=left_id, right_request_id=right_id)
        .first()
    )

def delete_duplicate_decisions_for_request(request_id):
    TandemDuplicateDecision.query.filter(
        (TandemDuplicateDecision.left_request_id == request_id)
        | (TandemDuplicateDecision.right_request_id == request_id)
    ).delete(synchronize_session=False)


