import { describe, expect, it } from "vitest";

import { PAGE_THEMES, resolveTheme } from "./registry";

describe("theme registry", () => {
  it("falls back to the default for unknown or missing themes", () => {
    expect(resolveTheme("landing", "does-not-exist")).toBe("hero");
    expect(resolveTheme("landing", null)).toBe("hero");
    expect(resolveTheme("landing", undefined)).toBe("hero");
  });

  it("keeps valid theme selections", () => {
    expect(resolveTheme("landing", "editorial")).toBe("editorial");
    expect(resolveTheme("calendar", "agenda")).toBe("agenda");
  });

  it("declares a default theme that exists on every page", () => {
    for (const [pageId, page] of Object.entries(PAGE_THEMES)) {
      expect(page.themes[page.defaultTheme], `${pageId} default`).toBeDefined();
    }
  });
});
