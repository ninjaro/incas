import { WorkingGroupsBoard } from "../components/WorkingGroupsBoard";
import { useLocale } from "../i18n/LocaleContext";

export function WorkingGroupsPage() {
  const { locale } = useLocale();
  const de = locale === "de";
  return (
    <>
      <header className="events-hero">
        <p className="hero-coords">{de ? "Wer macht was" : "Who does what"} · 50°46′ N · 6°05′ E</p>
        {de ? <h1>Arbeits<em>gruppen</em></h1> : <h1>Working <em>groups</em></h1>}
        <p>
          {de
            ? "Jeder Teil des INCAS-Programms wird von einer dieser Gruppen getragen. Öffne einen Flyer, um zu sehen, was die Gruppe wirklich macht und wie du mitmachen kannst."
            : "Every part of the INCAS program is run by one of these groups. Open a flyer to see what the group actually does and how to get involved."}
        </p>
      </header>
      <WorkingGroupsBoard />
    </>
  );
}
