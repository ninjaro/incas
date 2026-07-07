import type { PageId } from "../../api/types";

export type ThemeMeta = {
  name: string;
  description: string;
};

export type PageThemes = {
  name: string;
  defaultTheme: string;
  themes: Record<string, ThemeMeta>;
};

/**
 * Frontend mirror of the backend theme registry (app/themes_registry.py).
 * Page and theme ids must match; the backend resolves the active public
 * theme, the frontend picks the matching variant component.
 */
export const PAGE_THEMES: Record<PageId, PageThemes> = {
  landing: {
    name: "Landing Page",
    defaultTheme: "hero",
    themes: {
      hero: {
        name: "Hero",
        description: "Full-bleed hero with event cards, the current production look.",
      },
      editorial: {
        name: "Editorial",
        description: "Magazine-style layout that leads with the story and reads top to bottom.",
      },
      "event-first": {
        name: "Event First",
        description: "Puts the next events above the fold with a compact intro.",
      },
    },
  },
  calendar: {
    name: "Calendar",
    defaultTheme: "month",
    themes: {
      month: { name: "Month Grid", description: "Classic month grid with event chips." },
      agenda: { name: "Agenda", description: "Chronological agenda list, optimized for mobile." },
      timeline: { name: "Timeline", description: "Vertical timeline grouped by week." },
    },
  },
  language_tandem: {
    name: "Language Tandem Form",
    defaultTheme: "steps",
    themes: {
      steps: { name: "Guided Steps", description: "Multi-step wizard with progress indicator." },
      classic: { name: "Single Page", description: "One long accessible form, no steps." },
    },
  },
  team: {
    name: "Team Page",
    defaultTheme: "grid",
    themes: {
      grid: { name: "Card Grid", description: "Responsive card grid with photos and roles." },
      spotlight: {
        name: "Spotlight",
        description: "Large alternating rows, one member in focus at a time.",
      },
    },
  },
  admin_dashboard: {
    name: "Admin Dashboard",
    defaultTheme: "cards",
    themes: {
      cards: { name: "Cards", description: "Capability cards with quick stats." },
      compact: { name: "Compact", description: "Dense utility list for small screens." },
    },
  },
};

export function resolveTheme(pageId: PageId, themeId: string | undefined | null): string {
  const page = PAGE_THEMES[pageId];
  if (themeId && page.themes[themeId]) return themeId;
  return page.defaultTheme;
}
