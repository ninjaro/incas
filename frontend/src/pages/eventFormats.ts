import type { PublicPost } from "../api/types";

export type PastRow = { date: string; title: string; note: string; meta: string; record?: string };

export type Format = {
  key: string;
  kind: string | null;
  pin: "olive" | "orange";
  icon: string;
  kicker: string;
  title: string;
  desc: string;
  fallbackNext: string;
  fallbackWhere: string;
  tag: string;
  tagReq?: boolean;
  /** Formats without an archive slug link straight to a page instead of opening the stack. */
  plainHref?: string;
};

export const FORMAT_COLUMNS: Format[][] = [
  [
    {
      key: "international-tuesday", kind: "international_tuesday", pin: "olive", icon: "ic-chat",
      kicker: "Tuesdays · 7:00 PM", title: "International Tuesday",
      desc: "Meet students from around the world on selected Tuesday evenings at Humboldt-Haus. Quizzes, music, barbecues and country evenings.",
      fallbackNext: "Announced in the calendar", fallbackWhere: "Humboldt-Haus, Karl-Friedrich-Str. 1",
      tag: "Just show up",
    },
    {
      key: "country-evening", kind: "country_evening", pin: "orange", icon: "ic-pot",
      kicker: "Selected Tuesdays", title: "Country Evening",
      desc: "Students present their home country: food they cooked themselves, music, photos and stories. You eat, you ask questions, you leave knowing a place you have never been.",
      fallbackNext: "Announced in the calendar", fallbackWhere: "Humboldt-Haus · 30 spots",
      tag: "Registration required", tagReq: true,
    },
    {
      key: "cafe-lingua", kind: "cafe_lingua", pin: "olive", icon: "ic-chat",
      kicker: "Sundays · 7:00 PM", title: "Café Lingua",
      desc: "Practice languages at relaxed conversation tables. Tables are grouped by language, you sit wherever you want and switch whenever you like.",
      fallbackNext: "Announced in the calendar", fallbackWhere: "Humboldt-Haus · all levels",
      tag: "Just show up",
    },
  ],
  [
    {
      key: "international-breakfast", kind: "breakfast", pin: "orange", icon: "ic-cup",
      kicker: "Last Saturday of the month", title: "International Breakfast",
      desc: "Share a Saturday buffet inspired by one country or a clearly defined culture. Come hungry, leave with recipes.",
      fallbackNext: "Announced in the calendar", fallbackWhere: "40 spots · 2 € deposit",
      tag: "Registration required", tagReq: true,
    },
    {
      key: "weekend-trip", kind: "trip", pin: "orange", icon: "ic-signpost",
      kicker: "Monthly · Saturdays", title: "International Weekend",
      desc: "Explore a nearby city or sight on a guided day trip. Travel together by train and get the local tour from members who know the place.",
      fallbackNext: "Announced in the calendar", fallbackWhere: "Meet at Hauptbahnhof",
      tag: "Registration required", tagReq: true,
    },
    {
      key: "language-tandem", kind: null, pin: "olive", icon: "ic-chat",
      kicker: "All semester", title: "Language Tandem",
      desc: "Practise one language with a partner while sharing a language you know well. We match you, then you decide where and how often you meet.",
      fallbackNext: "Sign up any time", fallbackWhere: "Matched by our team",
      tag: "One-time sign-up", plainHref: "/events#register-tandem",
    },
  ],
  [
    {
      key: "board-games", kind: "board_games", pin: "olive", icon: "ic-die",
      kicker: "Monthly · Fridays", title: "Board Game Nights",
      desc: "Bring a game or choose one from the INCAS shelf. Games are explained at the table, so you do not need to know any rules beforehand.",
      fallbackNext: "Announced in the calendar", fallbackWhere: "Humboldt-Haus · free",
      tag: "Just show up",
    },
    {
      key: "incas-active", kind: "incas_active", pin: "olive", icon: "ic-signpost",
      kicker: "Now and then", title: "INCAS Active",
      desc: "Climbing forest, ice-skating, football. Special activities beside the regular programme, and your ideas are always welcome.",
      fallbackNext: "Announced in the calendar", fallbackWhere: "In and around Aachen",
      tag: "Varies per activity", plainHref: "/calendar",
    },
    {
      key: "dance", kind: "dance", pin: "orange", icon: "ic-mic",
      kicker: "Once a semester", title: "Dance Workshops",
      desc: "Beginner-friendly dance steps taught with Sol de la Salsa, then time to practise together. No prior knowledge needed.",
      fallbackNext: "Announced in the calendar", fallbackWhere: "With Sol de la Salsa",
      tag: "Registration required", tagReq: true, plainHref: "/calendar",
    },
  ],
];

export const ALL_FORMATS = FORMAT_COLUMNS.flat();

/** Formats with an archive, in the order the archive's type chips show them. */
export const ARCHIVE_FORMATS: Format[] = [
  {
    key: "karaoke-night", kind: "karaoke", pin: "orange", icon: "ic-mic",
    kicker: "Some Fridays", title: "Karaoke Night",
    desc: "Our song queue, your voice. Pick a song, put your name in the queue, and sing solo or drag friends on stage.",
    fallbackNext: "Announced in the calendar", fallbackWhere: "Humboldt-Haus · free entry, no registration",
    tag: "Just show up",
  },
  ...ALL_FORMATS.filter((fmt) => fmt.kind && !fmt.plainHref),
];

export const POSTER_ART: Record<string, { src: string; alt: string; caption?: string }> = {
  "country-evening": { src: "/static/img/playful/country-evening-oman.png", alt: "Poster for Country Evening: Oman" },
  "international-breakfast": { src: "/static/img/playful/iranian-breakfast.png", alt: "Poster for Iranian Breakfast" },
  "weekend-trip": { src: "/static/img/playful/trip-the-hague.png", alt: "Poster for the trip to The Hague" },
};
export const DEFAULT_ART = { src: "/static/img/playful/clothes-swapping.png", alt: "Poster from a past INCAS event", caption: "From a past edition" };

export const STATIC_PAST: Record<string, PastRow[]> = {
  "international-tuesday": [
    { date: "Tue · Jun 23", title: "Pub Quiz Night", note: "Six teams, one tie-break on German rivers.", meta: "~60 guests" },
    { date: "Tue · Jun 9", title: "Barbecue in the garden", note: "Grill started at six, last plate at eleven.", meta: "~80 guests" },
    { date: "Tue · May 26", title: "Karaoke Night", note: "42 songs on the queue by half past nine.", meta: "~70 guests" },
  ],
  "cafe-lingua": [
    { date: "Tue · Jun 9", title: "Café Lingua", note: "Master the language of your choice: 9 tables.", meta: "9 languages" },
    { date: "Tue · May 12", title: "Café Lingua", note: "New Portuguese and Korean tables.", meta: "8 languages" },
    { date: "Tue · Apr 14", title: "Café Lingua", note: "Semester opener, mostly newcomers.", meta: "7 languages" },
  ],
  "country-evening": [
    { date: "Tue · Jun 16", title: "Ecuadorian Country Evening", note: "Local food, Latino music and much more.", meta: "30 spots · full", record: "ecuadorian-country-evening" },
    { date: "Tue · May 19", title: "Vietnamese Country Evening", note: "Fresh spring rolls made at the table.", meta: "30 spots · full" },
    { date: "Tue · Apr 22", title: "Polish Country Evening", note: "Pierogi workshop before the presentation.", meta: "28 guests" },
    { date: "Tue · Feb 11", title: "Kenyan Country Evening", note: "Photo tour through the Rift Valley.", meta: "30 spots · full" },
  ],
  "board-games": [
    { date: "Tue · Jun 2", title: "INCAS Game Night", note: "A fun night with friends and lots of amazing games.", meta: "12 games" },
    { date: "Fri · May 8", title: "Board Games", note: "Werewolf table got loud, again.", meta: "~40 guests" },
    { date: "Fri · Mar 20", title: "Board Games", note: "Bring-your-own-game edition.", meta: "~35 guests" },
  ],
  "international-breakfast": [
    { date: "Sat · Jun 27", title: "Egyptian Breakfast", note: "Experience the beauty of Egypt: traditional food and culture.", meta: "40 spots · 2 €", record: "egyptian-breakfast" },
    { date: "Sat · Apr 25", title: "Turkish Breakfast", note: "A free culinary journey, çay included.", meta: "40 spots · 2 €" },
    { date: "Sat · Mar 28", title: "Balkan Breakfast", note: "Burek from four different countries.", meta: "36 guests" },
  ],
  "weekend-trip": [
    { date: "Sat · Jun 6", title: "Lille", note: "Registration opened on a Tuesday and sold out the same evening.", meta: "54 seats · 28 €", record: "lille" },
    { date: "Sat · Apr 18", title: "Cologne", note: "Cathedral climb and old town tour.", meta: "52 seats · 26 €" },
    { date: "Sat · Feb 21", title: "Brussels", note: "Comic museum and Grand Place.", meta: "50 seats · 24 €" },
  ],
  "karaoke-night": [
    { date: "Fri · May 22", title: "Karaoke Night", note: "38 singers, the queue ran until midnight.", meta: "~70 guests" },
    { date: "Fri · Apr 10", title: "Karaoke Night", note: "First one in the new room, ABBA block at the end.", meta: "~60 guests" },
    { date: "Fri · Feb 27", title: "Karaoke Night", note: "Duet special: everybody had to bring a partner.", meta: "~55 guests" },
  ],
};

/** Longer blurbs for the archive hero, where the poster copy reads too short. */
export const ARCHIVE_BLURBS: Record<string, string> = {
  "karaoke-night": "Our song queue, your voice. Pick a song, put your name in the queue, and sing solo or drag friends on stage.",
  "cafe-lingua": "A relaxed language exchange over coffee and tea. Tables are grouped by language, you sit down wherever you want to practice.",
  "country-evening": "Students from one country present their home: food they cooked themselves, music, photos, and stories. The classic INCAS event.",
  "board-games": "An evening of card and board games in small groups. Games are explained at the table, so you do not need to know any rules beforehand.",
  "international-breakfast": "A long shared table where everyone brings a breakfast item from home. Pancakes next to olives next to sweet rice.",
  "weekend-trip": "Day trips and weekend expeditions to nearby cities. Travel together by train, explore in groups, and get the local tour from members who know the city.",
};

export function whenLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} · ${time}`;
}

export function badgeParts(iso: string | null): { month: string; day: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.toLocaleDateString("en", { month: "short" }), day: String(d.getDate()) };
}

export function whereLabel(event: PublicPost): string | null {
  const spot = event.venue || event.meetingPoint || null;
  if (!spot) return null;
  return event.address ? `${spot}, ${event.address}` : spot;
}

export function pastRowFrom(event: PublicPost): PastRow & { slug: string; imageUrl: string } {
  const d = event.startsAt ? new Date(event.startsAt) : null;
  return {
    date: d
      ? `${d.toLocaleDateString("en", { weekday: "short" })} · ${d.toLocaleDateString("en", { month: "short", day: "numeric" })}`
      : "Earlier",
    title: event.title.full,
    note: event.summary,
    meta: event.venue || event.city || "",
    slug: event.slug,
    imageUrl: event.imageUrl,
  };
}

export function nextEventFor(fmt: Format, events: PublicPost[]): PublicPost | null {
  if (!fmt.kind) return null;
  return events.find((event) => event.eventKind === fmt.kind && event.startsAt) ?? null;
}

export function sortEvents(list: PublicPost[]): PublicPost[] {
  return [...list].sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
}
