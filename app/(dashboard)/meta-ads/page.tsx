"use client";

import * as React from "react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageGate } from "@/components/dashboard/page-gate";
import { DonutChart } from "@/components/charts/donut-chart";
import { Funnel } from "@/components/charts/funnel";
import { COLORS, META_COLOR } from "@/lib/config";
import { formatBRL, formatInt, formatPct } from "@/lib/format";
import { bestWorst, delta, groupMeta, totalsOf, type GroupRow } from "@/lib/metrics";

const columns = (firstLabel: string): Column<GroupRow>[] => [
  { key: "key", label: firstLabel, value: (r) => r.key },
  { key: "leads", label: "Leads", align: "right", value: (r) => r.leads, render: (r) => formatInt(r.leads), heat: "high-good" },
  { key: "spend", label: "Valor", align: "right", value: (r) => r.spend, render: (r) => formatBRL(r.spend) },
  { key: "cpl", label: "CPL", align: "right", value: (r) => r.cpl, render: (r) => formatBRL(r.cpl), heat: "low-good" },
  { key: "clicks", label: "Cliques", align: "right", value: (r) => r.clicks, render: (r) => formatInt(r.clicks) },
  { key: "ctr", label: "CTR", align: "right", value: (r) => r.ctr, render: (r) => formatPct(r.ctr) },
  { key: "cpc", label: "CPC", align: "right", value: (r) => r.cpc, render: (r) => formatBRL(r.cpc) },
  { key: "convRate", label: "Tx. conversão", align: "right", value: (r) => r.convRate, render: (r) => formatPct(r.convRate) },
];

function MetaAds() {
  const { slice, prevSlice, isLoading, data } = useDashboard();
  const loading = isLoading && !data;

  const metaRows = slice.ads;
  const prevMetaRows = prevSlice.ads;
  const t = React.useMemo(() => totalsOf(metaRows), [metaRows]);
  const p = React.useMemo(() => totalsOf(prevMetaRows), [prevMetaRows]);

  const byCampaign = React.useMemo(() => groupMeta(metaRows, "campaign"), [metaRows]);
  const byAdset = React.useMemo(() => groupMeta(metaRows, "adset"), [metaRows]);
  const byAd = React.useMemo(() => groupMeta(metaRows, "ad"), [metaRows]);
  const { best, worst } = React.useMemo(() => bestWorst(byAd), [byAd]);

  const empty = metaRows.length === 0;

  const topSlices = (rows: GroupRow[], pick: (r: GroupRow) => number) => {
    const sorted = [...rows].map((r) => ({ name: r.key, value: pick(r) })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    if (sorted.length <= 7) return sorted;
    return [...sorted.slice(0, 6), { name: "Outros", value: sorted.slice(6).reduce((s, r) => s + r.value, 0) }];
  };

  const kpis = [
    { label: "Valor Investido", value: formatBRL(t.spend), delta: delta(t.spend, p.spend), goodWhen: "neutral" as const },
    { label: "Leads", value: formatInt(t.leads), delta: delta(t.leads, p.leads), goodWhen: "up" as const },
    { label: "CPL", value: formatBRL(t.cpl), delta: delta(t.cpl, p.cpl), goodWhen: "down" as const },
    { label: "Cliques no link", value: formatInt(t.clicks), delta: delta(t.clicks, p.clicks), goodWhen: "up" as const },
    { label: "CPC", value: formatBRL(t.cpc), delta: delta(t.cpc, p.cpc), goodWhen: "down" as const },
    { label: "Impressões", value: formatInt(t.impressions), delta: delta(t.impressions, p.impressions), goodWhen: "neutral" as const },
  ];

  const rates = [
    { label: "CTR", value: formatPct(t.ctr), delta: delta(t.ctr, p.ctr), goodWhen: "up" as const },
    { label: "CPM", value: formatBRL(t.cpm), delta: delta(t.cpm, p.cpm), goodWhen: "down" as const },
    { label: "Tx. de carregamento", value: formatPct(t.loadRate), delta: delta(t.loadRate, p.loadRate), goodWhen: "up" as const },
    { label: "Tx. de conversão", value: formatPct(t.convRate), delta: delta(t.convRate, p.convRate), goodWhen: "up" as const },
  ];

  return (
    <>
      <section aria-label="Indicadores Meta" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} index={i} loading={loading} accent={META_COLOR} {...k} />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard className="lg:col-span-3" title="Funil" description="Impressões → Cliques → PageViews → Leads" empty={empty} index={1}>
          <Funnel
            steps={[
              { label: "Impressões", value: t.impressions },
              { label: "Cliques", value: t.clicks, rateLabel: "CTR", rate: t.ctr },
              { label: "PageViews", value: t.lpv, rateLabel: "Tx. de carregamento", rate: t.loadRate },
              { label: "Leads", value: t.leads, rateLabel: "Tx. de conversão", rate: t.convRate },
            ]}
          />
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
        <ChartCard title="Distribuição de leads por público" description="Leads por conjunto de anúncios" empty={t.leads === 0} index={3}>
          <DonutChart data={topSlices(byAdset, (r) => r.leads)} valueFormatter={formatInt} centerValue={formatInt(t.leads)} centerLabel="leads" colors={[...COLORS.series].reverse()} />
        </ChartCard>
      </div>

      <ChartCard title="Campanhas" description="Clique nos títulos para ordenar · cores: verde = melhor, vermelho = pior" empty={empty} index={4}>
        <DataTable rows={byCampaign} columns={columns("Campanha")} rowKey={(r) => r.key} defaultSort={{ key: "spend", dir: "desc" }} />
      </ChartCard>

      <ChartCard title="Públicos" description="Desempenho por conjunto de anúncios" empty={empty} index={5}>
        <DataTable rows={byAdset} columns={columns("Público")} rowKey={(r) => r.key} defaultSort={{ key: "leads", dir: "desc" }} />
      </ChartCard>

      <ChartCard
        title="Criativos"
        description="Desempenho por anúncio · melhor e pior criativo destacados"
        empty={empty}
        index={6}
      >
        {(best || worst) && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {best && (
              <div className="rounded-lg border border-success/40 bg-success/10 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-success">Melhor criativo · menor CPL</p>
                <p className="mt-1 truncate text-sm font-medium" title={best.key}>{best.key}</p>
                <p className="text-xs text-muted-foreground tabular">
                  CPL {formatBRL(best.cpl)} · {formatInt(best.leads)} leads · {formatBRL(best.spend)}
                </p>
              </div>
            )}
            {worst && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
                  Pior criativo · {worst.leads === 0 ? "gastou sem gerar leads" : "maior CPL"}
                </p>
                <p className="mt-1 truncate text-sm font-medium" title={worst.key}>{worst.key}</p>
                <p className="text-xs text-muted-foreground tabular">
                  CPL {formatBRL(worst.cpl)} · {formatInt(worst.leads)} leads · {formatBRL(worst.spend)}
                </p>
              </div>
            )}
          </div>
        )}
        <DataTable
          rows={byAd}
          columns={columns("Criativo")}
          rowKey={(r) => r.key}
          defaultSort={{ key: "leads", dir: "desc" }}
          highlight={(r) => (best && r.key === best.key ? "best" : worst && r.key === worst.key ? "worst" : undefined)}
        />
      </ChartCard>
    </>
  );
}

export default function Page() {
  return (
    <PageGate>
      <MetaAds />
    </PageGate>
  );
}
