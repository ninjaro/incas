import { useState } from "react";

import type { TandemMatch, TandemRequest } from "../../api/types";
import {
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  StatusBadge,
} from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";

function requestLabel(item: TandemRequest): string {
  if (item.firstName || item.lastName) {
    return `${item.firstName ?? ""} ${item.lastName ?? ""}`.trim();
  }
  return `Request ${item.ref.slice(0, 6).toUpperCase()}`;
}

function languageSummary(item: TandemRequest): string {
  const offered = item.offeredLanguages.join(", ").toUpperCase() || "—";
  const requested = item.requestedLanguages.join(", ").toUpperCase() || "—";
  return `${offered} → ${requested}`;
}

function RequestRow({
  item,
  showPrivate,
  onOpen,
}: {
  item: TandemRequest;
  showPrivate: boolean;
  onOpen: (ref: string) => void;
}) {
  return (
    <tr>
      <td>
        <strong>{requestLabel(item)}</strong>
        {showPrivate && item.email ? (
          <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>{item.email}</div>
        ) : null}
      </td>
      <td>{languageSummary(item)}</td>
      <td>
        {item.gender}, {new Date().getFullYear() - item.birthYear}
      </td>
      <td>{item.countryOfOrigin}</td>
      <td>{item.departureDate ?? "—"}</td>
      <td>
        {item.isViewed ? (
          <span className="badge badge-neutral">viewed</span>
        ) : (
          <span className="badge badge-info">new</span>
        )}
      </td>
      <td>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onOpen(item.ref)}>
          Matches
        </button>
      </td>
    </tr>
  );
}

function MatchGroup({ title, matches, showPrivate }: { title: string; matches: TandemMatch[]; showPrivate: boolean }) {
  if (matches.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ margin: "0 0 8px" }}>{title}</h4>
      {matches.map((match) => (
        <div key={match.candidate.ref} className="queue-row">
          <div className="queue-song">
            <strong>{requestLabel(match.candidate)}</strong>
            <span>
              {languageSummary(match.candidate)}
              {showPrivate && match.candidate.email ? ` · ${match.candidate.email}` : ""}
            </span>
            {match.reasons.slice(0, 2).map((reason) => (
              <span key={reason} style={{ display: "block", fontSize: "0.78rem" }}>
                {reason}
              </span>
            ))}
          </div>
          <StatusBadge status={match.category} />
          <span className="badge badge-neutral">score {match.score}</span>
        </div>
      ))}
    </div>
  );
}

function MatchesView({ refId, showPrivate, onBack }: { refId: string; showPrivate: boolean; onBack: () => void }) {
  const data = useData();
  const matches = useAsync(() => data.getTandemMatches(refId), [refId]);

  if (matches.loading) return <Loading />;
  if (matches.error) return <ErrorState error={matches.error} onRetry={matches.reload} />;

  const payload = matches.data;
  const total = Object.values(payload?.groups ?? {}).reduce((sum, list) => sum + list.length, 0);

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
        ← Back to all requests
      </button>
      {payload ? (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Matches for {requestLabel(payload.source)}</h3>
          <p style={{ color: "var(--ink-soft)" }}>{languageSummary(payload.source)}</p>
          {total === 0 ? (
            <EmptyState>No matching partners found yet.</EmptyState>
          ) : (
            <>
              <MatchGroup title="Full matches" matches={payload.groups.full ?? []} showPrivate={showPrivate} />
              <MatchGroup title="Partial matches" matches={payload.groups.partial ?? []} showPrivate={showPrivate} />
              <MatchGroup title="Weak matches" matches={payload.groups.weak ?? []} showPrivate={showPrivate} />
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

export function TandemPanel() {
  const data = useData();
  const list = useAsync(() => data.getTandemRequests(), []);
  const [openRef, setOpenRef] = useState<string | null>(null);

  if (list.loading) return <Loading />;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;

  const payload = list.data;
  const showPrivate = payload?.capabilities.private ?? false;

  return (
    <>
      <PageHeader
        kicker="Language exchange"
        title="Language Tandem"
        sub={
          showPrivate
            ? "Full access: personal details are visible. Use the matching tools to pair partners."
            : "Blind mode: requests are anonymized and personal details are never sent to your browser. Matching still works."
        }
      />
      {!showPrivate ? (
        <p className="notice notice-info">
          🔒 Contact details are hidden at the API level. Activate a stronger key to reveal them.
        </p>
      ) : null}
      {openRef ? (
        <MatchesView refId={openRef} showPrivate={showPrivate} onBack={() => setOpenRef(null)} />
      ) : (payload?.items.length ?? 0) === 0 ? (
        <EmptyState>No tandem requests yet.</EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Request</th>
              <th>Languages</th>
              <th>Profile</th>
              <th>Origin</th>
              <th>Departure</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(payload?.items ?? []).map((item) => (
              <RequestRow key={item.ref} item={item} showPrivate={showPrivate} onOpen={setOpenRef} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
