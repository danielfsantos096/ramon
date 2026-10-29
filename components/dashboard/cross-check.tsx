"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInt, formatPct } from "@/lib/format";
import { crossCheck, safeDiv, type CrossDimension } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { useDashboard } from "./dashboard-provider";

const DIM: Record<CrossDimension, { label: string; mapping: string }> = {
  campaign: { label: "Campanha", mapping: "Campaign Name ↔ utm Campaign" },
  adset: { label: "Público", mapping: "Ad Set Name ↔ utm Medium" },
  ad: { label: "Criativo", mapping: "Ad Name ↔ utm Content" },
};

function signed(n: number) {
  return (n > 0 ? "+" : "") + formatInt(n);
}

function diffTone(diff: number) {
  return diff === 0 ? "text-success" : "text-warning";
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular tracking-tight", tone)}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground tabular">{hint}</p>}
    </div>
  );
}

/** Aparece só quando há filtro de campanha, público ou criativo. */
export function CrossCheckCard() {
  const { slice, filters } = useDashboard();
  const result = React.useMemo(() => crossCheck(slice, filters), [slice, filters]);
  if (!result) return null;

  const { dimension, rows, total } = result;
  const dim = DIM[dimension];
  const pct = safeDiv(total.diff, total.meta);
  const unmatched = rows.filter((r) => r.meta > 0 && r.sheet === 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Gerenciador X Active</CardTitle>
          <CardDescription>
            Cruzamento por {dim.label.toLowerCase()} ({dim.mapping}) no período e filtros selecionados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Leads no gerenciador" value={formatInt(total.meta)} hint="Website Leads · aba Meta Ads" />
            <Stat label="Leads Active" value={formatInt(total.sheet)} hint="linhas com as mesmas UTMs" />
            <Stat
              label="Diferença (Leads Active − gerenciador)"
              value={signed(total.diff)}
              hint={pct === null ? undefined : `${pct > 0 ? "+" : ""}${formatPct(pct, 1)} do gerenciador`}
              tone={diffTone(total.diff)}
            />
          </div>

          {unmatched.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                {unmatched.length === 1 ? "1 item tem" : `${unmatched.length} itens têm`} leads no gerenciador, mas
                nenhum no Leads Active com a UTM correspondente. Confira se a UTM usa o mesmo nome do anúncio.
              </span>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{dim.label}</TableHead>
                <TableHead className="text-right">Gerenciador</TableHead>
                <TableHead className="text-right">Leads Active</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="max-w-[22rem] font-medium">
                    <span className="block truncate" title={r.key}>
                      {r.key}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatInt(r.meta)}</TableCell>
                  <TableCell className="text-right">{formatInt(r.sheet)}</TableCell>
                  <TableCell className={cn("text-right font-medium", diffTone(r.diff))}>{signed(r.diff)}</TableCell>
                </TableRow>
              ))}
              {rows.length > 1 && (
                <TableRow className="bg-muted/30 font-semibold hover:bg-muted/30">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{formatInt(total.meta)}</TableCell>
                  <TableCell className="text-right">{formatInt(total.sheet)}</TableCell>
                  <TableCell className={cn("text-right", diffTone(total.diff))}>{signed(total.diff)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
