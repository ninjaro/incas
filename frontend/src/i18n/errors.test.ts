import { describe, expect, it } from "vitest";

import { localizeFieldErrors } from "./errors";

describe("localizeFieldErrors", () => {
  it("keeps server detail in English", () => {
    expect(localizeFieldErrors({ email: "Server message" }, "en")).toEqual({ email: "Server message" });
  });

  it("does not expose English validation copy on German public forms", () => {
    expect(localizeFieldErrors({ email: "Enter a valid email.", unknown: "Required." }, "de"))
      .toEqual({
        email: "Bitte gib eine gültige E-Mail-Adresse ein.",
        unknown: "Bitte prüfe dieses Feld.",
      });
  });
});
