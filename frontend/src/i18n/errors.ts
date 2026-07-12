import type { Locale } from "../api/types";

const GERMAN_FIELDS: Record<string, string> = {
  email: "Bitte gib eine gültige E-Mail-Adresse ein.",
  contactEmail: "Bitte gib eine gültige E-Mail-Adresse oder eine Telefonnummer ein.",
  contactPhone: "Bitte gib eine E-Mail-Adresse oder eine Telefonnummer ein.",
  firstName: "Bitte fülle dieses Pflichtfeld aus.",
  lastName: "Bitte fülle dieses Pflichtfeld aus.",
  name: "Bitte fülle dieses Pflichtfeld aus.",
  message: "Bitte gib eine Nachricht ein.",
  country: "Bitte wähle ein Land oder eine Kultur.",
  countryOfOrigin: "Bitte wähle dein Herkunftsland.",
  occupation: "Bitte fülle dieses Pflichtfeld aus.",
  occupationOther: "Bitte gib deine Tätigkeit ein.",
  gender: "Bitte wähle eine Angabe aus.",
  birthYear: "Bitte gib ein gültiges Geburtsjahr ein.",
  departureDate: "Bitte gib ein gültiges Abreisedatum ein.",
  offeredLanguages: "Bitte wähle mindestens eine angebotene Sprache.",
  requestedLanguages: "Bitte wähle mindestens eine gesuchte Sprache.",
  dietPreference: "Bitte wähle eine Ernährungsform.",
  displayName: "Bitte gib einen Namen oder Spitznamen ein.",
  songTitle: "Bitte gib einen Songtitel ein.",
};

export function localizeFieldErrors(
  fields: Record<string, string>,
  locale: Locale,
): Record<string, string> {
  if (locale !== "de") return fields;
  return Object.fromEntries(
    Object.keys(fields).map((field) => [
      field,
      GERMAN_FIELDS[field] ?? (field.startsWith("offeredLanguageLevels.")
        ? "Bitte wähle dein Sprachniveau."
        : "Bitte prüfe dieses Feld."),
    ]),
  );
}
