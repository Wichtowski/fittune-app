import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addDays, toDateString } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { t } from "@/lib/i18n";

/** Steps through days; `date` is a local calendar day, `YYYY-MM-DD` */
export function DateBar({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const day = new Date(`${date}T12:00:00`);
  const today = toDateString(new Date());
  const step = (days: number) => onChange(toDateString(addDays(day, days)));

  return (
    <nav aria-label={t("Day")} className="mb-4 flex items-center justify-between gap-2 rounded-2xl border bg-card p-1.5">
      <Button variant="ghost" size="icon" aria-label={t("Previous day")} onClick={() => step(-1)}>
        <ChevronLeftIcon aria-hidden />
      </Button>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-display text-xl font-bold tracking-wide uppercase">{formatDay(`${date}T12:00:00`)}</span>
        {date !== today ? (
          <Button variant="secondary" size="sm" onClick={() => onChange(today)}>{t("Today")}</Button>
        ) : null}
      </div>
      <Button variant="ghost" size="icon" aria-label={t("Next day")} onClick={() => step(1)}>
        <ChevronRightIcon aria-hidden />
      </Button>
    </nav>
  );
}
