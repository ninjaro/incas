import { useState } from "react";

import type { AdminPayment } from "../../api/types";
import type { Locale } from "../../api/types";
import { ConfirmDialog, ErrorState, Loading, PageHeader, StatusBadge, statusLabel } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { useCurrentLocale } from "../../i18n/LocaleContext";
import { DataViews } from "./DataViews";

type PaymentAction = "refund_pending" | "refunded" | "cancelled";

function formatAmount(item: AdminPayment, locale: Locale) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: item.currency || "EUR" })
      .format(item.amountCents / 100);
  } catch {
    return `${(item.amountCents / 100).toFixed(2)} ${item.currency || "EUR"}`;
  }
}

function registrationLabel(item: AdminPayment, locale: Locale) {
  if (item.registrationName && item.registrationPublicId) {
    return `${item.registrationName} (${item.registrationPublicId})`;
  }
  return item.registrationName || item.registrationPublicId
    || (locale === "de" ? "Keine verknüpfte Anmeldung" : "No linked registration");
}

export function PaymentsPanel() {
  const data = useData();
  const locale = useCurrentLocale();
  const de = locale === "de";
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState<{ item: AdminPayment; next: PaymentAction } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = useAsync(() => data.getAdminPayments(status), [data, status]);

  const update = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      await data.updateAdminPayment(pending.item.id, pending.next);
      setPending(null);
      state.reload();
    } catch (reason) {
      setPending(null);
      setError(reason instanceof Error ? reason.message : de ? "Die Zahlung konnte nicht aktualisiert werden." : "Payment update failed.");
    } finally {
      setBusy(false);
    }
  };
  const actions = (item: AdminPayment) => <div className="form-actions">
    {item.status === "paid" ? <button className="btn btn-outline btn-sm" type="button" disabled={busy} onClick={() => { setError(null); setPending({ item, next: "refund_pending" }); }}>{de ? "Erstattung ausstehend" : "Refund pending"}</button> : null}
    {item.status === "refund_pending" ? <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => { setError(null); setPending({ item, next: "refunded" }); }}>{de ? "Als erstattet markieren" : "Mark refunded"}</button> : null}
    {item.status === "pending" ? <button className="btn btn-danger btn-sm" type="button" disabled={busy} onClick={() => { setError(null); setPending({ item, next: "cancelled" }); }}>{de ? "Stornieren" : "Cancel"}</button> : null}
  </div>;
  const provider = (item: AdminPayment) => <>{item.provider || (de ? "Unbekannter Anbieter" : "Unknown provider")}{item.isSimulated ? <span className="badge badge-warn">{de ? "simuliert" : "simulated"}</span> : null}</>;
  const card = (item: AdminPayment) => <>
    <small>{item.publicId || (de ? "Keine Zahlungs-ID" : "No payment ID")}</small>
    <h3>{item.eventTitle || (de ? "Unbekanntes Event" : "Unknown event")}</h3>
    <p>{registrationLabel(item, locale)}</p>
    <p>{provider(item)}</p>
    <StatusBadge status={item.status} />
    <p>{formatAmount(item, locale)}</p>
    {item.audit[0] ? <small>{de ? "Letzte manuelle Änderung" : "Last manual change"}: {statusLabel(item.audit[0].previousStatus, locale)} {de ? "zu" : "to"} {statusLabel(item.audit[0].newStatus, locale)}</small> : null}
    {actions(item)}
  </>;

  const actionLabel = pending?.next === "refund_pending"
    ? (de ? "Erstattung als ausstehend markieren" : "Mark refund pending")
    : pending?.next === "refunded"
      ? (de ? "Als erstattet markieren" : "Mark refunded")
      : (de ? "Zahlung stornieren" : "Cancel payment");

  return <>
    <PageHeader kicker="Admin" title={de ? "Zahlungen" : "Payments"} sub={de ? "Transaktionen zu Anmeldungen und ihr Erstattungsstatus." : "Registration-linked transactions and refund states."} />
    <div className="admin-filterbar"><label><span className="sr-only">{de ? "Zahlungsstatus" : "Payment status"}</span><select aria-label={de ? "Zahlungsstatus" : "Payment status"} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{de ? "Alle Status" : "All statuses"}</option>{["pending", "paid", "failed", "cancelled", "refund_pending", "refunded"].map((value) => <option key={value} value={value}>{statusLabel(value, locale)}</option>)}</select></label></div>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    {state.loading ? <Loading /> : state.error || !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : <DataViews items={state.data.items} keyFor={(item) => item.id} columns={de ? ["Zahlung", "Event", "Anmeldung", "Betrag", "Anbieter", "Status", "Aktionen"] : ["Payment", "Event", "Registration", "Amount", "Provider", "Status", "Actions"]} renderCells={(item) => [item.publicId || "—", item.eventTitle || (de ? "Unbekanntes Event" : "Unknown event"), registrationLabel(item, locale), formatAmount(item, locale), provider(item), <StatusBadge status={item.status} />, actions(item)]} renderCard={card} empty={de ? "Keine passenden Transaktionen." : "No matching transactions."} />}
    <ConfirmDialog
      open={pending !== null}
      title={`${actionLabel}?`}
      body={pending
        ? (de
          ? `${pending.item.publicId || "Diese Transaktion"} für ${registrationLabel(pending.item, locale)} wechselt von „${statusLabel(pending.item.status, locale)}“ zu „${statusLabel(pending.next, locale)}“.`
          : `${pending.item.publicId || "This transaction"} for ${registrationLabel(pending.item, locale)} will change from ${statusLabel(pending.item.status, locale)} to ${statusLabel(pending.next, locale)}.`)
        : undefined}
      confirmLabel={busy ? (de ? "Wird aktualisiert…" : "Updating…") : actionLabel}
      danger={pending?.next === "cancelled"}
      onConfirm={() => void update()}
      onCancel={() => !busy && setPending(null)}
    />
  </>;
}
