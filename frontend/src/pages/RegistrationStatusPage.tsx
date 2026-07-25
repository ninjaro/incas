import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link, useParams } from "react-router-dom";

import type { PaymentInfo } from "../api/types";
import { EventRegistrationStatus } from "../components/events";
import { ErrorState, Loading, PageHeader } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { useResilientPolling } from "../hooks/useResilientPolling";
import { useLocale } from "../i18n/LocaleContext";
import { absoluteAppUrl } from "../utils/assets";

export function RegistrationStatusPage() {
  const { publicId = "" } = useParams();
  const data = useData();
  const { locale } = useLocale();
  const de = locale === "de";
  // 90 seconds is at most 40 automatic requests/hour, leaving headroom under
  // the backend's 60/hour tracking limit for manual refreshes and reconnects.
  const state = useResilientPolling({
    load: () => data.getRegistration(publicId),
    deps: [data, publicId],
    intervalMs: 90_000,
    isFinal: (registration) => ["approved", "cancelled"].includes(registration.status),
  });
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const registrationPayment = state.data?.payment ?? null;

  useEffect(() => {
    setPayment(registrationPayment);
  }, [
    registrationPayment?.publicId,
    registrationPayment?.status,
    registrationPayment?.checkoutUrl,
  ]);

  if (state.loading && !state.data) return <Loading />;
  if (!state.data) return <ErrorState error={state.error} onRetry={() => void state.reload()} />;
  const registration = state.data;
  const trackingUrl = absoluteAppUrl(`/registrations/${registration.publicId}`);
  const paymentActionLabel = payment?.status === "pending"
    ? (de ? "Zahlung fortsetzen" : "Resume payment")
    : payment?.status === "failed"
      ? (de ? "Zahlung erneut versuchen" : "Retry payment")
      : (de ? "Zahlung starten" : "Start payment");

  const checkout = async () => {
    setPaymentError(null);
    try {
      const result = await data.startCheckout(registration.event.slug, registration.publicId);
      setPayment(result);
      if (!result.isSimulated && result.checkoutUrl) window.location.assign(result.checkoutUrl);
    } catch (error) {
      setPaymentError(de ? "Die Zahlung konnte nicht gestartet werden." : (error instanceof Error ? error.message : "Payment could not be started."));
    }
  };
  const simulate = async (outcome: "success" | "failure" | "cancel") => {
    if (!payment) return;
    const result = await data.simulatePayment(payment.publicId, outcome);
    setPayment(result);
    await state.reload();
  };

  return (
    <>
      <PageHeader kicker={de ? "Anmeldestatus" : "Registration status"} title={registration.event.title} sub={`${registration.name} - ${registration.publicId}`} actions={<Link className="btn btn-ghost" to={`/events/${registration.event.slug}`}>{de ? "Zum Event" : "Event details"}</Link>} />
      <div className="registration-status-layout">
        <section className="card registration-status-card">
          {state.stale ? <p className="notice notice-info" role="status">{de ? "Die letzten Daten bleiben sichtbar. Die nächste Aktualisierung wird automatisch erneut versucht." : "The last status remains visible. Refresh will retry automatically."}</p> : null}
          <dl className="detail-list">
            <div><dt>{de ? "Anmeldung" : "Application"}</dt><dd>{registration.publicId}</dd></div>
            <div><dt>{de ? "Name" : "Name"}</dt><dd>{registration.name}</dd></div>
            <div><dt>Status</dt><dd><EventRegistrationStatus status={registration.status} position={registration.waitingListPosition} locale={locale} /></dd></div>
            <div><dt>{de ? "Freie Plätze" : "Places remaining"}</dt><dd>{registration.event.placesRemaining} / {registration.event.capacity}</dd></div>
          </dl>
          {registration.status === "waiting_payment" && registration.event.priceCents ? <button className="btn btn-primary" type="button" onClick={checkout}>{paymentActionLabel}</button> : null}
          {paymentError ? <p className="notice notice-bad" role="alert">{paymentError}</p> : null}
          {payment?.isSimulated && payment.status === "pending" ? <div className="notice notice-info"><strong>{de ? "Simulierte Zahlung" : "Simulated payment"}</strong><div className="form-actions"><button className="btn btn-primary btn-sm" type="button" onClick={() => simulate("success")}>{de ? "Erfolg simulieren" : "Simulate success"}</button><button className="btn btn-outline btn-sm" type="button" onClick={() => simulate("failure")}>{de ? "Fehler simulieren" : "Simulate failure"}</button><button className="btn btn-ghost btn-sm" type="button" onClick={() => simulate("cancel")}>{de ? "Abbruch simulieren" : "Simulate cancellation"}</button></div></div> : null}
          {payment ? <div className={`notice notice-${payment.status === "paid" ? "ok" : payment.status === "failed" || payment.status === "cancelled" ? "bad" : "info"}`}><strong>{de ? "Zahlungsstatus" : "Payment status"}: {payment.status.replaceAll("_", " ")}</strong>{payment.errorMessage ? <p>{payment.errorMessage}</p> : null}{payment.expiresAt && payment.status === "pending" ? <p>{de ? "Reserviert bis" : "Reserved until"}: <time dateTime={payment.expiresAt}>{new Date(payment.expiresAt).toLocaleString(locale)}</time></p> : null}</div> : null}
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => void state.reload()}>{de ? "Status aktualisieren" : "Refresh status"}</button>
        </section>
        <aside className="card registration-qr">
          <QRCodeSVG value={trackingUrl} size={200} bgColor="#fffdfb" fgColor="#111827" level="M" marginSize={2} title={de ? "QR-Code für diese Anmeldung" : "QR code for this registration"} />
          <p>{de ? "Scanne den Code, um diese Statusseite zu öffnen." : "Scan to reopen this status page."}</p>
        </aside>
      </div>
    </>
  );
}
