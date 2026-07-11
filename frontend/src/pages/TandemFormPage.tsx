import { useState, type FormEvent } from "react";

import { ApiError } from "../api/client";
import type { FormOptions, TandemSubmission } from "../api/types";
import { Field, Loading, PageHeader } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { usePublicTheme } from "../features/themes/usePublicTheme";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";

const EMPTY_FORM: TandemSubmission = {
  firstName: "", lastName: "", email: "", occupation: "", occupationOther: "",
  gender: "", birthYear: "", departureDate: "", countryOfOrigin: "",
  offeredLanguages: [], offeredLanguageLevels: {}, requestedLanguages: [],
  requestedNativeOnly: false, sameGenderOnly: false, preferredGender: "", comment: "",
};

function selectedValues(element: HTMLSelectElement) {
  return Array.from(element.selectedOptions, (option) => option.value);
}

function ProfileFields({ form, setForm, errors, options, de }: FormSectionProps) {
  return (
    <div className="form-section">
      <div className="form-grid">
        <Field label={de ? "Vorname" : "First name"} error={errors.firstName}>
          <input autoComplete="given-name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
        </Field>
        <Field label={de ? "Nachname" : "Last name"} error={errors.lastName}>
          <input autoComplete="family-name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </Field>
        <Field label={de ? "Geschlecht" : "Gender"} error={errors.gender}>
          <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
            <option value="">-</option><option value="Female">{de ? "Weiblich" : "Female"}</option><option value="Male">{de ? "Männlich" : "Male"}</option><option value="Divers">{de ? "Divers" : "Diverse"}</option><option value="Prefer not to say">{de ? "Keine Angabe" : "Prefer not to say"}</option>
          </select>
        </Field>
        <Field label={de ? "Geburtsjahr" : "Birth year"} error={errors.birthYear}>
          <input type="number" min="1900" max={new Date().getFullYear()} value={form.birthYear} onChange={(event) => setForm({ ...form, birthYear: event.target.value })} />
        </Field>
        <Field label={de ? "Geplantes Abreisedatum" : "Planned departure date"} error={errors.departureDate}>
          <input type="date" value={form.departureDate} onChange={(event) => setForm({ ...form, departureDate: event.target.value })} />
        </Field>
        <Field label={de ? "Herkunftsland" : "Country of origin"} error={errors.countryOfOrigin}>
          <select value={form.countryOfOrigin} onChange={(event) => setForm({ ...form, countryOfOrigin: event.target.value })}>
            <option value="">-</option>{options.countries.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}
          </select>
        </Field>
        <Field label={de ? "Tätigkeit" : "Occupation"} error={errors.occupation}>
          <select value={form.occupation} onChange={(event) => setForm({ ...form, occupation: event.target.value })}>
            <option value="">-</option>{options.occupations.map((occupation) => <option key={occupation} value={occupation}>{occupation === "other" ? (de ? "Andere" : "Other") : occupation}</option>)}
          </select>
        </Field>
      </div>
      {form.occupation === "other" ? <Field label={de ? "Tätigkeit angeben" : "Specify occupation"} error={errors.occupationOther}><input value={form.occupationOther} onChange={(event) => setForm({ ...form, occupationOther: event.target.value })} /></Field> : null}
    </div>
  );
}

function LanguageFields({ form, setForm, errors, options, de }: FormSectionProps) {
  const setOffered = (languages: string[]) => {
    const levels = Object.fromEntries(Object.entries(form.offeredLanguageLevels).filter(([code]) => languages.includes(code)));
    setForm({ ...form, offeredLanguages: languages, offeredLanguageLevels: levels });
  };
  return (
    <div className="form-section">
      <div className="form-grid">
        <Field label={de ? "Sprachen, die du anbietest" : "Languages you offer"} error={errors.offeredLanguages}>
          <select multiple size={8} value={form.offeredLanguages} onChange={(event) => setOffered(selectedValues(event.target))}>
            {options.languages.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
        </Field>
        <Field label={de ? "Sprachen, die du suchst" : "Languages you request"} error={errors.requestedLanguages}>
          <select multiple size={8} value={form.requestedLanguages} onChange={(event) => setForm({ ...form, requestedLanguages: selectedValues(event.target) })}>
            {options.languages.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
        </Field>
      </div>
      {form.offeredLanguages.length ? <fieldset className="language-levels"><legend>{de ? "Dein Niveau" : "Your level"}</legend>{form.offeredLanguages.map((code) => {
        const language = options.languages.find((entry) => entry.code === code)?.label ?? code;
        return <Field key={code} label={language} error={errors[`offeredLanguageLevels.${code}`]}><select value={form.offeredLanguageLevels[code] ?? ""} onChange={(event) => setForm({ ...form, offeredLanguageLevels: { ...form.offeredLanguageLevels, [code]: event.target.value } })}><option value="">-</option>{options.languageLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}</select></Field>;
      })}</fieldset> : null}
    </div>
  );
}

function PreferenceFields({ form, setForm, errors, de }: Omit<FormSectionProps, "options">) {
  return (
    <div className="form-section">
      <label className="check-row"><input type="checkbox" checked={form.requestedNativeOnly} onChange={(event) => setForm({ ...form, requestedNativeOnly: event.target.checked })} />{de ? "Nur Muttersprachler:innen für die gesuchte Sprache" : "Only native speakers for requested languages"}</label>
      <label className="check-row"><input type="checkbox" checked={form.sameGenderOnly} onChange={(event) => setForm({ ...form, sameGenderOnly: event.target.checked })} />{de ? "Nur Partner:innen mit gleichem Geschlecht" : "Same-gender partner only"}</label>
      <Field label={de ? "Weitere Geschlechtspräferenz (optional)" : "Other gender preference (optional)"} error={errors.preferredGender}><input value={form.preferredGender} onChange={(event) => setForm({ ...form, preferredGender: event.target.value })} /></Field>
      <Field label={de ? "Kommentar" : "Comments"} error={errors.comment}><textarea rows={6} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} /></Field>
    </div>
  );
}

type FormSectionProps = {
  form: TandemSubmission;
  setForm: (value: TandemSubmission) => void;
  errors: Record<string, string>;
  options: FormOptions;
  de: boolean;
};

function CompleteForm({ variant }: { variant: "steps" | "classic" }) {
  const data = useData();
  const { locale } = useLocale();
  const de = locale === "de";
  const optionsState = useAsync(() => data.getFormOptions(), [data]);
  const [form, setForm] = useState<TandemSubmission>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (optionsState.loading) return <Loading />;
  if (optionsState.error || !optionsState.data) return <p className="notice notice-bad">{de ? "Formularoptionen konnten nicht geladen werden." : "Form options could not be loaded."}</p>;
  const props = { form, setForm, errors, options: optionsState.data, de };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const response = await data.submitTandem(form);
      setResult(response.submissionId);
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fields);
      else setErrors({ form: error instanceof Error ? error.message : "Submission failed." });
    } finally {
      setBusy(false);
    }
  };

  if (result) return <p className="notice notice-ok" role="status">{de ? "Anmeldung eingegangen" : "Registration received"}: <strong>{result}</strong></p>;
  return (
    <form className="card public-form tandem-form" onSubmit={submit} noValidate>
      {errors.form ? <p className="notice notice-bad" role="alert">{errors.form}</p> : null}
      {variant === "steps" ? <nav className="tabs" aria-label={de ? "Formularschritte" : "Form steps"}>{[de ? "Profil" : "Profile", de ? "Sprachen" : "Languages", de ? "Präferenzen" : "Preferences"].map((label, index) => <button type="button" key={label} aria-current={step === index ? "step" : undefined} onClick={() => setStep(index)}>{index + 1}. {label}</button>)}</nav> : null}
      {(variant === "classic" || step === 0) ? <ProfileFields {...props} /> : null}
      {(variant === "classic" || step === 1) ? <LanguageFields {...props} /> : null}
      {(variant === "classic" || step === 2) ? <PreferenceFields form={form} setForm={setForm} errors={errors} de={de} /> : null}
      <div className="form-actions">
        {variant === "steps" && step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>{de ? "Zurück" : "Back"}</button> : null}
        {variant === "steps" && step < 2 ? <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>{de ? "Weiter" : "Continue"}</button> : <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "..." : de ? "Anmeldung senden" : "Submit registration"}</button>}
      </div>
    </form>
  );
}

export function TandemFormPage() {
  const { theme, isPreview } = usePublicTheme("language_tandem");
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <>
      <PageHeader kicker={de ? "Sprachaustausch" : "Language exchange"} title="Language Tandem" sub={de ? "Finde eine passende Person und übt eure Sprachen gemeinsam." : "Find a partner and practice the languages you offer and want to learn."} />
      {isPreview ? <p className="notice notice-info">Theme preview: <strong>{theme}</strong></p> : null}
      <CompleteForm variant={theme === "classic" ? "classic" : "steps"} />
    </>
  );
}

export function TandemEmbeddedForm() {
  return <CompleteForm variant="classic" />;
}
