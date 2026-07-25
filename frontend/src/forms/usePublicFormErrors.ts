import { useRef, useState } from "react";

import { ApiError } from "../api/client";
import type { Locale } from "../api/types";
import { localizeFieldErrors } from "../i18n/errors";

export type PublicFormErrors = Record<string, string> & { form?: string };

function retryGuidance(seconds: number, locale: Locale) {
  const minutes = Math.ceil(seconds / 60);
  if (locale === "de") {
    return minutes > 1 ? ` Bitte versuche es in etwa ${minutes} Minuten erneut.` : " Bitte versuche es in etwa einer Minute erneut.";
  }
  return minutes > 1 ? ` Please try again in about ${minutes} minutes.` : " Please try again in about a minute.";
}

export function mapPublicFormError(error: unknown, locale: Locale): PublicFormErrors {
  const de = locale === "de";
  if (error instanceof ApiError) {
    const fields = localizeFieldErrors(error.fields, locale);
    if (Object.keys(fields).length) return fields;
    const messages: Record<string, [string, string]> = {
      rate_limited: ["Too many requests were sent.", "Es wurden zu viele Anfragen gesendet."],
      validation_failed: ["Please review the form and try again.", "Bitte prüfe das Formular und versuche es erneut."],
      event_required: ["This form is not connected to a valid event.", "Dieses Formular gehört zu keiner gültigen Veranstaltung."],
      event_unknown: ["This event is no longer available.", "Diese Veranstaltung ist nicht mehr verfügbar."],
      registration_closed: ["Registration is closed.", "Die Anmeldung ist geschlossen."],
      capacity_reached: ["No place can be reserved right now.", "Aktuell kann kein Platz reserviert werden."],
      registration_conflict: ["A new registration could not be created with these details.", "Mit diesen Angaben konnte keine neue Anmeldung erstellt werden."],
    };
    const pair = messages[error.code];
    const base = pair?.[de ? 1 : 0] ?? (de
      ? "Die Anfrage konnte nicht gesendet werden. Bitte versuche es erneut."
      : "The request could not be submitted. Please try again.");
    return { form: base + (error.retryAfter ? retryGuidance(error.retryAfter, locale) : "") };
  }
  return {
    form: de
      ? "Die Verbindung ist fehlgeschlagen. Prüfe deine Internetverbindung und versuche es erneut."
      : "The connection failed. Check your internet connection and try again.",
  };
}

export function usePublicFormErrors(locale: Locale) {
  const [errors, setErrors] = useState<PublicFormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  const focusErrors = (next: PublicFormErrors, beforeFocus?: (field: string | null) => void) => {
    const firstField = Object.keys(next).find((field) => field !== "form") ?? null;
    beforeFocus?.(firstField);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const control = firstField
          ? Array.from(formRef.current?.querySelectorAll<HTMLElement>("[name]") ?? [])
              .find((element) => element.getAttribute("name") === firstField)
          : null;
        (control ?? alertRef.current)?.focus();
      });
    });
  };

  const report = (error: unknown, beforeFocus?: (field: string | null) => void) => {
    const next = mapPublicFormError(error, locale);
    setErrors(next);
    focusErrors(next, beforeFocus);
    return next;
  };

  const show = (next: PublicFormErrors, beforeFocus?: (field: string | null) => void) => {
    setErrors(next);
    focusErrors(next, beforeFocus);
  };

  const clearField = (field: string) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  return {
    errors,
    formRef,
    alertRef,
    report,
    show,
    clear: () => setErrors({}),
    clearField,
  };
}
