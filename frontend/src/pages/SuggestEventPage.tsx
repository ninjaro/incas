import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { ApiError } from "../api/client";
import type { EventSuggestionSubmission } from "../api/types";
import { Field, PageHeader } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { useLocale } from "../i18n/LocaleContext";

export function SuggestEventPage() {
  const [params] = useSearchParams();
  const initialKind = params.get("kind") === "breakfast" ? "breakfast" : "country_evening";
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <>
      <PageHeader kicker={de ? "Mitmachen" : "Get involved"} title={de ? "Event vorschlagen" : "Suggest an event"} sub={de ? "Stell eine Kultur oder ein Land für ein kommendes Event vor." : "Propose a country or culture for a future INCAS event."} />
      <SuggestEventForm initialKind={initialKind} />
    </>
  );
}

export function SuggestEventForm({ initialKind = "country_evening" }: { initialKind?: EventSuggestionSubmission["kind"] }) {
  const data = useData();
  const { locale } = useLocale();
  const [form, setForm] = useState<EventSuggestionSubmission>({ kind: initialKind, country: "", contactName: "", contactEmail: "", contactPhone: "", comment: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const de = locale === "de";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const response = await data.submitEventSuggestion(form);
      setResult(response.submissionId);
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fields);
      else setErrors({ form: error instanceof Error ? error.message : "Submission failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {result ? <p className="notice notice-ok" role="status">{de ? "Vorschlag gesendet" : "Suggestion submitted"}: <strong>{result}</strong></p> : null}
      {errors.form ? <p className="notice notice-bad" role="alert">{errors.form}</p> : null}
      <form className="card public-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label={de ? "Eventtyp" : "Event type"} error={errors.kind}>
            <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as EventSuggestionSubmission["kind"] })}>
              <option value="country_evening">{de ? "Länderabend" : "Country Evening"}</option>
              <option value="breakfast">{de ? "Internationales Frühstück" : "International Breakfast"}</option>
            </select>
          </Field>
          <Field label={de ? "Land oder Kultur" : "Country or culture"} error={errors.country}>
            <input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
          </Field>
        </div>
        <Field label={de ? "Kontaktname" : "Contact name"} error={errors.contactName}>
          <input autoComplete="name" value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} />
        </Field>
        <div className="form-grid">
          <Field label="Email" error={errors.contactEmail}>
            <input type="email" autoComplete="email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
          </Field>
          <Field label={de ? "Telefon" : "Phone"} error={errors.contactPhone}>
            <input type="tel" autoComplete="tel" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} />
          </Field>
        </div>
        <Field label={de ? "Kommentar" : "Comment"} error={errors.comment}>
          <textarea rows={6} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "..." : de ? "Vorschlag senden" : "Submit suggestion"}</button>
      </form>
    </>
  );
}
