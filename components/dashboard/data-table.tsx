"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "./chart-card";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  value: (row: T) => number | string | null;
  render?: (row: T) => React.ReactNode;
  /** Heatmap: "low-good" (menor é melhor, ex.: CPL) ou "high-good" (maior é melhor, ex.: leads). */
  heat?: "low-good" | "high-good";
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  defaultSort?: { key: string; dir: "asc" | "desc" };
  highlight?: (row: T) => "best" | "worst" | undefined;
  /** Texto do selo da linha destacada (padrão: "Melhor" / "Pior"). */
  badgeLabel?: (row: T, kind: "best" | "worst") => string;
  pageSize?: number;
}

/** Cor por posição percentil (1 = melhor → verde, 0 = pior → vermelho). */
function heatColor(t: number) {
  return `hsl(${Math.round(t * 120)} 65% 45% / 0.24)`;
}

export function DataTable<T>({ rows, columns, rowKey, defaultSort, highlight, badgeLabel, pageSize = 15 }: Props<T>) {
  const [sort, setSort] = React.useState(defaultSort ?? null);
  const [limit, setLimit] = React.useState(pageSize);

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.value(a);
      const vb = col.value(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1; // vazios sempre no fim
      if (vb === null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "pt-BR") * dir;
    });
  }, [rows, columns, sort]);

  // heatmap por percentil
  const heat = React.useMemo(() => {
    const out = new Map<string, Map<T, number>>();
    for (const col of columns) {
      if (!col.heat) continue;
      const vals = rows
        .map((r) => ({ r, v: col.value(r) }))
        .filter((x): x is { r: T; v: number } => typeof x.v === "number");
      const order = [...vals].sort((a, b) => a.v - b.v);
      const m = new Map<T, number>();
      const n = order.length;
      order.forEach((x) => {
        // empates recebem a mesma posição
        const first = order.findIndex((o) => o.v === x.v);
        const p = n > 1 ? first / (n - 1) : 0.5;
        m.set(x.r, col.heat === "high-good" ? p : 1 - p);
      });
      // sem valor (ex.: CPL sem leads) = pior
      for (const r of rows) if (!m.has(r)) m.set(r, 0);
      out.set(col.key, m);
    }
    return out;
  }, [rows, columns]);

  if (rows.length === 0) return <EmptyState />;

  const visible = sorted.slice(0, limit);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => {
              const active = sort?.key === col.key;
              const Icon = !active ? ChevronsUpDown : sort!.dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <TableHead
                  key={col.key}
                  className={cn(col.align === "right" && "text-right")}
                  aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSort((s) =>
                        s?.key === col.key ? { key: col.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: col.key, dir: col.heat === "low-good" ? "asc" : "desc" }
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active && "text-foreground",
                      col.align === "right" && "flex-row-reverse"
                    )}
                  >
                    {col.label}
                    <Icon className={cn("size-3", !active && "opacity-40")} />
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((row) => {
            const hl = highlight?.(row);
            return (
              <TableRow
                key={rowKey(row)}
                className={cn(
                  hl === "best" && "bg-success/5 shadow-[inset_3px_0_0_hsl(var(--success))]",
                  hl === "worst" && "bg-destructive/5 shadow-[inset_3px_0_0_hsl(var(--destructive))]"
                )}
              >
                {columns.map((col, ci) => {
                  const h = heat.get(col.key)?.get(row);
                  return (
                    <TableCell
                      key={col.key}
                      className={cn(col.align === "right" && "text-right", ci === 0 && "max-w-[18rem] font-medium")}
                      style={h !== undefined ? { background: heatColor(h) } : undefined}
                    >
                      {ci === 0 ? (
                        <span className="flex items-center gap-2">
                          <span className="truncate" title={String(col.value(row) ?? "")}>
                            {col.render ? col.render(row) : String(col.value(row) ?? "—")}
                          </span>
                          {hl === "best" && <Badge variant="success">{badgeLabel?.(row, "best") ?? "Melhor"}</Badge>}
                          {hl === "worst" && <Badge variant="destructive">{badgeLabel?.(row, "worst") ?? "Pior"}</Badge>}
                        </span>
                      ) : col.render ? (
                        col.render(row)
                      ) : (
                        String(col.value(row) ?? "—")
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {sorted.length > limit && (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + pageSize)}>
            Ver mais ({sorted.length - limit})
          </Button>
        </div>
      )}
    </div>
  );
}
