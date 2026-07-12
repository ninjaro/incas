import { describe, expect, it } from "vitest";

import { EMPTY_EDITOR, editorToInput, nextScheduledStart } from "./PostsPanel";

describe("post editor contracts", () => {
  it("sends explicit nulls when optional event fields are cleared", () => {
    const input = editorToInput({
      ...EMPTY_EDITOR,
      title: "Converted post",
      status: "draft",
    });

    expect(input).toMatchObject({
      eventKind: null,
      startsAt: null,
      endsAt: null,
      publishAt: null,
    });
  });

  it("chooses the next configured Tuesday without changing its time", () => {
    const monday = new Date(2026, 6, 6, 12, 0, 0);
    expect(nextScheduledStart({ weekday: 1, time: "20:00" }, monday))
      .toBe("2026-07-07T20:00");
  });

  it("chooses the next configured Saturday", () => {
    const monday = new Date(2026, 6, 6, 12, 0, 0);
    expect(nextScheduledStart({ weekday: 5, time: "09:00" }, monday))
      .toBe("2026-07-11T09:00");
  });

  it("leaves the date empty when a kind has no schedule", () => {
    expect(nextScheduledStart(null, new Date(2026, 6, 6, 12, 0, 0))).toBe("");
  });
});
