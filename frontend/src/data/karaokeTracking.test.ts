import { describe, expect, it, vi } from "vitest";

import type { KaraokePublicEntry } from "../api/types";
import { KARAOKE_TRACKING_BATCH_SIZE, trackKaraokeInBatches } from "./karaokeTracking";

function entry(publicId: string): KaraokePublicEntry {
  return {
    publicId,
    displayName: publicId,
    songTitle: `Song ${publicId}`,
    artist: "",
    status: "pending",
    queuePosition: null,
    eventSlug: "karaoke",
    eventTitle: "Karaoke",
  };
}

describe("Karaoke tracking batches", () => {
  it("deduplicates and tracks more than 20 ids in deterministic chunks", async () => {
    const ids = Array.from({ length: 23 }, (_, index) => `KRQ-${index + 1}`);
    const missingId = ids[20];
    const loadBatch = vi.fn(async (batch: string[]) => ({
      items: batch.filter((id) => id !== missingId).map(entry),
      missing: batch.filter((id) => id === missingId),
    }));

    const result = await trackKaraokeInBatches(
      [...ids, ids[0], ` ${ids[1]} `],
      loadBatch,
    );

    expect(loadBatch.mock.calls.map(([batch]) => batch.length)).toEqual([
      KARAOKE_TRACKING_BATCH_SIZE,
      3,
    ]);
    expect(result.items.map((item) => item.publicId)).toEqual(
      ids.filter((id) => id !== missingId),
    );
    expect(result.missing).toEqual([missingId]);
  });
});
