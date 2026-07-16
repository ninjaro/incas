import { describe, expect, it } from "vitest";

import { relatedOfferItems } from "./SectionLayouts";

const items = [
  { path: "/offers/first", title: "First" },
  { path: "/offers/middle", title: "Middle" },
  { path: "/offers/final", title: "Final" },
];

describe("related offers", () => {
  it.each([
    ["/offers/first", ["Middle"]],
    ["/offers/middle", ["First", "Final"]],
    ["/offers/final", ["Middle"]],
  ])("uses deterministic previous/next neighbors for %s", (path, expected) => {
    const related = relatedOfferItems(items, path);
    expect(related.map((item) => item.title)).toEqual(expected);
    expect(related.some((item) => item.path === path)).toBe(false);
  });
});
