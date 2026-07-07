import { useState } from "react";

import { PageHeader } from "../components/ui";
import { DEFAULT_MEMBER_DESCRIPTION, teamMembers, type TeamMember } from "../content/team";
import { usePublicTheme } from "../features/themes/usePublicTheme";

function MemberAvatar({ member }: { member: TeamMember }) {
  const [failed, setFailed] = useState(false);
  if (!member.imagePath || failed) {
    return (
      <div className="team-avatar-fallback" aria-hidden="true">
        {member.name.charAt(0)}
      </div>
    );
  }
  return (
    <img
      className="team-avatar"
      src={member.imagePath}
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

function TeamGrid() {
  return (
    <div className="team-grid">
      {teamMembers.map((member) => (
        <div key={member.id} className="team-card">
          <MemberAvatar member={member} />
          <h3>{member.name}</h3>
          <p className="team-role">{member.role}</p>
          <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
            {member.description || DEFAULT_MEMBER_DESCRIPTION}
          </p>
          <MemberLinks member={member} />
        </div>
      ))}
    </div>
  );
}

function TeamSpotlight() {
  return (
    <div>
      {teamMembers.map((member) => (
        <div key={member.id} className="team-spotlight-row">
          <MemberAvatar member={member} />
          <div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.4rem" }}>
              {member.name}
            </h3>
            <p className="team-role">{member.role}</p>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              {member.description || DEFAULT_MEMBER_DESCRIPTION}
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
  return (
    <>
      <PageHeader
        kicker="Who we are"
        title="The INCAS Team"
        sub="Students who volunteer their time to keep the intercultural program in Aachen running."
      />
      {isPreview ? (
        <p className="notice notice-info">
          Theme preview: <strong>{theme}</strong>.
        </p>
      ) : null}
      {theme === "spotlight" ? <TeamSpotlight /> : <TeamGrid />}
    </>
  );
}
