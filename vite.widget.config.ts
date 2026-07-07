import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Legacy widget bundle mounted by the remaining Jinja templates
// (data-incas-component). Kept during the migration; remove together with
// the Jinja pages once the SPA reaches full parity.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "static/dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "frontend/src/main.tsx"),
      output: {
        entryFileNames: "incas.js",
        chunkFileNames: "incas-[name].js",
        assetFileNames: "incas-[name][extname]",
      },
    },
  },
});
