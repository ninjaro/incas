import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Field, PageHeader } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { usePublicFormErrors } from "../forms/usePublicFormErrors";
import { useLocale } from "../i18n/LocaleContext";
import { SuggestEventForm } from "./SuggestEventPage";

const COPY = {
  en: {
    kicker: "Contact", title: "Contact and feedback", sub: "Choose the shortest path for your question, idea, or application.",
    name: "Name", email: "Email", subject: "Subject (optional)", message: "Message",
    submit: "Send message", sent: "Your message was submitted.", id: "Reference",
  },
  de: {
    kicker: "Kontakt", title: "Kontakt und Feedback", sub: "Wähle den passenden Weg für deine Frage, Idee oder Anmeldung.",
    name: "Name", email: "E-Mail", subject: "Betreff (optional)", message: "Nachricht",
    submit: "Nachricht senden", sent: "Deine Nachricht wurde gesendet.", id: "Referenz",
  },
};

export function ContactForm() {
  const data = useData();
  const { locale } = useLocale();
  const copy = COPY[locale];
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const formErrors = usePublicFormErrors(locale);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const change = (field: keyof typeof form, value: string) => {
    formErrors.clearField(field);
    setForm((current) => ({ ...current, [field]: value }));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    formErrors.clear();
    try {
      const result = await data.submitContact(form);
      setSubmissionId(result.submissionId);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      formErrors.report(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {submissionId ? <p className="notice notice-ok" role="status">{copy.sent} {copy.id}: <strong>{submissionId}</strong></p> : null}
      {formErrors.errors.form ? <p ref={formErrors.alertRef} className="notice notice-bad" role="alert" tabIndex={-1}>{formErrors.errors.form}</p> : null}
      <form ref={formErrors.formRef} className="card public-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label={copy.name} error={formErrors.errors.name}>
            <input name="name" value={form.name} autoComplete="name" onChange={(event) => change("name", event.target.value)} />
          </Field>
          <Field label={copy.email} error={formErrors.errors.email}>
            <input name="email" type="email" value={form.email} autoComplete="email" onChange={(event) => change("email", event.target.value)} />
          </Field>
        </div>
        <Field label={copy.subject} error={formErrors.errors.subject}>
          <input name="subject" value={form.subject} onChange={(event) => change("subject", event.target.value)} />
        </Field>
        <Field label={copy.message} error={formErrors.errors.message}>
          <textarea name="message" rows={7} value={form.message} onChange={(event) => change("message", event.target.value)} />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "..." : copy.submit}</button>
      </form>
    </>
  );
}

export function ContactPage() {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const de = locale === "de";
  const [params] = useSearchParams();
  const requestedForm = params.get("form");
  const selected = requestedForm === "general" || requestedForm === "suggest-event"
    ? requestedForm
    : null;
  const kind = params.get("kind") === "breakfast" ? "breakfast" : "country_evening";

  return (
    <>
      <PageHeader kicker={copy.kicker} title={copy.title} sub={copy.sub} />
      <nav className="contact-options" aria-label={de ? "Kontaktmöglichkeiten" : "Contact options"}>
        <Link aria-current={selected === "general" ? "page" : undefined} className={selected === "general" ? "is-active" : ""} to="/contact?form=general"><strong>{de ? "Allgemeine Nachricht" : "General message"}</strong><span>{de ? "Fragen, Feedback oder eine Nachricht an das Team." : "Questions, feedback, or a message for the team."}</span></Link>
        <Link aria-current={selected === "suggest-event" ? "page" : undefined} className={selected === "suggest-event" ? "is-active" : ""} to="/contact?form=suggest-event"><strong>{de ? "Event vorschlagen" : "Suggest an event"}</strong><span>{de ? "Schlage ein Land oder eine Kultur für ein Event vor." : "Propose a country or culture for a future event."}</span></Link>
        <Link to="/tandem"><strong>{de ? "Sprachtandem" : "Language Tandem"}</strong><span>{de ? "Öffne die ausführliche Tandem-Anmeldung." : "Open the longer Tandem application."}</span></Link>
      </nav>
      {selected === "general" ? <section className="contact-form-panel" aria-label={de ? "Allgemeines Kontaktformular" : "General contact form"}><ContactForm /></section> : null}
      {selected === "suggest-event" ? <section className="contact-form-panel" aria-label={de ? "Event vorschlagen" : "Suggest an event"}><SuggestEventForm initialKind={kind} /></section> : null}
      {!selected ? <p className="contact-hub-hint">{de ? "Wähle oben eine Option. Es wird immer nur das benötigte Formular geöffnet." : "Choose an option above. Only the form you need will open."}</p> : null}
    </>
  );
}
