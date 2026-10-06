import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "bootstrap-icons/font/bootstrap-icons.css";
// Self-hosted Baloo 2 (SIL OFL 1.1): bundled and served from our own origin,
// matching the CSP font-src 'self' and the no-Google-Fonts privacy rule.
import "@fontsource/baloo-2/600.css";
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "./utils/incas-icons-sprite.js";
import "./styles/global.css";
import "./styles/treasure.css";
import "./styles/parchment.css";
import "./styles/playful.css";
import "./styles/playful-site.css";
import "./styles/playful-mobile.css";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
