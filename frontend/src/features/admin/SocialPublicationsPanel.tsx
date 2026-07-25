import { useState } from "react";

import type { AdminSocialPublication } from "../../api/types";
import { ErrorState, Loading, PageHeader, StatusBadge } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { DataViews } from "./DataViews";

export function SocialPublicationsPanel() {
  const data = useData();
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const state = useAsync(() => data.getAdminSocial({ status, provider }), [data, status, provider]);
  const retry = async (item: AdminSocialPublication) => {
    setBusyId(item.id);
    setError(null);
    try {
      await data.retrySocial(item.id);
      state.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Publication retry failed.");
    } finally {
      setBusyId(null);
    }
  };
  const actions = (item: AdminSocialPublication) => <div className="form-actions">{item.permalink ? <a className="btn btn-ghost btn-sm" href={item.permalink} target="_blank" rel="noreferrer">Open</a> : null}{item.status === "failed" ? <button className="btn btn-outline btn-sm" type="button" disabled={busyId === item.id} onClick={() => void retry(item)}>{busyId === item.id ? "Retrying…" : "Retry"}</button> : null}</div>;
  const providerLabel = (item: AdminSocialPublication) => <>{item.provider || "Unknown provider"}{item.isSimulated ? <span className="badge badge-warn">simulated</span> : null}</>;
  const card = (item: AdminSocialPublication) => <><small>{providerLabel(item)}</small><h3>{item.postTitle || "Untitled post"}</h3><StatusBadge status={item.status} /><p>{item.errorMessage || `${item.attemptCount} attempt(s)`}</p>{actions(item)}</>;

  return <>
    <PageHeader kicker="Admin" title="Social publications" sub="Scheduled, published, failed, and simulated provider operations." />
    <div className="admin-filterbar">
      <label><span className="sr-only">Social provider</span><select aria-label="Social provider" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">All providers</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select></label>
      <label><span className="sr-only">Publication status</span><select aria-label="Publication status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="failed">Failed</option></select></label>
    </div>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    {state.loading ? <Loading /> : state.error || !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : <DataViews items={state.data.items} keyFor={(item) => item.id} columns={["Post", "Provider", "Status", "Attempts", "Last attempt", "Actions"]} renderCells={(item) => [item.postTitle || "Untitled post", providerLabel(item), <StatusBadge status={item.status} />, item.attemptCount, item.lastAttemptAt ? new Date(item.lastAttemptAt).toLocaleString() : "—", actions(item)]} renderCard={card} empty="No matching social publications." />}
  </>;
}
