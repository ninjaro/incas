import { describe, expect, it } from "vitest";

import type { PublicPost } from "../api/types";
import { PAGE_THEMES } from "../features/themes/registry";
import { buildCells, CALENDAR_RENDERER_IDS, groupEventsByWeek } from "./CalendarPage";

function event(slug: string, startsAt: string): PublicPost {
  return { slug, startsAt } as PublicPost;
}

describe("calendar theme semantics", () => {
  it("has a renderer for every enabled calendar theme", () => {
    const enabled = Object.entries(PAGE_THEMES.calendar.themes)
      .filter(([, theme]) => theme.enabled !== false)
      .map(([id]) => id)
      .sort();
    expect([...CALENDAR_RENDERER_IDS].sort()).toEqual(enabled);
  });

  it("groups timeline events by Monday-based calendar week", () => {
    const groups = groupEventsByWeek([
      event("monday", "2026-07-06T20:00:00"),
      event("sunday", "2026-07-12T10:00:00"),
      event("next-monday", "2026-07-13T20:00:00"),
    ]);
    expect(groups.map((group) => group.events.map((item) => item.slug)))
      .toEqual([["monday", "sunday"], ["next-monday"]]);
  });

  it("keeps multiple events in one stable 42-cell month grid day", () => {
    const cells = buildCells(2026, 7, [
      event("first", "2026-07-07T18:00:00"),
      event("second", "2026-07-07T20:00:00"),
    ]);
    expect(cells).toHaveLength(42);
    expect(cells.find((cell) => cell.date.getDate() === 7 && cell.inMonth)?.events)
      .toHaveLength(2);
  });
});
