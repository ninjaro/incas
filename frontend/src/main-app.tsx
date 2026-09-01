import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "bootstrap-icons/font/bootstrap-icons.css";
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
