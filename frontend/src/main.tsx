import { createRoot } from "react-dom/client";

import {
  UpcomingEventsTimeline,
  type UpcomingEventsTimelineProps,
} from "./components/UpcomingEventsTimeline";

const componentRegistry = {
  "upcoming-events-timeline": UpcomingEventsTimeline,
};

type ComponentName = keyof typeof componentRegistry;

function parseProps<T>(mount: HTMLElement): T | null {
  const dataScript = mount.querySelector<HTMLScriptElement>("script[type='application/json'][data-incas-props]");
  if (!dataScript?.textContent) {
    return null;
  }

  try {
    return JSON.parse(dataScript.textContent) as T;
  } catch (error) {
    console.error("Could not parse INCAS component props.", error);
    return null;
  }
}

function mountUpcomingEventsTimeline(mount: HTMLElement) {
  const props = parseProps<UpcomingEventsTimelineProps>(mount);
  if (!props) {
    return;
  }

  createRoot(mount).render(<UpcomingEventsTimeline {...props} />);
}

function mountComponents() {
  document.querySelectorAll<HTMLElement>("[data-incas-component]").forEach((mount) => {
    const componentName = mount.dataset.incasComponent as ComponentName | undefined;

    if (componentName === "upcoming-events-timeline") {
      mountUpcomingEventsTimeline(mount);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountComponents, { once: true });
} else {
  mountComponents();
}
