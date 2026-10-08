import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import type { Locale, PublicPost, RegistrationRecord } from "../api/types";
import { useData } from "../data/DataProviderContext";
import { useAsync } from "../hooks/useAsync";
import { useLocale } from "../i18n/LocaleContext";
import { assetUrl } from "../utils/assets";
import { FoodFromEvents } from "./FoodFromEventsTab";
import {
  badgeParts,
  defaultArt,
  formatColumns,
  nextEventFor,
  pastRowFrom,
  posterArt,
  sortEvents,
  staticPast,
  whenLabel,
  whereLabel,
} from "./eventFormats";
import type { Format, PastRow } from "./eventFormats";

type EventsTab = "discover" | "register" | "food";

/* ---------- board poster ---------- */

function BoardPoster({
  fmt,
  next,
  locale,
  onOpen,
}: {
  fmt: Format;
  next: PublicPost | null;
  locale: Locale;
  onOpen: (fmt: Format, source: HTMLElement) => void;
}) {
  const de = locale === "de";
  const nextLabel = (next && whenLabel(next.startsAt, locale)) ?? fmt.fallbackNext;
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
        <span><b>{de ? "Nächstes" : "Next"}</b>{nextLabel}</span>
        <span><b>{de ? "Wo" : "Where"}</b>{whereText}</span>
      </span>
      <span className="poster-foot">
        <span className={`poster-tag${fmt.tagReq ? " is-req" : ""}`}>{fmt.tag}</span>
        <span className="poster-more">{de ? "Mehr lesen" : "Read more"} <i className="bi bi-arrow-right" aria-hidden="true" /></span>
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
  locale,
  onClose,
  onRegister,
}: {
  fmt: Format;
  next: PublicPost | null;
  past: PastRow[];
  locale: Locale;
  onClose: () => void;
  onRegister: () => void;
}) {
  const de = locale === "de";
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

  const nextLabel = (next && whenLabel(next.startsAt, locale)) ?? fmt.fallbackNext;
  const whereText = (next && whereLabel(next)) ?? fmt.fallbackWhere;
  const badge = badgeParts(next?.startsAt ?? null, locale);
  const nextArt = next?.imageUrl ? assetUrl(next.imageUrl) : null;
  const nextEdition = de ? "Nächste Ausgabe" : "Next edition";
  const art = nextArt && next
    ? { src: nextArt, alt: de ? `Plakat für ${next.title.full}` : `Poster for ${next.title.full}`, caption: nextEdition }
    : posterArt(fmt.key, locale) ?? defaultArt(locale);
  const folio = (page: number) => de ? `Seite ${page} von 3` : `Page ${page} of 3`;

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
        <button type="button" className="ev-close" aria-label={de ? "Schließen" : "Close"} onClick={onClose} ref={closeRef}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>

        <article className="ev-card is-poster" {...cardProps(0)}>
          <span className="ev-card-shade" aria-hidden="true" />
          <p className="ev-page-head">{nextEdition}</p>
          <div className="ev-poster-wrap">
            <figure className="ev-poster-art">
              <img src={assetUrl(art.src) ?? art.src} alt={art.alt} width={740} height={927} />
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
            <button type="button" className="btn btn-primary btn-sm" onClick={onRegister}>{de ? "Ich bin dabei" : "Sign me up"}</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => go(1)}>
              {de ? "Wie es ist" : "What it is like"} <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </div>
          <span className="ev-folio">{folio(1)}</span>
        </article>

        <article className="ev-card" {...cardProps(1)}>
          <span className="ev-card-shade" aria-hidden="true" />
          <p className="ev-page-head">{de ? "Über" : "About"} {fmt.title}</p>
          <h3>{fmt.title}</h3>
          <span className="poster-kicker">{fmt.kicker}</span>
          <p className="poster-desc">{fmt.desc}</p>
          <span className="poster-rule" aria-hidden="true" />
          <span className="poster-meta">
            <span><b>{de ? "Nächstes" : "Next"}</b>{nextLabel}</span>
            <span><b>{de ? "Wo" : "Where"}</b>{whereText}</span>
          </span>
          <div className="ev-foot">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => go(0)}>
              <i className="bi bi-arrow-left" aria-hidden="true" /> {de ? "Zurück" : "Back"}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => go(2)}>
              {de ? "Frühere Ausgaben" : "See past editions"} <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </div>
          <span className="ev-folio">{folio(2)}</span>
        </article>

        <article className="ev-card" {...cardProps(2)}>
          <span className="ev-card-shade" aria-hidden="true" />
          <h3>{de ? "Frühere Ausgaben" : "Past editions"}</h3>
          <p className="ev-page-head">{de ? `${past.length} in diesem Jahr festgehalten` : `${past.length} on record this year`}</p>
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
              <i className="bi bi-arrow-left" aria-hidden="true" /> {de ? "Zurück" : "Back"}
            </button>
            <Link className="btn btn-primary btn-sm" to={`/events/archive?e=${fmt.key}`}>{de ? "Ganzes Archiv öffnen" : "Open the full archive"}</Link>
          </div>
          <span className="ev-folio">{folio(3)}</span>
        </article>

        <div className="ev-pager">
          <button type="button" aria-label={de ? "Vorherige Seite" : "Previous page"} disabled={page === 0} onClick={() => go(page - 1)}>
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <span className="ev-dots">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={de ? `Seite ${i + 1}` : `Page ${i + 1}`}
                aria-current={i === page ? "true" : "false"}
                onClick={() => go(i)}
              />
            ))}
          </span>
          <button type="button" aria-label={de ? "Nächste Seite" : "Next page"} disabled={page === 2} onClick={() => go(page + 1)}>
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

function euro(cents: number, locale: Locale): string {
  const amount = (cents / 100).toFixed(2).replace(/\.00$/, "");
  return locale === "de" ? `${amount.replace(".", ",")} €` : `€${amount}`;
}

/** Option values stay English: they are stored and read by the team as-is. */
const OCCUPATIONS = [
  { value: "Student at RWTH Aachen", de: "Studierende*r an der RWTH Aachen" },
  { value: "Student at FH Aachen", de: "Studierende*r an der FH Aachen" },
  { value: "Other", de: "Sonstiges" },
];
const MEALS = [
  { value: "Everything", de: "Alles" },
  { value: "Vegetarian", de: "Vegetarisch" },
  { value: "Vegan", de: "Vegan" },
];
const JOIN_INTERESTS = [
  { value: "Not sure yet, show me around", de: "Weiß ich noch nicht, zeigt mir alles" },
  { value: "International Tuesday", de: "International Tuesday" },
  { value: "International Weekend (trips)", de: "International Weekend (Ausflüge)" },
  { value: "International Breakfast", de: "Internationales Frühstück" },
  { value: "Café Lingua / Language Exchange", de: "Café Lingua / Sprachaustausch" },
  { value: "Accommodation Search", de: "Wohnungssuche" },
  { value: "Public Relations (photos, posts, posters)", de: "Öffentlichkeitsarbeit (Fotos, Beiträge, Plakate)" },
];

function RegisterLetter({ events, preset, locale }: { events: PublicPost[]; preset: string | null; locale: Locale }) {
  const data = useData();
  const de = locale === "de";
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
        setError(de ? "Etwas ist schiefgelaufen. Bitte versuche es erneut." : "Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="register-layout">
      <form className="letter-sheet register-form" aria-label={de ? "Für ein Event anmelden" : "Register for an event"} onSubmit={submit}>
        <span className="letter-stamp" aria-hidden="true">
          <img src={assetUrl("img/playful/stamp-globe.svg") ?? ""} alt="" />
        </span>
        <div className="letter-head"><span><b>INCAS</b> · Humboldt-Haus, Aachen</span><span>Pontstr. 41</span></div>
        {result ? (
          <div className="notice notice-ok" role="status">
            {de ? "Anmeldung eingegangen! Deine Anmelde-ID ist" : "Registration received! Your application ID is"} <strong>{result.publicId}</strong>.{" "}
            <Link to={result.trackingPath}>{de ? "Hier kannst du deinen Status verfolgen." : "Track your status here."}</Link>
          </div>
        ) : null}
        {joinRef ? (
          <div className="notice notice-ok" role="status">
            {de ? "Super, wir halten Ausschau nach dir. Deine Referenz ist" : "Great, we will look out for you. Your reference is"} <strong>{joinRef}</strong>.
          </div>
        ) : null}
        {error ? <div className="notice notice-bad" role="alert">{error}</div> : null}
        <h3>{de ? "Ich bin dabei" : "Sign me up"}</h3>
        <p className="letter-salutation">
          {isJoin
            ? (de ? "Liebes INCAS-Team, ich möchte gern mithelfen bei:" : "Dear INCAS team, I would like to help out with:")
            : (de ? "Liebes INCAS-Team, ich möchte gern dabei sein bei:" : "Dear INCAS team, I would like to come along to:")}
        </p>
        <label className="field">
          <span className="field-label">Event *</span>
          <select value={choice} onChange={(event) => setChoice(event.target.value)} required>
            {events.map((event) => (
              <option key={event.slug} value={event.slug}>
                {event.title.full}{whenLabel(event.startsAt, locale) ? ` · ${whenLabel(event.startsAt, locale)}` : ""}
              </option>
            ))}
            <option value="language-tandem">{de ? "Sprachtandem (Partnervermittlung)" : "Language Tandem (partner matching)"}</option>
            <option value="join-team">{de ? "Im Team mitmachen (Dienstagstreffen)" : "Join the team (Tuesday meeting)"}</option>
          </select>
        </label>

        {payment ? (
          <div className="payment-notice">
            <span className="badge badge-warn">{de ? "Zahlung erforderlich" : "Payment required"}</span>
            <span>{payment.isDeposit ? (de ? "Erstattbare Kaution" : "Refundable deposit") : (de ? "Preis" : "Price")} <strong>{euro(payment.priceCents ?? 0, locale)}</strong></span>
            {payment.capacity ? <span className="payment-places">{payment.capacity} {de ? "Plätze" : "places"}</span> : null}
          </div>
        ) : null}

        {isTandem ? (
          <>
            <p className="letter-note">
              {de
                ? "Das Tandem-Team sucht dir von Hand eine Partnerin oder einen Partner aus, meist innerhalb von ein bis zwei Wochen. Ihr bekommt beide eine Vorstellung per E-Mail. Der Tandem-Brief hat ein paar zusätzliche Fragen und deshalb eine eigene Seite."
                : "The tandem team matches you with a partner by hand, usually within a week or two. You both get an email introduction. The tandem letter has a few extra questions, so it gets a page of its own."}
            </p>
            <div className="letter-signoff">
              <span className="letter-signoff-text">{de ? "Ich freue mich darauf," : "Looking forward to it,"}<b>{de ? "Finde mir ein Tandem" : "Find me a partner"}</b></span>
              <Link to="/tandem" className="btn btn-primary">{de ? "Tandem-Brief öffnen" : "Open the tandem letter"}</Link>
            </div>
          </>
        ) : (
          <>
            {isJoin ? (
              <p className="letter-note">
                {de
                  ? "Keine Bewerbung und keine Erfahrung nötig. Sag uns grob, wobei du gern helfen würdest, und wir stellen dich beim nächsten Dienstagstreffen der passenden Arbeitsgruppe vor."
                  : "No application and no experience needed. Tell us roughly what you would enjoy helping with and we will introduce you to that working group at the next Tuesday meeting."}
              </p>
            ) : null}
            <div className="register-fields">
              <label className="field">
                <span className="field-label">{de ? "Vorname" : "First name"} *</span>
                <input autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">{de ? "Nachname" : "Last name"} *</span>
                <input autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">{de ? "E-Mail" : "Email"} *</span>
                <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              {!isJoin ? (
                <label className="field">
                  <span className="field-label">{de ? "Tätigkeit" : "Occupation"} *</span>
                  <select required value={occupation} onChange={(e) => setOccupation(e.target.value)}>
                    <option value="">{de ? "Auswählen" : "Select"}</option>
                    {OCCUPATIONS.map((option) => <option key={option.value} value={option.value}>{de ? option.de : option.value}</option>)}
                  </select>
                </label>
              ) : null}
              {showMeal ? (
                <label className="field">
                  <span className="field-label">{de ? "Essenswunsch" : "Meal preference"} *</span>
                  <select required value={meal} onChange={(e) => setMeal(e.target.value)}>
                    <option value="">{de ? "Auswählen" : "Select"}</option>
                    {MEALS.map((option) => <option key={option.value} value={option.value}>{de ? option.de : option.value}</option>)}
                  </select>
                </label>
              ) : null}
              {isJoin ? (
                <>
                  <label className="field">
                    <span className="field-label">{de ? "Was klingt nach Spaß?" : "What sounds fun?"} *</span>
                    <select required value={joinFun} onChange={(e) => setJoinFun(e.target.value)}>
                      <option value="">{de ? "Auswählen" : "Select"}</option>
                      {JOIN_INTERESTS.map((option) => <option key={option.value} value={option.value}>{de ? option.de : option.value}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">{de ? "Sprachen, die du sprichst" : "Languages you speak"}</span>
                    <input placeholder={de ? "Deutsch, Englisch, …" : "German, English, …"} value={joinLanguages} onChange={(e) => setJoinLanguages(e.target.value)} />
                  </label>
                </>
              ) : null}
              <label className="field field-full">
                <span className="field-label">{de ? "Kommentar" : "Comment"}</span>
                <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>
            </div>
            <div className="letter-signoff">
              <span className="letter-signoff-text">
                {isJoin
                  ? <>{de ? "Bis Dienstag," : "See you Tuesday,"}<b>{de ? "Ich helfe gern" : "Happy to help"}</b></>
                  : <>{de ? "Ich freue mich darauf," : "Looking forward to it,"}<b>{de ? "Bis dann" : "See you there"}</b></>}
              </span>
              <button type="submit" className="btn btn-primary" disabled={pending}>
                {pending
                  ? (de ? "Wird gesendet…" : "Sending…")
                  : isJoin ? (de ? "Ich bin dabei" : "Count me in") : (de ? "Versiegeln und senden" : "Seal and send")}
              </button>
            </div>
          </>
        )}
      </form>

      <aside className="register-aside">
        <div className="card">
          <h3>{de ? "Muss ich mich anmelden?" : "Do I need to register?"}</h3>
          {de ? (
            <>
              <p><strong>Ohne Anmeldung:</strong> Café Lingua, Karaoke-Abend und Spieleabende. Einfach vorbeikommen.</p>
              <p><strong>Mit Anmeldung:</strong> Events mit Essen oder begrenzten Plätzen, etwa Länderabende, Frühstücke und Ausflüge.</p>
            </>
          ) : (
            <>
              <p><strong>No registration:</strong> Café Lingua, Karaoke Night, and Board Games. Just show up.</p>
              <p><strong>Registration needed:</strong> events with food or limited places, like country evenings, breakfasts, and trips.</p>
            </>
          )}
        </div>
        <div className="card">
          <h3>{de ? "Nach der Anmeldung" : "After you register"}</h3>
          <p>
            {de
              ? "Du bekommst eine Anmelde-ID, mit der du deinen Status verfolgen kannst. Bei Ausflügen mit Kaution ist dein Platz bestätigt, sobald die Zahlung eingegangen ist."
              : "You get an application ID to track your status. For trips with a deposit, your place is confirmed once the payment is in."}
          </p>
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
  const { locale } = useLocale();
  const de = locale === "de";
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
    const real = archived
      .filter((event) => event.eventKind === fmt.kind)
      .slice(0, 4)
      .map((event) => pastRowFrom(event, locale));
    return real.length ? real : staticPast(fmt.key, locale);
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
        {de
          ? <h1>So sind unsere <em>Events</em></h1>
          : <h1>What our events <em>are like</em></h1>}
        <p>
          {de
            ? "Jede Woche hängt etwas am Brett. Hier erfährst du, was dich bei jeder Art von Event erwartet, damit sich dein erster Besuch wie dein fünfter anfühlt."
            : "Every week there is something on the board. Here is what to expect at each kind of event, so your first visit feels like your fifth."}
        </p>
      </header>

      <div className="events-tabs" role="tablist" aria-label="Events">
        <button type="button" className="events-tab" role="tab" aria-selected={tab === "discover"} onClick={() => selectTab("discover")}>
          {de ? "Events entdecken" : "Discover events"}
        </button>
        <button type="button" className="events-tab" role="tab" aria-selected={tab === "register"} onClick={() => selectTab("register")}>
          {de ? "Für Events anmelden" : "Register for events"}
        </button>
        <button type="button" className="events-tab" role="tab" aria-selected={tab === "food"} onClick={() => selectTab("food")}>
          {de ? "Essen von Events" : "Food from events"}
        </button>
      </div>

      {tab === "discover" ? (
        <section aria-label={de ? "Events entdecken" : "Discover events"}>
          <p className="events-note">
            {de
              ? "Das meiste, was wir machen, ist kostenlos, und du kannst einfach vorbeikommen. Nur Events mit Essen oder begrenzten Plätzen brauchen eine Anmeldung, und auf jedem Plakat steht, was gilt."
              : "Most of what we do is free and you can simply walk in. Only events with food or a limited number of places need registration, and every poster says which it is."}
          </p>

          <div className="board">
            <div className="board-cols">
              {formatColumns(locale).map((column, columnIndex) => (
                <div className="board-col" key={columnIndex}>
                  {column.map((fmt) => (
                    <BoardPoster
                      key={fmt.key}
                      fmt={fmt}
                      next={nextEventFor(fmt, events)}
                      locale={locale}
                      onOpen={(f) => setStackFmt(f)}
                    />
                  ))}
                  {columnIndex === 2 ? (
                    <Link className="poster poster-note pin-orange" to="/suggest-event">
                      <span className="poster-band" aria-hidden="true" />
                      <span className="poster-kicker">{de ? "Deine Idee" : "Your idea"}</span>
                      <h2>{de ? "Event vorschlagen" : "Suggest an event"}</h2>
                      <p className="poster-desc">
                        {de
                          ? "Fehlt dir etwas? Sag uns, was du gern sehen würdest, und wir helfen dir, es ans Brett zu bringen."
                          : "Missing something? Tell us what you would like to see and we will help you put it on the board."}
                      </p>
                      <span className="poster-foot">
                        <span className="poster-more">{de ? "Schreib uns" : "Send us a note"} <i className="bi bi-arrow-right" aria-hidden="true" /></span>
                      </span>
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="board-note">
            <h2>{de ? "Nichts für deine Woche dabei?" : "Nothing pinned for your week?"}</h2>
            <p>
              {de
                ? "Im Kalender steht jeder Termin, und neue Plakate hängen, sobald eine Gruppe einen bestätigt."
                : "The calendar has every date, and new posters go up as soon as a group confirms one."}
            </p>
          </div>

          <div className="events-cta">
            <h2>{de ? "Lust mitzumachen?" : "Ready to join one?"}</h2>
            <p>
              {de
                ? "Alles ist kostenlos oder fast, und du kannst einfach vorbeikommen. Für Events mit begrenzten Plätzen nutze den "
                : "Everything is free or close to it, and you can just show up. For events with limited places, use the "}
              <button type="button" className="btn-link-tab" onClick={() => { selectTab("register"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                {de ? "Anmelde-Tab" : "registration tab"}
              </button>.
            </p>
            <div className="btn-row">
              <Link to="/calendar" className="btn btn-primary">{de ? "Kalender ansehen" : "View calendar"}</Link>
              <Link to="/" className="btn btn-outline">{de ? "Zur Startseite" : "Back to home"}</Link>
            </div>
          </div>
        </section>
      ) : tab === "food" ? (
        <FoodFromEvents />
      ) : (
        <section aria-label={de ? "Für Events anmelden" : "Register for events"}>
          <RegisterLetter events={events} preset={preset} locale={locale} />
        </section>
      )}

      {stackFmt ? (
        <PosterStack
          fmt={stackFmt}
          next={nextEventFor(stackFmt, events)}
          past={pastFor(stackFmt)}
          locale={locale}
          onClose={() => setStackFmt(null)}
          onRegister={() => openRegisterFor(stackFmt)}
        />
      ) : null}
    </>
  );
}
