import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { Loading } from "../components/ui";
import { localizedAboutItems } from "../domain/publicSections";
import { useLocale } from "../i18n/LocaleContext";

type SectionItem = { path: string; title: string; summary?: string };

export function relatedOfferItems(items: SectionItem[], currentPath: string) {
  const currentIndex = items.findIndex((item) => item.path === currentPath);
  if (currentIndex < 0) return [];
  return [items[currentIndex - 1], items[currentIndex + 1]].filter(
    (item): item is SectionItem => Boolean(item),
  );
}

function SectionPager({ items, currentIndex, de }: { items: SectionItem[]; currentIndex: number; de: boolean }) {
  if (currentIndex < 0) return null;
  const previous = items[currentIndex - 1];
  const next = items[currentIndex + 1];
  if (!previous && !next) return null;
  return (
    <nav className="section-pager" aria-label={de ? "Seitennavigation" : "Page navigation"}>
      {previous ? <Link to={previous.path}><span>{de ? "Zurück" : "Previous"}</span><strong>{previous.title}</strong></Link> : <span />}
      {next ? <Link to={next.path}><span>{de ? "Weiter" : "Next"}</span><strong>{next.title}</strong></Link> : <span />}
    </nav>
  );
}

function SectionNavigation({ label, items }: { label: string; items: SectionItem[] }) {
  return (
    <nav className="section-local-nav" aria-label={label}>
      {items.map((item) => <NavLink key={item.path} to={item.path} end>{item.title}</NavLink>)}
    </nav>
  );
}

export function AboutLayout() {
  const { locale } = useLocale();
  const de = locale === "de";
  const items = localizedAboutItems(locale).map((item) => ({ path: item.path, title: item.title, summary: item.summary }));
  const location = useLocation();
  const currentIndex = items.findIndex((item) => item.path === location.pathname);
  return (
    <section className="section-layout about-section">
      <div className="section-context">
        <Link className="section-home-link" to="/about">{de ? "Über INCAS" : "About INCAS"}</Link>
        <SectionNavigation label={de ? "Über-uns-Themen" : "About topics"} items={items} />
      </div>
      <Outlet />
      <SectionPager items={items} currentIndex={currentIndex} de={de} />
    </section>
  );
}

export function OffersLayout() {
  const { site, loading, locale } = useLocale();
  const de = locale === "de";
  const location = useLocation();
  if (loading) return <Loading />;
  const offers = site?.offers.pages ?? [];
  const items: SectionItem[] = [
    { path: "/offers", title: site?.offers.title ?? (de ? "Angebote" : "Offers") },
    ...offers.map((offer) => ({ path: offer.to, title: offer.title, summary: offer.description })),
  ];
  const currentIndex = items.findIndex((item) => item.path === location.pathname);
  const related = currentIndex > 0
    ? relatedOfferItems(items.slice(1), location.pathname)
    : [];
  return (
    <section className="section-layout offers-section">
      <div className="section-context">
        <Link className="section-home-link" to="/offers">{de ? "Alle Angebote" : "All offers"}</Link>
        <SectionNavigation label={de ? "Angebotsseiten" : "Offer pages"} items={items} />
      </div>
      <Outlet />
      {related.length ? (
        <aside className="section-related" aria-labelledby="related-offers-title">
          <h2 id="related-offers-title">{de ? "Weitere Angebote" : "Related offers"}</h2>
          <div>{related.map((item) => <Link key={item.path} to={item.path}><strong>{item.title}</strong>{item.summary ? <span>{item.summary}</span> : null}</Link>)}</div>
        </aside>
      ) : null}
      <SectionPager items={items} currentIndex={currentIndex} de={de} />
    </section>
  );
}
