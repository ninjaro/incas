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
  const state = useAsync(() => data.getAdminSocial({ status, provider }), [data, status, provider]);
  if (state.loading && !state.data) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  const retry = async (item: AdminSocialPublication) => { await data.retrySocial(item.id); state.reload(); };
  const actions = (item: AdminSocialPublication) => <>{item.permalink ? <a className="btn btn-ghost btn-sm" href={item.permalink} target="_blank" rel="noreferrer">Open</a> : null}{item.status === "failed" ? <button className="btn btn-outline btn-sm" type="button" onClick={() => retry(item)}>Retry</button> : null}</>;
  const providerLabel = (item: AdminSocialPublication) => <>{item.provider}{item.isSimulated ? <span className="badge badge-warn">simulated</span> : null}</>;
  const card = (item: AdminSocialPublication) => <><small>{providerLabel(item)}</small><h3>{item.postTitle}</h3><StatusBadge status={item.status} /><p>{item.errorMessage || `${item.attemptCount} attempt(s)`}</p>{actions(item)}</>;
  return <><PageHeader kicker="Admin" title="Social publications" sub="Scheduled, published, failed, and simulated provider operations." /><div className="admin-filterbar"><select value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">All providers</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="failed">Failed</option></select></div><DataViews items={state.data.items} keyFor={(item) => item.id} columns={["Post", "Provider", "Status", "Attempts", "Last attempt", "Actions"]} renderCells={(item) => [item.postTitle, providerLabel(item), <StatusBadge status={item.status} />, item.attemptCount, item.lastAttemptAt ? new Date(item.lastAttemptAt).toLocaleString() : "-", actions(item)]} renderCard={card} empty="No matching social publications." /></>;
}
