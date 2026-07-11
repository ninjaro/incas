import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { ContentPage } from "./ContentPage";
import { TeamSection } from "./TeamPage";

export function AboutPage() {
  const [params] = useSearchParams();
  useEffect(() => {
    if (params.get("section") === "team") {
      window.requestAnimationFrame(() => document.getElementById("team")?.scrollIntoView());
    }
  }, [params]);
  return <><ContentPage slug="about" /><TeamSection /></>;
}
