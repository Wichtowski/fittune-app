import { ChartColumnIcon, TableIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export type TableView = { columns: string[]; rows: (string | number)[][] };

type ChartCardProps = {
  title: string;
  description?: ReactNode;
  /** Data behind the chart, always available as a table (accessibility and exact values). */
  table?: TableView;
  /** Holds the previous render at reduced opacity while new data loads. */
  refreshing?: boolean;
  children: ReactNode;
  className?: string;
};

export function ChartCard({ title, description, table, refreshing = false, children, className }: ChartCardProps) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <Card className={cn("flex flex-col gap-3 p-4 md:p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {table ? (
          <button
            type="button"
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={view === "chart" ? t("Show {title} as a table", { title }) : t("Show {title} as a chart", { title })}
          >
            {view === "chart" ? <TableIcon className="size-4.5" /> : <ChartColumnIcon className="size-4.5" />}
          </button>
        ) : null}
      </div>
      <div className={cn("transition-opacity", refreshing && "opacity-50")}>
        {view === "table" && table ? <DataTable table={table} /> : children}
      </div>
    </Card>
  );
}

function DataTable({ table }: { table: TableView }) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card text-left text-muted-foreground">
          <tr>
            {table.columns.map((column, i) => (
              <th key={column} className={cn("py-2 font-medium", i > 0 && "text-right")}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {table.rows.map((row, r) => (
            <tr key={r} className="border-t">
              {row.map((cell, i) => (
                <td key={i} className={cn("py-2", i > 0 && "text-right")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
