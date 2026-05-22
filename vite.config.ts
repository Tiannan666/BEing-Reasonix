import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const rendererRoot = path.resolve(__dirname, "src/renderer");

export default defineConfig({
  plugins: [react()],
  root: rendererRoot,
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    // Disable module preload polyfill — Electron file:// doesn't support crossorigin
    modulePreload: false,
  },
  resolve: {
    alias: {
      "@": rendererRoot,
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
