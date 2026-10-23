"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { COLORS } from "@/lib/config";
import { ChartTooltip } from "./chart-tooltip";

export interface Slice {
  name: string;
  value: number;
}

interface Props {
  data: Slice[];
  valueFormatter: (v: number) => string;
  centerLabel?: string;
  centerValue?: string;
  colors?: readonly string[];
}

export function DonutChart({ data, valueFormatter, centerLabel, centerValue, colors = COLORS.series }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const colorOf = (i: number) => colors[i % colors.length];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
              cornerRadius={4}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={colorOf(i)} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip valueFormatter={(v) => valueFormatter(v)} />} />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-semibold leading-tight tabular">{centerValue}</span>
            <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
          </div>
        )}
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(i) }} />
              <span className="truncate" title={d.name}>{d.name}</span>
            </span>
            <span className="shrink-0 tabular text-muted-foreground">
              {valueFormatter(d.value)}
              <span className="ml-2 text-xs">
                {total > 0 ? ((d.value / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "0"}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
