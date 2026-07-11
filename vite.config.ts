/// <reference types="vitest/config" />
import { cpSync } from "node:fs";
import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// SPA build. Two modes:
//   vite build              -> static/app, served by Flask at /app
//   vite build --mode demo  -> dist-demo, static demo for GitHub Pages
// The legacy Jinja widget bundle has its own config: vite.widget.config.ts.
export default defineConfig(({ mode }) => {
  const isDemo = mode === "demo";
  const outDir = isDemo ? resolve(__dirname, "dist-demo") : resolve(__dirname, "static/app");

  return {
    root: resolve(__dirname, "frontend"),
    plugins: [
      react(),
      {
        name: "incas-static-images",
        closeBundle() {
          cpSync(resolve(__dirname, "static/img"), resolve(outDir, "img"), { recursive: true });
        },
      },
    ],
    base: isDemo ? "./" : "/static/app/",
    define: {
      "import.meta.env.VITE_DATA_MODE": JSON.stringify(isDemo ? "demo" : "api"),
    },
    build: {
      outDir,
      emptyOutDir: true,
    },
    server: {
      proxy: {
        "/api": "http://127.0.0.1:5000",
        "/static/img": "http://127.0.0.1:5000",
      },
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});
