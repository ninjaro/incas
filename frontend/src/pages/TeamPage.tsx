import { Link } from "react-router-dom";

export function TeamPage() {
  return (
    <>
      <header className="team-hero">
        <div>
          <p className="hero-coords">Who we are · 50°46′ N · 6°05′ E</p>
          <h1>The INCAS <em>Team</em></h1>
          <p>
            Students who volunteer their time to keep the intercultural program in Aachen running.
            The work is split into working groups, each with its own leaders, each planning its
            projects independently.
          </p>
          <div className="btn-row team-hero-cta">
            <Link to="/about/working-groups" className="btn btn-primary">See the working groups</Link>
            <Link to="/join" className="btn btn-outline">Join us</Link>
          </div>
        </div>
        <figure className="photo-tape">
          <span className="tape tape-tl" aria-hidden="true" />
          <span className="tape tape-br" aria-hidden="true" />
          <img src="/static/img/site/team-photo.jpg" alt="The INCAS team at Humboldt-Haus" />
          <figcaption className="photo-caption">the whole crew, Tuesday night</figcaption>
        </figure>
      </header>

      <div className="wg-note">
        Want to put faces to the names? Come to the team meeting on <strong>Tuesdays at 7:00 PM</strong> at
        Humboldt-Haus, or find any of us at an event. Every working group has its own flyer on the{" "}
        <Link to="/about/working-groups">working groups board</Link>.
      </div>
    </>
  );
}
