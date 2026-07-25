import { Link } from "react-router-dom";

import { PageHeader } from "../components/ui";

export function JoinPage() {
  return (
    <>
      <PageHeader
        kicker="Become part of the crew"
        title="Join us"
        sub="INCAS is run entirely by students. There is no membership fee and no application: pick whichever way in suits you."
      />
      <div className="join-grid">
        <div className="card">
          <h3>Come to an event</h3>
          <p>
            The easiest way in. Show up to any event on the calendar, say hi, and you are already
            part of it. Everyone is welcome, local and international students alike.
          </p>
          <Link to="/calendar" className="btn btn-primary btn-sm">
            See what&apos;s on
          </Link>
        </div>
        <div className="card">
          <h3>Join the team</h3>
          <p>
            Want to help organize things? The INCAS team meets every{" "}
            <strong>Tuesday at 7:00 PM</strong> in the INCAS office at{" "}
            <strong>Humboldt-Haus</strong>. The meeting is open to everyone; just drop by and find
            out who we are and what we do.
          </p>
        </div>
        <div className="card">
          <h3>Say hello</h3>
          <p>Questions first? Follow us or send a message; we answer quickly.</p>
          <div className="join-links">
            <a
              className="btn btn-outline btn-sm"
              href="https://www.instagram.com/incas_aachen/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
            <a
              className="btn btn-outline btn-sm"
              href="https://www.facebook.com/INCASAachen/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>
      <p className="join-tandem-note">
        Looking for a language partner instead? That is its own program:{" "}
        <Link to="/tandem">sign up for Language Tandem</Link>.
      </p>
    </>
  );
}
