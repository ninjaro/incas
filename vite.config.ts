import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
