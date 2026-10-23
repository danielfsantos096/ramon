"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { COLORS } from "@/lib/config";
import { formatInt, formatPct } from "@/lib/format";

export interface FunnelStep {
  label: string;
  value: number;
  /** Rótulo e valor da taxa em relação à etapa anterior. */
  rateLabel?: string;
  rate?: number | null;
}

/** Funil visual. A largura é escalada (raiz) para etapas pequenas continuarem legíveis. */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = Math.max(steps[0]?.value ?? 0, 1);
  return (
    <div className="space-y-1">
      {steps.map((s, i) => {
        const width = Math.max(14, Math.min(100, 100 * Math.pow(s.value / top, 0.32)));
        return (
          <div key={s.label}>
            {i > 0 && (
              <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] text-muted-foreground">
                <ChevronDown className="size-3.5" />
                <span>{s.rateLabel}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-semibold tabular text-foreground">
                  {formatPct(s.rate ?? null)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-muted-foreground sm:w-28">{s.label}</span>
              <div className="flex flex-1 justify-center">
                <motion.div
                  className="flex h-11 items-center justify-center rounded-md px-2 text-sm font-semibold text-white shadow-sm"
                  style={{ background: COLORS.funnel[i % COLORS.funnel.length] }}
                  initial={{ width: 0, opacity: 0.4 }}
                  animate={{ width: `${width}%`, opacity: 1 }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut" }}
                >
                  <span className="truncate tabular">{formatInt(s.value)}</span>
                </motion.div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
