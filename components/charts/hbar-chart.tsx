"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS } from "@/lib/config";
import { truncate } from "@/lib/format";
import { AXIS_TICK, ChartTooltip, GRID_STROKE } from "./chart-tooltip";

interface Props {
  data: { name: string; value: number }[];
  color?: string;
  name?: string;
  valueFormatter?: (v: number) => string;
}

export function HBarChart({ data, color = COLORS.series[0], name = "Leads", valueFormatter = (v) => v.toLocaleString("pt-BR") }: Props) {
  const height = Math.max(180, data.length * 34 + 24);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            interval={0}
            tickFormatter={(v: string) => truncate(v, 20)}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
            content={<ChartTooltip valueFormatter={(v) => valueFormatter(v)} />}
          />
          <Bar dataKey="value" name={name} radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.name === "Sem UTM" ? COLORS.noUtm : color} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: unknown) => valueFormatter(Number(v))}
              style={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
