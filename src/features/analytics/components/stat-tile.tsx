import { t } from "@/lib/i18n";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { percentChange } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  value: string;
  current?: number;
  previous?: number;
  /** Name of the comparison period, e.g. "last week". */
  comparedTo?: string;
  className?: string;
};

/** Headline number with an optional signed change against the previous period. */
export function StatTile({ label, value, current, previous, comparedTo, className }: StatTileProps) {
  const period = comparedTo ? t(comparedTo) : "";
  const change = current !== undefined && previous !== undefined ? percentChange(current, previous) : null;
  const up = change !== null && change > 0;
  const flat = change !== null && Math.abs(change) < 0.5;

  return (
    <div className={cn("rounded-2xl border bg-card p-4", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl leading-none font-bold md:text-4xl">{value}</p>
      {comparedTo ? (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {change === null ? (
            <span>{t("No data")}{" "}{period}</span>
          ) : flat ? (
            <span>{t("Same as")}{" "}{period}</span>
          ) : (
            <>
              {up ? (
                <ArrowUpRightIcon className="size-3.5 text-primary-strong" aria-hidden />
              ) : (
                <ArrowDownRightIcon className="size-3.5" aria-hidden />
              )}
              <span className={cn("font-semibold tabular", up ? "text-primary-strong" : "text-foreground")}>
                {up ? "+" : ""}
                {Math.round(change)}%
              </span>
              <span>{t("vs")}{" "}{period}</span>
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
