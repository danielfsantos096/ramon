"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDashboard } from "./dashboard-provider";
import { formatDayShort } from "@/lib/format";

export type GoodWhen = "up" | "down" | "neutral";

/** Só renderiza quando há base de comparação; caso contrário, nada. */
export function DeltaBadge({ value, goodWhen }: { value: number | null; goodWhen: GoodWhen }) {
  if (value === null || !Number.isFinite(value)) return null;
  const up = value > 0;
  const flat = Math.abs(value) < 0.0005;
  const good = goodWhen === "neutral" || flat ? null : goodWhen === "up" ? up : !up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular",
        good === null && "bg-muted text-muted-foreground",
        good === true && "bg-success/15 text-success",
        good === false && "bg-destructive/15 text-destructive"
      )}
    >
      <Icon className="size-3" />
      {(value > 0 ? "+" : "") + (value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"}
    </span>
  );
}

interface Props {
  label: string;
  value: string;
  delta?: number | null;
  goodWhen?: GoodWhen;
  accent?: string;
  index?: number;
  loading?: boolean;
}

export function KpiCard({ label, value, delta, goodWhen = "up", accent, index = 0, loading }: Props) {
  const { prevRange } = useDashboard();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: "easeOut" }}
    >
      <Card className="relative h-full overflow-hidden p-4 sm:p-5">
        {accent && <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden />}
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-28" />
        ) : (
          <p className="mt-1.5 whitespace-nowrap text-[clamp(1.15rem,1.7vw,1.75rem)] font-semibold leading-tight tracking-tight tabular">{value}</p>
        )}
        {!loading && delta !== undefined && delta !== null && Number.isFinite(delta) && (
          <div className="mt-2" title={`vs ${formatDayShort(prevRange.from)} – ${formatDayShort(prevRange.to)}`}>
            <DeltaBadge value={delta} goodWhen={goodWhen} />
          </div>
        )}
      </Card>
    </motion.div>
  );
}
