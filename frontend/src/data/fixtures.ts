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

function daysFromNow(days: number, hour = 19): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function buildDemoEvents(): PublicPost[] {
  const make = (
    slug: string,
    full: string,
    eventKind: string,
    startInDays: number,
    summary: string,
    price?: number,
  ): PublicPost => ({
    slug,
    title: { full, prefix: "", focus: "" },
    summary,
    eventKind,
    isEvent: true,
    isPinned: startInDays <= 3,
    isLive: true,
    startsAt: daysFromNow(startInDays),
    imageUrl: "",
    registration: price
      ? { hasQueue: true, priceCents: price, isDeposit: false, placesRemaining: 12 }
      : null,
  });

  return [
    make("karaoke-night", "Karaoke Night", "karaoke", 2, "Sing your favorite songs with the INCAS crowd."),
    make("cafe-lingua", "Café Lingua", "cafe_lingua", 4, "Relaxed language exchange over coffee."),
    make(
      "country-evening-peru",
      "Country Evening: Peru",
      "country_evening",
      7,
      "Food, music, and stories from Peru.",
    ),
    make(
      "international-breakfast",
      "International Breakfast",
      "breakfast",
      12,
      "A shared breakfast with dishes from around the world.",
      500,
    ),
    make(
      "weekend-trip-maastricht",
      "International Weekend: Maastricht",
      "trip",
      18,
      "Day trip to Maastricht with the INCAS travel group.",
      1500,
    ),
    make("board-games", "Board Games", "board_games", 9, "Casual board games evening, everyone welcome."),
  ];
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
    startsAt: null,
    imageUrl: "",
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
    publishAt: null,
    status: "published",
    storedStatus: "published",
    isActive: true,
    isPinned: event.isPinned,
    imageUrl: event.imageUrl,
    registrationLimitEnabled: Boolean(event.registration),
    registrationLimit: event.registration ? 20 : null,
    registrationPriceCents: event.registration?.priceCents ?? null,
    registrationIsDeposit: false,
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
