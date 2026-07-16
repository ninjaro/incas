import { Link } from "react-router-dom";

import { localizedAboutItems } from "../domain/publicSections";
import { useLocale } from "../i18n/LocaleContext";
import { ContentPage } from "./ContentPage";

export function AboutPage() {
  const { locale } = useLocale();
  const de = locale === "de";
  const topics = localizedAboutItems(locale).slice(1);
  return (
    <>
      <ContentPage slug="about" section="about" />
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
