import { describe, expect, it } from "vitest";

import { EVENT_KINDS, getEventKind } from "./eventKinds";

describe("eventKinds", () => {
  it("exposes all eight kinds with both locale labels", () => {
    expect(Object.keys(EVENT_KINDS).sort()).toEqual(
      [
        "board_games", "breakfast", "cafe_lingua", "country_evening",
        "dance", "housing", "karaoke", "trip",
      ],
    );
    expect(EVENT_KINDS.breakfast.label.de).toBe("Internationales Frühstück");
  });

  it("getEventKind returns the kind or undefined", () => {
    expect(getEventKind("trip")?.mapMode).toBe("destination");
    expect(getEventKind("nope")).toBeUndefined();
  });
});
