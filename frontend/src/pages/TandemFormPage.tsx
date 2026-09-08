import { useState, type FormEvent } from "react";

import type { FormOptions, TandemSubmission } from "../api/types";
import { Field, Loading, PageHeader } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { usePublicTheme } from "../features/themes/usePublicTheme";
import { FormPrivacyNotice } from "../forms/FormPrivacyNotice";
import { usePublicFormErrors } from "../forms/usePublicFormErrors";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";
import { localizeFieldErrors } from "../i18n/errors";

const EMPTY_FORM: TandemSubmission = {
  firstName: "", lastName: "", email: "", occupation: "", occupationOther: "",
  gender: "", birthYear: "", departureDate: "", countryOfOrigin: "",
  offeredLanguages: [], offeredLanguageLevels: {}, requestedLanguages: [],
  requestedNativeOnly: false, sameGenderOnly: false, preferredGender: "", comment: "",
};

function selectedValues(element: HTMLSelectElement) {
  return Array.from(element.selectedOptions, (option) => option.value);
}

function ProfileFields({ form, setForm, errors, options, de, clearField }: FormSectionProps) {
  const update = <K extends keyof TandemSubmission>(field: K, value: TandemSubmission[K]) => {
    clearField(field);
    setForm({ ...form, [field]: value });
  };
  return (
    <div className="form-section">
      <div className="form-grid">
        <Field label={de ? "Vorname" : "First name"} error={errors.firstName}>
          <input name="firstName" autoComplete="given-name" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} />
        </Field>
        <Field label={de ? "Nachname" : "Last name"} error={errors.lastName}>
          <input name="lastName" autoComplete="family-name" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input name="email" type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
        </Field>
        <Field label={de ? "Geschlecht" : "Gender"} error={errors.gender}>
          <select name="gender" value={form.gender} onChange={(event) => update("gender", event.target.value)}>
            <option value="">-</option><option value="Female">{de ? "Weiblich" : "Female"}</option><option value="Male">{de ? "Männlich" : "Male"}</option><option value="Divers">{de ? "Divers" : "Diverse"}</option><option value="Prefer not to say">{de ? "Keine Angabe" : "Prefer not to say"}</option>
          </select>
        </Field>
        <Field label={de ? "Geburtsjahr" : "Birth year"} error={errors.birthYear}>
          <input name="birthYear" type="number" min="1900" max={new Date().getFullYear()} value={form.birthYear} onChange={(event) => update("birthYear", event.target.value)} />
        </Field>
        <Field label={de ? "Geplantes Abreisedatum" : "Planned departure date"} error={errors.departureDate}>
          <input name="departureDate" type="date" value={form.departureDate} onChange={(event) => update("departureDate", event.target.value)} />
        </Field>
        <Field label={de ? "Herkunftsland" : "Country of origin"} error={errors.countryOfOrigin}>
          <select name="countryOfOrigin" value={form.countryOfOrigin} onChange={(event) => update("countryOfOrigin", event.target.value)}>
            <option value="">-</option>{options.countries.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}
          </select>
        </Field>
        <Field label={de ? "Tätigkeit" : "Occupation"} error={errors.occupation}>
          <select name="occupation" value={form.occupation} onChange={(event) => update("occupation", event.target.value)}>
            <option value="">-</option>{options.occupations.map((occupation) => <option key={occupation} value={occupation}>{occupation === "other" ? (de ? "Andere" : "Other") : occupation}</option>)}
          </select>
        </Field>
      </div>
      {form.occupation === "other" ? <Field label={de ? "Tätigkeit angeben" : "Specify occupation"} error={errors.occupationOther}><input name="occupationOther" value={form.occupationOther} onChange={(event) => update("occupationOther", event.target.value)} /></Field> : null}
    </div>
  );
}

function LanguageFields({ form, setForm, errors, options, de, clearField }: FormSectionProps) {
  const setOffered = (languages: string[]) => {
    clearField("offeredLanguages");
    const levels = Object.fromEntries(Object.entries(form.offeredLanguageLevels).filter(([code]) => languages.includes(code)));
    setForm({ ...form, offeredLanguages: languages, offeredLanguageLevels: levels });
  };
  return (
    <div className="form-section">
      <div className="form-grid">
        <Field label={de ? "Sprachen, die du anbietest" : "Languages you offer"} error={errors.offeredLanguages}>
          <select name="offeredLanguages" multiple size={8} value={form.offeredLanguages} onChange={(event) => setOffered(selectedValues(event.target))}>
            {options.languages.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
        </Field>
        <Field label={de ? "Sprachen, die du suchst" : "Languages you request"} error={errors.requestedLanguages}>
          <select name="requestedLanguages" multiple size={8} value={form.requestedLanguages} onChange={(event) => { clearField("requestedLanguages"); setForm({ ...form, requestedLanguages: selectedValues(event.target) }); }}>
            {options.languages.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}
          </select>
        </Field>
      </div>
      {form.offeredLanguages.length ? <fieldset className="language-levels"><legend>{de ? "Dein Niveau" : "Your level"}</legend>{form.offeredLanguages.map((code) => {
        const language = options.languages.find((entry) => entry.code === code)?.label ?? code;
        const field = `offeredLanguageLevels.${code}`;
        return <Field key={code} label={language} error={errors[field]}><select name={field} value={form.offeredLanguageLevels[code] ?? ""} onChange={(event) => { clearField(field); setForm({ ...form, offeredLanguageLevels: { ...form.offeredLanguageLevels, [code]: event.target.value } }); }}><option value="">-</option>{options.languageLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}</select></Field>;
      })}</fieldset> : null}
    </div>
  );
}

function PreferenceFields({ form, setForm, errors, de, clearField }: Omit<FormSectionProps, "options">) {
  return (
    <div className="form-section">
      <label className="check-row"><input name="requestedNativeOnly" type="checkbox" checked={form.requestedNativeOnly} onChange={(event) => setForm({ ...form, requestedNativeOnly: event.target.checked })} />{de ? "Nur Muttersprachler:innen für die gesuchte Sprache" : "Only native speakers for requested languages"}</label>
      <label className="check-row"><input name="sameGenderOnly" type="checkbox" checked={form.sameGenderOnly} onChange={(event) => setForm({ ...form, sameGenderOnly: event.target.checked })} />{de ? "Nur Partner:innen mit gleichem Geschlecht" : "Same-gender partner only"}</label>
      <Field label={de ? "Weitere Geschlechtspräferenz (optional)" : "Other gender preference (optional)"} error={errors.preferredGender}><input name="preferredGender" value={form.preferredGender} onChange={(event) => { clearField("preferredGender"); setForm({ ...form, preferredGender: event.target.value }); }} /></Field>
      <Field label={de ? "Kommentar" : "Comments"} error={errors.comment}><textarea name="comment" rows={6} value={form.comment} onChange={(event) => { clearField("comment"); setForm({ ...form, comment: event.target.value }); }} /></Field>
    </div>
  );
}

type FormSectionProps = {
  form: TandemSubmission;
  setForm: (value: TandemSubmission) => void;
  errors: Record<string, string>;
  options: FormOptions;
  de: boolean;
  clearField: (field: string) => void;
};

function CompleteForm({ variant }: { variant: "steps" | "classic" }) {
  const data = useData();
  const { locale } = useLocale();
  const de = locale === "de";
  const optionsState = useAsync(() => data.getFormOptions(), [data]);
  const [form, setForm] = useState<TandemSubmission>(EMPTY_FORM);
  const formErrors = usePublicFormErrors(locale);
  const [step, setStep] = useState(0);
  const [highestUnlockedStep, setHighestUnlockedStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (optionsState.loading) return <Loading />;
  if (optionsState.error || !optionsState.data) return <p className="notice notice-bad">{de ? "Formularoptionen konnten nicht geladen werden." : "Form options could not be loaded."}</p>;
  const props = { form, setForm, errors: formErrors.errors, options: optionsState.data, de, clearField: formErrors.clearField };

  const fieldStep = (field: string | null) => {
    if (!field) return step;
    if (field === "offeredLanguages" || field === "requestedLanguages" || field.startsWith("offeredLanguageLevels.")) return 1;
    if (["preferredGender", "comment"].includes(field)) return 2;
    return 0;
  };

  const validateStep = (targetStep: number) => {
    const next: Record<string, string> = {};
    if (targetStep === 0) {
      for (const field of ["firstName", "lastName", "email", "occupation", "gender", "birthYear", "departureDate", "countryOfOrigin"] as const) {
        if (!String(form[field] ?? "").trim()) next[field] = "Required.";
      }
      if (form.email && !form.email.includes("@")) next.email = "Enter a valid email address.";
      if (form.occupation === "other" && !form.occupationOther.trim()) next.occupationOther = "Required.";
    }
    if (targetStep === 1) {
      if (!form.offeredLanguages.length) next.offeredLanguages = "Select at least one language.";
      if (!form.requestedLanguages.length) next.requestedLanguages = "Select at least one language.";
      for (const code of form.offeredLanguages) {
        if (!form.offeredLanguageLevels[code]) next[`offeredLanguageLevels.${code}`] = "Select a level.";
      }
    }
    return localizeFieldErrors(next, locale);
  };

  const moveToStep = (nextStep: number) => {
    if (nextStep > highestUnlockedStep && nextStep !== step + 1) return;
    if (nextStep > step) {
      const validation = validateStep(step);
      if (Object.keys(validation).length) {
        formErrors.show(validation, (field) => setStep(fieldStep(field)));
        return;
      }
      setHighestUnlockedStep((current) => Math.max(current, nextStep));
    }
    setStep(nextStep);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    formErrors.clear();
    try {
      const response = await data.submitTandem(form);
      setResult(response.submissionId);
    } catch (error) {
      formErrors.report(error, (field) => setStep(fieldStep(field)));
    } finally {
      setBusy(false);
    }
  };

  if (result) return <p className="notice notice-ok" role="status">{de ? "Anmeldung eingegangen" : "Registration received"}: <strong>{result}</strong></p>;
  return (
    <form ref={formErrors.formRef} className="card public-form tandem-form" onSubmit={submit} noValidate>
      {formErrors.errors.form ? <p ref={formErrors.alertRef} className="notice notice-bad" role="alert" tabIndex={-1}>{formErrors.errors.form}</p> : null}
      {variant === "steps" ? <><p id="tandem-step-progress" className="form-progress" role="status">{de ? `Schritt ${step + 1} von 3` : `Step ${step + 1} of 3`}</p><nav className="tabs tandem-stepper" aria-label={de ? "Formularschritte" : "Form steps"} aria-describedby="tandem-step-progress">{[de ? "Profil" : "Profile", de ? "Sprachen" : "Languages", de ? "Präferenzen" : "Preferences"].map((label, index) => <button type="button" key={label} aria-current={step === index ? "step" : undefined} disabled={index > highestUnlockedStep} onClick={() => moveToStep(index)}>{index + 1}. {label}</button>)}</nav></> : null}
      {(variant === "classic" || step === 0) ? <ProfileFields {...props} /> : null}
      {(variant === "classic" || step === 1) ? <LanguageFields {...props} /> : null}
      {(variant === "classic" || step === 2) ? <PreferenceFields form={form} setForm={setForm} errors={formErrors.errors} de={de} clearField={formErrors.clearField} /> : null}
      {(variant === "classic" || step === 2) ? (
        <FormPrivacyNotice
          purpose={{
            en: "find and propose a tandem partner and contact you about it",
            de: "eine Tandempartnerin oder einen Tandempartner zu finden, vorzuschlagen und dich dazu zu kontaktieren",
          }}
        />
      ) : null}
      <div className="form-actions">
        {variant === "steps" && step > 0 ? <button type="button" className="btn btn-ghost" onClick={() => moveToStep(step - 1)}>{de ? "Zurück" : "Back"}</button> : null}
        {variant === "steps" && step < 2 ? <button type="button" className="btn btn-primary" onClick={() => moveToStep(step + 1)}>{de ? "Weiter" : "Continue"}</button> : <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "..." : de ? "Anmeldung senden" : "Submit registration"}</button>}
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
