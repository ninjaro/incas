import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import type { PaymentInfo } from "../api/types";
import { ErrorState, Loading, PageHeader, StatusBadge } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { useAsync } from "../hooks/useAsync";

function PaymentBox({ slug, priceCents }: { slug: string; priceCents: number }) {
  const data = useData();
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (task: () => Promise<PaymentInfo>) => {
    setBusy(true);
    setError(null);
    try {
      setPayment(await task());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3>Registration payment</h3>
      <p>
        Price: <strong>{(priceCents / 100).toFixed(2)} €</strong>
      </p>
      {payment ? (
        <>
          <p>
            Payment <code>{payment.publicId}</code>: <StatusBadge status={payment.status} />{" "}
            {payment.isSimulated ? <span className="badge badge-warn">simulated</span> : null}
          </p>
          {payment.status === "pending" ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() => run(() => data.simulatePayment(payment.publicId, "success"))}
              >
                Complete payment (simulated)
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy}
                onClick={() => run(() => data.simulatePayment(payment.publicId, "failure"))}
              >
                Simulate failure
              </button>
            </div>
          ) : null}
          {payment.status === "failed" ? (
            <p className="notice notice-bad">
              {payment.errorMessage || "Payment failed."} You can start a new checkout below.
            </p>
          ) : null}
          {payment.status === "paid" ? (
            <p className="notice notice-ok">Payment received — your spot is confirmed.</p>
          ) : null}
          {payment.status !== "pending" ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={busy}
              onClick={() => run(() => data.startCheckout(slug))}
            >
              Start a new checkout
            </button>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => run(() => data.startCheckout(slug))}
        >
          Pay for registration
        </button>
      )}
      {error ? <p className="notice notice-bad">{error}</p> : null}
    </div>
  );
}

export function EventDetailPage() {
  const { slug = "" } = useParams();
  const data = useData();
  const post = useAsync(() => data.getPublicPost(slug), [slug]);

  if (post.loading) return <Loading />;
  if (post.error || !post.data) return <ErrorState error={post.error} onRetry={post.reload} />;

  const event = post.data;

  return (
    <>
      <PageHeader
        kicker={event.startsAt ? new Date(event.startsAt).toLocaleString("en", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }) : "Post"}
        title={event.title.full}
        sub={event.summary}
        actions={
          <Link to="/calendar" className="btn btn-ghost">
            ← Back to calendar
          </Link>
        }
      />
      {event.imageUrl ? (
        <img
          src={event.imageUrl}
          alt=""
          style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)" }}
        />
      ) : null}
      <div className="card" style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
        {event.body || event.summary}
      </div>
      {event.registration?.priceCents ? (
        <PaymentBox slug={event.slug} priceCents={event.registration.priceCents} />
      ) : null}
    </>
  );
}
