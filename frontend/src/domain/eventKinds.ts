import snapshot from "../content/event-kinds.generated.json";

export type EventKindMarker = "accent" | "info" | "ok" | "warn" | "bad" | "muted" | "ink";
export type EventKindMapMode = "none" | "venue" | "country" | "destination";
export type EventKindFeature = "registration" | "deposit" | "map" | "karaoke_queue";

export interface EventKind {
  id: string;
  label: { en: string; de: string };
  icon: string;
  marker: EventKindMarker;
  titlePrefix: { en: string; de: string } | null;
  highlightTitle: boolean;
  schedule: { weekday: number; time: string } | null;
  mapMode: EventKindMapMode;
  features: EventKindFeature[];
  registrationDefault: boolean;
  depositDefault: boolean;
}

export const EVENT_KINDS = snapshot as unknown as Record<string, EventKind>;

export function getEventKind(id: string): EventKind | undefined {
  return EVENT_KINDS[id];
}
