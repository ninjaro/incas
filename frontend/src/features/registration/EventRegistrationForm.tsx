import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import type { EventRegistrationInput, PublicPost } from "../../api/types";
import { EventAvailability, EventPaymentNotice } from "../../components/events";
import { Field } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const registration = event.registration;
  if (!registration) return null;

  const submit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const result = await data.registerForEvent(event.slug, form);
      navigate(`/registrations/${result.publicId}`);
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fields);
      else setErrors({ form: error instanceof Error ? error.message : "Registration failed." });
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
      {errors.form ? <p className="notice notice-bad" role="alert">{errors.form}</p> : null}
      <form className="card public-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label={de ? "Vorname" : "First name"} error={errors.firstName}><input required autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label={de ? "Nachname" : "Last name"} error={errors.lastName}><input required autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Email" error={errors.email}><input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={de ? "Tätigkeit" : "Occupation"} error={errors.occupation}><input required value={form.occupation} placeholder={de ? "z. B. Student:in an der RWTH" : "e.g. Student at RWTH Aachen"} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></Field>
        </div>
        {event.eventKind === "breakfast" ? <Field label={de ? "Ernährung" : "Meal preference"} error={errors.dietPreference}><select value={form.dietPreference} onChange={(e) => setForm({ ...form, dietPreference: e.target.value as EventRegistrationInput["dietPreference"] })}><option value="">-</option><option value="vegan">Vegan</option><option value="vegetarian">Vegetarian</option><option value="omnivore">{de ? "Omnivor" : "Omnivore"}</option></select></Field> : null}
        <Field label={de ? "Kommentar" : "Comments"} error={errors.comment}><textarea rows={5} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></Field>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "..." : registration.availability === "waiting_list" ? (de ? "Warteliste beitreten" : "Join waiting list") : (de ? "Anmeldung senden" : "Submit registration")}</button>
      </form>
    </section>
  );
}
