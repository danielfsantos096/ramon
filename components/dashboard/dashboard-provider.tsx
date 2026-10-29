"use client";

import * as React from "react";
import useSWR from "swr";
import { usePathname } from "next/navigation";
import { REFRESH_MS } from "@/lib/config";
import {
  EMPTY_FILTERS,
  buildClassifier,
  dailySeries,
  previousRange,
  sliceData,
  summarize,
  todayISO,
  uniqueSorted,
  adCampaignMatchesLead,
  type DailyPoint,
  type Filters,
  type Scope,
  type Slice,
  type Summary,
} from "@/lib/metrics";
import type { ApiData } from "@/lib/types";

class FetchError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function fetcher(url: string): Promise<ApiData> {
  // no-store: nunca reaproveita resposta do cache do navegador; o cache de 5 min fica no servidor/CDN.
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) {
    let message = "Falha ao carregar dados.";
    let code: string | undefined;
    try {
      const body = await res.json();
      message = body.error ?? message;
      code = body.code;
    } catch {
      /* ignore */
    }
    throw new FetchError(message, code);
  }
  return res.json();
}

const EMPTY_DATA: ApiData = {
  generatedAt: new Date(0).toISOString(),
  campaignStart: null,
  lastDate: null,
  ads: [],
  leads: [],
  warnings: [],
};

interface Ctx {
  data: ApiData | undefined;
  error: FetchError | undefined;
  isLoading: boolean;
  isValidating: boolean;
  refresh: () => void;
  today: string;

  range: { from: string; to: string };
  prevRange: { from: string; to: string };
  rangeIsCustom: boolean;
  setRange: (from?: string | null, to?: string | null) => void;
  resetRange: () => void;

  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  clearFilters: () => void;
  /** "ads": campanhas da Meta · "leads": campanhas da aba Leads (Análise de Leads). */
  scope: Scope;
  options: {
    campaigns: string[];
    leadCampaigns: string[];
    /** Linhas da aba Leads por campanha (no período e filtro de leads novos). */
    leadCampaignCounts: Record<string, number>;
    adsets: string[];
    ads: string[];
  };

  slice: Slice;
  prevSlice: Slice;
  summary: Summary;
  prevSummary: Summary;
  daily: DailyPoint[];
}

const DashboardContext = React.createContext<Ctx | null>(null);

export function useDashboard(): Ctx {
  const ctx = React.useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard deve ser usado dentro de <DashboardProvider>");
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ApiData, FetchError>("/api/data", fetcher, {
    refreshInterval: REFRESH_MS,
    refreshWhenHidden: true, // continua atualizando com a aba em segundo plano
    revalidateOnFocus: true, // ao voltar para a aba, busca dados novos
    focusThrottleInterval: 60_000,
    revalidateOnReconnect: true,
    dedupingInterval: 15_000,
    keepPreviousData: true,
    shouldRetryOnError: true,
    errorRetryInterval: 30_000,
  });

  const pathname = usePathname();
  const scope: Scope = pathname?.startsWith("/leads") ? "leads" : "ads";

  // "Hoje" acompanha a virada do dia, mesmo com a aba aberta por dias.
  const [today, setToday] = React.useState(todayISO);
  React.useEffect(() => {
    const id = setInterval(() => setToday((t) => (todayISO() === t ? t : todayISO())), 60_000);
    return () => clearInterval(id);
  }, []);

  const [fromOverride, setFromOverride] = React.useState<string | null>(null);
  const [toOverride, setToOverride] = React.useState<string | null>(null);
  const [filters, setFiltersState] = React.useState<Filters>(EMPTY_FILTERS);

  const d = data ?? EMPTY_DATA;

  // Padrão: do início da captação até hoje.
  const range = React.useMemo(() => {
    const from = fromOverride ?? d.campaignStart ?? today;
    const to = toOverride ?? today;
    return from <= to ? { from, to } : { from: to, to: from };
  }, [fromOverride, toOverride, d.campaignStart, today]);

  const prevRange = React.useMemo(() => previousRange(range.from, range.to), [range]);

  const setRange = React.useCallback((from?: string | null, to?: string | null) => {
    if (from !== undefined) setFromOverride(from);
    if (to !== undefined) setToOverride(to);
  }, []);
  const resetRange = React.useCallback(() => {
    setFromOverride(null);
    setToOverride(null);
  }, []);

  const setFilters = React.useCallback((patch: Partial<Filters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...patch };
      // mudar campanha limpa seleções de público/criativo que deixaram de existir
      return next;
    });
  }, []);
  const clearFilters = React.useCallback(() => setFiltersState(EMPTY_FILTERS), []);

  const classify = React.useMemo(() => buildClassifier(d.ads), [d.ads]);

  const options = React.useMemo(() => {
    // Opções de público/criativo respeitam a campanha escolhida (quando há correspondência).
    let inCampaign = d.ads;
    if (scope === "ads" && filters.campaigns.length) {
      const set = new Set(filters.campaigns);
      inCampaign = d.ads.filter((r) => set.has(r.campaign));
    } else if (scope === "leads" && filters.leadCampaigns.length) {
      const matched = d.ads.filter((r) => adCampaignMatchesLead(r.campaign, filters.leadCampaigns));
      if (matched.length) inCampaign = matched;
    }

    // Campanhas da aba Leads: contagem de linhas da planilha por campanha.
    const counts: Record<string, number> = {};
    for (const l of d.leads) {
      if (l.date < range.from || l.date > range.to) continue;
      if (filters.onlyNewLeads && l.old) continue;
      counts[l.campaign] = (counts[l.campaign] ?? 0) + l.count;
    }
    const allLeadCampaigns = uniqueSorted(d.leads.map((l) => l.campaign));
    const leadCampaigns = allLeadCampaigns.sort(
      (a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b, "pt-BR")
    );

    return {
      campaigns: uniqueSorted(d.ads.map((r) => r.campaign)),
      leadCampaigns,
      leadCampaignCounts: counts,
      adsets: uniqueSorted(inCampaign.map((r) => r.adset)),
      ads: uniqueSorted(inCampaign.map((r) => r.ad)),
    };
  }, [d.ads, d.leads, scope, filters.campaigns, filters.leadCampaigns, filters.onlyNewLeads, range]);

  const slice = React.useMemo(() => sliceData(d, filters, range.from, range.to, scope), [d, filters, range, scope]);
  const prevSlice = React.useMemo(
    () => sliceData(d, filters, prevRange.from, prevRange.to, scope),
    [d, filters, prevRange, scope]
  );
  const summary = React.useMemo(() => summarize(slice, classify), [slice, classify]);
  const prevSummary = React.useMemo(() => summarize(prevSlice, classify), [prevSlice, classify]);
  const daily = React.useMemo(() => dailySeries(slice, range.from, range.to), [slice, range]);

  const value = React.useMemo<Ctx>(
    () => ({
      data,
      error,
      isLoading,
      isValidating,
      refresh: () => void mutate(),
      today,
      range,
      prevRange,
      rangeIsCustom: fromOverride !== null || toOverride !== null,
      setRange,
      resetRange,
      filters,
      setFilters,
      clearFilters,
      scope,
      options,
      slice,
      prevSlice,
      summary,
      prevSummary,
      daily,
    }),
    [
      data, error, isLoading, isValidating, mutate, today, range, prevRange, fromOverride, toOverride,
      setRange, resetRange, filters, setFilters, clearFilters, scope, options, slice, prevSlice, summary, prevSummary, daily,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
