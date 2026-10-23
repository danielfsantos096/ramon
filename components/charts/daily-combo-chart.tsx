"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "@/lib/config";
import { formatBRL, formatDayFull, formatDayShort, formatInt } from "@/lib/format";
import type { DailyPoint } from "@/lib/metrics";
import { AXIS_TICK, ChartTooltip, GRID_STROKE } from "./chart-tooltip";

/** Barras de leads (esq.), CPL em R$ (dir.) e Investimento em escala própria (eixo oculto; valores reais no tooltip). */
export function DailyComboChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="h-[300px] w-full sm:h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayShort}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            minTickGap={22}
          />
          <YAxis yAxisId="left" tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <YAxis yAxisId="spend" orientation="right" hide />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
            content={
              <ChartTooltip
                labelFormatter={formatDayFull}
                valueFormatter={(v, e) =>
                  e.dataKey === "cpl" || e.dataKey === "spend" ? formatBRL(v) : formatInt(v)
                }
              />
            }
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar yAxisId="left" dataKey="leadsTraffic" name="Leads Tráfego" fill={COLORS.leadsTraffic} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar yAxisId="left" dataKey="leadsAC" name="Leads AC" fill={COLORS.leadsAC} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Line yAxisId="right" type="monotone" dataKey="cpl" name="CPL Tráfego" stroke={COLORS.cpl} strokeWidth={2.5} dot={false} connectNulls={false} />
          <Line yAxisId="spend" type="monotone" dataKey="spend" name="Investimento" stroke={COLORS.spend} strokeWidth={2} strokeDasharray="5 3" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
