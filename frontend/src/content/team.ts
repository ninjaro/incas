/**
 * Team and organization content.
 *
 * This file is the single source of truth for team members shown on the
 * Team page, in both production and demo builds. It is deliberately not
 * stored in the database: edit names, roles, descriptions, and image paths
 * right here. A missing image falls back to a default avatar, and a missing
 * description falls back to a placeholder, so partial entries are fine.
 */

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  description: string;
  imagePath: string;
  links?: {
    label: string;
    url: string;
  }[];
};

export const DEFAULT_MEMBER_DESCRIPTION =
  "Part of the INCAS team, helping international and local students meet in Aachen.";

export const teamMembers: TeamMember[] = [
  {
    id: "board-chair",
    name: "Alex Example",
    role: "Chairperson",
    description:
      "Coordinates the INCAS board, keeps the weekly program running, and welcomes new members.",
    imagePath: "/static/img/site/about-team.webp",
  },
  {
    id: "events-lead",
    name: "Sam Sample",
    role: "Events Lead",
    description:
      "Plans country evenings, breakfasts, and the international weekend trips.",
    imagePath: "",
  },
  {
    id: "tandem-lead",
    name: "Robin Placeholder",
    role: "Language Tandem",
    description: "",
    imagePath: "",
  },
  {
    id: "communications",
    name: "Kim Demo",
    role: "Communications",
    description:
      "Runs the newsletter and social channels and keeps the website up to date.",
    imagePath: "",
    links: [{ label: "Instagram", url: "https://www.instagram.com/incas.aachen/" }],
  },
];
