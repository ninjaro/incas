import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

const GROUPS: WorkingGroupFlyer[] = [
  {
    key: "coordination", icon: "ic-compass", title: "Coordination",
    blurb: "Leads INCAS, runs the weekly team meeting, and represents us outwards.",
    caption: "the coordination crew",
    bullets: [
      "Chairs the weekly team meeting and keeps the semester plan",
      "Represents INCAS towards the International Offices of RWTH and FH",
      "Handles the budget and the room bookings at Humboldt-Haus",
    ],
    ask: "Coordination",
    slip: { lines: ["Meets every Tuesday, 7:00 PM", "Bring an idea and it goes on the agenda."], strong: "Looking for one more coordinator" },
  },
  {
    key: "tuesday-lingua", icon: "ic-chat", title: "International Tuesday & Café Lingua",
    blurb: "Runs the weekly Tuesday evening and the monthly Café Lingua language café.",
    caption: "Tuesday night regulars",
    bullets: [
      "Hosts the Tuesday evening: games, talks, and whoever walks in",
      "Plans the monthly Café Lingua and finds native speakers for each table",
      "Keeps the tea, coffee and board game shelf stocked",
    ],
    ask: "International Tuesday & Café Lingua",
    slip: { lines: ["Tuesdays, 7:00 PM at Humboldt-Haus", "Café Lingua once a month, all languages welcome."], strong: "Always happy to have new hosts" },
  },
  {
    key: "weekend", icon: "ic-signpost", title: "International Weekend",
    blurb: "Organizes the monthly day trip in Germany and to neighboring countries.",
    caption: "somewhere on the road",
    bullets: [
      "Picks one destination a month and scouts the route",
      "Books group tickets and handles the sign-up list",
      "Leads the trip on the day and brings the first aid kit",
    ],
    ask: "International Weekend",
    slip: { lines: ["One trip a month, weekends", "Past stops: The Hague, Cologne, Maastricht."], strong: "Help us scout the next destination" },
  },
  {
    key: "accommodation", icon: "ic-house", title: "Accommodation Search & Service Hours",
    blurb: "Helps with housing and offers multilingual service hours in the office.",
    caption: "office hours, Humboldt-Haus",
    bullets: [
      "Runs the multilingual service hours in the office",
      "Collects room offers and passes them on to students looking",
      "Explains contracts, deposits and Anmeldung to newcomers",
    ],
    ask: "Accommodation Search & Service Hours",
    slip: { lines: ["Service hours in the office", "We answer in German, English, and more."], strong: "Looking for people who speak a third language" },
  },
  {
    key: "language-exchange", icon: "ic-exchange", title: "Language Exchange",
    blurb: "Matches language tandem partners from the database.",
    caption: "tandem matchmakers",
    bullets: [
      "Keeps the tandem database and matches partners by language pair",
      "Sends out new matches every two weeks",
      "Checks in with pairs that went quiet",
    ],
    ask: "Language Exchange",
    slip: { lines: ["Matches go out every two weeks", "Around 40 tandem pairs running right now."], strong: "One helper is enough to keep it going" },
  },
  {
    key: "breakfast", icon: "ic-pot", title: "International Breakfast",
    blurb: "Prepares the international breakfast on the last Sunday of each month.",
    caption: "Sunday morning kitchen",
    bullets: [
      "Plans the menu so every region gets a dish",
      "Shops on Saturday and cooks from early Sunday",
      "Sets the long table and washes up afterwards",
    ],
    ask: "International Breakfast",
    slip: { lines: ["Last Sunday of the month", "Everyone brings something from home."], strong: "Kitchen hands very welcome" },
  },
  {
    key: "pr", icon: "ic-megaphone", title: "Public Relations",
    blurb: "Website, social media, flyers: the public face of INCAS.",
    caption: "behind the camera, for once",
    bullets: [
      "Designs the posters and the event graphics",
      "Runs the Instagram account and shoots at events",
      "Keeps the website and the newsletter current",
    ],
    ask: "Public Relations",
    slip: { lines: ["Photos, posts, posters", "If you saw it online, this group made it."], strong: "Looking for a photographer" },
  },
];

function Polaroid({ group, open }: { group: WorkingGroupFlyer; open: boolean }) {
  return (
    <figure className="polaroid">
      {!open ? (
        <>
          <span className="tape" aria-hidden="true" />
          <span className="tape tape-r" aria-hidden="true" />
        </>
      ) : null}
      <div className="polaroid-photo"><span className="polaroid-empty">Group photo</span></div>
      <figcaption>{group.caption}</figcaption>
    </figure>
  );
}

function FlyerContent({ group, open, onToggle, onClose }: { group: WorkingGroupFlyer; open: boolean; onToggle: () => void; onClose?: () => void }) {
  return (
    <>
      {open && onClose ? (
        <button type="button" className="wg-close" aria-label="Close" onClick={onClose} data-autofocus>
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
            <b>{open ? "Close" : "Open the file"}</b>
            <i className="bi bi-chevron-down" />
          </span>
        </div>
      </div>
      {open ? (
        <div className="wg-detail">
          <div className="wg-detail-main">
            <h3>What this group actually does</h3>
            <ul>
              {group.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
            <p className="wg-contact">
              Want in? Come to the team meeting on <strong>Tuesdays at 7:00 PM</strong> at Humboldt-Haus
              and ask for the {group.ask} group.
            </p>
          </div>
          <aside className="wg-slip">
            <span className="slip-kicker">Good to know</span>
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
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const openGroup = GROUPS.find((group) => group.key === openKey) ?? null;

  const openFile = (group: WorkingGroupFlyer) => {
    const card = cardRefs.current[group.key];
    setSourceRect(card ? card.getBoundingClientRect() : null);
    setOpenKey(group.key);
  };

  return (
    <>
      <div className="wg-board">
        <span className="wg-board-label" aria-hidden="true">Working groups</span>
        <div className="wg-files">
          {GROUPS.map((group) => (
            <article
              key={group.key}
              className={`wg-file${openKey === group.key ? " is-lifted" : ""}`}
              ref={(el) => { cardRefs.current[group.key] = el; }}
            >
              <FlyerContent group={group} open={false} onToggle={() => openFile(group)} />
            </article>
          ))}
          <div className="wg-join">
            <span className="join-kicker">Want in?</span>
            <p>
              Want to join a group? Come to the team meeting on <strong>Tuesdays at 7:00 PM</strong> at
              Humboldt-Haus, or just talk to us at any event. You contribute as much time as you want.
            </p>
          </div>
        </div>
      </div>

      {openGroup ? (
        <FlyerOverlay group={openGroup} sourceRect={sourceRect} onClose={() => setOpenKey(null)} />
      ) : null}
    </>
  );
}
