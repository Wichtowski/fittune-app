import { ChevronDownIcon } from "lucide-react";

import { useLocale, t } from "@/lib/i18n";

export function LanguagePicker() {
  const { locale, setLocale } = useLocale();

  return (
    <label className="flex items-center gap-3 text-sm">
      <span>{t("Language")}</span>
      <span className="relative">
        {/* Own chevron: the native arrow sits flush against the edge and ignores padding */}
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as "en" | "pl")}
          className="h-10 min-w-32 appearance-none rounded-lg border border-input bg-background pr-10 pl-3 text-foreground"
        >
          <option value="en">English</option>
          <option value="pl">Polski</option>
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </span>
    </label>
  );
}
