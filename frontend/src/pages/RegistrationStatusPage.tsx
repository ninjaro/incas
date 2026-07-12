import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link, useParams } from "react-router-dom";

import type { PaymentInfo } from "../api/types";
import { EventRegistrationStatus } from "../components/events";
import { ErrorState, Loading, PageHeader } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";
import { absoluteAppUrl } from "../utils/assets";

export function RegistrationStatusPage() {
  const { publicId = "" } = useParams();
  const data = useData();
  const { locale } = useLocale();
  const de = locale === "de";
  const state = useAsync(() => data.getRegistration(publicId), [data, publicId]);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(state.reload, 10_000);
    return () => window.clearInterval(timer);
  }, [state.reload]);

  if (state.loading && !state.data) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  const registration = state.data;
  const trackingUrl = absoluteAppUrl(`/registrations/${registration.publicId}`);

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
          <dl className="detail-list">
            <div><dt>{de ? "Anmeldung" : "Application"}</dt><dd>{registration.publicId}</dd></div>
            <div><dt>{de ? "Name" : "Name"}</dt><dd>{registration.name}</dd></div>
            <div><dt>Status</dt><dd><EventRegistrationStatus status={registration.status} position={registration.waitingListPosition} locale={locale} /></dd></div>
            <div><dt>{de ? "Freie Plätze" : "Places remaining"}</dt><dd>{registration.event.placesRemaining} / {registration.event.capacity}</dd></div>
          </dl>
          {registration.status === "waiting_payment" && registration.event.priceCents ? <button className="btn btn-primary" type="button" onClick={checkout}>{de ? "Zahlung starten" : "Start payment"}</button> : null}
          {paymentError ? <p className="notice notice-bad" role="alert">{paymentError}</p> : null}
          {payment?.isSimulated && payment.status === "pending" ? <div className="notice notice-info"><strong>{de ? "Simulierte Zahlung" : "Simulated payment"}</strong><div className="form-actions"><button className="btn btn-primary btn-sm" type="button" onClick={() => simulate("success")}>{de ? "Erfolg simulieren" : "Simulate success"}</button><button className="btn btn-outline btn-sm" type="button" onClick={() => simulate("failure")}>{de ? "Fehler simulieren" : "Simulate failure"}</button></div></div> : null}
          {payment ? <p>{de ? "Zahlungsstatus" : "Payment status"}: <strong>{payment.status}</strong></p> : null}
          <button className="btn btn-ghost btn-sm" type="button" onClick={state.reload}>{de ? "Status aktualisieren" : "Refresh status"}</button>
        </section>
        <aside className="card registration-qr">
          <QRCodeSVG value={trackingUrl} size={200} bgColor="#fffdfb" fgColor="#111827" level="M" marginSize={2} title={de ? "QR-Code für diese Anmeldung" : "QR code for this registration"} />
          <p>{de ? "Scanne den Code, um diese Statusseite zu öffnen." : "Scan to reopen this status page."}</p>
        </aside>
      </div>
    </>
  );
}
