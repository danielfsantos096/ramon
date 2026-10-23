"use client";

import * as React from "react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageGate } from "@/components/dashboard/page-gate";
import { DailyAreaChart } from "@/components/charts/daily-area-chart";
import { HBarChart } from "@/components/charts/hbar-chart";
import { COLORS } from "@/lib/config";
import { formatBRL, formatInt } from "@/lib/format";
import { countLeadsBy, delta, safeDiv } from "@/lib/metrics";

function Leads() {
  const { summary: s, prevSummary: p, daily, slice, isLoading, data } = useDashboard();
  const loading = isLoading && !data;

  const cplTotal = safeDiv(s.spend, s.leadsAC);
  const cplTotalPrev = safeDiv(p.spend, p.leadsAC);
  const empty = s.leadsAC === 0;

  const by = React.useMemo(
    () => ({
      source: countLeadsBy(slice.leads, "source"),
      content: countLeadsBy(slice.leads, "content"),
      term: countLeadsBy(slice.leads, "term"),
      medium: countLeadsBy(slice.leads, "medium"),
      campaign: countLeadsBy(slice.leads, "campaign"),
    }),
    [slice.leads]
  );
  const perDay = React.useMemo(() => daily.map((d) => ({ date: d.date, value: d.leadsAC })), [daily]);

  const kpis = [
    { label: "Leads totais", value: formatInt(s.leadsAC), delta: delta(s.leadsAC, p.leadsAC), goodWhen: "up" as const, accent: COLORS.leadsAC },
    { label: "Tráfego", value: formatInt(s.leadsPaid), delta: delta(s.leadsPaid, p.leadsPaid), goodWhen: "up" as const, accent: COLORS.leadsTraffic },
    { label: "Orgânico", value: formatInt(s.leadsOrganic), delta: delta(s.leadsOrganic, p.leadsOrganic), goodWhen: "up" as const, accent: COLORS.organic },
    { label: "Sem UTMs", value: formatInt(s.leadsNoUtm), delta: delta(s.leadsNoUtm, p.leadsNoUtm), goodWhen: "down" as const, accent: COLORS.noUtm },
    { label: "CPL total", value: formatBRL(cplTotal), delta: delta(cplTotal, cplTotalPrev), goodWhen: "down" as const, accent: COLORS.cpl },
  ];

  return (
    <>
      <section aria-label="Indicadores de leads" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} index={i} loading={loading} {...k} />
        ))}
      </section>

      <ChartCard title="Leads por dia" description="Inscrições por Data da Inscrição" empty={empty} index={1}>
        <DailyAreaChart data={perDay} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Por Source" description="Origem (utm_source)" empty={empty} index={2}>
          <HBarChart data={by.source} color={COLORS.series[0]} />
        </ChartCard>
        <ChartCard title="Por Content (criativo)" description="utm_content" empty={empty} index={3}>
          <HBarChart data={by.content} color={COLORS.series[1]} />
        </ChartCard>
        <ChartCard title="Por Term (posição do anúncio)" description="utm_term" empty={empty} index={4}>
          <HBarChart data={by.term} color={COLORS.series[2]} />
        </ChartCard>
        <ChartCard title="Por Medium" description="utm_medium" empty={empty} index={5}>
          <HBarChart data={by.medium} color={COLORS.series[3]} />
        </ChartCard>
      </div>

      <ChartCard title="Por Campaign" description="utm_campaign" empty={empty} index={6}>
        <HBarChart data={by.campaign} color={COLORS.series[4]} />
      </ChartCard>
    </>
  );
}

export default function Page() {
  return (
    <PageGate>
      <Leads />
    </PageGate>
  );
}
