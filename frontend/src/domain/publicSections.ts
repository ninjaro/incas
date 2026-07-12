import type { Locale } from "../api/types";

type LocalizedText = Record<Locale, string>;

export type AboutSectionItem = {
  id: "overview" | "working-groups" | "team-meetings" | "team";
  path: string;
  label: LocalizedText;
  description: LocalizedText;
};

export const ABOUT_SECTION_ITEMS: AboutSectionItem[] = [
  {
    id: "overview",
    path: "/about",
    label: { en: "About us", de: "Über uns" },
    description: {
      en: "How INCAS connects international and local students in Aachen.",
      de: "Wie INCAS internationale und lokale Studierende in Aachen verbindet.",
    },
  },
  {
    id: "working-groups",
    path: "/about/working-groups",
    label: { en: "Working Groups", de: "Arbeitsgruppen" },
    description: {
      en: "The volunteer groups that organize events, support, and communication.",
      de: "Die ehrenamtlichen Gruppen für Events, Unterstützung und Kommunikation.",
    },
  },
  {
    id: "team-meetings",
    path: "/about/team-meetings",
    label: { en: "Team Meetings", de: "Teamtreffen" },
    description: {
      en: "When the team meets and how you can get involved.",
      de: "Wann sich das Team trifft und wie du mitmachen kannst.",
    },
  },
  {
    id: "team",
    path: "/about/team",
    label: { en: "Team", de: "Team" },
    description: {
      en: "Meet the students who currently coordinate INCAS.",
      de: "Lerne die Studierenden kennen, die INCAS aktuell koordinieren.",
    },
  },
];

export function localizedAboutItems(locale: Locale) {
  return ABOUT_SECTION_ITEMS.map((item) => ({
    ...item,
    title: item.label[locale],
    summary: item.description[locale],
  }));
}
