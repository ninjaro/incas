import { useState } from "react";

import type { AdminSocialPublication } from "../../api/types";
import { ErrorState, Loading, PageHeader, StatusBadge } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { useCurrentLocale } from "../../i18n/LocaleContext";
import { DataViews } from "./DataViews";

export function SocialPublicationsPanel() {
  const data = useData();
  const locale = useCurrentLocale();
  const de = locale === "de";
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
      setError(reason instanceof Error ? reason.message : de ? "Der erneute Versuch ist fehlgeschlagen." : "Publication retry failed.");
    } finally {
      setBusyId(null);
    }
  };
  const actions = (item: AdminSocialPublication) => <div className="form-actions">{item.permalink ? <a className="btn btn-ghost btn-sm" href={item.permalink} target="_blank" rel="noreferrer">{de ? "Öffnen" : "Open"}</a> : null}{item.status === "failed" ? <button className="btn btn-outline btn-sm" type="button" disabled={busyId === item.id} onClick={() => void retry(item)}>{busyId === item.id ? (de ? "Wird wiederholt…" : "Retrying…") : (de ? "Erneut versuchen" : "Retry")}</button> : null}</div>;
  const providerLabel = (item: AdminSocialPublication) => <>{item.provider || (de ? "Unbekannter Anbieter" : "Unknown provider")}{item.isSimulated ? <span className="badge badge-warn">{de ? "simuliert" : "simulated"}</span> : null}</>;
  const untitled = de ? "Beitrag ohne Titel" : "Untitled post";
  const attempts = (count: number) => de ? `${count} Versuch(e)` : `${count} attempt(s)`;
  const card = (item: AdminSocialPublication) => <><small>{providerLabel(item)}</small><h3>{item.postTitle || untitled}</h3><StatusBadge status={item.status} /><p>{item.errorMessage || attempts(item.attemptCount)}</p>{actions(item)}</>;

  return <>
    <PageHeader kicker="Admin" title={de ? "Social-Media-Beiträge" : "Social publications"} sub={de ? "Geplante, veröffentlichte, fehlgeschlagene und simulierte Veröffentlichungen." : "Scheduled, published, failed, and simulated provider operations."} />
    <div className="admin-filterbar">
      <label><span className="sr-only">{de ? "Social-Media-Anbieter" : "Social provider"}</span><select aria-label={de ? "Social-Media-Anbieter" : "Social provider"} value={provider} onChange={(event) => setProvider(event.target.value)}><option value="">{de ? "Alle Anbieter" : "All providers"}</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select></label>
      <label><span className="sr-only">{de ? "Veröffentlichungsstatus" : "Publication status"}</span><select aria-label={de ? "Veröffentlichungsstatus" : "Publication status"} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{de ? "Alle Status" : "All statuses"}</option><option value="scheduled">{de ? "Geplant" : "Scheduled"}</option><option value="published">{de ? "Veröffentlicht" : "Published"}</option><option value="failed">{de ? "Fehlgeschlagen" : "Failed"}</option></select></label>
    </div>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    {state.loading ? <Loading /> : state.error || !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : <DataViews items={state.data.items} keyFor={(item) => item.id} columns={de ? ["Beitrag", "Anbieter", "Status", "Versuche", "Letzter Versuch", "Aktionen"] : ["Post", "Provider", "Status", "Attempts", "Last attempt", "Actions"]} renderCells={(item) => [item.postTitle || untitled, providerLabel(item), <StatusBadge status={item.status} />, item.attemptCount, item.lastAttemptAt ? new Date(item.lastAttemptAt).toLocaleString(locale) : "—", actions(item)]} renderCard={card} empty={de ? "Keine passenden Veröffentlichungen." : "No matching social publications."} />}
  </>;
}
