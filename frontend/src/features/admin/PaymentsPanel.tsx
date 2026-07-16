import { useState } from "react";

import type { AdminPayment } from "../../api/types";
import { ErrorState, Loading, PageHeader, StatusBadge } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useAsync } from "../../hooks/useAsync";
import { DataViews } from "./DataViews";

export function PaymentsPanel() {
  const data = useData();
  const [status, setStatus] = useState("");
  const state = useAsync(() => data.getAdminPayments(status), [data, status]);
  if (state.loading && !state.data) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  const update = async (item: AdminPayment, next: "refund_pending" | "refunded" | "cancelled") => { await data.updateAdminPayment(item.id, next); state.reload(); };
  const actions = (item: AdminPayment) => <div className="form-actions">{item.status === "paid" ? <button className="btn btn-outline btn-sm" type="button" onClick={() => update(item, "refund_pending")}>Refund pending</button> : null}{item.status === "refund_pending" ? <button className="btn btn-primary btn-sm" type="button" onClick={() => update(item, "refunded")}>Mark refunded</button> : null}{item.status === "pending" ? <button className="btn btn-danger btn-sm" type="button" onClick={() => update(item, "cancelled")}>Cancel</button> : null}</div>;
  const provider = (item: AdminPayment) => <>{item.provider}{item.isSimulated ? <span className="badge badge-warn">simulated</span> : null}</>;
  const card = (item: AdminPayment) => <><small>{item.publicId}</small><h3>{item.eventTitle}</h3><p>{item.registrationName} / {item.registrationPublicId}</p><p>{provider(item)}</p><StatusBadge status={item.status} /><p>{new Intl.NumberFormat(undefined, { style: "currency", currency: item.currency }).format(item.amountCents / 100)}</p>{item.audit[0] ? <small>Last manual change: {item.audit[0].previousStatus.replaceAll("_", " ")} to {item.audit[0].newStatus.replaceAll("_", " ")}</small> : null}{actions(item)}</>;
  return <><PageHeader kicker="Admin" title="Payments" sub="Registration-linked transactions and refund states." /><div className="admin-filterbar"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{["pending", "paid", "failed", "cancelled", "refund_pending", "refunded"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div><DataViews items={state.data.items} keyFor={(item) => item.id} columns={["Payment", "Event", "Registration", "Amount", "Provider", "Status", "Actions"]} renderCells={(item) => [item.publicId, item.eventTitle, `${item.registrationName ?? "-"} (${item.registrationPublicId ?? "-"})`, new Intl.NumberFormat(undefined, { style: "currency", currency: item.currency }).format(item.amountCents / 100), provider(item), <StatusBadge status={item.status} />, actions(item)]} renderCard={card} empty="No matching transactions." /></>;
}
