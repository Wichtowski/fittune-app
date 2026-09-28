/// <reference types="vitest/config" />
import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      // Updates are applied when the user accepts the in-app prompt, never mid-workout.
      registerType: "prompt",
      injectRegister: false,
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        id: "/",
        name: "FitTune",
        short_name: "FitTune",
        description: "Log workouts, track activities and see your progress.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        theme_color: "#0f1115",
        background_color: "#0f1115",
        categories: ["health", "fitness", "sports"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        globIgnores: ["**/anatomy-viewer-*.js", "**/draco_*.js"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        // API responses are cached by TanStack Query (per user), never by the service worker.
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
