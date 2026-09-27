import { cn } from "@/lib/utils";

export type BarListItem = { key: string; label: string; value: number; display: string; detail?: string };

/** Ranked horizontal bars in plain HTML: labels stay readable at any width, value at the tip. */
export function BarList({ items, series = "strength" }: { items: BarListItem[]; series?: "strength" | "endurance" }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="grid gap-2.5">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 text-sm" title={item.detail}>
          <span className="truncate text-muted-foreground">{item.label}</span>
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "h-3 min-w-1 rounded-r-[4px]",
                series === "strength" ? "bg-chart-strength" : "bg-chart-endurance",
              )}
              style={{ width: `${(item.value / max) * 100}%` }}
              aria-hidden
            />
            <span className="shrink-0 font-medium tabular">{item.display}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
