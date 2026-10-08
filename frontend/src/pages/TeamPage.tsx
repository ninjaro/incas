import { useState } from "react";
import { Link } from "react-router-dom";

import { DEFAULT_MEMBER_DESCRIPTION, teamMembers, type TeamMember } from "../content/team";
import { usePublicTheme } from "../features/themes/usePublicTheme";
import { useLocale } from "../i18n/LocaleContext";
import { assetUrl } from "../utils/assets";

function MemberAvatar({ member, locale }: { member: TeamMember; locale: "en" | "de" }) {
  const [failed, setFailed] = useState(false);
  if (!member.imagePath || failed) {
    return (
      <div className="team-avatar-fallback" aria-hidden="true">
        {member.name[locale].charAt(0)}
      </div>
    );
  }
  return (
    <img
      className="team-avatar"
      src={assetUrl(member.imagePath) ?? ""}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/** The "spotlight" team theme: one row per team, kept selectable from the admin themes panel. */
function TeamSpotlight({ locale }: { locale: "en" | "de" }) {
  return (
    <div className="team-spotlight">
      {teamMembers.map((member) => (
        <div key={member.id} className="team-spotlight-row">
          <MemberAvatar member={member} locale={locale} />
          <div>
            <h3>{member.name[locale]}</h3>
            <p className="team-role">{member.role[locale]}</p>
            <p>{member.description[locale] || DEFAULT_MEMBER_DESCRIPTION[locale]}</p>
            {member.links?.length ? (
              <p>
                {member.links.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                ))}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The default team theme slot ("grid") renders the Playful design: taped group photo. */
function TeamPhotoHero({ locale }: { locale: "en" | "de" }) {
  const de = locale === "de";
  return (
    <>
      <header className="team-hero">
        <div>
          <p className="hero-coords">{de ? "Wer wir sind" : "Who we are"} · 50°46′ N · 6°05′ E</p>
          <h1>{de ? "Das INCAS-" : "The INCAS "}<em>Team</em></h1>
          <p>
            {de
              ? "Studierende, die ehrenamtlich ihre Zeit einbringen, damit das interkulturelle Programm in Aachen läuft. Die Arbeit ist auf Arbeitsgruppen verteilt, jede mit eigener Leitung und eigenen Projekten."
              : "Students who volunteer their time to keep the intercultural program in Aachen running. The work is split into working groups, each with its own leaders, each planning its projects independently."}
          </p>
          <div className="btn-row team-hero-cta">
            <Link to="/about/working-groups" className="btn btn-primary">{de ? "Zu den Arbeitsgruppen" : "See the working groups"}</Link>
            <Link to="/join" className="btn btn-outline">{de ? "Mitmachen" : "Join us"}</Link>
          </div>
        </div>
        <figure className="photo-tape">
          <span className="tape tape-tl" aria-hidden="true" />
          <span className="tape tape-br" aria-hidden="true" />
          <img src={assetUrl("img/site/team-photo.jpg") ?? ""} alt={de ? "Das INCAS-Team im Humboldt-Haus" : "The INCAS team at Humboldt-Haus"} />
          <figcaption className="photo-caption">{de ? "die ganze Crew, Dienstagabend" : "the whole crew, Tuesday night"}</figcaption>
        </figure>
      </header>

      {de ? (
        <div className="wg-note">
          Du willst wissen, wer hinter den Namen steckt? Komm zum Teamtreffen <strong>dienstags um 19:00 Uhr</strong> im
          Humboldt-Haus oder sprich uns bei einem Event an. Jede Arbeitsgruppe hat ihren eigenen Flyer am{" "}
          <Link to="/about/working-groups">Brett der Arbeitsgruppen</Link>.
        </div>
      ) : (
        <div className="wg-note">
          Want to put faces to the names? Come to the team meeting on <strong>Tuesdays at 7:00 PM</strong> at
          Humboldt-Haus, or find any of us at an event. Every working group has its own flyer on the{" "}
          <Link to="/about/working-groups">working groups board</Link>.
        </div>
      )}
    </>
  );
}

export function TeamPage() {
  const { theme, isPreview } = usePublicTheme("team");
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <>
      {isPreview ? (
        <p className="notice notice-info">
          {de ? "Theme-Vorschau" : "Theme preview"}: <strong>{theme}</strong>.
        </p>
      ) : null}
      {theme === "spotlight" ? (
        <>
          <header className="events-hero">
            <p className="hero-coords">{de ? "Wer wir sind" : "Who we are"} · 50°46′ N · 6°05′ E</p>
            <h1>{de ? "Das INCAS Team" : "The INCAS Team"}</h1>
          </header>
          <TeamSpotlight locale={locale} />
        </>
      ) : (
        <TeamPhotoHero locale={locale} />
      )}
    </>
  );
}
