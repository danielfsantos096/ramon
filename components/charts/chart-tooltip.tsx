"use client";

import * as React from "react";

interface Entry {
  name?: string | number;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any;
}

interface Props {
  active?: boolean;
  payload?: readonly Entry[];
  label?: string | number;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number, entry: Entry) => string;
}

export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }: Props) {
  if (!active || !payload || payload.length === 0) return null;
  const title = label !== undefined ? (labelFormatter ? labelFormatter(String(label)) : String(label)) : undefined;
  return (
    <div className="min-w-[10rem] rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {title && <p className="mb-1.5 font-medium text-foreground">{title}</p>}
      <ul className="space-y-1">
        {payload.map((e, i) => {
          const v = typeof e.value === "number" ? e.value : e.value == null ? null : Number(e.value);
          return (
            <li key={`${e.dataKey ?? e.name}-${i}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: e.color ?? e.payload?.fill }} />
                {e.name}
              </span>
              <span className="font-medium tabular text-foreground">
                {v === null || Number.isNaN(v) ? "—" : valueFormatter ? valueFormatter(v, e) : v.toLocaleString("pt-BR")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" } as const;
export const GRID_STROKE = "hsl(var(--border))";
