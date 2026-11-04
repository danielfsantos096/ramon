"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { useDashboard } from "@/components/dashboard/dashboard-provider";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageGate } from "@/components/dashboard/page-gate";
import { DonutChart } from "@/components/charts/donut-chart";
import { StackedDailyChart } from "@/components/charts/stacked-daily-chart";
import { Card } from "@/components/ui/card";
import { COLORS, META_COLOR, SALES_PRODUCT, SALES_START } from "@/lib/config";
import { formatBRL, formatInt, formatPct } from "@/lib/format";
import { delta, safeDiv } from "@/lib/metrics";
import { NO_UTM } from "@/lib/parse";
import {
  groupSales,
  paymentLabel,
  salesDaily,
  salesInRange,
  statusLabel,
  summarizeSales,
  type SalesGroup,
} from "@/lib/sales";

const groupColumns = (first: string): Column<SalesGroup>[] => [
  { key: "key", label: first, value: (r) => r.key },
  { key: "orders", label: "Vendas", align: "right", value: (r) => r.orders, render: (r) => formatInt(r.orders), heat: "high-good" },
  { key: "gross", label: "Faturamento", align: "right", value: (r) => r.gross, render: (r) => formatBRL(r.gross), heat: "high-good" },
  { key: "share", label: "% das vendas", align: "right", value: (r) => r.share, render: (r) => formatPct(r.share, 1) },
];

function topSlices(rows: SalesGroup[], max = 7) {
  const list = rows.filter((r) => r.orders > 0).sort((a, b) => b.orders - a.orders);
  if (list.length <= max) return list.map((r) => ({ name: r.key, value: r.orders }));
  const head = list.slice(0, max - 1).map((r) => ({ name: r.key, value: r.orders }));
  return [...head, { name: "Outros", value: list.slice(max - 1).reduce((s, r) => s + r.orders, 0) }];
}

function Sales() {
  const { data, range, prevRange, isLoading } = useDashboard();
  const loading = isLoading && !data;

  // só vendas a partir da abertura do carrinho
  const sales = React.useMemo(() => (data?.sales ?? []).filter((x) => x.date >= SALES_START), [data?.sales]);
  const cur = React.useMemo(() => salesInRange(sales, range.from, range.to), [sales, range]);
  const prev = React.useMemo(() => salesInRange(sales, prevRange.from, prevRange.to), [sales, prevRange]);
  const s = React.useMemo(() => summarizeSales(cur), [cur]);
  const p = React.useMemo(() => summarizeSales(prev), [prev]);

  // Investimento da Meta no período (Captação + Avisos + RMKT)
  const { spend, prevSpend, spendByDate } = React.useMemo(() => {
    const map = new Map<string, number>();
    let a = 0, b = 0;
    for (const r of data?.ads ?? []) {
      if (r.date >= range.from && r.date <= range.to) {
        a += r.spend;
        map.set(r.date, (map.get(r.date) ?? 0) + r.spend);
      } else if (r.date >= prevRange.from && r.date <= prevRange.to) b += r.spend;
    }
    return { spend: a, prevSpend: b, spendByDate: map };
  }, [data?.ads, range, prevRange]);

  const daily = React.useMemo(() => salesDaily(cur, spendByDate, range.from, range.to), [cur, spendByDate, range]);
  const byPayment = React.useMemo(() => groupSales(cur, (x) => paymentLabel(x.payment)), [cur]);
  const bySource = React.useMemo(() => groupSales(cur, (x) => x.source), [cur]);
  const byCampaign = React.useMemo(() => groupSales(cur, (x) => x.campaign), [cur]);
  const byContent = React.useMemo(() => groupSales(cur, (x) => x.content), [cur]);

  const byStatus = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const x of cur) map.set(x.status, (map.get(x.status) ?? 0) + x.count);
    return [...map.entries()].map(([k, v]) => ({ key: statusLabel(k), count: v })).sort((a, b) => b.count - a.count);
  }, [cur]);

  const roas = safeDiv(s.gross, spend);
  const roasPrev = safeDiv(p.gross, prevSpend);
  const cac = spend > 0 ? safeDiv(spend, s.orders) : null;
  const cacPrev = prevSpend > 0 ? safeDiv(prevSpend, p.orders) : null;
  const hasAnything = cur.length > 0;

  const kpis = [
    { label: "Vendas", value: formatInt(s.orders), delta: delta(s.orders, p.orders), goodWhen: "up" as const, accent: COLORS.leadsTraffic },
    { label: "Faturamento bruto", value: formatBRL(s.gross), delta: delta(s.gross, p.gross), goodWhen: "up" as const, accent: COLORS.leadsTraffic },
    { label: "Ticket médio", value: formatBRL(s.ticket), delta: delta(s.ticket, p.ticket), goodWhen: "up" as const },
    { label: "Investido (Meta)", value: formatBRL(spend), delta: delta(spend, prevSpend), goodWhen: "neutral" as const, accent: META_COLOR },
    { label: "ROAS", value: roas === null || spend <= 0 ? "—" : roas.toFixed(2).replace(".", ",") + "x", delta: delta(roas, roasPrev), goodWhen: "up" as const },
    { label: "CAC (investido ÷ vendas)", value: formatBRL(cac), delta: delta(cac, cacPrev), goodWhen: "down" as const, accent: COLORS.cpl },
  ];
  const second = [
    { label: "Comissão (líquido)", value: formatBRL(s.commission), delta: delta(s.commission, p.commission), goodWhen: "up" as const },
    { label: "Devoluções", value: formatInt(s.refunds), delta: delta(s.refunds, p.refunds), goodWhen: "down" as const },
    { label: "Taxa de devolução", value: formatPct(s.refundRate, 1), delta: delta(s.refundRate, p.refundRate), goodWhen: "down" as const },
    { label: "Vendas com UTM", value: formatPct(safeDiv(s.withUtm, s.orders), 1), delta: null, goodWhen: "neutral" as const },
  ];

  if (data?.salesError) {
    return (
      <Card className="mx-auto mt-6 flex max-w-lg flex-col items-center gap-3 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="text-base font-semibold">Vendas indisponíveis</h2>
        <p className="text-sm text-muted-foreground">{data.salesError}</p>
      </Card>
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Produto: <span className="font-medium text-foreground">{SALES_PRODUCT}</span> · vendas com status Completa/Aprovada; reembolso,
        chargeback e disputa aparecem em Devoluções.
      </p>

      <section aria-label="Indicadores de vendas" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} index={i} loading={loading} {...k} />
        ))}
      </section>
      <section aria-label="Indicadores complementares" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {second.map((k, i) => (
          <KpiCard key={k.label} index={i + 6} loading={loading} {...k} />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Vendas por dia" description="Vendas pagas (Completa + Aprovada)" empty={!hasAnything} index={1}>
          <StackedDailyChart data={daily} valueFormatter={formatInt} series={[{ key: "orders", label: "Vendas", color: COLORS.leadsTraffic }]} />
        </ChartCard>
        <ChartCard title="Faturamento por dia" description="Valor bruto das vendas pagas · investimento da Meta ao lado" empty={!hasAnything} index={2}>
          <StackedDailyChart
            data={daily}
            valueFormatter={formatBRL}
            yTickFormatter={(v) => `R$${Math.round(v)}`}
            stacked={false}
            series={[
              { key: "gross", label: "Faturamento", color: COLORS.leadsTraffic },
              { key: "spend", label: "Investimento", color: META_COLOR },
            ]}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Forma de pagamento" description="Vendas pagas por método" empty={s.orders === 0} index={3}>
          <DonutChart data={topSlices(byPayment)} valueFormatter={formatInt} centerValue={formatInt(s.orders)} centerLabel="vendas" />
        </ChartCard>
        <ChartCard title="Origem das vendas" description="Vendas pagas por utm_source" empty={s.orders === 0} index={4}>
          <DonutChart data={topSlices(bySource)} valueFormatter={formatInt} centerValue={formatInt(s.orders)} centerLabel="vendas" colors={[...COLORS.series].reverse()} />
        </ChartCard>
      </div>

      <ChartCard title="Campanhas (utm_campaign)" description={`"${NO_UTM}" = venda sem UTM · clique nos títulos para ordenar`} empty={s.orders === 0} index={5}>
        <DataTable rows={byCampaign} columns={groupColumns("Campanha")} rowKey={(r) => r.key} defaultSort={{ key: "gross", dir: "desc" }} />
      </ChartCard>

      <ChartCard title="Criativos (utm_content)" description="Vendas por conteúdo da UTM" empty={s.orders === 0} index={6}>
        <DataTable rows={byContent} columns={groupColumns("Criativo")} rowKey={(r) => r.key} defaultSort={{ key: "gross", dir: "desc" }} />
      </ChartCard>

      <ChartCard title="Status das transações" description="Todas as transações do produto no período" empty={byStatus.length === 0} index={7}>
        <DataTable
          rows={byStatus}
          columns={[
            { key: "key", label: "Status", value: (r) => r.key },
            { key: "count", label: "Transações", align: "right", value: (r) => r.count, render: (r) => formatInt(r.count) },
          ]}
          rowKey={(r) => r.key}
          defaultSort={{ key: "count", dir: "desc" }}
        />
      </ChartCard>
    </>
  );
}

export default function Page() {
  return (
    <PageGate>
      <Sales />
    </PageGate>
  );
}
