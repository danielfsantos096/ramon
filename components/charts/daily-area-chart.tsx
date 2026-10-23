"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS } from "@/lib/config";
import { formatDayFull, formatDayShort, formatInt } from "@/lib/format";
import { AXIS_TICK, ChartTooltip, GRID_STROKE } from "./chart-tooltip";

export function DailyAreaChart({
  data,
  name = "Leads",
  color = COLORS.leadsAC,
}: {
  data: { date: string; value: number }[];
  name?: string;
  color?: string;
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayShort}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            minTickGap={22}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <Tooltip content={<ChartTooltip labelFormatter={formatDayFull} valueFormatter={(v) => formatInt(v)} />} />
          <Area type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2.5} fill="url(#areaFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
