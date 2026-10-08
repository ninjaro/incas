import { useEffect, useRef, useState } from "react";

import { useLocale } from "../i18n/LocaleContext";
import { sanitizeRichHtml } from "../utils/sanitize";

const STORAGE_KEY = "incas-wiki-docs-v2";

const GROUPS = [
  "Coordination",
  "International Tuesday & Café Lingua",
  "International Weekend",
  "Accommodation Search & Service Hours",
  "Language Exchange",
  "International Breakfast",
  "Public Relations",
];

/** Group names are stored on documents in English; only their display is localized. */
const GERMAN_GROUP_NAMES: Record<string, string> = {
  Coordination: "Koordination",
  "International Tuesday & Café Lingua": "International Tuesday & Café Lingua",
  "International Weekend": "International Weekend",
  "Accommodation Search & Service Hours": "Wohnungssuche & Sprechstunden",
  "Language Exchange": "Sprachaustausch",
  "International Breakfast": "Internationales Frühstück",
  "Public Relations": "Öffentlichkeitsarbeit",
};

const GERMAN_DOC_TYPES: Record<string, string> = { Text: "Text", PDF: "PDF", DOCX: "DOCX" };

type WikiDoc = {
  id: string;
  group: string;
  title: string;
  type: "Text" | "PDF" | "DOCX";
  info: string;
  html: string;
};

const SEED_DOCS: WikiDoc[] = [
  { id: "onboarding", group: "Coordination", title: "New Member Onboarding", type: "Text", info: "Written by the team · updated Jul 2026",
    html: "<p>Welcome to the crew! This page collects everything a new member needs in the first weeks.</p><h3>First steps</h3><ul><li>Come to the team meeting, Tuesdays 7:00 PM at Humboldt-Haus.</li><li>Join the team group chat (ask any group leader).</li><li>Pick a working group that fits the time you can invest.</li></ul><h3>Keys and access</h3><p>Office keys are handled by Coordination. The office is in Humboldt-Haus; the service hours schedule hangs at the door.</p>" },
  { id: "meeting-protocol", group: "Coordination", title: "Meeting Protocol Template", type: "DOCX", info: "Uploaded DOCX · converted to editable text",
    html: "<p>Copy this structure for the weekly protocol.</p><ul><li>Date, attendees, moderator</li><li>Updates per working group</li><li>Upcoming events and open tasks</li><li>Decisions taken</li></ul>" },
  { id: "country-evening-guide", group: "International Tuesday & Café Lingua", title: "Country Evening Guide", type: "Text", info: "Written by the team · updated Jun 2026",
    html: "<p>Checklist for hosting a country evening from idea to cleanup.</p><h3>Four weeks before</h3><ul><li>Find presenters from the country and fix the date.</li><li>Announce it in the team meeting and reserve the room.</li></ul><h3>On the day</h3><ul><li>Setup from 5 PM, doors at 7 PM.</li><li>Cleanup crew stays until the kitchen is done.</li></ul>" },
  { id: "cafe-lingua-setup", group: "International Tuesday & Café Lingua", title: "Café Lingua Table Setup", type: "PDF", info: "Uploaded PDF · converted to editable text",
    html: "<p>Room and table plan for the monthly language café.</p><ul><li>At least four language tables, signs on each table.</li><li>Coffee and tea station near the entrance.</li><li>Hosts rotate between tables every 30 minutes.</li></ul>" },
  { id: "trip-finances", group: "International Weekend", title: "Trip Finances & Deposits", type: "PDF", info: "Uploaded PDF · converted to editable text",
    html: "<p>Rules for handling registration deposits on trips.</p><h3>Deposits</h3><ul><li>Standard deposit is €10, refundable at the meeting point.</li><li>No-shows without cancellation forfeit the deposit.</li></ul><h3>Reimbursements</h3><p>Group leads submit receipts to Coordination within two weeks of the trip.</p>" },
  { id: "service-hours", group: "Accommodation Search & Service Hours", title: "Service Hours Handbook", type: "Text", info: "Written by the team · updated May 2026",
    html: "<p>How to run a service hour shift in the office.</p><ul><li>Check the shared inbox for open questions before the shift.</li><li>Common topics: rental contracts, enrollment, insurance.</li><li>Log every visit briefly in the shift book.</li></ul>" },
  { id: "tandem-matching", group: "Language Exchange", title: "Tandem Matching Basics", type: "Text", info: "Written by the team · updated Apr 2026",
    html: "<p>How requests are matched from the database.</p><ul><li>Match offered against requested languages, both directions.</li><li>Prefer full matches; follow up on partial matches by email.</li><li>Mark matched pairs in the admin so nobody is matched twice.</li></ul>" },
  { id: "breakfast-shopping", group: "International Breakfast", title: "Shopping & Prep List", type: "DOCX", info: "Uploaded DOCX · converted to editable text",
    html: "<p>Standard list for the last-Sunday breakfast.</p><ul><li>Bread, spreads, fruit, vegetables, eggs.</li><li>Coffee machine on at 9:00, doors at 10:00.</li><li>Budget per breakfast is agreed with Coordination.</li></ul>" },
  { id: "social-media", group: "Public Relations", title: "Social Media Playbook", type: "Text", info: "Written by the team · updated Jul 2026",
    html: "<p>How INCAS posts: friendly, direct, and in English.</p><ul><li>Announce every event about one week ahead on Instagram.</li><li>Post photos within two days after an event.</li><li>Flyers use the INCAS orange and the logo, nothing else.</li></ul>" },
];

function loadDocs(): WikiDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WikiDoc[];
  } catch {
    // fall through to the seed library
  }
  return [...SEED_DOCS];
}

function typeIcon(type: WikiDoc["type"]): string {
  if (type === "PDF") return "bi-file-earmark-pdf";
  if (type === "DOCX") return "bi-file-earmark-word";
  return "bi-file-earmark-text";
}

export function WikiPage() {
  const { locale } = useLocale();
  const de = locale === "de";
  const groupName = (group: string) => (de ? GERMAN_GROUP_NAMES[group] ?? group : group);
  const [docs, setDocs] = useState<WikiDoc[]>(loadDocs);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingGroup = useRef(GROUPS[0]);

  const active = docs.find((doc) => doc.id === activeId) ?? null;

  const persist = (next: WikiDoc[]) => {
    setDocs(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const commitEdits = () => {
    if (!editing || !active) { setEditing(false); return; }
    const html = sanitizeRichHtml(contentRef.current?.innerHTML ?? active.html);
    const title = titleRef.current?.textContent?.trim() || active.title;
    persist(docs.map((doc) => (doc.id === active.id ? { ...doc, html, title } : doc)));
    setEditing(false);
  };

  useEffect(() => {
    if (editing) contentRef.current?.focus();
  }, [editing]);

  const openDoc = (id: string) => {
    setActiveId(id);
    setEditing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const newPage = (group: string) => {
    const doc: WikiDoc = {
      id: `doc-${Date.now()}`,
      group,
      title: de ? "Seite ohne Titel" : "Untitled page",
      type: "Text",
      info: `${de ? "Neue Seite" : "New page"} · ${new Date().toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`,
      html: de ? "<p>Fang an zu schreiben…</p>" : "<p>Start writing…</p>",
    };
    persist([...docs, doc]);
    setActiveId(doc.id);
    setEditing(true);
  };

  const onUpload = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setConverting(file.name);
    window.setTimeout(() => {
      setConverting(null);
      const ext = (file.name.split(".").pop() ?? "").toUpperCase();
      const doc: WikiDoc = {
        id: `doc-${Date.now()}`,
        group: pendingGroup.current,
        title: file.name.replace(/\.[^.]+$/, ""),
        type: ext === "PDF" ? "PDF" : "DOCX",
        info: de
          ? `Hochgeladenes ${ext} · in bearbeitbaren Text umgewandelt`
          : `Uploaded ${ext} · converted to editable text`,
        html: de
          ? `<p><em>In der echten App erscheint hier der aus ${file.name} extrahierte Text. Klicke auf Bearbeiten und schreib oder füge den Inhalt ein.</em></p>`
          : `<p><em>Extracted text from ${file.name} appears here in the real app. Click Edit and write or paste the content.</em></p>`,
      };
      persist([...docs, doc]);
      setActiveId(doc.id);
      setEditing(true);
    }, 1400);
    if (fileRef.current) fileRef.current.value = "";
  };

  const download = () => {
    if (!active) return;
    const blob = new Blob(
      [`<!doctype html><meta charset="utf-8"><title>${active.title}</title><h1>${active.title}</h1>${active.html}`],
      { type: "text/html" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${active.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <header className="page-hero wiki-hero">
        <p className="wiki-badge">{de ? "Team-Wiki · intern" : "Team Wiki · internal"}</p>
        <h1><em>Wiki</em></h1>
        <p>
          {de
            ? "Jede Arbeitsgruppe hat ihre eigene Bibliothek. Öffne ein Dokument zum Lesen oder Bearbeiten, lade PDF- und Word-Dateien hoch oder schreib direkt neue Seiten."
            : "Every working group has its own library. Open a document to read or edit it, upload PDF and Word files, or write new pages directly."}
        </p>
      </header>

      {!active ? (
        <div className="library-wrap">
          {converting ? (
            <div className="wiki-converting" style={{ display: "flex" }}>
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
              <span>{de ? `„${converting}“ wird in bearbeitbaren Text umgewandelt…` : `Converting “${converting}” to editable text…`}</span>
            </div>
          ) : null}
          <div className="library">
            {GROUPS.map((group) => {
              const groupDocs = docs.filter((doc) => doc.group === group);
              return (
                <section className="lib-card" key={group} aria-label={de ? `Bibliothek: ${groupName(group)}` : `${group} library`}>
                  <div className="lib-head">
                    <h2>{groupName(group)}</h2>
                    <span>{groupDocs.length} {de ? (groupDocs.length === 1 ? "Dokument" : "Dokumente") : (groupDocs.length === 1 ? "doc" : "docs")}</span>
                    <button type="button" className="lib-add" onClick={() => setOpenMenu(openMenu === group ? null : group)}>
                      <i className="bi bi-plus-lg" aria-hidden="true" /> {de ? "Hinzufügen" : "Add"}
                    </button>
                  </div>
                  {groupDocs.map((doc) => (
                    <button type="button" className="doc-row" key={doc.id} onClick={() => openDoc(doc.id)}>
                      <i className={`bi ${typeIcon(doc.type)}`} aria-hidden="true" />
                      <strong>{doc.title}</strong>
                      <span className="doc-type-badge">{de ? GERMAN_DOC_TYPES[doc.type] : doc.type}</span>
                      <i className="bi bi-chevron-right" aria-hidden="true" />
                    </button>
                  ))}
                  <div className={`shelf-menu${openMenu === group ? " is-open" : ""}`}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => { pendingGroup.current = group; fileRef.current?.click(); }}>
                      <i className="bi bi-upload" aria-hidden="true" /> {de ? "PDF / DOCX hochladen" : "Upload PDF / DOCX"}
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => newPage(group)}>
                      <i className="bi bi-file-earmark-plus" aria-hidden="true" /> {de ? "Neue Seite schreiben" : "Write a new page"}
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
          <input type="file" ref={fileRef} accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={onUpload} />
        </div>
      ) : (
        <div className="wiki-doc-view is-open">
          <button type="button" className="btn btn-outline btn-sm wiki-back" onClick={() => { commitEdits(); setActiveId(null); }}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> {de ? "Zurück zur Bibliothek" : "Back to the library"}
          </button>
          <div className="card wiki-main-card">
            <div className="wiki-doc-head">
              <h2 ref={titleRef} contentEditable={editing} suppressContentEditableWarning>{active.title}</h2>
              <div className="wiki-toolbar">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => (editing ? commitEdits() : setEditing(true))}>
                  {editing
                    ? <><i className="bi bi-check-lg" aria-hidden="true" /> {de ? "Fertig" : "Done"}</>
                    : <><i className="bi bi-pencil" aria-hidden="true" /> {de ? "Bearbeiten" : "Edit"}</>}
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={download}>
                  <i className="bi bi-download" aria-hidden="true" /> {de ? "Herunterladen" : "Download"}
                </button>
              </div>
              <div className="wiki-doc-meta">
                <span className="badge badge-brand">{active.type}</span>
                <span>{groupName(active.group)} · {active.info}</span>
              </div>
            </div>
            {editing ? (
              <div className="notice notice-ok wiki-edit-note" style={{ display: "block" }}>
                {de
                  ? "Du bearbeitest diese Seite. Änderungen werden gespeichert, sobald du auf Fertig klickst."
                  : "You are editing this page. Changes save automatically when you click Done."}
              </div>
            ) : null}
            <div
              className="wiki-content"
              ref={contentRef}
              contentEditable={editing}
              suppressContentEditableWarning
              // Library content is authored locally (seeds + this browser's own edits) and
              // sanitized again on every save.
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(active.html) }}
            />
          </div>
        </div>
      )}
    </>
  );
}
