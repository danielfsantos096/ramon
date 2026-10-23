"use client";

import { ChartCard } from "@/components/dashboard/chart-card";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageGate } from "@/components/dashboard/page-gate";
import { DailyComboChart } from "@/components/charts/daily-combo-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { StackedDailyChart } from "@/components/charts/stacked-daily-chart";
import { COLORS, META_COLOR } from "@/lib/config";
import { formatBRL, formatInt } from "@/lib/format";
import { countLeadsBy, delta } from "@/lib/metrics";

function Overview() {
  const { summary: s, prevSummary: p, daily, slice, isLoading, data } = useDashboard();
  const loading = isLoading && !data;

  const origins = countLeadsBy(slice.leads, "source", 7);
  const hasAnything = s.spend > 0 || s.leadsTraffic > 0 || s.leadsAC > 0;

  const kpis = [
    { label: "Leads Tráfego", value: formatInt(s.leadsTraffic), delta: delta(s.leadsTraffic, p.leadsTraffic), goodWhen: "up" as const, accent: COLORS.leadsTraffic },
    { label: "Leads AC", value: formatInt(s.leadsAC), delta: delta(s.leadsAC, p.leadsAC), goodWhen: "up" as const, accent: COLORS.leadsAC },
    { label: "Valor Investido", value: formatBRL(s.spend), delta: delta(s.spend, p.spend), goodWhen: "neutral" as const, accent: COLORS.spend },
    { label: "CPL Tráfego", value: formatBRL(s.cplTraffic), delta: delta(s.cplTraffic, p.cplTraffic), goodWhen: "down" as const, accent: COLORS.cpl },
    { label: "CPL AC", value: formatBRL(s.cplAC), delta: delta(s.cplAC, p.cplAC), goodWhen: "down" as const, accent: COLORS.cpl },
    { label: "CPL AC - UTMs Tráfego", value: formatBRL(s.cplACUtm), delta: delta(s.cplACUtm, p.cplACUtm), goodWhen: "down" as const, accent: COLORS.cpl },
  ];

  return (
    <>
      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} index={i} loading={loading} {...k} />
        ))}
      </section>

      <ChartCard
        title="Evolução diária"
        description="Leads (barras) · CPL de tráfego (linha cheia) · investimento (tracejada, escala própria)"
        empty={!hasAnything}
      >
        <DailyComboChart data={daily} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          className="lg:col-span-2"
          index={1}
          title="Origem dos leads"
          description="Leads do AC por Source (UTM)"
          empty={s.leadsAC === 0}
        >
          <DonutChart
            data={origins}
            valueFormatter={formatInt}
            centerValue={formatInt(s.leadsAC)}
            centerLabel="leads AC"
          />
        </ChartCard>

        <ChartCard
          className="lg:col-span-3"
          index={2}
          title="Investimento diário"
          description="Valor investido por dia (Meta Ads)"
          empty={s.spend === 0}
        >
          <StackedDailyChart
            data={daily}
            valueFormatter={formatBRL}
            yTickFormatter={(v) => `R$${Math.round(v)}`}
            series={[{ key: "spend", label: "Investimento", color: META_COLOR }]}
          />
        </ChartCard>
      </div>

      <ChartCard
        index={3}
        title="Leads diários"
        description="Leads de tráfego (Meta Ads) x leads AC (aba Leads) por dia"
        empty={s.leadsTraffic === 0 && s.leadsAC === 0}
      >
        <StackedDailyChart
          data={daily}
          valueFormatter={formatInt}
          stacked={false}
          series={[
            { key: "leadsTraffic", label: "Leads Tráfego", color: COLORS.leadsTraffic },
            { key: "leadsAC", label: "Leads AC", color: COLORS.leadsAC },
          ]}
        />
      </ChartCard>
    </>
  );
}

export default function Page() {
  return (
    <PageGate>
      <Overview />
    </PageGate>
  );
}
