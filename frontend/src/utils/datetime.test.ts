import { describe, expect, it } from "vitest";

import { dateTimeLocalTomorrow, fromDateTimeLocal, toDateTimeLocal } from "./datetime";

describe("Europe/Berlin admin datetimes", () => {
  it("renders and parses summer wall time independently of the browser timezone", () => {
    expect(toDateTimeLocal("2026-07-14T18:00:00Z")).toBe("2026-07-14T20:00");
    expect(fromDateTimeLocal("2026-07-14T20:00")).toBe("2026-07-14T18:00:00.000Z");
  });

  it("uses the winter offset", () => {
    expect(toDateTimeLocal("2026-01-14T19:00:00Z")).toBe("2026-01-14T20:00");
    expect(fromDateTimeLocal("2026-01-14T20:00")).toBe("2026-01-14T19:00:00.000Z");
  });

  it("keeps the same local time on the next day across DST", () => {
    expect(dateTimeLocalTomorrow(new Date("2026-03-28T19:00:00Z"))).toBe("2026-03-29T20:00");
  });
});
