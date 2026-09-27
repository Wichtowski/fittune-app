import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { TooltipBox } from "./chart-tooltip";

export type ColumnDatum = { key: string; label: string; value: number; tooltipTitle?: string };

type ColumnChartProps = {
  data: ColumnDatum[];
  series: "strength" | "endurance";
  seriesLabel: string;
  formatValue: (value: number) => string;
  formatTick?: (value: number) => string;
  height?: number;
};

const colors = { strength: "var(--chart-strength)", endurance: "var(--chart-endurance)" };

/** Single-series columns over time: capped width, rounded data end, hairline grid. */
export function ColumnChart({ data, series, seriesLabel, formatValue, formatTick, height = 220 }: ColumnChartProps) {
  const color = colors[series];
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            tickFormatter={formatTick ?? ((v: number) => v.toLocaleString())}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const datum = payload?.[0]?.payload as ColumnDatum | undefined;
              if (!active || !datum) return null;
              return (
                <TooltipBox
                  title={datum.tooltipTitle ?? datum.label}
                  rows={[{ color, label: seriesLabel, value: formatValue(datum.value) }]}
                />
              );
            }}
          />
          <Bar dataKey="value" name={seriesLabel} fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={400} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
