import { WorkingGroupsBoard } from "../components/WorkingGroupsBoard";

export function WorkingGroupsPage() {
  return (
    <>
      <header className="events-hero">
        <p className="hero-coords">Who does what · 50°46′ N · 6°05′ E</p>
        <h1>Working <em>groups</em></h1>
        <p>
          Every part of the INCAS program is run by one of these groups. Open a flyer to see what
          the group actually does and how to get involved.
        </p>
      </header>
      <WorkingGroupsBoard />
    </>
  );
}
