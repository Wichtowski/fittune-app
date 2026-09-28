import { useLocale, t } from "@/lib/i18n";

export function LanguagePicker() {
  const { locale, setLocale } = useLocale();

  return (
    <label className="flex items-center gap-3 text-sm">
      <span>{t("Language")}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as "en" | "pl")}
        className="h-10 rounded-lg border border-input bg-background px-3 text-foreground"
      >
        <option value="en">English</option>
        <option value="pl">Polski</option>
      </select>
    </label>
  );
}
