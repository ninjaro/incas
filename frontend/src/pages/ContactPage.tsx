import { useState, type FormEvent } from "react";

import { ApiError } from "../api/client";
import { Field, PageHeader } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { useLocale } from "../i18n/LocaleContext";

const COPY = {
  en: {
    kicker: "Contact", title: "Write to INCAS", sub: "Questions, ideas, or feedback for the volunteer team.",
    name: "Name", email: "Email", subject: "Subject (optional)", message: "Message",
    submit: "Send message", sent: "Your message was submitted.", id: "Reference",
  },
  de: {
    kicker: "Kontakt", title: "Schreib INCAS", sub: "Fragen, Ideen oder Feedback für das ehrenamtliche Team.",
    name: "Name", email: "E-Mail", subject: "Betreff (optional)", message: "Nachricht",
    submit: "Nachricht senden", sent: "Deine Nachricht wurde gesendet.", id: "Referenz",
  },
};

export function ContactPage() {
  const data = useData();
  const { locale } = useLocale();
  const copy = COPY[locale];
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const result = await data.submitContact(form);
      setSubmissionId(result.submissionId);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fields);
      else setErrors({ form: error instanceof Error ? error.message : "Submission failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader kicker={copy.kicker} title={copy.title} sub={copy.sub} />
      {submissionId ? <p className="notice notice-ok" role="status">{copy.sent} {copy.id}: <strong>{submissionId}</strong></p> : null}
      {errors.form ? <p className="notice notice-bad" role="alert">{errors.form}</p> : null}
      <form className="card public-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label={copy.name} error={errors.name}>
            <input value={form.name} autoComplete="name" aria-invalid={Boolean(errors.name)} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label={copy.email} error={errors.email}>
            <input type="email" value={form.email} autoComplete="email" aria-invalid={Boolean(errors.email)} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
        </div>
        <Field label={copy.subject} error={errors.subject}>
          <input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
        </Field>
        <Field label={copy.message} error={errors.message}>
          <textarea rows={7} value={form.message} aria-invalid={Boolean(errors.message)} onChange={(event) => setForm({ ...form, message: event.target.value })} />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "..." : copy.submit}</button>
      </form>
    </>
  );
}
