"use client";

import * as React from "react";
import { CalendarDays, Filter, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays, hasActiveFilters } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { STAGE_LABEL } from "@/lib/stage";
import { useDashboard } from "./dashboard-provider";
import { MultiSelect } from "./multi-select";

const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "14 dias", days: 14 },
  { label: "30 dias", days: 30 },
] as const;

export function FilterBar() {
  const {
    range, setRange, resetRange, rangeIsCustom, today,
    filters, setFilters, clearFilters, options, data, scope, view, stages,
  } = useDashboard();
  const [open, setOpen] = React.useState(false);

  const active = hasActiveFilters(filters) || rangeIsCustom;
  const min = data?.campaignStart ?? undefined;

  const isSales = view === "sales";
  const fmt = (iso: string) => iso.split("-").reverse().join("/");
  const stageInfo = !isSales ? stages[view] : null;

  const applyPreset = (days: number) => setRange(addDays(today, -(days - 1)), today);

  return (
    <div className="rounded-lg border border-border/70 bg-card/70 p-3 backdrop-blur sm:p-4">
      <div className="flex items-center justify-between sm:hidden">
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <Filter /> Filtros {active && <span className="size-1.5 rounded-full bg-primary" />}
        </Button>
        <span className="text-xs text-muted-foreground tabular">
          {range.from.split("-").reverse().join("/")} – {range.to.split("-").reverse().join("/")}
        </span>
      </div>

      <div className={cn("flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-end", open ? "mt-3 flex" : "hidden")}>
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-3.5" /> Período
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label="Data inicial"
              value={range.from}
              min={min}
              max={range.to}
              onChange={(e) => e.target.value && setRange(e.target.value, undefined)}
              className="h-9 w-[9.5rem]"
            />
            <span className="text-muted-foreground">→</span>
            <Input
              type="date"
              aria-label="Data final"
              value={range.to}
              min={range.from}
              onChange={(e) => e.target.value && setRange(undefined, e.target.value)}
              className="h-9 w-[9.5rem]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.days} variant="secondary" size="sm" onClick={() => applyPreset(p.days)}>
              {p.label}
            </Button>
          ))}
          <Button variant={rangeIsCustom ? "secondary" : "default"} size="sm" onClick={resetRange}>
            Tudo
          </Button>
        </div>

        {!isSales && <div className="hidden h-9 w-px bg-border sm:block" />}

        <div className={cn(isSales ? "hidden" : "grid grid-cols-1 gap-2 sm:flex sm:flex-wrap")}>
          {scope === "leads" ? (
            <MultiSelect
              label="Campanha"
              options={options.leadCampaigns}
              counts={options.leadCampaignCounts}
              value={filters.leadCampaigns}
              onChange={(leadCampaigns) => setFilters({ leadCampaigns })}
              hint="Campanhas (UTM Campaign) do Leads Active, com a contagem de linhas da planilha."
            />
          ) : (
            <MultiSelect
              label="Campanha"
              options={options.campaigns}
              value={filters.campaigns}
              onChange={(campaigns) => setFilters({ campaigns })}
            />
          )}
          <MultiSelect
            label="Público"
            options={options.adsets}
            value={filters.adsets}
            onChange={(adsets) => setFilters({ adsets })}
            hint="Conjunto de anúncios (Meta). Nos leads do AC usa a UTM Medium."
          />
          <MultiSelect
            label="Criativo"
            options={options.ads}
            value={filters.ads}
            onChange={(ads) => setFilters({ ads })}
            hint="Anúncio (Meta). Nos leads do AC usa a UTM Content."
          />
        </div>

        <label className={cn("h-9 cursor-pointer items-center gap-2 text-sm", isSales || view !== "capt" ? "hidden" : "flex")}>
          <input
            type="checkbox"
            checked={filters.onlyNewLeads}
            onChange={(e) => setFilters({ onlyNewLeads: e.target.checked })}
            className="size-4 rounded border-input accent-[hsl(var(--primary))]"
          />
          <span className="text-muted-foreground">Só leads novos</span>
        </label>

        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="sm:ml-auto"
            onClick={() => {
              clearFilters();
              resetRange();
            }}
          >
            <FilterX /> Limpar tudo
          </Button>
        )}
      </div>
      {(stageInfo || isSales) && (
        <p className="mt-3 text-xs text-muted-foreground">
          {isSales ? (
            <>Período padrão: início da captação até hoje.</>
          ) : stageInfo ? (
            <>
              <span className="font-medium text-foreground">
                {view === "capt" ? "Captação" : STAGE_LABEL[view]}
              </span>
              : {fmt(stageInfo.from)} → {fmt(stageInfo.to)} · {stageInfo.ongoing ? "em andamento" : "encerrada"} (período padrão desta aba)
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
