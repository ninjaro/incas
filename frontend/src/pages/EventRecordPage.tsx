import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, useParams } from "react-router-dom";

import { ARCHIVE_FORMATS } from "./eventFormats";
import { EDITION_RECORDS } from "./eventRecords";
import { downloadRecipeCard } from "../utils/recipeCards";
import type { RecordDish, RecordDoc, Slide } from "./eventRecords";

const DOC_ICON: Record<string, string> = {
  Slides: "bi-easel2",
  PDF: "bi-file-earmark-pdf",
  Playlist: "bi-music-note-list",
  List: "bi-card-checklist",
};

/** Demo of "kept slides": the deck opens in a paper slide viewer. */
function SlideViewer({ title, slides, onClose }: { title: string; slides: Slide[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const go = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    indexRef.current = clamped;
    setIndex(clamped);
  }, [slides.length]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key === "ArrowRight") go(indexRef.current + 1);
      if (event.key === "ArrowLeft") go(indexRef.current - 1);
      if (event.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = Array.from(panel.querySelectorAll<HTMLElement>("button:not([disabled])"));
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
  }, [go, onClose]);

  const slide = slides[index];

  return createPortal(
    <>
      <div className="slides-backdrop" onClick={onClose} />
      <div className="theme-parchment slides-panel" role="dialog" aria-modal="true" aria-label={title} ref={panelRef}>
        <button type="button" className="ev-close" aria-label="Close" onClick={onClose} ref={closeRef}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
        <p className="slides-title">{title}</p>
        <div className={`slide tone-${slide.tone ?? "cream"}${slide.image ? " has-image" : ""}`}>
          <div className="slide-body">
            {slide.kicker ? <span className="slide-kicker">{slide.kicker}</span> : null}
            <h3>{slide.title}</h3>
            {slide.lines?.length ? (
              <ul>
                {slide.lines.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : null}
          </div>
          {slide.image ? (
            <figure className="slide-photo">
              <span className="tape" aria-hidden="true" />
              <img src={slide.image} alt="" />
            </figure>
          ) : null}
          <span className="slide-folio">{index + 1} / {slides.length}</span>
        </div>
        <div className="ev-pager slides-pager">
          <button type="button" aria-label="Previous slide" disabled={index === 0} onClick={() => go(index - 1)}>
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <span className="ev-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                aria-current={i === index ? "true" : "false"}
                onClick={() => go(i)}
              />
            ))}
          </span>
          <button type="button" aria-label="Next slide" disabled={index === slides.length - 1} onClick={() => go(index + 1)}>
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

function DishCard({ dish, recordTitle }: { dish: RecordDish; recordTitle: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`rec-dish${open ? " is-open" : ""}`}>
      <div className="rec-dish-head">
        <div>
          <h3>{dish.name}</h3>
          <p>{dish.note}</p>
        </div>
        {dish.recipe ? (
          <button type="button" className="btn btn-outline btn-sm" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? "Fold the recipe away" : "Open the recipe"}
          </button>
        ) : (
          <span className="rec-dish-none">No recipe kept</span>
        )}
      </div>
      {open && dish.recipe ? (
        <div className="rec-recipe">
          <div className="rec-recipe-top">
            <span className="rec-recipe-kicker">Recipe card · {dish.recipe.serves}</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => downloadRecipeCard(dish.name, recordTitle, dish.recipe!)}
            >
              <i className="bi bi-download" aria-hidden="true" /> Save the card
            </button>
          </div>
          <div className="rec-recipe-cols">
            <div>
              <h4>Ingredients</h4>
              <ul>
                {dish.recipe.ingredients.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h4>How it went</h4>
              <ol>
                {dish.recipe.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function EventRecordPage() {
  const { record: recordId } = useParams();
  const record = recordId ? EDITION_RECORDS[recordId] : undefined;
  const [openDeck, setOpenDeck] = useState<RecordDoc | null>(null);

  useEffect(() => {
    if (record) {
      document.title = `INCAS · ${record.title}`;
      window.scrollTo({ top: 0 });
      setOpenDeck(null);
    }
  }, [record?.id]);

  if (!record) return <Navigate to="/events/archive" replace />;
  const fmt = ARCHIVE_FORMATS.find((entry) => entry.key === record.formatKey);

  return (
    <>
      <Link to={`/events/archive?e=${record.formatKey}`} className="ev-back">
        <i className="bi bi-arrow-left" aria-hidden="true" /> Back to the {fmt?.title ?? "event"} archive
      </Link>
      <header className="ev-hero rec-hero">
        <p className="hero-coords">Kept by the team · {record.date}</p>
        <h1>{record.title}</h1>
        <p>{record.intro}</p>
        <p className="rec-meta">{record.meta}</p>
      </header>

      {record.photos.length ? (
        <section className="rec-section" aria-label="Photos from the event">
          <h2 className="rec-heading"><span className="rec-no">N° 01</span> How it looked</h2>
          <div className="rec-photos">
            {record.photos.map((photo, index) => (
              <figure className="rec-photo" key={photo.src + index}>
                <span className="tape" aria-hidden="true" />
                <img src={photo.src} alt={photo.caption} loading="lazy" />
                <figcaption>{photo.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {record.protocol.length ? (
        <section className="rec-section" aria-label="How the event went">
          <h2 className="rec-heading"><span className="rec-no">N° 02</span> The protocol</h2>
          <div className="rec-protocol">
            {record.protocol.map((step) => (
              <div className="rec-step" key={step.time + step.what}>
                <span className="rec-step-time">{step.time}</span>
                <span className="rec-step-what">{step.what}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {record.dishes.length ? (
        <section className="rec-section" aria-label="The food and recipes">
          <h2 className="rec-heading"><span className="rec-no">N° 03</span> The food, kept as recipes</h2>
          <div className="rec-dishes">
            {record.dishes.map((dish) => <DishCard dish={dish} recordTitle={record.title} key={dish.name} />)}
          </div>
        </section>
      ) : null}

      {record.documents.length ? (
        <section className="rec-section" aria-label="Slides and documents">
          <h2 className="rec-heading"><span className="rec-no">N° {record.dishes.length ? "04" : "03"}</span> Slides and documents</h2>
          <div className="rec-docs">
            {record.documents.map((doc) => {
              const inner = (
                <>
                  <i className={`bi ${DOC_ICON[doc.type] ?? "bi-file-earmark"}`} aria-hidden="true" />
                  <span className="rec-doc-body">
                    <strong>{doc.title}</strong>
                    <span>{doc.info}</span>
                  </span>
                  {doc.slides ? (
                    <span className="rec-doc-open">View the slides <i className="bi bi-arrow-right" aria-hidden="true" /></span>
                  ) : null}
                  <span className="doc-type-badge">{doc.type}</span>
                </>
              );
              return doc.slides ? (
                <button type="button" className="rec-doc is-openable" key={doc.title} onClick={() => setOpenDeck(doc)}>
                  {inner}
                </button>
              ) : (
                <div className="rec-doc" key={doc.title}>{inner}</div>
              );
            })}
          </div>
          <p className="rec-docs-note">
            The team keeps these after every edition. Ask at a Tuesday meeting or message us to get a copy.
          </p>
        </section>
      ) : null}

      {openDeck?.slides ? (
        <SlideViewer title={openDeck.title} slides={openDeck.slides} onClose={() => setOpenDeck(null)} />
      ) : null}
    </>
  );
}
