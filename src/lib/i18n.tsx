import { createContext, Fragment, type ReactNode, useContext, useState } from "react";
import { z } from "zod";

import { pl } from "./pl";
import { storage } from "./storage";

export type Locale = "en" | "pl";

function initialLocale(): Locale {
  const saved = storage.getItem("fittune-locale");
  return saved === "en" || saved === "pl" ? saved : navigator.language.toLowerCase().startsWith("pl") ? "pl" : "en";
}

let locale: Locale = initialLocale();
document.documentElement.lang = locale;
z.config(z.locales[locale]());

export function getLocale(): Locale {
  return locale;
}

export function t(english: string, values?: Record<string, string | number>): string {
  const message = locale === "pl" ? pl[english] ?? english : english;
  if (locale === "pl" && message === english) {
    const max = /^At most (\d+)$/.exec(english);
    if (max) return t("At most {max}", { max: max[1] ?? "" });
    const range = /^Must be between (\d+) and (\d+)$/.exec(english);
    if (range) return t("Must be between {min} and {max}", { min: range[1] ?? "", max: range[2] ?? "" });
  }
  return message.replace(/\{(\w+)\}/g, (match, key: string) => String(values?.[key] ?? match));
}

const LocaleContext = createContext<{ locale: Locale; setLocale: (next: Locale) => void } | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState(locale);
  const setLocale = (next: Locale) => {
    locale = next;
    storage.setItem("fittune-locale", next);
    document.documentElement.lang = next;
    z.config(z.locales[next]());
    setCurrent(next);
  };

  return <LocaleContext.Provider value={{ locale: current, setLocale }}><Fragment key={current}>{children}</Fragment></LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("LocaleProvider is missing");
  return context;
}
