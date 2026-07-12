import { useState } from "react";

import { PageHeader } from "../components/ui";
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

function MemberLinks({ member }: { member: TeamMember }) {
  if (!member.links?.length) return null;
  return (
    <p style={{ marginTop: 8 }}>
      {member.links.map((link) => (
        <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
          {link.label}
        </a>
      ))}
    </p>
  );
}

function TeamGrid({ locale }: { locale: "en" | "de" }) {
  return (
    <div className="team-grid">
      {teamMembers.map((member) => (
        <div key={member.id} className="team-card">
          <MemberAvatar member={member} locale={locale} />
          <h3>{member.name[locale]}</h3>
          <p className="team-role">{member.role[locale]}</p>
          <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
            {member.description[locale] || DEFAULT_MEMBER_DESCRIPTION[locale]}
          </p>
          <MemberLinks member={member} />
        </div>
      ))}
    </div>
  );
}

function TeamSpotlight({ locale }: { locale: "en" | "de" }) {
  return (
    <div>
      {teamMembers.map((member) => (
        <div key={member.id} className="team-spotlight-row">
          <MemberAvatar member={member} locale={locale} />
          <div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.4rem" }}>
              {member.name[locale]}
            </h3>
            <p className="team-role">{member.role[locale]}</p>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              {member.description[locale] || DEFAULT_MEMBER_DESCRIPTION[locale]}
            </p>
            <MemberLinks member={member} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TeamPage() {
  const { theme, isPreview } = usePublicTheme("team");
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <>
      <PageHeader
        kicker={de ? "Wer wir sind" : "Who we are"}
        title={de ? "Das INCAS Team" : "The INCAS Team"}
        sub={de ? "Studierende engagieren sich ehrenamtlich für das interkulturelle Programm in Aachen." : "Students who volunteer their time to keep the intercultural programme in Aachen running."}
      />
      {isPreview ? (
        <p className="notice notice-info">
          {de ? "Theme-Vorschau" : "Theme preview"}: <strong>{theme}</strong>.
        </p>
      ) : null}
      {theme === "spotlight" ? <TeamSpotlight locale={locale} /> : <TeamGrid locale={locale} />}
    </>
  );
}
