import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import type { EventSuggestionSubmission } from "../api/types";
import { Field, PageHeader } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { FormPrivacyNotice } from "../forms/FormPrivacyNotice";
import { usePublicFormErrors } from "../forms/usePublicFormErrors";
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
  const [dirty, setDirty] = useState(false);
  const formErrors = usePublicFormErrors(locale);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const de = locale === "de";

  useEffect(() => {
    if (!dirty) setForm((current) => ({ ...current, kind: initialKind }));
  }, [dirty, initialKind]);

  const change = <K extends keyof EventSuggestionSubmission>(field: K, value: EventSuggestionSubmission[K]) => {
    setDirty(true);
    formErrors.clearField(field);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    formErrors.clear();
    try {
      const response = await data.submitEventSuggestion(form);
      setResult(response.submissionId);
    } catch (error) {
      formErrors.report(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {result ? <p className="notice notice-ok" role="status">{de ? "Vorschlag gesendet" : "Suggestion submitted"}: <strong>{result}</strong></p> : null}
      {formErrors.errors.form ? <p ref={formErrors.alertRef} className="notice notice-bad" role="alert" tabIndex={-1}>{formErrors.errors.form}</p> : null}
      <form ref={formErrors.formRef} className="card public-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label={de ? "Eventtyp" : "Event type"} error={formErrors.errors.kind}>
            <select name="kind" value={form.kind} onChange={(event) => change("kind", event.target.value as EventSuggestionSubmission["kind"])}>
              <option value="country_evening">{de ? "Länderabend" : "Country Evening"}</option>
              <option value="breakfast">{de ? "Internationales Frühstück" : "International Breakfast"}</option>
            </select>
          </Field>
          <Field label={de ? "Land oder Kultur" : "Country or culture"} error={formErrors.errors.country}>
            <input name="country" value={form.country} onChange={(event) => change("country", event.target.value)} />
          </Field>
        </div>
        <Field label={de ? "Kontaktname" : "Contact name"} error={formErrors.errors.contactName}>
          <input name="contactName" autoComplete="name" value={form.contactName} onChange={(event) => change("contactName", event.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="Email" error={formErrors.errors.contactEmail}>
            <input name="contactEmail" type="email" autoComplete="email" value={form.contactEmail} onChange={(event) => change("contactEmail", event.target.value)} />
          </Field>
          <Field label={de ? "Telefon" : "Phone"} error={formErrors.errors.contactPhone}>
            <input name="contactPhone" type="tel" autoComplete="tel" value={form.contactPhone} onChange={(event) => change("contactPhone", event.target.value)} />
          </Field>
        </div>
        <Field label={de ? "Kommentar" : "Comment"} error={formErrors.errors.comment}>
          <textarea name="comment" rows={6} value={form.comment} onChange={(event) => change("comment", event.target.value)} />
        </Field>
        <FormPrivacyNotice purpose={{ en: "review and follow up on your suggestion", de: "deinen Vorschlag zu prüfen und nachzuverfolgen" }} />
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "..." : de ? "Vorschlag senden" : "Submit suggestion"}</button>
      </form>
    </>
  );
}
