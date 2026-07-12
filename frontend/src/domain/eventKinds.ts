import snapshot from "../content/event-kinds.generated.json";

export type EventKindMarker = "accent" | "info" | "ok" | "warn" | "bad" | "muted" | "ink";
export type EventKindMapMode = "none" | "venue" | "country" | "country_or_region" | "destination";
export type EventKindFeature = "registration" | "deposit" | "map" | "karaoke_queue";
export type EventRegistrationMode = "none" | "queue" | "karaoke";

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
  defaultCapacity: number | null;
  defaultPriceCents: number | null;
  defaultDurationMinutes: number;
  registrationMode: EventRegistrationMode;
  calendarPresentation: "standard" | "highlight";
  landingPresentation: "standard" | "featured";
}

export const EVENT_KINDS = snapshot as unknown as Record<string, EventKind>;

export function getEventKind(id: string): EventKind | undefined {
  return EVENT_KINDS[id];
}
