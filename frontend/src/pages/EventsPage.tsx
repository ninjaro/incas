import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import type { PublicPost, RegistrationRecord } from "../api/types";
import { useData } from "../data/DataProviderContext";
import { useAsync } from "../hooks/useAsync";
import { assetUrl } from "../utils/assets";
import { FoodFromEvents } from "./FoodFromEventsTab";
import {
  DEFAULT_ART,
  FORMAT_COLUMNS,
  POSTER_ART,
  STATIC_PAST,
  badgeParts,
  nextEventFor,
  pastRowFrom,
  sortEvents,
  whenLabel,
  whereLabel,
} from "./eventFormats";
import type { Format, PastRow } from "./eventFormats";

type EventsTab = "discover" | "register" | "food";

/* ---------- board poster ---------- */

function BoardPoster({
  fmt,
  next,
  onOpen,
}: {
  fmt: Format;
  next: PublicPost | null;
  onOpen: (fmt: Format, source: HTMLElement) => void;
}) {
  const nextLabel = (next && whenLabel(next.startsAt)) ?? fmt.fallbackNext;
  const whereText = (next && whereLabel(next)) ?? fmt.fallbackWhere;
  const href = fmt.plainHref ?? `/events/archive?e=${fmt.key}`;

  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (fmt.plainHref) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onOpen(fmt, event.currentTarget);
  };

  return (
    <Link className={`poster pin-${fmt.pin}`} to={href} onClick={handleClick}>
      <span className="poster-band" aria-hidden="true" />
      <span className="poster-kicker">{fmt.kicker}</span>
      <h2>{fmt.title}</h2>
      <p className="poster-desc">{fmt.desc}</p>
      <span className="poster-rule" aria-hidden="true" />
      <span className="poster-meta">
        <span><b>Next</b>{nextLabel}</span>
        <span><b>Where</b>{whereText}</span>
      </span>
      <span className="poster-foot">
        <span className={`poster-tag${fmt.tagReq ? " is-req" : ""}`}>{fmt.tag}</span>
        <span className="poster-more">Read more <i className="bi bi-arrow-right" aria-hidden="true" /></span>
      </span>
    </Link>
  );
}

/* ---------- poster stack overlay ---------- */

const TURN_MS = 860;
const TURN_EASE = "cubic-bezier(0.32, 0.02, 0.18, 1)";

function PosterStack({
  fmt,
  next,
  past,
  onClose,
  onRegister,
}: {
  fmt: Format;
  next: PublicPost | null;
  past: PastRow[];
  onClose: () => void;
  onRegister: () => void;
}) {
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const stackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = useRef({ x: 0, y: 0, tracking: false });

  const go = useCallback((n: number) => {
    const clamped = Math.max(0, Math.min(2, n));
    const current = pageRef.current;
    if (clamped === current) return;
    const forward = clamped > current;
    const moving = cardRefs.current[forward ? current : clamped];
    pageRef.current = clamped;
    setPage(clamped);
    if (moving && typeof moving.animate === "function") {
      const flat = { transform: "rotateY(0deg) translateZ(0px)", opacity: 1, offset: 0 };
      const lift = { transform: "rotateY(-92deg) translateZ(34px)", opacity: 1, offset: forward ? 0.46 : 0.54 };
      const away = { transform: "rotateY(-168deg) translateZ(2px)", opacity: 0.12, offset: forward ? 1 : 0 };
      const keys = forward ? [flat, lift, away] : [away, lift, flat];
      const prev = moving.style.transition;
      moving.style.transition = "none";
      const anim = moving.animate(keys, { duration: TURN_MS, easing: TURN_EASE, fill: "none" });
      anim.onfinish = anim.oncancel = () => {
        moving.style.transition = prev;
      };
    }
    const target = cardRefs.current[clamped];
    if (target) target.scrollTop = 0;
  }, []);

  // Sync the stack's height to the top card so pages behind never spill out.
  useLayoutEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;
    const cards = cardRefs.current.filter(Boolean) as HTMLElement[];
    const top = cardRefs.current[page];
    if (!top) return;
    const measure = () => {
      cards.forEach((card) => { card.style.height = ""; });
      const h = top.offsetHeight;
      stack.style.height = `${h}px`;
      cards.forEach((card) => { if (card !== top) card.style.height = `${h}px`; });
    };
    measure();
    top.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", measure, { once: true });
    });
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [page, fmt.key]);

  // Focus, keyboard and scroll lock for the dialog.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key === "ArrowRight") go(pageRef.current + 1);
      if (event.key === "ArrowLeft") go(pageRef.current - 1);
      if (event.key === "Tab") {
        const stack = stackRef.current;
        if (!stack) return;
        const focusables = Array.from(
          stack.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
        ).filter((el) => el.offsetParent !== null || el === closeRef.current);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus();
    };
  }, [go, onClose]);

  const nextLabel = (next && whenLabel(next.startsAt)) ?? fmt.fallbackNext;
  const whereText = (next && whereLabel(next)) ?? fmt.fallbackWhere;
  const badge = badgeParts(next?.startsAt ?? null);
  const nextArt = next?.imageUrl ? assetUrl(next.imageUrl) : null;
  const art = nextArt && next
    ? { src: nextArt, alt: `Poster for ${next.title.full}`, caption: "Next edition" }
    : POSTER_ART[fmt.key] ?? DEFAULT_ART;

  const cardProps = (index: number) => ({
    "data-pos": String(index - page),
    ref: (el: HTMLElement | null) => { cardRefs.current[index] = el; },
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      if (index === page) return;
      if ((event.target as HTMLElement).closest("a, button")) return;
      go(index);
    },
  });

  return createPortal(
    <>
      <div className="ev-backdrop is-on" onClick={onClose} />
      <div
        className={`theme-parchment ev-stack is-on${fmt.pin === "olive" ? " is-olive" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={fmt.title}
        ref={stackRef}
        onTouchStart={(event) => {
          if (event.touches.length !== 1) return;
          touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, tracking: true };
        }}
        onTouchEnd={(event) => {
          if (!touch.current.tracking) return;
          touch.current.tracking = false;
          const t = event.changedTouches[0];
          const dx = t.clientX - touch.current.x;
          const dy = t.clientY - touch.current.y;
          if (Math.abs(dx) < 46 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
          go(dx < 0 ? pageRef.current + 1 : pageRef.current - 1);
        }}
      >
        <button type="button" className="ev-close" aria-label="Close" onClick={onClose} ref={closeRef}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>

        <article className="ev-card is-poster" {...cardProps(0)}>
          <span className="ev-card-shade" aria-hidden="true" />
          <p className="ev-page-head">Next edition</p>
          <div className="ev-poster-wrap">
            <figure className="ev-poster-art">
              <img src={art.src} alt={art.alt} width={740} height={927} />
              {art.caption ? <figcaption>{art.caption}</figcaption> : null}
            </figure>
            <div className="ev-next-row">
              {badge ? (
                <span className="ev-date-badge" aria-hidden="true"><span>{badge.month}</span><strong>{badge.day}</strong></span>
              ) : null}
              <div>
                <h2>{next?.title.full ?? fmt.title}</h2>
                <p className="ev-when">{nextLabel}</p>
                <p className="ev-where">{whereText}</p>
              </div>
            </div>
          </div>
          <div className="ev-foot">
            <span className={`poster-tag${fmt.tagReq ? " is-req" : ""}`}>{fmt.tag}</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={onRegister}>Sign me up</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => go(1)}>
              What it is like <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </div>
          <span className="ev-folio">Page 1 of 3</span>
        </article>

        <article className="ev-card" {...cardProps(1)}>
          <span className="ev-card-shade" aria-hidden="true" />
          <p className="ev-page-head">About {fmt.title}</p>
          <h3>{fmt.title}</h3>
          <span className="poster-kicker">{fmt.kicker}</span>
          <p className="poster-desc">{fmt.desc}</p>
          <span className="poster-rule" aria-hidden="true" />
          <span className="poster-meta">
            <span><b>Next</b>{nextLabel}</span>
            <span><b>Where</b>{whereText}</span>
          </span>
          <div className="ev-foot">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => go(0)}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> Back
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => go(2)}>
              See past editions <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </div>
          <span className="ev-folio">Page 2 of 3</span>
        </article>

        <article className="ev-card" {...cardProps(2)}>
          <span className="ev-card-shade" aria-hidden="true" />
          <h3>Past editions</h3>
          <p className="ev-page-head">{past.length} on record this year</p>
          <div className="ev-past">
            {past.map((row) => (
              <div className="ev-past-row" key={`${row.date}-${row.title}`}>
                <span className="ev-past-when">{row.date}</span>
                <span>
                  <span className="ev-past-title">{row.title}</span>
                  <span className="ev-past-note">{row.note}</span>
                </span>
                <span className="ev-past-meta">{row.meta}</span>
              </div>
            ))}
          </div>
          <div className="ev-foot">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => go(1)}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> Back
            </button>
            <Link className="btn btn-primary btn-sm" to={`/events/archive?e=${fmt.key}`}>Open the full archive</Link>
          </div>
          <span className="ev-folio">Page 3 of 3</span>
        </article>

        <div className="ev-pager">
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => go(page - 1)}>
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <span className="ev-dots">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`Page ${i + 1}`}
                aria-current={i === page ? "true" : "false"}
                onClick={() => go(i)}
              />
            ))}
          </span>
          <button type="button" aria-label="Next page" disabled={page === 2} onClick={() => go(page + 1)}>
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ---------- registration letter ---------- */

const MEAL_KINDS = new Set(["country_evening", "breakfast"]);

function euro(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

function RegisterLetter({ events, preset }: { events: PublicPost[]; preset: string | null }) {
  const data = useData();
  const [choice, setChoice] = useState<string>(preset ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [occupation, setOccupation] = useState("");
  const [meal, setMeal] = useState("");
  const [comment, setComment] = useState("");
  const [joinFun, setJoinFun] = useState("");
  const [joinLanguages, setJoinLanguages] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RegistrationRecord | null>(null);
  const [joinRef, setJoinRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preset) { setChoice(preset); setResult(null); setJoinRef(null); }
  }, [preset]);
  useEffect(() => {
    if (!choice && events.length) setChoice(events[0].slug);
  }, [choice, events]);

  const isTandem = choice === "language-tandem";
  const isJoin = choice === "join-team";
  const selected = useMemo(
    () => events.find((event) => event.slug === choice) ?? null,
    [events, choice],
  );
  const showMeal = !!selected && MEAL_KINDS.has(selected.eventKind ?? "");
  const payment = selected?.registration && selected.registration.priceCents
    ? selected.registration
    : null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setJoinRef(null);
    setPending(true);
    try {
      if (isJoin) {
        const message = [
          `I would like to help out. What sounds fun: ${joinFun || "not sure yet"}.`,
          joinLanguages ? `Languages: ${joinLanguages}.` : "",
          comment,
        ].filter(Boolean).join("\n");
        const res = await data.submitContact({
          name: `${firstName} ${lastName}`.trim(),
          email,
          subject: "Join the team",
          message,
        });
        setJoinRef(res.submissionId);
      } else if (selected) {
        const record = await data.registerForEvent(selected.slug, {
          firstName,
          lastName,
          email,
          occupation,
          dietPreference: meal === "Vegetarian" ? "vegetarian" : meal === "Vegan" ? "vegan" : meal === "Everything" ? "omnivore" : "",
          comment,
        });
        setResult(record);
      }
      setFirstName(""); setLastName(""); setEmail(""); setOccupation("");
      setMeal(""); setComment(""); setJoinFun(""); setJoinLanguages("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = Object.values(err.fields ?? {});
        setError(fields.length ? fields.join(" ") : err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="register-layout">
      <form className="letter-sheet register-form" aria-label="Register for an event" onSubmit={submit}>
        <span className="letter-stamp" aria-hidden="true">
          <img src="/static/img/playful/stamp-globe.svg" alt="" />
        </span>
        <div className="letter-head"><span><b>INCAS</b> · Humboldt-Haus, Aachen</span><span>Pontstr. 41</span></div>
        {result ? (
          <div className="notice notice-ok" role="status">
            Registration received! Your application ID is <strong>{result.publicId}</strong>.{" "}
            <Link to={result.trackingPath}>Track your status here.</Link>
          </div>
        ) : null}
        {joinRef ? (
          <div className="notice notice-ok" role="status">
            Great, we will look out for you. Your reference is <strong>{joinRef}</strong>.
          </div>
        ) : null}
        {error ? <div className="notice notice-bad" role="alert">{error}</div> : null}
        <h3>Sign me up</h3>
        <p className="letter-salutation">
          {isJoin ? "Dear INCAS team, I would like to help out with:" : "Dear INCAS team, I would like to come along to:"}
        </p>
        <label className="field">
          <span className="field-label">Event *</span>
          <select value={choice} onChange={(event) => setChoice(event.target.value)} required>
            {events.map((event) => (
              <option key={event.slug} value={event.slug}>
                {event.title.full}{whenLabel(event.startsAt) ? ` · ${whenLabel(event.startsAt)}` : ""}
              </option>
            ))}
            <option value="language-tandem">Language Tandem (partner matching)</option>
            <option value="join-team">Join the team (Tuesday meeting)</option>
          </select>
        </label>

        {payment ? (
          <div className="payment-notice">
            <span className="badge badge-warn">Payment required</span>
            <span>{payment.isDeposit ? "Refundable deposit" : "Price"} <strong>{euro(payment.priceCents ?? 0)}</strong></span>
            {payment.capacity ? <span className="payment-places">{payment.capacity} places</span> : null}
          </div>
        ) : null}

        {isTandem ? (
          <>
            <p className="letter-note">
              The tandem team matches you with a partner by hand, usually within a week or two.
              You both get an email introduction. The tandem letter has a few extra questions, so it
              gets a page of its own.
            </p>
            <div className="letter-signoff">
              <span className="letter-signoff-text">Looking forward to it,<b>Find me a partner</b></span>
              <Link to="/tandem" className="btn btn-primary">Open the tandem letter</Link>
            </div>
          </>
        ) : (
          <>
            {isJoin ? (
              <p className="letter-note">
                No application and no experience needed. Tell us roughly what you would enjoy helping
                with and we will introduce you to that working group at the next Tuesday meeting.
              </p>
            ) : null}
            <div className="register-fields">
              <label className="field">
                <span className="field-label">First name *</span>
                <input autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">Last name *</span>
                <input autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">Email *</span>
                <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              {!isJoin ? (
                <label className="field">
                  <span className="field-label">Occupation *</span>
                  <select required value={occupation} onChange={(e) => setOccupation(e.target.value)}>
                    <option value="">Select</option>
                    <option>Student at RWTH Aachen</option>
                    <option>Student at FH Aachen</option>
                    <option>Other</option>
                  </select>
                </label>
              ) : null}
              {showMeal ? (
                <label className="field">
                  <span className="field-label">Meal preference *</span>
                  <select required value={meal} onChange={(e) => setMeal(e.target.value)}>
                    <option value="">Select</option>
                    <option>Everything</option>
                    <option>Vegetarian</option>
                    <option>Vegan</option>
                  </select>
                </label>
              ) : null}
              {isJoin ? (
                <>
                  <label className="field">
                    <span className="field-label">What sounds fun? *</span>
                    <select required value={joinFun} onChange={(e) => setJoinFun(e.target.value)}>
                      <option value="">Select</option>
                      <option>Not sure yet, show me around</option>
                      <option>International Tuesday</option>
                      <option>International Weekend (trips)</option>
                      <option>International Breakfast</option>
                      <option>Café Lingua / Language Exchange</option>
                      <option>Accommodation Search</option>
                      <option>Public Relations (photos, posts, posters)</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Languages you speak</span>
                    <input placeholder="German, English, …" value={joinLanguages} onChange={(e) => setJoinLanguages(e.target.value)} />
                  </label>
                </>
              ) : null}
              <label className="field field-full">
                <span className="field-label">Comment</span>
                <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>
            </div>
            <div className="letter-signoff">
              <span className="letter-signoff-text">
                {isJoin ? <>See you Tuesday,<b>Happy to help</b></> : <>Looking forward to it,<b>See you there</b></>}
              </span>
              <button type="submit" className="btn btn-primary" disabled={pending}>
                {pending ? "Sending…" : isJoin ? "Count me in" : "Seal and send"}
              </button>
            </div>
          </>
        )}
      </form>

      <aside className="register-aside">
        <div className="card">
          <h3>Do I need to register?</h3>
          <p><strong>No registration:</strong> Café Lingua, Karaoke Night, and Board Games. Just show up.</p>
          <p><strong>Registration needed:</strong> events with food or limited places, like country evenings, breakfasts, and trips.</p>
        </div>
        <div className="card">
          <h3>After you register</h3>
          <p>You get an application ID to track your status. For trips with a deposit, your place is confirmed once the payment is in.</p>
        </div>
      </aside>
    </div>
  );
}

/* ---------- page ---------- */

function tabFromHash(hash: string): EventsTab {
  if (hash.startsWith("#register")) return "register";
  if (hash === "#food") return "food";
  return "discover";
}

export function EventsPage() {
  const data = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<EventsTab>(() => tabFromHash(location.hash));
  const [preset, setPreset] = useState<string | null>(null);
  const [stackFmt, setStackFmt] = useState<Format | null>(null);
  const posts = useAsync(() => data.getPublicPosts(), [data]);

  useEffect(() => {
    setTab(tabFromHash(location.hash));
    if (location.hash === "#register-tandem") setPreset("language-tandem");
    if (location.hash === "#register-join") setPreset("join-team");
  }, [location.hash]);

  const selectTab = (next: EventsTab) => {
    setTab(next);
    navigate(`#${next}`, { replace: true });
  };

  const events = useMemo(() => sortEvents(posts.data?.events ?? []), [posts.data]);
  const archived = posts.data?.archivedEvents ?? [];

  const pastFor = (fmt: Format): PastRow[] => {
    const real = archived.filter((event) => event.eventKind === fmt.kind).slice(0, 4).map(pastRowFrom);
    return real.length ? real : STATIC_PAST[fmt.key] ?? [];
  };

  const openRegisterFor = (fmt: Format) => {
    const next = nextEventFor(fmt, events);
    setStackFmt(null);
    setPreset(next ? next.slug : null);
    selectTab("register");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <header className="events-hero">
        <p className="hero-coords">50°46′ N · 6°05′ E · Aachen</p>
        <h1>What our events <em>are like</em></h1>
        <p>Every week there is something on the board. Here is what to expect at each kind of event, so your first visit feels like your fifth.</p>
      </header>

      <div className="events-tabs" role="tablist" aria-label="Events">
        <button type="button" className="events-tab" role="tab" aria-selected={tab === "discover"} onClick={() => selectTab("discover")}>
          Discover events
        </button>
        <button type="button" className="events-tab" role="tab" aria-selected={tab === "register"} onClick={() => selectTab("register")}>
          Register for events
        </button>
        <button type="button" className="events-tab" role="tab" aria-selected={tab === "food"} onClick={() => selectTab("food")}>
          Food from events
        </button>
      </div>

      {tab === "discover" ? (
        <section aria-label="Discover events">
          <p className="events-note">
            Most of what we do is free and you can simply walk in. Only events with food or a limited
            number of places need registration, and every poster says which it is.
          </p>

          <div className="board">
            <div className="board-cols">
              {FORMAT_COLUMNS.map((column, columnIndex) => (
                <div className="board-col" key={columnIndex}>
                  {column.map((fmt) => (
                    <BoardPoster
                      key={fmt.key}
                      fmt={fmt}
                      next={nextEventFor(fmt, events)}
                      onOpen={(f) => setStackFmt(f)}
                    />
                  ))}
                  {columnIndex === 2 ? (
                    <Link className="poster poster-note pin-orange" to="/suggest-event">
                      <span className="poster-band" aria-hidden="true" />
                      <span className="poster-kicker">Your idea</span>
                      <h2>Suggest an event</h2>
                      <p className="poster-desc">Missing something? Tell us what you would like to see and we will help you put it on the board.</p>
                      <span className="poster-foot">
                        <span className="poster-more">Send us a note <i className="bi bi-arrow-right" aria-hidden="true" /></span>
                      </span>
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="board-note">
            <h2>Nothing pinned for your week?</h2>
            <p>The calendar has every date, and new posters go up as soon as a group confirms one.</p>
          </div>

          <div className="events-cta">
            <h2>Ready to join one?</h2>
            <p>
              Everything is free or close to it, and you can just show up. For events with limited
              places, use the{" "}
              <button type="button" className="btn-link-tab" onClick={() => { selectTab("register"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                registration tab
              </button>.
            </p>
            <div className="btn-row">
              <Link to="/calendar" className="btn btn-primary">View calendar</Link>
              <Link to="/" className="btn btn-outline">Back to home</Link>
            </div>
          </div>
        </section>
      ) : tab === "food" ? (
        <FoodFromEvents />
      ) : (
        <section aria-label="Register for events">
          <RegisterLetter events={events} preset={preset} />
        </section>
      )}

      {stackFmt ? (
        <PosterStack
          fmt={stackFmt}
          next={nextEventFor(stackFmt, events)}
          past={pastFor(stackFmt)}
          onClose={() => setStackFmt(null)}
          onRegister={() => openRegisterFor(stackFmt)}
        />
      ) : null}
    </>
  );
}
