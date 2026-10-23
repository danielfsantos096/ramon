"use client";

import * as React from "react";
import useSWR from "swr";
import { REFRESH_MS } from "@/lib/config";
import {
  EMPTY_FILTERS,
  dailySeries,
  previousRange,
  sliceData,
  summarize,
  todayISO,
  uniqueSorted,
  type DailyPoint,
  type Filters,
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
  const res = await fetch(url, { credentials: "same-origin" });
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
  options: { campaigns: string[]; adsets: string[]; ads: string[] };

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
    revalidateOnFocus: false,
    keepPreviousData: true,
    shouldRetryOnError: true,
    errorRetryInterval: 30_000,
  });

  const today = React.useMemo(() => todayISO(), []);

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

  const options = React.useMemo(() => {
    const campaignSet = new Set(filters.campaigns);
    const inCampaign = d.ads.filter((r) => campaignSet.size === 0 || campaignSet.has(r.campaign));
    return {
      campaigns: uniqueSorted(d.ads.map((r) => r.campaign)),
      adsets: uniqueSorted(inCampaign.map((r) => r.adset)),
      ads: uniqueSorted(inCampaign.map((r) => r.ad)),
    };
  }, [d.ads, filters.campaigns]);

  const slice = React.useMemo(() => sliceData(d, filters, range.from, range.to), [d, filters, range]);
  const prevSlice = React.useMemo(
    () => sliceData(d, filters, prevRange.from, prevRange.to),
    [d, filters, prevRange]
  );
  const summary = React.useMemo(() => summarize(slice), [slice]);
  const prevSummary = React.useMemo(() => summarize(prevSlice), [prevSlice]);
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
      options,
      slice,
      prevSlice,
      summary,
      prevSummary,
      daily,
    }),
    [
      data, error, isLoading, isValidating, mutate, today, range, prevRange, fromOverride, toOverride,
      setRange, resetRange, filters, setFilters, clearFilters, options, slice, prevSlice, summary, prevSummary, daily,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
