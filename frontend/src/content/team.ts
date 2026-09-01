/** Manually maintained organizational team content.
 *  Structure follows the design system's team page (INCAS Design System,
 *  explorations/Team.html): one section per working group, with placeholder
 *  member slots ("Name" / "A line about this member.") that the team fills in
 *  with real people and photos. No real roster is invented here.
 */
export type TeamText = { en: string; de: string };

export type TeamMemberSlot = {
  id: string;
  name: TeamText;
  description: TeamText;
  /** Empty string renders the placeholder photo slot. */
  imagePath: string;
};

export type WorkingGroup = {
  id: string;
  /** Bootstrap Icons class for the group (design: .wg-icon). */
  icon: string;
  name: TeamText;
  description: TeamText;
  members: TeamMemberSlot[];
};

const PLACEHOLDER_NAME: TeamText = { en: "Name", de: "Name" };
const PLACEHOLDER_LINE: TeamText = {
  en: "A line about this member.",
  de: "Eine Zeile über dieses Mitglied.",
};

function memberSlots(groupId: string, count: number): TeamMemberSlot[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${groupId}-${index}`,
    name: PLACEHOLDER_NAME,
    description: PLACEHOLDER_LINE,
    imagePath: "",
  }));
}

/** Groups and member counts from the design reference (Team.html). */
export const workingGroups: WorkingGroup[] = [
  {
    id: "coordination",
    icon: "bi-compass",
    name: { en: "Coordination", de: "Koordination" },
    description: {
      en: "Leads INCAS, runs the weekly team meeting, and represents us outwards.",
      de: "Leitet INCAS, führt das wöchentliche Teamtreffen und vertritt uns nach außen.",
    },
    members: memberSlots("coordination", 2),
  },
  {
    id: "international-tuesday",
    icon: "bi-globe-americas",
    name: {
      en: "International Tuesday & Café Lingua",
      de: "International Tuesday & Café Lingua",
    },
    description: {
      en: "Runs the weekly Tuesday evening and the monthly Café Lingua language café.",
      de: "Organisiert den wöchentlichen Dienstagabend und das monatliche Café Lingua.",
    },
    members: memberSlots("international-tuesday", 2),
  },
  {
    id: "international-weekend",
    icon: "bi-signpost-2",
    name: { en: "International Weekend", de: "International Weekend" },
    description: {
      en: "Organizes the monthly day trip in Germany and to neighboring countries.",
      de: "Organisiert den monatlichen Tagesausflug in Deutschland und in die Nachbarländer.",
    },
    members: memberSlots("international-weekend", 2),
  },
  {
    id: "accommodation",
    icon: "bi-house-heart",
    name: {
      en: "Accommodation Search & Service Hours",
      de: "Wohnungssuche & Sprechstunden",
    },
    description: {
      en: "Helps with housing and offers multilingual service hours in the office.",
      de: "Hilft bei der Wohnungssuche und bietet mehrsprachige Sprechstunden im Büro.",
    },
    members: memberSlots("accommodation", 1),
  },
  {
    id: "language-exchange",
    icon: "bi-chat-dots",
    name: { en: "Language Exchange", de: "Sprachaustausch" },
    description: {
      en: "Matches language tandem partners from the database.",
      de: "Vermittelt passende Tandempartner:innen aus der Datenbank.",
    },
    members: memberSlots("language-exchange", 1),
  },
  {
    id: "international-breakfast",
    icon: "bi-egg-fried",
    name: { en: "International Breakfast", de: "International Breakfast" },
    description: {
      en: "Prepares the international breakfast on the last Sunday of each month.",
      de: "Bereitet das internationale Frühstück am letzten Sonntag im Monat vor.",
    },
    members: memberSlots("international-breakfast", 2),
  },
  {
    id: "public-relations",
    icon: "bi-megaphone",
    name: { en: "Public Relations", de: "Öffentlichkeitsarbeit" },
    description: {
      en: "Website, social media, flyers: the public face of INCAS.",
      de: "Website, Social Media, Flyer: das öffentliche Gesicht von INCAS.",
    },
    members: memberSlots("public-relations", 1),
  },
];
