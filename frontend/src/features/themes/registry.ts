import type { PageId } from "../../api/types";
import snapshot from "../../content/themes.generated.json";

export type ThemeMeta = {
  name: string;
  description: string;
  enabled?: boolean;
  legacyVariants?: string[];
  decision?: "migrated" | "merged" | "retired";
};

export type PageThemes = {
  name: string;
  defaultTheme: string;
  themes: Record<string, ThemeMeta>;
};

type ThemeSnapshot = {
  pages: Array<{
    pageId: PageId;
    name: string;
    defaultTheme: string;
    themes: Array<ThemeMeta & { themeId: string }>;
  }>;
};

/** React consumes the generated snapshot from app/themes_registry.py. */
export const PAGE_THEMES = Object.fromEntries(
  (snapshot as ThemeSnapshot).pages.map((page) => [
    page.pageId,
    {
      name: page.name,
      defaultTheme: page.defaultTheme,
      themes: Object.fromEntries(
        page.themes.map(({ themeId, ...theme }) => [themeId, theme]),
      ),
    },
  ]),
) as Record<PageId, PageThemes>;

export function resolveTheme(pageId: PageId, themeId: string | undefined | null): string {
  const page = PAGE_THEMES[pageId];
  if (themeId && page.themes[themeId] && page.themes[themeId].enabled !== false) return themeId;
  return page.defaultTheme;
}
