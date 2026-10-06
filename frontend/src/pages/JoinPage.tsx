import { Link } from "react-router-dom";

import { assetUrl } from "../utils/assets";

export function JoinPage() {
  return (
    <>
      <header className="page-hero">
        <p className="hero-coords">Become part of the crew · 50°46′ N · 6°05′ E</p>
        <h1>Join us</h1>
        <p>INCAS is run entirely by students. There is no membership fee and no application: pick whichever way in suits you.</p>
      </header>

      <div className="join-layout">
        <aside className="wanted">
          <span className="wanted-pin" aria-hidden="true" />
          <span className="wanted-ring" aria-hidden="true" />
          <span className="wanted-stamp" aria-hidden="true">No fee<b>NO CV</b>No excuses</span>
          <div className="wanted-inner">
            <p className="wanted-top">Humboldt-Haus · Aachen</p>
            <h2>WANTED</h2>
            <p className="wanted-sub">Curious students, all nationalities</p>
            <span className="wanted-rule" aria-hidden="true" />
            <div className="wanted-art"><img src={assetUrl("img/incas-logo.png") ?? ""} alt="INCAS" /></div>
            <ul className="wanted-list">
              <li>Last seen: learning a language over coffee</li>
              <li>Known for: cooking for forty people</li>
              <li>No experience required, no fee, no application</li>
              <li>Answers to: any language you try</li>
            </ul>
            <p className="wanted-reward"><b>Reward</b><span>Friends on four continents</span></p>
            <Link to="/events#register-join" className="btn btn-primary btn-sm">Come and find us</Link>
            <p className="wanted-foot">Tuesdays · 7:00 PM · Pontstr. 41</p>
          </div>
          <div className="wanted-tears" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span className="wanted-tear" key={index}><b>INCAS</b> · Tue 7 PM</span>
            ))}
          </div>
        </aside>
        <div className="join-grid">
          <div className="card">
            <h3>Come to an event</h3>
            <p>The easiest way in. Show up to any event on the calendar, say hi, and you are already part of it. Everyone is welcome, local and international students alike.</p>
            <Link to="/calendar" className="btn btn-primary btn-sm">See what's on</Link>
          </div>
          <div className="card">
            <h3>Join the team</h3>
            <p>Want to help organize things? The INCAS team meets every <strong>Tuesday at 7:00 PM</strong> in the INCAS office at <strong>Humboldt-Haus</strong>. The meeting is open to everyone; just drop by and find out who we are and what we do.</p>
          </div>
          <div className="card">
            <h3>Say hello</h3>
            <p>Questions first? Follow us or send a message; we answer quickly.</p>
            <div className="btn-row">
              <a href="https://www.instagram.com/incas_aachen/" className="btn btn-outline btn-sm" target="_blank" rel="noreferrer"><i className="bi bi-instagram" aria-hidden="true" /> Instagram</a>
              <a href="https://www.facebook.com/INCASAachen/" className="btn btn-outline btn-sm" target="_blank" rel="noreferrer"><i className="bi bi-facebook" aria-hidden="true" /> Facebook</a>
            </div>
          </div>
        </div>
      </div>

      <p className="tandem-note">Looking for a language partner instead? That is its own program: <Link to="/events#register-tandem">sign up for Language Tandem</Link>.</p>
    </>
  );
}
