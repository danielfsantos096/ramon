"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDayFull, formatDayShort } from "@/lib/format";
import { AXIS_TICK, ChartTooltip, GRID_STROKE } from "./chart-tooltip";

export interface Series {
  key: string;
  label: string;
  color: string;
}

interface Props<T extends { date: string }> {
  data: T[];
  series: Series[];
  valueFormatter: (v: number) => string;
  yTickFormatter?: (v: number) => string;
  height?: number;
  /** false = barras lado a lado (padrão: empilhadas). */
  stacked?: boolean;
}

export function StackedDailyChart<T extends { date: string }>({
  data,
  series,
  valueFormatter,
  yTickFormatter,
  height = 260,
  stacked = true,
}: Props<T>) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayShort}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            minTickGap={22}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={62}
            tickFormatter={yTickFormatter}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
            content={<ChartTooltip labelFormatter={formatDayFull} valueFormatter={(v) => valueFormatter(v)} />}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? "a" : undefined}
              fill={s.color}
              maxBarSize={26}
              radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
