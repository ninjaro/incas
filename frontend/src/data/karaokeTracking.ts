import type { KaraokePublicEntry } from "../api/types";

export const KARAOKE_TRACKING_BATCH_SIZE = 20;

type TrackingResult = {
  items: KaraokePublicEntry[];
  missing: string[];
};

export async function trackKaraokeInBatches(
  publicIds: string[],
  loadBatch: (publicIds: string[]) => Promise<TrackingResult>,
): Promise<TrackingResult> {
  const uniqueIds = [...new Set(publicIds.map((value) => value.trim()).filter(Boolean))];
  if (!uniqueIds.length) return { items: [], missing: [] };

  const batches: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += KARAOKE_TRACKING_BATCH_SIZE) {
    batches.push(uniqueIds.slice(index, index + KARAOKE_TRACKING_BATCH_SIZE));
  }
  const results = await Promise.all(batches.map((batch) => loadBatch(batch)));
  const itemsById = new Map(
    results.flatMap((result) => result.items).map((item) => [item.publicId, item]),
  );
  const missing = new Set(results.flatMap((result) => result.missing));
  return {
    items: uniqueIds.flatMap((publicId) => {
      const item = itemsById.get(publicId);
      return item ? [item] : [];
    }),
    missing: uniqueIds.filter((publicId) => missing.has(publicId) || !itemsById.has(publicId)),
  };
}
