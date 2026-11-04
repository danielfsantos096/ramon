"use client";

import * as React from "react";
import { ArrowUpDown, Trophy } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageGate } from "@/components/dashboard/page-gate";
import { DonutChart } from "@/components/charts/donut-chart";
import { Funnel } from "@/components/charts/funnel";
import { Button } from "@/components/ui/button";
import { COLORS, META_COLOR } from "@/lib/config";
import { formatBRL, formatInt, formatPct } from "@/lib/format";
import { bestWorst, delta, groupMeta, rankCreatives, safeDiv, totalsOf, type GroupRow } from "@/lib/metrics";
import { STAGE_LABEL } from "@/lib/stage";
import type { Stage } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Captação e etapas com leads: resultado = Website Leads (CPL).
 * Avisos sem leads na aba Meta Ads: resultado = visualizações da página de destino (custo por LPV).
 * RMKT (vendas): resultado = Website Purchases (CPA e ROAS) — nenhuma informação de lead.
 */
type Mode = "leads" | "lpv" | "sales";

const costPerLpv = (r: GroupRow) => safeDiv(r.spend, r.lpv);

const columns = (firstLabel: string, mode: Mode): Column<GroupRow>[] => {
  const first: Column<GroupRow> = { key: "key", label: firstLabel, value: (r) => r.key };
  const spend: Column<GroupRow> = { key: "spend", label: "Valor", align: "right", value: (r) => r.spend, render: (r) => formatBRL(r.spend) };
  const clicks: Column<GroupRow> = { key: "clicks", label: "Cliques", align: "right", value: (r) => r.clicks, render: (r) => formatInt(r.clicks) };
  const ctr: Column<GroupRow> = { key: "ctr", label: "CTR", align: "right", value: (r) => r.ctr, render: (r) => formatPct(r.ctr) };
  const cpc: Column<GroupRow> = { key: "cpc", label: "CPC", align: "right", value: (r) => r.cpc, render: (r) => formatBRL(r.cpc) };

  if (mode === "sales") {
    return [
      first,
      { key: "purchases", label: "Compras", align: "right", value: (r) => r.purchases, render: (r) => formatInt(r.purchases), heat: "high-good" },
      spend,
      { key: "cpa", label: "CPA", align: "right", value: (r) => r.cpa, render: (r) => formatBRL(r.cpa), heat: "low-good" },
      { key: "purchaseValue", label: "Valor de conversão", align: "right", value: (r) => r.purchaseValue, render: (r) => formatBRL(r.purchaseValue) },
      { key: "roas", label: "ROAS", align: "right", value: (r) => r.roas, render: (r) => fmtRoas(r.roas), heat: "high-good" },
      { key: "checkouts", label: "Checkouts", align: "right", value: (r) => r.checkouts, render: (r) => formatInt(r.checkouts) },
      clicks,
      ctr,
    ];
  }
  return [
    first,
    mode === "leads"
      ? { key: "leads", label: "Leads", align: "right", value: (r) => r.leads, render: (r) => formatInt(r.leads), heat: "high-good" }
      : { key: "lpv", label: "Visual. da página", align: "right", value: (r) => r.lpv, render: (r) => formatInt(r.lpv), heat: "high-good" },
    spend,
    mode === "leads"
      ? { key: "cpl", label: "CPL", align: "right", value: (r) => r.cpl, render: (r) => formatBRL(r.cpl), heat: "low-good" }
      : { key: "cplpv", label: "Custo/visual.", align: "right", value: costPerLpv, render: (r) => formatBRL(costPerLpv(r)), heat: "low-good" },
    clicks,
    ctr,
    cpc,
    mode === "leads"
      ? { key: "convRate", label: "Tx. conversão", align: "right", value: (r) => r.convRate, render: (r) => formatPct(r.convRate) }
      : { key: "loadRate", label: "Tx. carregamento", align: "right", value: (r) => r.loadRate, render: (r) => formatPct(r.loadRate) },
  ];
};

const fmtRoas = (v: number | null) => (v === null ? "—" : v.toFixed(2).replace(".", ",") + "x");

function MetaStage({ stage }: { stage: Stage }) {
  const { slice, prevSlice, isLoading, data } = useDashboard();
  const loading = isLoading && !data;

  const metaRows = slice.ads;
  const t = React.useMemo(() => totalsOf(metaRows), [metaRows]);
  const p = React.useMemo(() => totalsOf(prevSlice.ads), [prevSlice.ads]);
  const mode: Mode = stage === "rmkt" ? "sales" : stage === "capt" || t.leads > 0 || p.leads > 0 ? "leads" : "lpv";
  const label = STAGE_LABEL[stage];

  const byCampaign = React.useMemo(() => groupMeta(metaRows, "campaign"), [metaRows]);
  const byAdset = React.useMemo(() => groupMeta(metaRows, "adset"), [metaRows]);
  const byAd = React.useMemo(() => groupMeta(metaRows, "ad"), [metaRows]);

  // Ranking de criativos (melhor → pior) + botão para inverter a ordem da tabela.
  // No modo "lpv" o resultado é a visualização da página e o custo é o custo por visualização.
  const rankInput = React.useMemo(
    () =>
      mode === "leads"
        ? byAd
        : mode === "sales"
          ? byAd.map((r) => ({ ...r, leads: r.purchases, cpl: r.cpa }))
          : byAd.map((r) => ({ ...r, leads: r.lpv, cpl: costPerLpv(r) })),
    [byAd, mode]
  );
  const { worst: worstRaw } = React.useMemo(() => bestWorst(rankInput), [rankInput]);
  const [creativeOrder, setCreativeOrder] = React.useState<"best" | "worst">("best");
  const { ranked, unranked } = React.useMemo(() => rankCreatives(rankInput), [rankInput]);
  const top3 = React.useMemo(() => ranked.filter((r) => r.leads > 0).slice(0, 3), [ranked]);
  const rankOf = React.useMemo(() => new Map(top3.map((r, i) => [r.key, i])), [top3]);
  // com poucos criativos o pior pode já estar entre os 3 melhores: nesse caso não repete
  const worst = worstRaw && !rankOf.has(worstRaw.key) ? worstRaw : null;
  const creativeRows = React.useMemo(
    () => (creativeOrder === "best" ? [...ranked, ...unranked] : [...ranked].reverse().concat(unranked)),
    [ranked, unranked, creativeOrder]
  );
  const costName = mode === "leads" ? "CPL" : mode === "sales" ? "CPA" : "Custo/visualização";
  const unitName = mode === "leads" ? "leads" : mode === "sales" ? "compras" : "visualizações";

  const empty = metaRows.length === 0;

  const topSlices = (rows: GroupRow[], pick: (r: GroupRow) => number) => {
    const sorted = [...rows].map((r) => ({ name: r.key, value: pick(r) })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    if (sorted.length <= 7) return sorted;
    return [...sorted.slice(0, 6), { name: "Outros", value: sorted.slice(6).reduce((s, r) => s + r.value, 0) }];
  };

  const freq = safeDiv(t.impressions, t.reach);
  const freqPrev = safeDiv(p.impressions, p.reach);
  const cpLpv = safeDiv(t.spend, t.lpv);
  const cpLpvPrev = safeDiv(p.spend, p.lpv);

  const kpiBase = [
    { label: "Cliques no link", value: formatInt(t.clicks), delta: delta(t.clicks, p.clicks), goodWhen: "up" as const },
    { label: "CPC", value: formatBRL(t.cpc), delta: delta(t.cpc, p.cpc), goodWhen: "down" as const },
    { label: "Impressões", value: formatInt(t.impressions), delta: delta(t.impressions, p.impressions), goodWhen: "neutral" as const },
  ];
  const spendKpi = { label: "Valor Investido", value: formatBRL(t.spend), delta: delta(t.spend, p.spend), goodWhen: "neutral" as const };

  const kpis =
    mode === "sales"
      ? [
          spendKpi,
          { label: "Compras", value: formatInt(t.purchases), delta: delta(t.purchases, p.purchases), goodWhen: "up" as const },
          { label: "CPA", value: formatBRL(t.cpa), delta: delta(t.cpa, p.cpa), goodWhen: "down" as const },
          { label: "Valor de conversão", value: formatBRL(t.purchaseValue), delta: delta(t.purchaseValue, p.purchaseValue), goodWhen: "up" as const },
          { label: "ROAS", value: fmtRoas(t.roas), delta: delta(t.roas, p.roas), goodWhen: "up" as const },
          { label: "Checkouts iniciados", value: formatInt(t.checkouts), delta: delta(t.checkouts, p.checkouts), goodWhen: "up" as const },
        ]
      : mode === "leads"
        ? [
            spendKpi,
            { label: "Leads", value: formatInt(t.leads), delta: delta(t.leads, p.leads), goodWhen: "up" as const },
            { label: "CPL", value: formatBRL(t.cpl), delta: delta(t.cpl, p.cpl), goodWhen: "down" as const },
            ...kpiBase,
          ]
        : [
            spendKpi,
            { label: "Visualizações da página", value: formatInt(t.lpv), delta: delta(t.lpv, p.lpv), goodWhen: "up" as const },
            { label: "Custo por visualização", value: formatBRL(cpLpv), delta: delta(cpLpv, cpLpvPrev), goodWhen: "down" as const },
            ...kpiBase,
          ];

  const rates = [
    { label: "CTR", value: formatPct(t.ctr), delta: delta(t.ctr, p.ctr), goodWhen: "up" as const },
    { label: "CPM", value: formatBRL(t.cpm), delta: delta(t.cpm, p.cpm), goodWhen: "down" as const },
    { label: "Tx. de carregamento", value: formatPct(t.loadRate), delta: delta(t.loadRate, p.loadRate), goodWhen: "up" as const },
    mode === "leads"
      ? { label: "Tx. de conversão", value: formatPct(t.convRate), delta: delta(t.convRate, p.convRate), goodWhen: "up" as const }
      : mode === "sales"
        ? { label: "Tx. checkout → compra", value: formatPct(t.checkoutRate), delta: delta(t.checkoutRate, p.checkoutRate), goodWhen: "up" as const }
        : { label: "Frequência", value: freq === null ? "—" : freq.toFixed(2).replace(".", ","), delta: delta(freq, freqPrev), goodWhen: "neutral" as const },
  ];

  const funnelSteps =
    mode === "sales"
      ? [
          { label: "Impressões", value: t.impressions },
          { label: "Cliques", value: t.clicks, rateLabel: "CTR", rate: t.ctr },
          { label: "PageViews", value: t.lpv, rateLabel: "Tx. de carregamento", rate: t.loadRate },
          { label: "Checkouts", value: t.checkouts, rateLabel: "PageView → checkout", rate: safeDiv(t.checkouts, t.lpv) },
          { label: "Compras", value: t.purchases, rateLabel: "Tx. checkout → compra", rate: t.checkoutRate },
        ]
      : mode === "leads"
      ? [
          { label: "Impressões", value: t.impressions },
          { label: "Cliques", value: t.clicks, rateLabel: "CTR", rate: t.ctr },
          { label: "PageViews", value: t.lpv, rateLabel: "Tx. de carregamento", rate: t.loadRate },
          { label: "Leads", value: t.leads, rateLabel: "Tx. de conversão", rate: t.convRate },
        ]
      : [
          { label: "Impressões", value: t.impressions },
          { label: "Cliques", value: t.clicks, rateLabel: "CTR", rate: t.ctr },
          { label: "PageViews", value: t.lpv, rateLabel: "Tx. de carregamento", rate: t.loadRate },
        ];

  const pickMain = (r: GroupRow) => (mode === "leads" ? r.leads : mode === "sales" ? r.purchases : r.lpv);
  const mainTotal = mode === "leads" ? t.leads : mode === "sales" ? t.purchases : t.lpv;
  const mainNoun = mode === "leads" ? "leads" : mode === "sales" ? "compras" : "visualizações";

  return (
    <>
      <section aria-label={`Indicadores ${label}`} className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} index={i} loading={loading} accent={META_COLOR} {...k} />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-3"
          title="Funil"
          description={
            mode === "leads"
              ? "Impressões → Cliques → PageViews → Leads"
              : mode === "sales"
                ? "Impressões → Cliques → PageViews → Checkouts → Compras"
                : "Impressões → Cliques → PageViews"
          }
          empty={empty}
          index={1}
        >
          <Funnel steps={funnelSteps} />
        </ChartCard>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          {rates.map((k, i) => (
            <KpiCard key={k.label} index={i + 2} loading={loading} {...k} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Distribuição de verba por público" description="Valor investido por conjunto de anúncios" empty={t.spend === 0} index={2}>
          <DonutChart data={topSlices(byAdset, (r) => r.spend)} valueFormatter={formatBRL} centerValue={formatBRL(t.spend)} centerLabel="investido" />
        </ChartCard>
        <ChartCard
          title={`Distribuição de ${mainNoun} por público`}
          description={`${mainNoun[0].toUpperCase()}${mainNoun.slice(1)} por conjunto de anúncios`}
          empty={mainTotal === 0}
          index={3}
        >
          <DonutChart
            data={topSlices(byAdset, pickMain)}
            valueFormatter={formatInt}
            centerValue={formatInt(mainTotal)}
            centerLabel={mainNoun}
            colors={[...COLORS.series].reverse()}
          />
        </ChartCard>
      </div>

      <ChartCard title="Campanhas" description="Clique nos títulos para ordenar · cores: verde = melhor, vermelho = pior" empty={empty} index={4}>
        <DataTable rows={byCampaign} columns={columns("Campanha", mode)} rowKey={(r) => r.key} defaultSort={{ key: "spend", dir: "desc" }} />
      </ChartCard>

      <ChartCard title="Públicos" description="Desempenho por conjunto de anúncios" empty={empty} index={5}>
        <DataTable rows={byAdset} columns={columns("Público", mode)} rowKey={(r) => r.key} defaultSort={{ key: mode === "leads" ? "leads" : mode === "sales" ? "purchases" : "lpv", dir: "desc" }} />
      </ChartCard>

      <ChartCard
        title="Criativos"
        description="Desempenho por anúncio · 3 melhores e pior criativo destacados"
        empty={empty}
        index={6}
      >
        {(top3.length > 0 || worst) && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {top3.map((c, i) => (
              <div
                key={c.key}
                className={cn(
                  "rounded-lg border p-3",
                  i === 0 ? "border-success/60 bg-success/15 ring-1 ring-success/30" : "border-success/30 bg-success/5"
                )}
              >
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-success">
                  <Trophy className="size-3.5" />
                  {i + 1}º melhor criativo · {i === 0 ? `menor ${costName}` : costName}
                </p>
                <p className="mt-1 truncate text-sm font-medium" title={c.key}>{c.key}</p>
                <p className="text-xs text-muted-foreground tabular">
                  {costName} {formatBRL(c.cpl)} · {formatInt(c.leads)} {unitName} · {formatBRL(c.spend)}
                </p>
              </div>
            ))}
            {worst && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
                  Pior criativo · {worst.leads === 0 ? `gastou sem gerar ${unitName}` : `maior ${costName}`}
                </p>
                <p className="mt-1 truncate text-sm font-medium" title={worst.key}>{worst.key}</p>
                <p className="text-xs text-muted-foreground tabular">
                  {costName} {formatBRL(worst.cpl)} · {formatInt(worst.leads)} {unitName} · {formatBRL(worst.spend)}
                </p>
              </div>
            )}
          </div>
        )}
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Ranking por {costName} · {creativeOrder === "best" ? "do melhor para o pior" : "do pior para o melhor"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreativeOrder((o) => (o === "best" ? "worst" : "best"))}
            aria-label="Inverter ordem de classificação dos criativos"
          >
            <ArrowUpDown className="size-3.5" />
            {creativeOrder === "best" ? "Melhor → Pior" : "Pior → Melhor"}
          </Button>
        </div>
        <DataTable
          key={creativeOrder}
          rows={creativeRows}
          columns={columns("Criativo", mode)}
          rowKey={(r) => r.key}
          highlight={(r) => (rankOf.has(r.key) ? "best" : worst && r.key === worst.key ? "worst" : undefined)}
          badgeLabel={(r, kind) => (kind === "best" ? `${(rankOf.get(r.key) ?? 0) + 1}º` : "Pior")}
        />
      </ChartCard>
    </>
  );
}

export function MetaStagePage({ stage }: { stage: Stage }) {
  return (
    <PageGate>
      <MetaStage stage={stage} />
    </PageGate>
  );
}
