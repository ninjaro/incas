import { Link } from "react-router-dom";

import { useLocale } from "../i18n/LocaleContext";

/**
 * Short Art. 13 GDPR pointer shown next to every public form. The detail lives
 * in the privacy policy (/privacy); this only names the purpose in one line and
 * deep-links to the matching section (e.g. /privacy#tandem).
 */
export function FormPrivacyNotice({
  purpose,
  anchor,
}: {
  purpose?: { en: string; de: string };
  anchor?: string;
}) {
  const { locale } = useLocale();
  const de = locale === "de";
  const reason = purpose ? (de ? purpose.de : purpose.en) : null;
  const to = anchor ? `/privacy#${anchor}` : "/privacy";
  return (
    <p className="form-consent">
      {de
        ? `Wir verarbeiten deine Angaben${reason ? `, um ${reason}` : ""}. Details und deine Rechte: `
        : `We use your details${reason ? ` to ${reason}` : ""}. Details and your rights: `}
      <Link to={to}>{de ? "Datenschutzerklärung" : "privacy policy"}</Link>.
    </p>
  );
}
