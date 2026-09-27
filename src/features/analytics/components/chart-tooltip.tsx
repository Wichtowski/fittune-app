import type { ReactNode } from "react";

/** Tooltip body: value first and strong, the label beneath; a line key carries the series. */
export function TooltipBox({ title, rows }: { title: ReactNode; rows: { color: string; label: string; value: string }[] }) {
  return (
    <div className="min-w-36 rounded-xl border bg-popover px-3 py-2 text-sm shadow-xl">
      <p className="mb-1 text-xs text-muted-foreground">{title}</p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className="h-0.5 w-3 rounded-full" style={{ background: row.color }} aria-hidden />
          <span className="font-semibold tabular">{row.value}</span>
          <span className="text-muted-foreground">{row.label}</span>
        </div>
      ))}
    </div>
  );
}
