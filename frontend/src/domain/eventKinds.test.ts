import { describe, expect, it } from "vitest";

import { EVENT_KINDS, getEventKind } from "./eventKinds";

describe("eventKinds", () => {
  it("exposes every supported kind with both locale labels", () => {
    expect(Object.keys(EVENT_KINDS)).toEqual(
      expect.arrayContaining([
        "board_games", "breakfast", "cafe_lingua", "country_evening", "dance",
        "housing", "incas_active", "international_tuesday", "karaoke",
        "opening_ceremony", "trip",
      ]),
    );
    expect(EVENT_KINDS.breakfast.label.de).toBe("Internationales Frühstück");
  });

  it("getEventKind returns the kind or undefined", () => {
    expect(getEventKind("trip")?.mapMode).toBe("destination");
    expect(getEventKind("breakfast")?.defaultPriceCents).toBe(200);
    expect(getEventKind("nope")).toBeUndefined();
  });
});
