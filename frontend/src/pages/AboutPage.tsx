import { Link } from "react-router-dom";

import { localizedAboutItems } from "../domain/publicSections";
import { useLocale } from "../i18n/LocaleContext";
import { LetterScene } from "./LandingPage";
import { assetUrl } from "../utils/assets";

export function AboutPage() {
  const { locale } = useLocale();
  const de = locale === "de";
  const topics = localizedAboutItems(locale).slice(1);
  const logo = assetUrl("img/incas-logo.png");
  return (
    <>
      <header className="events-hero">
        <p className="hero-coords">{de ? "Über uns" : "About us"} · 50°46′ N · 6°05′ E</p>
        <h1>
          {de ? "Was ist " : "What is "}
          {logo ? <img src={logo} alt="INCAS" style={{ height: "1em", width: "auto", transform: "translateY(0.12em)" }} /> : <em>INCAS</em>}?
        </h1>
        <p>
          {de
            ? "Die Kurzfassung steckt im Umschlag. Öffne den Brief."
            : "The short version arrived by airmail. Open the letter."}
        </p>
      </header>

      <section className="about-letter-section" aria-label={de ? "Über INCAS" : "About INCAS"}>
        <LetterScene de={de} />
      </section>

      <section className="about-topic-preview" aria-labelledby="about-topics-title">
        <header className="section-heading">
          <p className="page-kicker">{de ? "Mehr über INCAS" : "Explore INCAS"}</p>
          <h2 id="about-topics-title">{de ? "Team und Arbeitsweise" : "Our team and how we work"}</h2>
        </header>
        <div className="section-card-grid">
          {topics.map((topic) => (
            <article key={topic.path} className="section-card">
              <Link className="card-primary-link" to={topic.path} aria-label={topic.title}>
                <h3>{topic.title}</h3>
                <p>{topic.summary}</p>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
