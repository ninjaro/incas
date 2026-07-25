import { useState } from "react";

import type { AdminPayment } from "../../api/types";
import { ConfirmDialog, ErrorState, Loading, PageHeader, StatusBadge } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { DataViews } from "./DataViews";

type PaymentAction = "refund_pending" | "refunded" | "cancelled";

function formatAmount(item: AdminPayment) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: item.currency || "EUR" })
      .format(item.amountCents / 100);
  } catch {
    return `${(item.amountCents / 100).toFixed(2)} ${item.currency || "EUR"}`;
  }
}

function registrationLabel(item: AdminPayment) {
  if (item.registrationName && item.registrationPublicId) {
    return `${item.registrationName} (${item.registrationPublicId})`;
  }
  return item.registrationName || item.registrationPublicId || "No linked registration";
}

export function PaymentsPanel() {
  const data = useData();
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
      setError(reason instanceof Error ? reason.message : "Payment update failed.");
    } finally {
      setBusy(false);
    }
  };
  const actions = (item: AdminPayment) => <div className="form-actions">
    {item.status === "paid" ? <button className="btn btn-outline btn-sm" type="button" disabled={busy} onClick={() => { setError(null); setPending({ item, next: "refund_pending" }); }}>Refund pending</button> : null}
    {item.status === "refund_pending" ? <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => { setError(null); setPending({ item, next: "refunded" }); }}>Mark refunded</button> : null}
    {item.status === "pending" ? <button className="btn btn-danger btn-sm" type="button" disabled={busy} onClick={() => { setError(null); setPending({ item, next: "cancelled" }); }}>Cancel</button> : null}
  </div>;
  const provider = (item: AdminPayment) => <>{item.provider || "Unknown provider"}{item.isSimulated ? <span className="badge badge-warn">simulated</span> : null}</>;
  const card = (item: AdminPayment) => <>
    <small>{item.publicId || "No payment ID"}</small>
    <h3>{item.eventTitle || "Unknown event"}</h3>
    <p>{registrationLabel(item)}</p>
    <p>{provider(item)}</p>
    <StatusBadge status={item.status} />
    <p>{formatAmount(item)}</p>
    {item.audit[0] ? <small>Last manual change: {item.audit[0].previousStatus.replaceAll("_", " ")} to {item.audit[0].newStatus.replaceAll("_", " ")}</small> : null}
    {actions(item)}
  </>;

  const actionLabel = pending?.next === "refund_pending"
    ? "Mark refund pending"
    : pending?.next === "refunded"
      ? "Mark refunded"
      : "Cancel payment";

  return <>
    <PageHeader kicker="Admin" title="Payments" sub="Registration-linked transactions and refund states." />
    <div className="admin-filterbar"><label><span className="sr-only">Payment status</span><select aria-label="Payment status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{["pending", "paid", "failed", "cancelled", "refund_pending", "refunded"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label></div>
    {error ? <p className="notice notice-bad" role="alert">{error}</p> : null}
    {state.loading ? <Loading /> : state.error || !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : <DataViews items={state.data.items} keyFor={(item) => item.id} columns={["Payment", "Event", "Registration", "Amount", "Provider", "Status", "Actions"]} renderCells={(item) => [item.publicId || "—", item.eventTitle || "Unknown event", registrationLabel(item), formatAmount(item), provider(item), <StatusBadge status={item.status} />, actions(item)]} renderCard={card} empty="No matching transactions." />}
    <ConfirmDialog
      open={pending !== null}
      title={`${actionLabel}?`}
      body={pending ? `${pending.item.publicId || "This transaction"} for ${registrationLabel(pending.item)} will change from ${pending.item.status.replaceAll("_", " ")} to ${pending.next.replaceAll("_", " ")}.` : undefined}
      confirmLabel={busy ? "Updating…" : actionLabel}
      danger={pending?.next === "cancelled"}
      onConfirm={() => void update()}
      onCancel={() => !busy && setPending(null)}
    />
  </>;
}
