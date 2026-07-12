/**
 * Synthetic demo data. Nothing here corresponds to a real person; names,
 * emails, and requests are invented for the static demo build.
 */
import type {
  AdminPost,
  KaraokeAdminEntry,
  PostTemplateInfo,
  PublicPost,
  TandemRequest,
} from "../api/types";
import demoEventCatalogJson from "../content/demo-events.generated.json";
import { getEventKind } from "../domain/eventKinds";

function daysFromNow(days: number, hour = 19): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

type CatalogEntry = { label: string; description: string };
type TuesdayEntry = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  event_kind: string;
  image_url: string;
};
type DemoEventCatalog = {
  timezone: string;
  rules: {
    monthsBefore: number;
    monthsAfter: number;
    tuesdayWeekday: number;
    saturdayWeekday: number;
    breakfastSaturdayIndex: number;
    tripSaturdayIndex: number;
  };
  tuesdaySpecials: TuesdayEntry[];
  openingCeremony: TuesdayEntry;
  countryEvenings: CatalogEntry[];
  breakfasts: CatalogEntry[];
  trips: CatalogEntry[];
  paymentDefaults: {
    openingCeremony: { capacity: number; priceCents: null; isDeposit: boolean };
    breakfast: { capacity: number; priceCents: number; isDeposit: boolean };
    trip: {
      capacityMin: number;
      capacityMax: number;
      priceCentsMin: number;
      priceCentsMax: number;
      isDeposit: boolean;
    };
  };
};

const demoEventCatalog = demoEventCatalogJson as DemoEventCatalog;
const COUNTRY_CODES: Record<string, string> = {
  Spain: "ES", Japan: "JP", Brazil: "BR", Turkey: "TR", Italy: "IT", Mexico: "MX", Poland: "PL", Belgium: "BE",
};
const TRIP_POINTS: Record<string, [number, number]> = {
  "Maastricht, Netherlands": [5.69, 50.8514],
  "Cologne, Germany": [6.9603, 50.9375],
  "Mons, Belgium": [3.9523, 50.4542],
  "Bonn, Germany": [7.0982, 50.7374],
  "Liège, Belgium": [5.5797, 50.6326],
  "Drachenfels, Germany": [7.2114, 50.6678],
  "Luxembourg City, Luxembourg": [6.1319, 49.6116],
};
const AACHEN_POINT = { name: "Aachen", coordinates: [6.0839, 50.7753] as [number, number] };

function berlinDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: demoEventCatalog.timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function berlinIso(year: number, month: number, day: number, clock: string): string {
  const [hour, minute] = clock.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offsetName = new Intl.DateTimeFormat("en", {
    timeZone: demoEventCatalog.timezone,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(guess)).find((part) => part.type === "timeZoneName")?.value ?? "GMT+00:00";
  const match = offsetName.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offset = match ? (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
  return new Date(guess - offset * 60_000).toISOString();
}

function shiftedMonth(year: number, month: number, offset: number) {
  const value = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1 };
}

function weekdaysInMonth(year: number, month: number, pythonWeekday: number): number[] {
  const result: number[] = [];
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= days; day += 1) {
    const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
    if (weekday === pythonWeekday) result.push(day);
  }
  return result;
}

function baseEvent(
  slug: string,
  title: string,
  eventKind: string,
  startsAt: string,
  summary: string,
  bodyHtml: string,
  imageUrl: string,
): PublicPost {
  const kind = getEventKind(eventKind);
  const starts = new Date(startsAt);
  const endsAt = new Date(starts.getTime() + (kind?.defaultDurationMinutes ?? 180) * 60_000).toISOString();
  const isLive = new Date(endsAt).getTime() > Date.now();
  return {
    slug,
    title: { full: title, prefix: "", focus: "" },
    summary,
    eventKind,
    isEvent: true,
    isPinned: false,
    isLive,
    publicationState: isLive ? "live" : "archived",
    startsAt,
    endsAt,
    durationMinutes: kind?.defaultDurationMinutes ?? 180,
    imageUrl,
    bodyHtml,
    eventPublicId: `EVT-DEMO-${slug.slice(-10).replaceAll("-", "")}`,
    venue: eventKind === "trip" ? "" : "Humboldt-Haus",
    address: eventKind === "trip" ? "" : "Pontstraße 41",
    city: eventKind === "trip" ? "" : "Aachen",
    meetingPoint: eventKind === "trip" ? "Aachen Hauptbahnhof" : "",
    destination: "",
    coordinates: eventKind === "trip" ? null : { latitude: 50.7753, longitude: 6.0839 },
    destinationCoordinates: null,
    countryCode: null,
    socialLinks: [],
    features: kind?.features ?? [],
    map: null,
    registration: null,
  };
}

export function buildDemoEvents(): PublicPost[] {
  const anchor = berlinDateParts();
  const events: PublicPost[] = [];
  let specialIndex = 0;
  let countryIndex = 0;
  let breakfastIndex = 0;
  let tripIndex = 0;
  const rules = demoEventCatalog.rules;

  for (let offset = -rules.monthsBefore; offset <= rules.monthsAfter; offset += 1) {
    const current = shiftedMonth(anchor.year, anchor.month, offset);
    const tuesdays = weekdaysInMonth(current.year, current.month, rules.tuesdayWeekday);
    const saturdays = weekdaysInMonth(current.year, current.month, rules.saturdayWeekday);
    tuesdays.forEach((day, index) => {
      let event: PublicPost;
      if (index === 1) {
        const starts = berlinIso(current.year, current.month, day, "20:00");
        event = baseEvent(`cafe-lingua-${starts.slice(0, 10)}`, "Café Lingua", "cafe_lingua", starts, "Relaxed language tables and conversation rounds.", "<p>Choose a language table, meet new people and stay for as long as you like.</p>", "/static/img/site/cafe-lingua.webp");
      } else if (index === 2) {
        const topic = demoEventCatalog.countryEvenings[countryIndex++ % demoEventCatalog.countryEvenings.length];
        const starts = berlinIso(current.year, current.month, day, "20:00");
        event = baseEvent(`country-evening-${topic.label.toLowerCase()}-${starts.slice(0, 10)}`, `Country Evening: ${topic.label}`, "country_evening", starts, topic.description, `<p>${topic.description}</p><p>Join us for stories, food ideas, music and conversation.</p>`, "/static/img/site/country-evening.webp");
        event.title = { full: event.title.full, prefix: "Country Evening:", focus: topic.label };
        event.countryCode = COUNTRY_CODES[topic.label] ?? null;
        event.map = {
          providerId: "amcharts-maps", providerName: "amCharts 5 + geodata", title: "Country focus",
          description: `${topic.label} highlighted with regional context.`, note: "Zoom and pan to explore the surrounding region.",
          target: { kind: "country", label: topic.label, countryCodes: event.countryCode ? [event.countryCode] : [], center: [15, 30], zoom: 1.8 },
        };
      } else {
        const template = demoEventCatalog.tuesdaySpecials[specialIndex++ % demoEventCatalog.tuesdaySpecials.length];
        const starts = berlinIso(current.year, current.month, day, getEventKind(template.event_kind)?.schedule?.time ?? "20:00");
        event = baseEvent(`${template.slug}-${starts.slice(0, 10)}`, template.title, template.event_kind, starts, template.summary, `<p>${template.body}</p>`, template.image_url);
      }
      events.push(event);
    });

    const breakfastDay = saturdays[rules.breakfastSaturdayIndex];
    if (breakfastDay) {
      const topic = demoEventCatalog.breakfasts[breakfastIndex++ % demoEventCatalog.breakfasts.length];
      const starts = berlinIso(current.year, current.month, breakfastDay, "10:00");
      const event = baseEvent(`international-breakfast-${starts.slice(0, 10)}`, `International Breakfast: ${topic.label}`, "breakfast", starts, topic.description, `<p>${topic.description}</p><p>The EUR 2 deposit is returned after participation.</p>`, "/static/img/site/international-breakfast.webp");
      event.title = { full: event.title.full, prefix: "International Breakfast:", focus: topic.label };
      const defaults = demoEventCatalog.paymentDefaults.breakfast;
      event.registration = { hasQueue: true, availability: "available", capacity: defaults.capacity, confirmedCount: 8, reservedCount: 12, waitingListCount: 0, nonCancelledCount: 12, placesRemaining: defaults.capacity - 12, mode: "queue", priceCents: defaults.priceCents, currency: "EUR", isDeposit: defaults.isDeposit, depositExplanation: "The EUR 2 deposit is returned after participation." };
      const code = COUNTRY_CODES[topic.label];
      event.countryCode = code ?? null;
      event.map = code ? { providerId: "amcharts-maps", providerName: "amCharts 5 + geodata", title: "Breakfast focus", description: `${topic.label} highlighted with regional context.`, note: "Zoom and pan to explore.", target: { kind: "country", label: topic.label, countryCodes: [code], center: [15, 30], zoom: 1.8 } } : null;
      events.push(event);
    }

    const tripDay = saturdays[rules.tripSaturdayIndex];
    if (tripDay) {
      const trip = demoEventCatalog.trips[tripIndex++ % demoEventCatalog.trips.length];
      const starts = berlinIso(current.year, current.month, tripDay, "09:00");
      const event = baseEvent(`international-weekend-${starts.slice(0, 10)}`, `International Weekend: ${trip.label}`, "trip", starts, trip.description, `<p>${trip.description}</p><p>This is a decorative overview, not a navigation route.</p>`, "/static/img/site/international-weekend.webp");
      const destination = TRIP_POINTS[trip.label];
      event.destination = trip.label;
      event.destinationCoordinates = destination ? { latitude: destination[1], longitude: destination[0] } : null;
      const defaults = demoEventCatalog.paymentDefaults.trip;
      const capacity = defaults.capacityMin + (tripIndex * 7) % (defaults.capacityMax - defaults.capacityMin + 1);
      const price = defaults.priceCentsMin + ((tripIndex * 300) % (defaults.priceCentsMax - defaults.priceCentsMin + 100));
      event.registration = { hasQueue: true, availability: "available", capacity, confirmedCount: 24, reservedCount: 30, waitingListCount: 0, nonCancelledCount: 30, placesRemaining: capacity - 30, mode: "queue", priceCents: price, currency: "EUR", isDeposit: false, depositExplanation: "" };
      event.map = destination ? { providerId: "openlayers", providerName: "OpenLayers + OSM + TopoJSON", title: "Trip overview", description: `Aachen to ${trip.label}.`, note: "The orange dashed line is decorative and not a navigation route.", target: { kind: "trip", center: [(AACHEN_POINT.coordinates[0] + destination[0]) / 2, (AACHEN_POINT.coordinates[1] + destination[1]) / 2], zoom: trip.label.startsWith("Luxembourg") ? 4.2 : 6.8, origin: AACHEN_POINT, destination: { name: trip.label.split(",")[0], coordinates: destination } } } : null;
      events.push(event);
    }

    if (offset === 1 && tuesdays[0]) {
      const template = demoEventCatalog.openingCeremony;
      const starts = berlinIso(current.year, current.month, tuesdays[0], "18:00");
      const event = baseEvent(
        `${template.slug}-${starts.slice(0, 10)}`,
        template.title,
        template.event_kind,
        starts,
        template.summary,
        `<p>${template.body}</p>`,
        template.image_url,
      );
      const defaults = demoEventCatalog.paymentDefaults.openingCeremony;
      event.venue = "SuperC";
      event.address = "Templergraben 57";
      event.coordinates = { latitude: 50.7787, longitude: 6.0778 };
      event.registration = {
        hasQueue: true,
        availability: "available",
        capacity: defaults.capacity,
        confirmedCount: 24,
        reservedCount: 24,
        waitingListCount: 0,
        nonCancelledCount: 24,
        placesRemaining: defaults.capacity - 24,
        mode: "queue",
        priceCents: defaults.priceCents,
        currency: "EUR",
        isDeposit: defaults.isDeposit,
        depositExplanation: "",
      };
      event.map = {
        providerId: "amcharts-maps",
        providerName: "amCharts 5 + geodata",
        title: "Opening venue",
        description: "The opening ceremony venue in Aachen with regional context.",
        note: "Zoom and pan to explore the surrounding region.",
        target: {
          kind: "marker",
          label: "SuperC, Aachen",
          center: [6.0778, 50.7787],
          zoom: 6.5,
          marker: { name: "SuperC", coordinates: [6.0778, 50.7787] },
        },
      };
      events.push(event);
    }
  }
  events.sort((left, right) => (left.startsAt ?? "").localeCompare(right.startsAt ?? ""));
  const next = events.find((event) => event.isLive);
  if (next) next.isPinned = true;
  return events;
}

export const demoPosts: PublicPost[] = [
  {
    slug: "welcome-to-incas",
    title: { full: "Welcome to INCAS", prefix: "", focus: "" },
    summary: "Who we are and what we do for international students in Aachen.",
    eventKind: null,
    isEvent: false,
    isPinned: false,
    isLive: true,
    publicationState: "live",
    startsAt: null,
    endsAt: null,
    durationMinutes: null,
    imageUrl: "",
    bodyHtml: "<p>INCAS connects international and local students in Aachen.</p>",
    eventPublicId: null,
    venue: "",
    address: "",
    city: "",
    meetingPoint: "",
    destination: "",
    coordinates: null,
    destinationCoordinates: null,
    countryCode: null,
    socialLinks: [],
    features: [],
    map: null,
    registration: null,
  },
];

export function buildDemoAdminPosts(events: PublicPost[]): AdminPost[] {
  return events.map((event, index) => ({
    id: index + 1,
    slug: event.slug,
    title: event.title.full,
    summary: event.summary,
    body: `${event.summary}\n\nThis is synthetic demo content.`,
    eventKind: event.eventKind,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    durationMinutes: event.durationMinutes,
    publishAt: null,
    status: "published",
    storedStatus: "published",
    isActive: true,
    isPinned: event.isPinned,
    imageUrl: event.imageUrl,
    registrationLimitEnabled: Boolean(event.registration),
    registrationLimit: event.registration?.capacity ?? null,
    registrationPriceCents: event.registration?.priceCents ?? null,
    registrationIsDeposit: event.registration?.isDeposit ?? false,
    registrationMode: event.registration?.mode ?? "none",
    depositExplanation: event.registration?.depositExplanation ?? "",
    venue: event.venue,
    address: event.address,
    city: event.city,
    meetingPoint: event.meetingPoint,
    destination: event.destination,
    countryCode: event.countryCode ?? "",
    latitude: event.coordinates?.latitude ?? null,
    longitude: event.coordinates?.longitude ?? null,
    destinationLatitude: event.destinationCoordinates?.latitude ?? null,
    destinationLongitude: event.destinationCoordinates?.longitude ?? null,
    mapConfig: event.map ?? {},
    featureFlags: event.features,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    social: [],
  }));
}

export const demoTemplates: PostTemplateInfo[] = [
  {
    id: 1,
    name: "Karaoke Night",
    titlePattern: "Karaoke Night",
    summary: "Sing your favorite songs with the INCAS crowd.",
    body: "Join us for another karaoke night!",
    eventKind: "karaoke",
    registrationLimitEnabled: false,
    registrationLimit: null,
    registrationPriceCents: null,
    registrationIsDeposit: false,
    imageUrl: "",
    socialSettings: { facebook: true, instagram: true },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Country Evening",
    titlePattern: "Country Evening: <country>",
    summary: "Food, music, and stories from <country>.",
    body: "An evening dedicated to the culture of <country>.",
    eventKind: "country_evening",
    registrationLimitEnabled: false,
    registrationLimit: null,
    registrationPriceCents: null,
    registrationIsDeposit: false,
    imageUrl: "",
    socialSettings: {},
    updatedAt: new Date().toISOString(),
  },
];

export const demoTandemRequests: TandemRequest[] = [
  {
    ref: "demo-ref-aaaa",
    gender: "female",
    birthYear: 1999,
    occupation: "Student",
    countryOfOrigin: "ES",
    departureDate: daysFromNow(180).slice(0, 10),
    offeredLanguages: ["es"],
    offeredNativeLanguages: ["es"],
    offeredLanguageLevels: { es: "native" },
    requestedLanguages: ["de"],
    requestedNativeOnly: false,
    sameGenderOnly: false,
    preferredGender: "",
    isViewed: false,
    createdAt: daysFromNow(-4),
  },
  {
    ref: "demo-ref-bbbb",
    gender: "male",
    birthYear: 1996,
    occupation: "PhD Candidate",
    countryOfOrigin: "DE",
    departureDate: daysFromNow(240).slice(0, 10),
    offeredLanguages: ["de", "en"],
    offeredNativeLanguages: ["de"],
    offeredLanguageLevels: { de: "native", en: "c1" },
    requestedLanguages: ["es"],
    requestedNativeOnly: true,
    sameGenderOnly: false,
    preferredGender: "",
    isViewed: true,
    createdAt: daysFromNow(-11),
  },
  {
    ref: "demo-ref-aaab",
    gender: "female",
    birthYear: 1999,
    occupation: "Student",
    countryOfOrigin: "ES",
    departureDate: daysFromNow(182).slice(0, 10),
    offeredLanguages: ["es"],
    offeredNativeLanguages: ["es"],
    offeredLanguageLevels: { es: "native" },
    requestedLanguages: ["de"],
    requestedNativeOnly: false,
    sameGenderOnly: false,
    preferredGender: "",
    isViewed: false,
    createdAt: daysFromNow(-3),
  },
  {
    ref: "demo-ref-cccc",
    gender: "diverse",
    birthYear: 2001,
    occupation: "Student",
    countryOfOrigin: "IT",
    departureDate: daysFromNow(120).slice(0, 10),
    offeredLanguages: ["it", "en"],
    offeredNativeLanguages: ["it"],
    offeredLanguageLevels: { it: "native", en: "b2" },
    requestedLanguages: ["de", "fr"],
    requestedNativeOnly: false,
    sameGenderOnly: false,
    preferredGender: "",
    isViewed: false,
    createdAt: daysFromNow(-1),
  },
];

export function buildDemoKaraoke(): KaraokeAdminEntry[] {
  const make = (
    id: number,
    displayName: string,
    songTitle: string,
    artist: string,
    status: KaraokeAdminEntry["status"],
    position: number | null,
  ): KaraokeAdminEntry => ({
    id,
    publicId: `KRQ-DEMO${id.toString().padStart(3, "0")}`,
    postId: 1,
    displayName,
    songTitle,
    artist,
    note: "",
    contact: "",
    status,
    position,
    queuePosition: position,
    eventSlug: "karaoke-night-demo",
    eventTitle: "Karaoke Night",
    createdAt: new Date().toISOString(),
  });

  return [
    make(1, "Maria", "Shallow", "Lady Gaga & Bradley Cooper", "performing", 1),
    make(2, "Jonas", "99 Luftballons", "Nena", "approved", 2),
    make(3, "Aisha", "Rolling in the Deep", "Adele", "approved", 3),
    make(4, "Tom", "Country Roads", "John Denver", "pending", null),
    make(5, "Elena", "Bohemian Rhapsody", "Queen", "pending", null),
  ];
}

/** Demo access keys shown on the demo unlock screen. */
export const DEMO_KEYS: Record<string, string[]> = {
  "demo-admin": [
    "posts",
    "event_registrations",
    "forms",
    "access_keys",
    "theme_review",
    "theme_force",
    "karaoke_queue",
    "language_tandem_blind",
    "language_tandem_private",
    "language_tandem_corrections",
  ],
  "demo-review": ["theme_review"],
  "demo-karaoke": ["karaoke_queue"],
  "demo-tandem-blind": ["language_tandem_blind"],
};
