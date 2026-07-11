/** Manually maintained organizational team content; no personal roster is fabricated. */
export type TeamText = { en: string; de: string };

export type TeamMember = {
  id: string;
  name: TeamText;
  role: TeamText;
  description: TeamText;
  imagePath: string;
  links?: { label: string; url: string }[];
};

export const DEFAULT_MEMBER_DESCRIPTION: TeamText = {
  en: "Part of the INCAS team, helping international and local students meet in Aachen.",
  de: "Teil des INCAS Teams und engagiert für Begegnungen zwischen internationalen und lokalen Studierenden in Aachen.",
};

export const teamMembers: TeamMember[] = [
  {
    id: "board-chair",
    name: { en: "INCAS Board", de: "INCAS Vorstand" },
    role: { en: "Coordination", de: "Koordination" },
    description: {
      en: "Coordinates the INCAS board, keeps the weekly programme running, and welcomes new members.",
      de: "Koordiniert den Vorstand, hält das Wochenprogramm am Laufen und begrüßt neue Mitglieder.",
    },
    imagePath: "/static/img/site/about-team.webp",
  },
  {
    id: "events-lead",
    name: { en: "International Tuesday Team", de: "International Tuesday Team" },
    role: { en: "Events", de: "Veranstaltungen" },
    description: {
      en: "Plans country evenings, breakfasts, and the international weekend trips.",
      de: "Plant Länderabende, Frühstücke und die International-Weekend-Ausflüge.",
    },
    imagePath: "",
  },
  {
    id: "tandem-lead",
    name: { en: "Language Tandem Team", de: "Sprachtandem-Team" },
    role: { en: "Language exchange", de: "Sprachaustausch" },
    description: {
      en: "Reviews registrations and brings suitable tandem partners together.",
      de: "Prüft Anmeldungen und bringt passende Tandempartner:innen zusammen.",
    },
    imagePath: "",
  },
  {
    id: "communications",
    name: { en: "Communications Team", de: "Kommunikationsteam" },
    role: { en: "Communications", de: "Kommunikation" },
    description: {
      en: "Runs the newsletter and social channels and keeps the website up to date.",
      de: "Betreut Newsletter und Social Media und hält die Website aktuell.",
    },
    imagePath: "",
    links: [{ label: "Instagram", url: "https://www.instagram.com/incas_aachen/" }],
  },
];
