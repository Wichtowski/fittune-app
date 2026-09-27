import { useEffect, useSyncExternalStore } from "react";

import { storage } from "@/lib/storage";

export type ThemePreference = "system" | "light" | "dark";

const KEY = "fittune.theme";
const listeners = new Set<() => void>();

function read(): ThemePreference {
  const value = storage.getItem(KEY);
  return value === "light" || value === "dark" ? value : "system";
}

function systemIsLight() {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

function apply(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && !systemIsLight());
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0f1115" : "#fafbfc");
}

export function setThemePreference(preference: ThemePreference) {
  storage.setItem(KEY, preference);
  apply(preference);
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  const preference = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      const media = window.matchMedia("(prefers-color-scheme: light)");
      media.addEventListener("change", onChange);
      return () => {
        listeners.delete(onChange);
        media.removeEventListener("change", onChange);
      };
    },
    read,
    () => "system" as const,
  );
  const resolved: "light" | "dark" =
    preference === "system" ? (systemIsLight() ? "light" : "dark") : preference;

  useEffect(() => apply(preference), [preference, resolved]);
  return { preference, resolved, setPreference: setThemePreference };
}
