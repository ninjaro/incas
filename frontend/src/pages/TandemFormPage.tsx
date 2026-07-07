import { useState } from "react";

import { Field, PageHeader } from "../components/ui";
import { useData } from "../data/DataProviderContext";
import { usePublicTheme } from "../features/themes/usePublicTheme";

/**
 * Language Tandem public form, themed (guided steps / single page).
 *
 * The full legacy form with server-side validation still lives on the Flask
 * side; in production the final submission continues there until the React
 * form reaches full parity, while the demo build simulates a submission.
 */

type FormState = {
  offeredLanguage: string;
  requestedLanguage: string;
  occupation: string;
};

const STEP_LABELS = ["Your languages", "About you", "Review"];

function useTandemForm() {
  const data = useData();
  const [form, setForm] = useState<FormState>({
    offeredLanguage: "",
    requestedLanguage: "",
    occupation: "student",
  });
  const [done, setDone] = useState(false);

  const submit = () => {
    if (data.isDemo) {
      setDone(true);
      return;
    }
    // Hand over to the legacy Flask form with sensible prefills until the
    // React form reaches full parity.
    window.location.href = "/language-tandem";
  };

  return { form, setForm, submit, done, isDemo: data.isDemo };
}

function FormFields({
  form,
  setForm,
}: {
  form: FormState;
  setForm: (form: FormState) => void;
}) {
  return (
    <>
      <div className="form-grid">
        <Field label="Language you offer">
          <input
            value={form.offeredLanguage}
            onChange={(event) => setForm({ ...form, offeredLanguage: event.target.value })}
            placeholder="e.g. Spanish"
          />
        </Field>
        <Field label="Language you want to practice">
          <input
            value={form.requestedLanguage}
            onChange={(event) => setForm({ ...form, requestedLanguage: event.target.value })}
            placeholder="e.g. German"
          />
        </Field>
      </div>
      <Field label="Occupation">
        <select
          value={form.occupation}
          onChange={(event) => setForm({ ...form, occupation: event.target.value })}
        >
          <option value="student">Student</option>
          <option value="phd">PhD candidate</option>
          <option value="staff">University staff</option>
          <option value="other">Other</option>
        </select>
      </Field>
    </>
  );
}

function StepsVariant() {
  const { form, setForm, submit, done, isDemo } = useTandemForm();
  const [step, setStep] = useState(0);

  if (done) {
    return <p className="notice notice-ok">Demo submission recorded — thanks for trying it out!</p>;
  }

  return (
    <div className="card">
      <nav aria-label="Form progress" className="tabs">
        {STEP_LABELS.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-selected={index === step}
            onClick={() => setStep(index)}
          >
            {index + 1}. {label}
          </button>
        ))}
      </nav>
      {step === 0 ? <FormFields form={form} setForm={setForm} /> : null}
      {step === 1 ? (
        <p>
          The full form asks about your background, availability, and preferences.{" "}
          {isDemo ? "In demo mode this step is shortened." : "Continue to the complete form to fill them in."}
        </p>
      ) : null}
      {step === 2 ? (
        <p>
          You offer <strong>{form.offeredLanguage || "…"}</strong> and want to practice{" "}
          <strong>{form.requestedLanguage || "…"}</strong>.
        </p>
      ) : null}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {step > 0 ? (
          <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        ) : null}
        {step < STEP_LABELS.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>
            Continue
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={submit}>
            {isDemo ? "Submit (demo)" : "Continue to the full form"}
          </button>
        )}
      </div>
    </div>
  );
}

function ClassicVariant() {
  const { form, setForm, submit, done, isDemo } = useTandemForm();

  if (done) {
    return <p className="notice notice-ok">Demo submission recorded — thanks for trying it out!</p>;
  }

  return (
    <div className="card">
      <FormFields form={form} setForm={setForm} />
      <button type="button" className="btn btn-primary" onClick={submit}>
        {isDemo ? "Submit (demo)" : "Continue to the full form"}
      </button>
    </div>
  );
}

export function TandemFormPage() {
  const { theme, isPreview } = usePublicTheme("language_tandem");
  return (
    <>
      <PageHeader
        kicker="Language exchange"
        title="Language Tandem"
        sub="Find a partner to practice languages with — we match you based on what you offer and what you want to learn."
      />
      {isPreview ? (
        <p className="notice notice-info">
          Theme preview: <strong>{theme}</strong>.
        </p>
      ) : null}
      {theme === "classic" ? <ClassicVariant /> : <StepsVariant />}
    </>
  );
}
