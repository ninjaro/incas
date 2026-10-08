import type { Locale } from "../../api/types";

/** German names for access scopes/capabilities; the API only ships English labels. */
const GERMAN_CAPABILITY_LABELS: Record<string, string> = {
  posts: "Beiträge und Events",
  event_registrations: "Eventanmeldungen (voll)",
  event_registrations_view: "Eventanmeldungen (Ansicht)",
  event_registrations_checkin: "Eventanmeldungen (Check-in)",
  event_registrations_private: "Eventanmeldungen (private Daten)",
  event_registrations_export: "Eventanmeldungen (CSV-Export)",
  forms: "Formulare",
  forms_triage: "Formulare (Sichtung)",
  forms_full: "Formulare (alle Details)",
  access_keys: "Zugangsschlüssel",
  language_tandem: "Sprachtandem",
  language_tandem_blind: "Tandem-Matching (anonym)",
  language_tandem_private: "Tandem-Kontaktdaten",
  language_tandem_corrections: "Tandem-Korrekturen",
  theme_review: "Theme-Prüfung und Abstimmung",
  theme_force: "Theme erzwingen",
  karaoke_queue: "Karaoke-Warteschlange",
};

export function capabilityLabel(
  capability: string,
  locale: Locale,
  serverLabels: Record<string, string> = {},
): string {
  if (locale === "de" && GERMAN_CAPABILITY_LABELS[capability]) {
    return GERMAN_CAPABILITY_LABELS[capability];
  }
  return serverLabels[capability] ?? capability;
}
