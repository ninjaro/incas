import type { Locale, PublicPost } from "../api/types";

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

type Text = Record<Locale, string>;

/** Source copy: every visible string carries its English and German version. */
type FormatSource = Omit<Format, "kicker" | "title" | "desc" | "fallbackNext" | "fallbackWhere" | "tag"> & {
  kicker: Text;
  title: Text;
  desc: Text;
  fallbackNext: Text;
  fallbackWhere: Text;
  tag: Text;
};

const ANNOUNCED: Text = { en: "Announced in the calendar", de: "Wird im Kalender angekündigt" };
const JUST_SHOW_UP: Text = { en: "Just show up", de: "Einfach vorbeikommen" };
const REGISTRATION_REQUIRED: Text = { en: "Registration required", de: "Anmeldung erforderlich" };

const FORMAT_SOURCE_COLUMNS: FormatSource[][] = [
  [
    {
      key: "international-tuesday", kind: "international_tuesday", pin: "olive", icon: "ic-chat",
      kicker: { en: "Tuesdays · 7:00 PM", de: "Dienstags · 19:00 Uhr" },
      title: { en: "International Tuesday", de: "International Tuesday" },
      desc: {
        en: "Meet students from around the world on selected Tuesday evenings at Humboldt-Haus. Quizzes, music, barbecues and country evenings.",
        de: "Triff an ausgewählten Dienstagabenden im Humboldt-Haus Studierende aus aller Welt. Quizze, Musik, Grillabende und Länderabende.",
      },
      fallbackNext: ANNOUNCED,
      fallbackWhere: { en: "Humboldt-Haus, Karl-Friedrich-Str. 1", de: "Humboldt-Haus, Karl-Friedrich-Str. 1" },
      tag: JUST_SHOW_UP,
    },
    {
      key: "country-evening", kind: "country_evening", pin: "orange", icon: "ic-pot",
      kicker: { en: "Selected Tuesdays", de: "Ausgewählte Dienstage" },
      title: { en: "Country Evening", de: "Länderabend" },
      desc: {
        en: "Students present their home country: food they cooked themselves, music, photos and stories. You eat, you ask questions, you leave knowing a place you have never been.",
        de: "Studierende stellen ihr Heimatland vor: selbst gekochtes Essen, Musik, Fotos und Geschichten. Du isst, fragst nach und gehst mit dem Gefühl, einen Ort zu kennen, an dem du nie warst.",
      },
      fallbackNext: ANNOUNCED,
      fallbackWhere: { en: "Humboldt-Haus · 30 spots", de: "Humboldt-Haus · 30 Plätze" },
      tag: REGISTRATION_REQUIRED, tagReq: true,
    },
    {
      key: "cafe-lingua", kind: "cafe_lingua", pin: "olive", icon: "ic-chat",
      kicker: { en: "Sundays · 7:00 PM", de: "Sonntags · 19:00 Uhr" },
      title: { en: "Café Lingua", de: "Café Lingua" },
      desc: {
        en: "Practice languages at relaxed conversation tables. Tables are grouped by language, you sit wherever you want and switch whenever you like.",
        de: "Übe Sprachen an entspannten Gesprächstischen. Die Tische sind nach Sprachen sortiert, du setzt dich, wohin du möchtest, und wechselst, wann du willst.",
      },
      fallbackNext: ANNOUNCED,
      fallbackWhere: { en: "Humboldt-Haus · all levels", de: "Humboldt-Haus · alle Niveaus" },
      tag: JUST_SHOW_UP,
    },
  ],
  [
    {
      key: "international-breakfast", kind: "breakfast", pin: "orange", icon: "ic-cup",
      kicker: { en: "Last Saturday of the month", de: "Letzter Samstag im Monat" },
      title: { en: "International Breakfast", de: "Internationales Frühstück" },
      desc: {
        en: "Share a Saturday buffet inspired by one country or a clearly defined culture. Come hungry, leave with recipes.",
        de: "Ein Samstagsbuffet, inspiriert von einem Land oder einer klar umrissenen Kultur. Komm hungrig und geh mit Rezepten nach Hause.",
      },
      fallbackNext: ANNOUNCED,
      fallbackWhere: { en: "40 spots · 2 € deposit", de: "40 Plätze · 2 € Kaution" },
      tag: REGISTRATION_REQUIRED, tagReq: true,
    },
    {
      key: "weekend-trip", kind: "trip", pin: "orange", icon: "ic-signpost",
      kicker: { en: "Monthly · Saturdays", de: "Monatlich · samstags" },
      title: { en: "International Weekend", de: "International Weekend" },
      desc: {
        en: "Explore a nearby city or sight on a guided day trip. Travel together by train and get the local tour from members who know the place.",
        de: "Entdecke auf einem geführten Tagesausflug eine Stadt oder Sehenswürdigkeit in der Nähe. Wir reisen gemeinsam mit dem Zug, und Mitglieder, die den Ort kennen, führen herum.",
      },
      fallbackNext: ANNOUNCED,
      fallbackWhere: { en: "Meet at Hauptbahnhof", de: "Treffpunkt Hauptbahnhof" },
      tag: REGISTRATION_REQUIRED, tagReq: true,
    },
    {
      key: "language-tandem", kind: null, pin: "olive", icon: "ic-chat",
      kicker: { en: "All semester", de: "Das ganze Semester" },
      title: { en: "Language Tandem", de: "Sprachtandem" },
      desc: {
        en: "Practise one language with a partner while sharing a language you know well. We match you, then you decide where and how often you meet.",
        de: "Übe eine Sprache mit einer Partnerin oder einem Partner und teile dafür eine Sprache, die du gut kannst. Wir bringen euch zusammen, wo und wie oft ihr euch trefft, entscheidet ihr.",
      },
      fallbackNext: { en: "Sign up any time", de: "Anmeldung jederzeit" },
      fallbackWhere: { en: "Matched by our team", de: "Zuordnung durch unser Team" },
      tag: { en: "One-time sign-up", de: "Einmalige Anmeldung" }, plainHref: "/events#register-tandem",
    },
  ],
  [
    {
      key: "board-games", kind: "board_games", pin: "olive", icon: "ic-die",
      kicker: { en: "Monthly · Fridays", de: "Monatlich · freitags" },
      title: { en: "Board Game Nights", de: "Spieleabende" },
      desc: {
        en: "Bring a game or choose one from the INCAS shelf. Games are explained at the table, so you do not need to know any rules beforehand.",
        de: "Bring ein Spiel mit oder such dir eins aus dem INCAS-Regal aus. Die Regeln werden am Tisch erklärt, du musst also vorher nichts kennen.",
      },
      fallbackNext: ANNOUNCED,
      fallbackWhere: { en: "Humboldt-Haus · free", de: "Humboldt-Haus · kostenlos" },
      tag: JUST_SHOW_UP,
    },
    {
      key: "incas-active", kind: "incas_active", pin: "olive", icon: "ic-signpost",
      kicker: { en: "Now and then", de: "Ab und zu" },
      title: { en: "INCAS Active", de: "INCAS Active" },
      desc: {
        en: "Climbing forest, ice-skating, football. Special activities beside the regular programme, and your ideas are always welcome.",
        de: "Kletterwald, Eislaufen, Fußball: besondere Aktivitäten neben dem regulären Programm. Deine Ideen sind jederzeit willkommen.",
      },
      fallbackNext: ANNOUNCED,
      fallbackWhere: { en: "In and around Aachen", de: "In und um Aachen" },
      tag: { en: "Varies per activity", de: "Je nach Aktivität" }, plainHref: "/calendar",
    },
    {
      key: "dance", kind: "dance", pin: "orange", icon: "ic-mic",
      kicker: { en: "Once a semester", de: "Einmal pro Semester" },
      title: { en: "Dance Workshops", de: "Tanzworkshops" },
      desc: {
        en: "Beginner-friendly dance steps taught with Sol de la Salsa, then time to practise together. No prior knowledge needed.",
        de: "Einsteigerfreundliche Tanzschritte mit Sol de la Salsa, danach Zeit zum gemeinsamen Üben. Keine Vorkenntnisse nötig.",
      },
      fallbackNext: ANNOUNCED,
      fallbackWhere: { en: "With Sol de la Salsa", de: "Mit Sol de la Salsa" },
      tag: REGISTRATION_REQUIRED, tagReq: true, plainHref: "/calendar",
    },
  ],
];

const KARAOKE_SOURCE: FormatSource = {
  key: "karaoke-night", kind: "karaoke", pin: "orange", icon: "ic-mic",
  kicker: { en: "Some Fridays", de: "An manchen Freitagen" },
  title: { en: "Karaoke Night", de: "Karaoke-Abend" },
  desc: {
    en: "Our song queue, your voice. Pick a song, put your name in the queue, and sing solo or drag friends on stage.",
    de: "Unsere Songliste, deine Stimme. Such dir einen Song aus, trag dich in die Warteschlange ein und sing allein oder hol Freunde mit auf die Bühne.",
  },
  fallbackNext: ANNOUNCED,
  fallbackWhere: { en: "Humboldt-Haus · free entry, no registration", de: "Humboldt-Haus · freier Eintritt, keine Anmeldung" },
  tag: JUST_SHOW_UP,
};

function localize(source: FormatSource, locale: Locale): Format {
  return {
    ...source,
    kicker: source.kicker[locale],
    title: source.title[locale],
    desc: source.desc[locale],
    fallbackNext: source.fallbackNext[locale],
    fallbackWhere: source.fallbackWhere[locale],
    tag: source.tag[locale],
  };
}

export function formatColumns(locale: Locale): Format[][] {
  return FORMAT_SOURCE_COLUMNS.map((column) => column.map((source) => localize(source, locale)));
}

export function allFormats(locale: Locale): Format[] {
  return formatColumns(locale).flat();
}

/** Formats with an archive, in the order the archive's type chips show them. */
export function archiveFormats(locale: Locale): Format[] {
  return [
    localize(KARAOKE_SOURCE, locale),
    ...allFormats(locale).filter((fmt) => fmt.kind && !fmt.plainHref),
  ];
}

type Art = { src: string; alt: string; caption?: string };

export function posterArt(key: string, locale: Locale): Art | null {
  const de = locale === "de";
  const art: Record<string, Art> = {
    "country-evening": {
      src: "/static/img/playful/country-evening-oman.png",
      alt: de ? "Plakat zum Länderabend: Oman" : "Poster for Country Evening: Oman",
    },
    "international-breakfast": {
      src: "/static/img/playful/iranian-breakfast.png",
      alt: de ? "Plakat zum Iranischen Frühstück" : "Poster for Iranian Breakfast",
    },
    "weekend-trip": {
      src: "/static/img/playful/trip-the-hague.png",
      alt: de ? "Plakat zum Ausflug nach Den Haag" : "Poster for the trip to The Hague",
    },
  };
  return art[key] ?? null;
}

export function defaultArt(locale: Locale): Art {
  const de = locale === "de";
  return {
    src: "/static/img/playful/clothes-swapping.png",
    alt: de ? "Plakat von einem früheren INCAS-Event" : "Poster from a past INCAS event",
    caption: de ? "Aus einer früheren Ausgabe" : "From a past edition",
  };
}

type PastSource = { date: Text; title: Text; note: Text; meta: Text; record?: string };

const STATIC_PAST_SOURCE: Record<string, PastSource[]> = {
  "international-tuesday": [
    { date: { en: "Tue · Jun 23", de: "Di · 23. Juni" }, title: { en: "Pub Quiz Night", de: "Pub-Quiz-Abend" }, note: { en: "Six teams, one tie-break on German rivers.", de: "Sechs Teams, ein Stechen über deutsche Flüsse." }, meta: { en: "~60 guests", de: "~60 Gäste" } },
    { date: { en: "Tue · Jun 9", de: "Di · 9. Juni" }, title: { en: "Barbecue in the garden", de: "Grillen im Garten" }, note: { en: "Grill started at six, last plate at eleven.", de: "Grill an um sechs, letzter Teller um elf." }, meta: { en: "~80 guests", de: "~80 Gäste" } },
    { date: { en: "Tue · May 26", de: "Di · 26. Mai" }, title: { en: "Karaoke Night", de: "Karaoke-Abend" }, note: { en: "42 songs on the queue by half past nine.", de: "Um halb zehn standen 42 Songs auf der Liste." }, meta: { en: "~70 guests", de: "~70 Gäste" } },
  ],
  "cafe-lingua": [
    { date: { en: "Tue · Jun 9", de: "Di · 9. Juni" }, title: { en: "Café Lingua", de: "Café Lingua" }, note: { en: "Master the language of your choice: 9 tables.", de: "Übe die Sprache deiner Wahl: 9 Tische." }, meta: { en: "9 languages", de: "9 Sprachen" } },
    { date: { en: "Tue · May 12", de: "Di · 12. Mai" }, title: { en: "Café Lingua", de: "Café Lingua" }, note: { en: "New Portuguese and Korean tables.", de: "Neue Tische für Portugiesisch und Koreanisch." }, meta: { en: "8 languages", de: "8 Sprachen" } },
    { date: { en: "Tue · Apr 14", de: "Di · 14. Apr." }, title: { en: "Café Lingua", de: "Café Lingua" }, note: { en: "Semester opener, mostly newcomers.", de: "Semesterauftakt, vor allem Neuankömmlinge." }, meta: { en: "7 languages", de: "7 Sprachen" } },
  ],
  "country-evening": [
    { date: { en: "Tue · Jun 16", de: "Di · 16. Juni" }, title: { en: "Ecuadorian Country Evening", de: "Ecuadorianischer Länderabend" }, note: { en: "Local food, Latino music and much more.", de: "Typisches Essen, Latino-Musik und vieles mehr." }, meta: { en: "30 spots · full", de: "30 Plätze · ausgebucht" }, record: "ecuadorian-country-evening" },
    { date: { en: "Tue · May 19", de: "Di · 19. Mai" }, title: { en: "Vietnamese Country Evening", de: "Vietnamesischer Länderabend" }, note: { en: "Fresh spring rolls made at the table.", de: "Frische Sommerrollen, direkt am Tisch gerollt." }, meta: { en: "30 spots · full", de: "30 Plätze · ausgebucht" } },
    { date: { en: "Tue · Apr 22", de: "Di · 22. Apr." }, title: { en: "Polish Country Evening", de: "Polnischer Länderabend" }, note: { en: "Pierogi workshop before the presentation.", de: "Pierogi-Workshop vor der Präsentation." }, meta: { en: "28 guests", de: "28 Gäste" } },
    { date: { en: "Tue · Feb 11", de: "Di · 11. Feb." }, title: { en: "Kenyan Country Evening", de: "Kenianischer Länderabend" }, note: { en: "Photo tour through the Rift Valley.", de: "Fototour durch das Rift Valley." }, meta: { en: "30 spots · full", de: "30 Plätze · ausgebucht" } },
  ],
  "board-games": [
    { date: { en: "Tue · Jun 2", de: "Di · 2. Juni" }, title: { en: "INCAS Game Night", de: "INCAS-Spieleabend" }, note: { en: "A fun night with friends and lots of amazing games.", de: "Ein lustiger Abend mit Freunden und vielen tollen Spielen." }, meta: { en: "12 games", de: "12 Spiele" } },
    { date: { en: "Fri · May 8", de: "Fr · 8. Mai" }, title: { en: "Board Games", de: "Brettspiele" }, note: { en: "Werewolf table got loud, again.", de: "Am Werwolf-Tisch wurde es mal wieder laut." }, meta: { en: "~40 guests", de: "~40 Gäste" } },
    { date: { en: "Fri · Mar 20", de: "Fr · 20. März" }, title: { en: "Board Games", de: "Brettspiele" }, note: { en: "Bring-your-own-game edition.", de: "Ausgabe mit selbst mitgebrachten Spielen." }, meta: { en: "~35 guests", de: "~35 Gäste" } },
  ],
  "international-breakfast": [
    { date: { en: "Sat · Jun 27", de: "Sa · 27. Juni" }, title: { en: "Egyptian Breakfast", de: "Ägyptisches Frühstück" }, note: { en: "Experience the beauty of Egypt: traditional food and culture.", de: "Erlebe die Schönheit Ägyptens: traditionelles Essen und Kultur." }, meta: { en: "40 spots · 2 €", de: "40 Plätze · 2 €" }, record: "egyptian-breakfast" },
    { date: { en: "Sat · Apr 25", de: "Sa · 25. Apr." }, title: { en: "Turkish Breakfast", de: "Türkisches Frühstück" }, note: { en: "A free culinary journey, çay included.", de: "Eine kostenlose kulinarische Reise, Çay inklusive." }, meta: { en: "40 spots · 2 €", de: "40 Plätze · 2 €" } },
    { date: { en: "Sat · Mar 28", de: "Sa · 28. März" }, title: { en: "Balkan Breakfast", de: "Balkan-Frühstück" }, note: { en: "Burek from four different countries.", de: "Burek aus vier verschiedenen Ländern." }, meta: { en: "36 guests", de: "36 Gäste" } },
  ],
  "weekend-trip": [
    { date: { en: "Sat · Jun 6", de: "Sa · 6. Juni" }, title: { en: "Lille", de: "Lille" }, note: { en: "Registration opened on a Tuesday and sold out the same evening.", de: "Die Anmeldung öffnete an einem Dienstag und war noch am selben Abend voll." }, meta: { en: "54 seats · 28 €", de: "54 Plätze · 28 €" }, record: "lille" },
    { date: { en: "Sat · Apr 18", de: "Sa · 18. Apr." }, title: { en: "Cologne", de: "Köln" }, note: { en: "Cathedral climb and old town tour.", de: "Domaufstieg und Altstadtführung." }, meta: { en: "52 seats · 26 €", de: "52 Plätze · 26 €" } },
    { date: { en: "Sat · Feb 21", de: "Sa · 21. Feb." }, title: { en: "Brussels", de: "Brüssel" }, note: { en: "Comic museum and Grand Place.", de: "Comic-Museum und Grand Place." }, meta: { en: "50 seats · 24 €", de: "50 Plätze · 24 €" } },
  ],
  "karaoke-night": [
    { date: { en: "Fri · May 22", de: "Fr · 22. Mai" }, title: { en: "Karaoke Night", de: "Karaoke-Abend" }, note: { en: "38 singers, the queue ran until midnight.", de: "38 Sänger*innen, die Liste lief bis Mitternacht." }, meta: { en: "~70 guests", de: "~70 Gäste" } },
    { date: { en: "Fri · Apr 10", de: "Fr · 10. Apr." }, title: { en: "Karaoke Night", de: "Karaoke-Abend" }, note: { en: "First one in the new room, ABBA block at the end.", de: "Der erste im neuen Raum, zum Schluss ein ABBA-Block." }, meta: { en: "~60 guests", de: "~60 Gäste" } },
    { date: { en: "Fri · Feb 27", de: "Fr · 27. Feb." }, title: { en: "Karaoke Night", de: "Karaoke-Abend" }, note: { en: "Duet special: everybody had to bring a partner.", de: "Duett-Special: Alle mussten jemanden mitbringen." }, meta: { en: "~55 guests", de: "~55 Gäste" } },
  ],
};

export function staticPast(key: string, locale: Locale): PastRow[] {
  return (STATIC_PAST_SOURCE[key] ?? []).map((row) => ({
    date: row.date[locale],
    title: row.title[locale],
    note: row.note[locale],
    meta: row.meta[locale],
    record: row.record,
  }));
}

/** Longer blurbs for the archive hero, where the poster copy reads too short. */
const ARCHIVE_BLURBS: Record<string, Text> = {
  "karaoke-night": {
    en: "Our song queue, your voice. Pick a song, put your name in the queue, and sing solo or drag friends on stage.",
    de: "Unsere Songliste, deine Stimme. Such dir einen Song aus, trag dich in die Warteschlange ein und sing allein oder hol Freunde mit auf die Bühne.",
  },
  "cafe-lingua": {
    en: "A relaxed language exchange over coffee and tea. Tables are grouped by language, you sit down wherever you want to practice.",
    de: "Entspannter Sprachaustausch bei Kaffee und Tee. Die Tische sind nach Sprachen sortiert, du setzt dich dorthin, wo du üben möchtest.",
  },
  "country-evening": {
    en: "Students from one country present their home: food they cooked themselves, music, photos, and stories. The classic INCAS event.",
    de: "Studierende aus einem Land stellen ihre Heimat vor: selbst gekochtes Essen, Musik, Fotos und Geschichten. Der INCAS-Klassiker.",
  },
  "board-games": {
    en: "An evening of card and board games in small groups. Games are explained at the table, so you do not need to know any rules beforehand.",
    de: "Ein Abend mit Karten- und Brettspielen in kleinen Gruppen. Die Regeln werden am Tisch erklärt, du musst also vorher nichts kennen.",
  },
  "international-breakfast": {
    en: "A long shared table where everyone brings a breakfast item from home. Pancakes next to olives next to sweet rice.",
    de: "Eine lange gemeinsame Tafel, an die alle etwas zum Frühstück von zu Hause mitbringen. Pfannkuchen neben Oliven neben süßem Reis.",
  },
  "weekend-trip": {
    en: "Day trips and weekend expeditions to nearby cities. Travel together by train, explore in groups, and get the local tour from members who know the city.",
    de: "Tagesausflüge und Wochenendtouren in Städte in der Nähe. Wir reisen gemeinsam mit dem Zug, erkunden in Gruppen, und Mitglieder, die die Stadt kennen, führen herum.",
  },
};

export function archiveBlurb(key: string, locale: Locale): string | null {
  return ARCHIVE_BLURBS[key]?.[locale] ?? null;
}

export function whenLabel(iso: string | null, locale: Locale = "en"): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
  const time = locale === "de"
    ? `${d.toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" })} Uhr`
    : d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} · ${time}`;
}

export function badgeParts(iso: string | null, locale: Locale = "en"): { month: string; day: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.toLocaleDateString(locale, { month: "short" }), day: String(d.getDate()) };
}

export function whereLabel(event: PublicPost): string | null {
  const spot = event.venue || event.meetingPoint || null;
  if (!spot) return null;
  return event.address ? `${spot}, ${event.address}` : spot;
}

export function pastRowFrom(event: PublicPost, locale: Locale = "en"): PastRow & { slug: string; imageUrl: string } {
  const d = event.startsAt ? new Date(event.startsAt) : null;
  return {
    date: d
      ? `${d.toLocaleDateString(locale, { weekday: "short" })} · ${d.toLocaleDateString(locale, { month: "short", day: "numeric" })}`
      : locale === "de" ? "Früher" : "Earlier",
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
