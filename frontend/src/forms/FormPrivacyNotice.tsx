import { Link } from "react-router-dom";

import { useLocale } from "../i18n/LocaleContext";

/**
 * Short Art. 13 GDPR pointer shown next to every public form. The detail lives
 * in the privacy policy (/privacy); this only names the purpose in one line.
 */
export function FormPrivacyNotice({ purpose }: { purpose?: { en: string; de: string } }) {
  const { locale } = useLocale();
  const de = locale === "de";
  const reason = purpose ? (de ? purpose.de : purpose.en) : null;
  return (
    <p className="form-consent">
      {de
        ? `Wir verarbeiten deine Angaben${reason ? `, um ${reason}` : ""}. Details und deine Rechte: `
        : `We use your details${reason ? ` to ${reason}` : ""}. Details and your rights: `}
      <Link to="/privacy">{de ? "Datenschutzerklärung" : "privacy policy"}</Link>.
    </p>
  );
}
