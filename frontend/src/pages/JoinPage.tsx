import { Link } from "react-router-dom";

import { useLocale } from "../i18n/LocaleContext";
import { assetUrl } from "../utils/assets";

export function JoinPage() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <>
      <header className="page-hero">
        <p className="hero-coords">{de ? "Werde Teil der Crew" : "Become part of the crew"} · 50°46′ N · 6°05′ E</p>
        <h1>{de ? "Mitmachen" : "Join us"}</h1>
        <p>
          {de
            ? "INCAS wird komplett von Studierenden getragen. Es gibt keinen Mitgliedsbeitrag und keine Bewerbung: Such dir einfach den Weg aus, der zu dir passt."
            : "INCAS is run entirely by students. There is no membership fee and no application: pick whichever way in suits you."}
        </p>
      </header>

      <div className="join-layout">
        <aside className="wanted">
          <span className="wanted-pin" aria-hidden="true" />
          <span className="wanted-ring" aria-hidden="true" />
          <span className="wanted-stamp" aria-hidden="true">
            {de ? <>Kein Beitrag<b>KEIN CV</b>Keine Ausreden</> : <>No fee<b>NO CV</b>No excuses</>}
          </span>
          <div className="wanted-inner">
            <p className="wanted-top">Humboldt-Haus · Aachen</p>
            <h2>{de ? "GESUCHT" : "WANTED"}</h2>
            <p className="wanted-sub">{de ? "Neugierige Studierende, alle Nationalitäten" : "Curious students, all nationalities"}</p>
            <span className="wanted-rule" aria-hidden="true" />
            <div className="wanted-art"><img src={assetUrl("img/incas-logo.png") ?? ""} alt="INCAS" /></div>
            <ul className="wanted-list">
              {de ? (
                <>
                  <li>Zuletzt gesehen: beim Sprachenlernen über einem Kaffee</li>
                  <li>Bekannt für: Kochen für vierzig Leute</li>
                  <li>Keine Erfahrung nötig, kein Beitrag, keine Bewerbung</li>
                  <li>Hört auf: jede Sprache, die du ausprobierst</li>
                </>
              ) : (
                <>
                  <li>Last seen: learning a language over coffee</li>
                  <li>Known for: cooking for forty people</li>
                  <li>No experience required, no fee, no application</li>
                  <li>Answers to: any language you try</li>
                </>
              )}
            </ul>
            <p className="wanted-reward">
              <b>{de ? "Belohnung" : "Reward"}</b>
              <span>{de ? "Freunde auf vier Kontinenten" : "Friends on four continents"}</span>
            </p>
            <Link to="/events#register-join" className="btn btn-primary btn-sm">{de ? "Komm vorbei" : "Come and find us"}</Link>
            <p className="wanted-foot">{de ? "Dienstags · 19:00 Uhr · Pontstr. 41" : "Tuesdays · 7:00 PM · Pontstr. 41"}</p>
          </div>
          <div className="wanted-tears" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span className="wanted-tear" key={index}><b>INCAS</b> · {de ? "Di 19 Uhr" : "Tue 7 PM"}</span>
            ))}
          </div>
        </aside>
        <div className="join-grid">
          <div className="card">
            <h3>{de ? "Komm zu einem Event" : "Come to an event"}</h3>
            <p>
              {de
                ? "Der einfachste Einstieg. Komm zu einem beliebigen Event aus dem Kalender, sag Hallo, und schon bist du dabei. Alle sind willkommen, lokale wie internationale Studierende."
                : "The easiest way in. Show up to any event on the calendar, say hi, and you are already part of it. Everyone is welcome, local and international students alike."}
            </p>
            <Link to="/calendar" className="btn btn-primary btn-sm">{de ? "Was steht an?" : "See what's on"}</Link>
          </div>
          <div className="card">
            <h3>{de ? "Mach im Team mit" : "Join the team"}</h3>
            {de ? (
              <p>Du möchtest mitorganisieren? Das INCAS-Team trifft sich jeden <strong>Dienstag um 19:00 Uhr</strong> im INCAS-Büro im <strong>Humboldt-Haus</strong>. Das Treffen ist offen für alle: Komm einfach vorbei und lerne kennen, wer wir sind und was wir machen.</p>
            ) : (
              <p>Want to help organize things? The INCAS team meets every <strong>Tuesday at 7:00 PM</strong> in the INCAS office at <strong>Humboldt-Haus</strong>. The meeting is open to everyone; just drop by and find out who we are and what we do.</p>
            )}
          </div>
          <div className="card">
            <h3>{de ? "Sag Hallo" : "Say hello"}</h3>
            <p>
              {de
                ? "Erst mal Fragen? Folge uns oder schreib uns eine Nachricht, wir antworten schnell."
                : "Questions first? Follow us or send a message; we answer quickly."}
            </p>
            <div className="btn-row">
              <a href="https://www.instagram.com/incas_aachen/" className="btn btn-outline btn-sm" target="_blank" rel="noreferrer"><i className="bi bi-instagram" aria-hidden="true" /> Instagram</a>
              <a href="https://www.facebook.com/INCASAachen/" className="btn btn-outline btn-sm" target="_blank" rel="noreferrer"><i className="bi bi-facebook" aria-hidden="true" /> Facebook</a>
            </div>
          </div>
        </div>
      </div>

      <p className="tandem-note">
        {de
          ? <>Suchst du lieber eine Sprachpartnerin oder einen Sprachpartner? Das ist ein eigenes Programm: <Link to="/events#register-tandem">für das Sprachtandem anmelden</Link>.</>
          : <>Looking for a language partner instead? That is its own program: <Link to="/events#register-tandem">sign up for Language Tandem</Link>.</>}
      </p>
    </>
  );
}
