import { describe, expect, it } from "vitest";

import { formatRemaining } from "./ThemesPanel";

describe("theme force countdown", () => {
  it("carries rounded minutes into hours instead of displaying 60 minutes", () => {
    const now = Date.parse("2026-07-21T10:00:00Z");
    expect(formatRemaining("2026-07-21T12:00:00Z", now)).toBe("2h 0m");
    expect(formatRemaining("2026-07-21T11:59:00Z", now)).toBe("1h 59m");
  });
});
