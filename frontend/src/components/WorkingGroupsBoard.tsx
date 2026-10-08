import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Locale } from "../api/types";
import { useCurrentLocale } from "../i18n/LocaleContext";

type Text = Record<Locale, string>;

type WorkingGroupFlyer = {
  key: string;
  icon: string;
  title: string;
  blurb: string;
  caption: string;
  bullets: string[];
  ask: string;
  slip: { lines: string[]; strong: string };
};

type WorkingGroupSource = {
  key: string;
  icon: string;
  title: Text;
  blurb: Text;
  caption: Text;
  bullets: Text[];
  slip: { lines: Text[]; strong: Text };
};

const GROUP_SOURCES: WorkingGroupSource[] = [
  {
    key: "coordination", icon: "ic-compass",
    title: { en: "Coordination", de: "Koordination" },
    blurb: {
      en: "Leads INCAS, runs the weekly team meeting, and represents us outwards.",
      de: "Leitet INCAS, organisiert das wöchentliche Teamtreffen und vertritt uns nach außen.",
    },
    caption: { en: "the coordination crew", de: "die Koordinations-Crew" },
    bullets: [
      { en: "Chairs the weekly team meeting and keeps the semester plan", de: "Leitet das wöchentliche Teamtreffen und führt den Semesterplan" },
      { en: "Represents INCAS towards the International Offices of RWTH and FH", de: "Vertritt INCAS gegenüber den International Offices von RWTH und FH" },
      { en: "Handles the budget and the room bookings at Humboldt-Haus", de: "Kümmert sich um das Budget und die Raumbuchungen im Humboldt-Haus" },
    ],
    slip: {
      lines: [
        { en: "Meets every Tuesday, 7:00 PM", de: "Trifft sich jeden Dienstag, 19:00 Uhr" },
        { en: "Bring an idea and it goes on the agenda.", de: "Bring eine Idee mit, und sie kommt auf die Tagesordnung." },
      ],
      strong: { en: "Looking for one more coordinator", de: "Wir suchen noch eine Koordinatorin oder einen Koordinator" },
    },
  },
  {
    key: "tuesday-lingua", icon: "ic-chat",
    title: { en: "International Tuesday & Café Lingua", de: "International Tuesday & Café Lingua" },
    blurb: {
      en: "Runs the weekly Tuesday evening and the monthly Café Lingua language café.",
      de: "Organisiert den wöchentlichen Dienstagabend und das monatliche Sprachcafé Café Lingua.",
    },
    caption: { en: "Tuesday night regulars", de: "Stammgäste am Dienstagabend" },
    bullets: [
      { en: "Hosts the Tuesday evening: games, talks, and whoever walks in", de: "Gestaltet den Dienstagabend: Spiele, Gespräche und alle, die vorbeikommen" },
      { en: "Plans the monthly Café Lingua and finds native speakers for each table", de: "Plant das monatliche Café Lingua und findet Muttersprachler*innen für jeden Tisch" },
      { en: "Keeps the tea, coffee and board game shelf stocked", de: "Sorgt dafür, dass Tee, Kaffee und das Spieleregal gefüllt sind" },
    ],
    slip: {
      lines: [
        { en: "Tuesdays, 7:00 PM at Humboldt-Haus", de: "Dienstags, 19:00 Uhr im Humboldt-Haus" },
        { en: "Café Lingua once a month, all languages welcome.", de: "Café Lingua einmal im Monat, alle Sprachen willkommen." },
      ],
      strong: { en: "Always happy to have new hosts", de: "Neue Gastgeber*innen sind immer willkommen" },
    },
  },
  {
    key: "weekend", icon: "ic-signpost",
    title: { en: "International Weekend", de: "International Weekend" },
    blurb: {
      en: "Organizes the monthly day trip in Germany and to neighboring countries.",
      de: "Organisiert den monatlichen Tagesausflug in Deutschland und in die Nachbarländer.",
    },
    caption: { en: "somewhere on the road", de: "irgendwo unterwegs" },
    bullets: [
      { en: "Picks one destination a month and scouts the route", de: "Wählt jeden Monat ein Ziel aus und erkundet die Route" },
      { en: "Books group tickets and handles the sign-up list", de: "Bucht Gruppentickets und führt die Anmeldeliste" },
      { en: "Leads the trip on the day and brings the first aid kit", de: "Leitet den Ausflug am Tag selbst und hat den Erste-Hilfe-Kasten dabei" },
    ],
    slip: {
      lines: [
        { en: "One trip a month, weekends", de: "Ein Ausflug im Monat, am Wochenende" },
        { en: "Past stops: The Hague, Cologne, Maastricht.", de: "Bisherige Ziele: Den Haag, Köln, Maastricht." },
      ],
      strong: { en: "Help us scout the next destination", de: "Hilf uns, das nächste Ziel zu finden" },
    },
  },
  {
    key: "accommodation", icon: "ic-house",
    title: { en: "Accommodation Search & Service Hours", de: "Wohnungssuche & Sprechstunden" },
    blurb: {
      en: "Helps with housing and offers multilingual service hours in the office.",
      de: "Hilft bei der Wohnungssuche und bietet mehrsprachige Sprechstunden im Büro an.",
    },
    caption: { en: "office hours, Humboldt-Haus", de: "Sprechstunde, Humboldt-Haus" },
    bullets: [
      { en: "Runs the multilingual service hours in the office", de: "Betreut die mehrsprachigen Sprechstunden im Büro" },
      { en: "Collects room offers and passes them on to students looking", de: "Sammelt Zimmerangebote und gibt sie an Suchende weiter" },
      { en: "Explains contracts, deposits and Anmeldung to newcomers", de: "Erklärt Neuankömmlingen Mietverträge, Kautionen und die Anmeldung" },
    ],
    slip: {
      lines: [
        { en: "Service hours in the office", de: "Sprechstunden im Büro" },
        { en: "We answer in German, English, and more.", de: "Wir antworten auf Deutsch, Englisch und in weiteren Sprachen." },
      ],
      strong: { en: "Looking for people who speak a third language", de: "Wir suchen Leute, die eine dritte Sprache sprechen" },
    },
  },
  {
    key: "language-exchange", icon: "ic-exchange",
    title: { en: "Language Exchange", de: "Sprachaustausch" },
    blurb: {
      en: "Matches language tandem partners from the database.",
      de: "Bringt Tandempartner*innen aus der Datenbank zusammen.",
    },
    caption: { en: "tandem matchmakers", de: "die Tandem-Vermittlung" },
    bullets: [
      { en: "Keeps the tandem database and matches partners by language pair", de: "Pflegt die Tandem-Datenbank und bildet Paare nach Sprachkombination" },
      { en: "Sends out new matches every two weeks", de: "Verschickt alle zwei Wochen neue Vorschläge" },
      { en: "Checks in with pairs that went quiet", de: "Fragt bei Paaren nach, von denen man nichts mehr hört" },
    ],
    slip: {
      lines: [
        { en: "Matches go out every two weeks", de: "Vorschläge gehen alle zwei Wochen raus" },
        { en: "Around 40 tandem pairs running right now.", de: "Gerade laufen rund 40 Tandempaare." },
      ],
      strong: { en: "One helper is enough to keep it going", de: "Eine helfende Person reicht, damit es weiterläuft" },
    },
  },
  {
    key: "breakfast", icon: "ic-pot",
    title: { en: "International Breakfast", de: "Internationales Frühstück" },
    blurb: {
      en: "Prepares the international breakfast on the last Sunday of each month.",
      de: "Bereitet das internationale Frühstück am letzten Sonntag jedes Monats vor.",
    },
    caption: { en: "Sunday morning kitchen", de: "Sonntagmorgen in der Küche" },
    bullets: [
      { en: "Plans the menu so every region gets a dish", de: "Plant das Menü, damit jede Region ein Gericht bekommt" },
      { en: "Shops on Saturday and cooks from early Sunday", de: "Kauft samstags ein und kocht ab Sonntag früh" },
      { en: "Sets the long table and washes up afterwards", de: "Deckt die lange Tafel und spült danach ab" },
    ],
    slip: {
      lines: [
        { en: "Last Sunday of the month", de: "Letzter Sonntag im Monat" },
        { en: "Everyone brings something from home.", de: "Alle bringen etwas von zu Hause mit." },
      ],
      strong: { en: "Kitchen hands very welcome", de: "Helfende Hände in der Küche sehr willkommen" },
    },
  },
  {
    key: "pr", icon: "ic-megaphone",
    title: { en: "Public Relations", de: "Öffentlichkeitsarbeit" },
    blurb: {
      en: "Website, social media, flyers: the public face of INCAS.",
      de: "Website, Social Media, Flyer: das öffentliche Gesicht von INCAS.",
    },
    caption: { en: "behind the camera, for once", de: "ausnahmsweise hinter der Kamera" },
    bullets: [
      { en: "Designs the posters and the event graphics", de: "Gestaltet die Plakate und die Eventgrafiken" },
      { en: "Runs the Instagram account and shoots at events", de: "Betreut den Instagram-Account und fotografiert bei Events" },
      { en: "Keeps the website and the newsletter current", de: "Hält die Website und den Newsletter aktuell" },
    ],
    slip: {
      lines: [
        { en: "Photos, posts, posters", de: "Fotos, Beiträge, Plakate" },
        { en: "If you saw it online, this group made it.", de: "Was du online gesehen hast, kommt von dieser Gruppe." },
      ],
      strong: { en: "Looking for a photographer", de: "Wir suchen eine Fotografin oder einen Fotografen" },
    },
  },
];

function localizedGroups(locale: Locale): WorkingGroupFlyer[] {
  return GROUP_SOURCES.map((group) => ({
    key: group.key,
    icon: group.icon,
    title: group.title[locale],
    blurb: group.blurb[locale],
    caption: group.caption[locale],
    bullets: group.bullets.map((bullet) => bullet[locale]),
    ask: group.title[locale],
    slip: { lines: group.slip.lines.map((line) => line[locale]), strong: group.slip.strong[locale] },
  }));
}

function Polaroid({ group, open }: { group: WorkingGroupFlyer; open: boolean }) {
  const de = useCurrentLocale() === "de";
  return (
    <figure className="polaroid">
      {!open ? (
        <>
          <span className="tape" aria-hidden="true" />
          <span className="tape tape-r" aria-hidden="true" />
        </>
      ) : null}
      <div className="polaroid-photo"><span className="polaroid-empty">{de ? "Gruppenfoto" : "Group photo"}</span></div>
      <figcaption>{group.caption}</figcaption>
    </figure>
  );
}

function FlyerContent({ group, open, onToggle, onClose }: { group: WorkingGroupFlyer; open: boolean; onToggle: () => void; onClose?: () => void }) {
  const de = useCurrentLocale() === "de";
  return (
    <>
      {open && onClose ? (
        <button type="button" className="wg-close" aria-label={de ? "Schließen" : "Close"} onClick={onClose} data-autofocus>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      ) : null}
      <div
        className="wg-head"
        role="button"
        tabIndex={open ? -1 : 0}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (!open && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onToggle(); }
        }}
        aria-expanded={open}
      >
        <Polaroid group={group} open={open} />
        <div className="wg-head-row">
          <span className="wg-icon" aria-hidden="true"><svg className="ic"><use href={`#${group.icon}`} /></svg></span>
          <div>
            <h2>{group.title}</h2>
            <p>{group.blurb}</p>
          </div>
          <span className="wg-open" aria-hidden="true">
            <b>{open ? (de ? "Schließen" : "Close") : (de ? "Akte öffnen" : "Open the file")}</b>
            <i className="bi bi-chevron-down" />
          </span>
        </div>
      </div>
      {open ? (
        <div className="wg-detail">
          <div className="wg-detail-main">
            <h3>{de ? "Was diese Gruppe wirklich macht" : "What this group actually does"}</h3>
            <ul>
              {group.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
            {de ? (
              <p className="wg-contact">
                Lust mitzumachen? Komm zum Teamtreffen <strong>dienstags um 19:00 Uhr</strong> im Humboldt-Haus
                und frag nach der Gruppe {group.ask}.
              </p>
            ) : (
              <p className="wg-contact">
                Want in? Come to the team meeting on <strong>Tuesdays at 7:00 PM</strong> at Humboldt-Haus
                and ask for the {group.ask} group.
              </p>
            )}
          </div>
          <aside className="wg-slip">
            <span className="slip-kicker">{de ? "Gut zu wissen" : "Good to know"}</span>
            {group.slip.lines.map((line) => <p key={line}>{line}</p>)}
            <p><strong>{group.slip.strong}</strong></p>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function FlyerOverlay({ group, sourceRect, onClose }: { group: WorkingGroupFlyer; sourceRect: DOMRect | null; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);

  // FLIP: rise from the flyer's pinned spot on the board to the centre of the screen.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !sourceRect || typeof panel.animate !== "function") return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm) return;
    const target = panel.getBoundingClientRect();
    const dx = sourceRect.left + sourceRect.width / 2 - (target.left + target.width / 2);
    const dy = sourceRect.top + sourceRect.height / 2 - (target.top + target.height / 2);
    const scale = Math.max(0.2, sourceRect.width / target.width);
    panel.animate(
      [
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.7 },
        { transform: "translate(-50%, -50%)", opacity: 1 },
      ],
      { duration: 340, easing: "cubic-bezier(0.16, 0.84, 0.28, 1)", fill: "none" },
    );
  }, [group.key, sourceRect]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = Array.from(panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus();
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="wg-backdrop is-on" onClick={onClose} />
      <article
        className="theme-parchment wg-file is-open"
        role="dialog"
        aria-modal="true"
        aria-label={group.title}
        ref={panelRef}
      >
        <FlyerContent group={group} open onToggle={() => undefined} onClose={onClose} />
      </article>
    </>,
    document.body,
  );
}


/** The cork board of working-group flyers (design: Team.html), with the FLIP
    overlay that lifts a flyer off the board. */
export function WorkingGroupsBoard() {
  const locale = useCurrentLocale();
  const de = locale === "de";
  const groups = localizedGroups(locale);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const openGroup = groups.find((group) => group.key === openKey) ?? null;

  const openFile = (group: WorkingGroupFlyer) => {
    const card = cardRefs.current[group.key];
    setSourceRect(card ? card.getBoundingClientRect() : null);
    setOpenKey(group.key);
  };

  return (
    <>
      <div className="wg-board">
        <span className="wg-board-label" aria-hidden="true">{de ? "Arbeitsgruppen" : "Working groups"}</span>
        <div className="wg-files">
          {groups.map((group) => (
            <article
              key={group.key}
              className={`wg-file${openKey === group.key ? " is-lifted" : ""}`}
              ref={(el) => { cardRefs.current[group.key] = el; }}
            >
              <FlyerContent group={group} open={false} onToggle={() => openFile(group)} />
            </article>
          ))}
          <div className="wg-join">
            <span className="join-kicker">{de ? "Lust mitzumachen?" : "Want in?"}</span>
            {de ? (
              <p>
                Du möchtest in einer Gruppe mitmachen? Komm zum Teamtreffen <strong>dienstags um 19:00 Uhr</strong> im
                Humboldt-Haus oder sprich uns bei einem Event an. Du bringst so viel Zeit ein, wie du möchtest.
              </p>
            ) : (
              <p>
                Want to join a group? Come to the team meeting on <strong>Tuesdays at 7:00 PM</strong> at
                Humboldt-Haus, or just talk to us at any event. You contribute as much time as you want.
              </p>
            )}
          </div>
        </div>
      </div>

      {openGroup ? (
        <FlyerOverlay group={openGroup} sourceRect={sourceRect} onClose={() => setOpenKey(null)} />
      ) : null}
    </>
  );
}
