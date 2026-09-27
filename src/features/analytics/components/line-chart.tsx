import { CartesianGrid, Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { TooltipBox } from "./chart-tooltip";

export type LineDatum = { key: string; label: string; value: number; tooltipTitle?: string };

type LineChartProps = {
  data: LineDatum[];
  seriesLabel: string;
  formatValue: (value: number) => string;
  formatTick?: (value: number) => string;
  height?: number;
};

/** Single-series trend (e.g. estimated 1RM per session) with a crosshair tooltip. */
export function TrendLineChart({ data, seriesLabel, formatValue, formatTick, height = 220 }: LineChartProps) {
  const color = "var(--chart-strength)";
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            domain={["auto", "auto"]}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            tickFormatter={formatTick ?? ((v: number) => Math.round(v).toLocaleString())}
          />
          <Tooltip
            cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const datum = payload?.[0]?.payload as LineDatum | undefined;
              if (!active || !datum) return null;
              return (
                <TooltipBox
                  title={datum.tooltipTitle ?? datum.label}
                  rows={[{ color, label: seriesLabel, value: formatValue(datum.value) }]}
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={seriesLabel}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: color, stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: color, stroke: "var(--card)", strokeWidth: 2 }}
            animationDuration={400}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
