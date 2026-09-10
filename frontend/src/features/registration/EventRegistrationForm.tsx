import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import type { EventRegistrationInput, PublicPost } from "../../api/types";
import { EventAvailability, EventPaymentNotice } from "../../components/events";
import { Field } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { FormPrivacyNotice } from "../../forms/FormPrivacyNotice";
import { usePublicFormErrors } from "../../forms/usePublicFormErrors";
import { useLocale } from "../../i18n/LocaleContext";

const EMPTY: EventRegistrationInput = {
  firstName: "", lastName: "", email: "", occupation: "", dietPreference: "", comment: "",
};

export function EventRegistrationForm({ event }: { event: PublicPost }) {
  const data = useData();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const de = locale === "de";
  const [form, setForm] = useState(EMPTY);
  const formErrors = usePublicFormErrors(locale);
  const [busy, setBusy] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const registration = event.registration;
  if (!registration) return null;

  const change = <K extends keyof EventRegistrationInput>(field: K, value: EventRegistrationInput[K]) => {
    formErrors.clearField(field);
    if (field === "email") {
      setRecoveryAvailable(false);
      setRecoveryMessage("");
    }
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setBusy(true);
    formErrors.clear();
    try {
      const result = await data.registerForEvent(event.slug, form);
      navigate(`/registrations/${result.publicId}`);
    } catch (error) {
      setRecoveryAvailable(error instanceof ApiError && error.code === "registration_conflict");
      formErrors.report(error);
    } finally {
      setBusy(false);
    }
  };

  const recover = async () => {
    setBusy(true);
    try {
      const result = await data.recoverRegistration(event.slug, form.email);
      setRecoveryMessage(
        de
          ? "Falls eine passende aktive Anmeldung existiert, wird der private Link per E-Mail gesendet."
          : result.message,
      );
    } catch (error) {
      formErrors.report(error);
    } finally {
      setBusy(false);
    }
  };

  if (registration.availability === "closed") {
    return <p className="notice notice-info">{de ? "Die Anmeldung ist geschlossen." : "Registration is closed."}</p>;
  }
  return (
    <section className="event-registration" aria-labelledby="event-registration-title">
      <div className="event-registration-heading">
        <div><p className="page-kicker">{de ? "Teilnehmen" : "Join"}</p><h2 id="event-registration-title">{de ? "Für dieses Event anmelden" : "Register for this event"}</h2></div>
        <EventAvailability registration={registration} locale={locale} />
      </div>
      <EventPaymentNotice registration={registration} locale={locale} />
      {registration.availability === "waiting_list" ? <p className="notice notice-info">{de ? "Die Plätze sind reserviert. Neue Anmeldungen kommen auf die Warteliste." : "All places are reserved. New registrations join the waiting list."}</p> : null}
      {formErrors.errors.form ? <p ref={formErrors.alertRef} className="notice notice-bad" role="alert" tabIndex={-1}>{formErrors.errors.form}</p> : null}
      {recoveryAvailable ? <p className="notice notice-info">{de ? "Du hast den Link verloren?" : "Lost your existing link?"} <button className="link-button" type="button" onClick={recover} disabled={busy}>{de ? "Link per E-Mail anfordern" : "Email my registration link"}</button></p> : null}
      {recoveryMessage ? <p className="notice notice-ok" role="status">{recoveryMessage}</p> : null}
      <form ref={formErrors.formRef} className="card public-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label={de ? "Vorname" : "First name"} error={formErrors.errors.firstName}><input name="firstName" required autoComplete="given-name" value={form.firstName} onChange={(e) => change("firstName", e.target.value)} /></Field>
          <Field label={de ? "Nachname" : "Last name"} error={formErrors.errors.lastName}><input name="lastName" required autoComplete="family-name" value={form.lastName} onChange={(e) => change("lastName", e.target.value)} /></Field>
          <Field label="Email" error={formErrors.errors.email}><input name="email" required type="email" autoComplete="email" value={form.email} onChange={(e) => change("email", e.target.value)} /></Field>
          <Field label={de ? "Tätigkeit" : "Occupation"} error={formErrors.errors.occupation}><input name="occupation" required value={form.occupation} placeholder={de ? "z. B. Student:in an der RWTH" : "e.g. Student at RWTH Aachen"} onChange={(e) => change("occupation", e.target.value)} /></Field>
        </div>
        {event.eventKind === "breakfast" ? <Field label={de ? "Ernährung" : "Meal preference"} error={formErrors.errors.dietPreference}><select name="dietPreference" value={form.dietPreference} onChange={(e) => change("dietPreference", e.target.value as EventRegistrationInput["dietPreference"])}><option value="">-</option><option value="vegan">Vegan</option><option value="vegetarian">Vegetarian</option><option value="omnivore">{de ? "Omnivor" : "Omnivore"}</option></select></Field> : null}
        <Field label={de ? "Kommentar" : "Comments"} error={formErrors.errors.comment}><textarea name="comment" rows={5} value={form.comment} onChange={(e) => change("comment", e.target.value)} /></Field>
        <FormPrivacyNotice
          anchor="event-registration"
          purpose={{
            en: "manage your place, the waiting list and any payment",
            de: "deinen Platz, die Warteliste und eine etwaige Zahlung zu verwalten",
          }}
        />
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "..." : registration.availability === "waiting_list" ? (de ? "Warteliste beitreten" : "Join waiting list") : (de ? "Anmeldung senden" : "Submit registration")}</button>
      </form>
    </section>
  );
}
