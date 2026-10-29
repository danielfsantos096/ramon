import { NO_UTM } from "./parse";
import { PAID_MEDIUM_HINTS, PAID_SOURCES, TIMEZONE, TRAFFIC_ONLY_BY_SOURCE_TERMS, TRAFFIC_SOURCE_TERMS } from "./config";
import type { AdRow, ApiData, LeadAgg } from "./types";

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */

/** Data de hoje (ISO) no fuso de São Paulo. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
}

const DAY = 86400000;

function toMs(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
function fromMs(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number) {
  return fromMs(toMs(iso) + n * DAY);
}
export function diffDays(a: string, b: string) {
  return Math.round((toMs(b) - toMs(a)) / DAY);
}
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  if (from > to) return out;
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Período imediatamente anterior, com a mesma duração. */
export function previousRange(from: string, to: string) {
  const len = diffDays(from, to) + 1;
  const prevTo = addDays(from, -1);
  return { from: addDays(prevTo, -(len - 1)), to: prevTo };
}

/* ------------------------------------------------------------------ */
/* Filtros                                                             */
/* ------------------------------------------------------------------ */

export interface Filters {
  /** Campanhas da Meta (aba "Meta Ads") — usadas na Visão geral e no Meta Ads. */
  campaigns: string[];
  /** Campanhas da aba "Leads" (coluna Campaign, valores exatos da planilha) — usadas na Análise de Leads. */
  leadCampaigns: string[];
  adsets: string[]; // público
  ads: string[]; // criativo
  onlyNewLeads: boolean;
}

export const EMPTY_FILTERS: Filters = { campaigns: [], leadCampaigns: [], adsets: [], ads: [], onlyNewLeads: false };

export function hasActiveFilters(f: Filters) {
  return f.campaigns.length > 0 || f.leadCampaigns.length > 0 || f.adsets.length > 0 || f.ads.length > 0 || f.onlyNewLeads;
}

/** Normaliza para comparação: decodifica URL ("+", %20), sem acento, minúsculo, espaços únicos. */
export function normKey(v: string): string {
  let s = String(v ?? "");
  try {
    s = decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    s = s.replace(/\+/g, " ");
  }
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Remove o ID que a Meta costuma acrescentar nas UTMs: "nome|1202345..." ou "nome - 1202345...". */
function stripId(v: string): string {
  return v.replace(/\s*[|_\-–:]\s*\d{6,}\s*$/, "").trim();
}

/** Chave de comparação entre nomes da Meta e valores de UTM. */
export function utmKey(v: string): string {
  return stripId(normKey(v));
}

/** UTM casa com o nome selecionado: igualdade normalizada (ignorando ID final) ou prefixo "nome|". */
export function utmMatches(value: string, selected: string[]) {
  const v = utmKey(value);
  const raw = normKey(value);
  return selected.some((s) => {
    const t = utmKey(s);
    return v === t || raw.startsWith(normKey(s) + "|");
  });
}

/** Campanha da Meta (nome) ↔ campanha da aba Leads (UTM): vale nos dois sentidos, ignorando ID final. */
export function adCampaignMatchesLead(adCampaign: string, leadCampaigns: string[]) {
  const a = normKey(adCampaign);
  const ak = utmKey(adCampaign);
  return leadCampaigns.some((l) => {
    const lr = normKey(l);
    return ak === utmKey(l) || lr.startsWith(a + "|") || a.startsWith(lr + "|");
  });
}

export type Scope = "ads" | "leads";

export interface Slice {
  ads: AdRow[];
  leads: LeadAgg[];
}

/**
 * scope "ads"  (Visão geral / Meta Ads): campanha = nome da campanha da Meta.
 * scope "leads" (Análise de Leads): campanha = valor exato da coluna Campaign da aba Leads;
 *   o investimento considera as campanhas da Meta com o mesmo nome (para o CPL).
 */
export function sliceData(data: ApiData, f: Filters, from: string, to: string, scope: Scope = "ads"): Slice {
  const campaignSet = new Set(f.campaigns);
  const adsetSet = new Set(f.adsets);
  const adSet = new Set(f.ads);
  const leadCampaignSet = new Set(f.leadCampaigns);

  const ads = data.ads.filter((r) => {
    if (r.date < from || r.date > to) return false;
    if (scope === "ads" && campaignSet.size && !campaignSet.has(r.campaign)) return false;
    if (scope === "leads" && f.leadCampaigns.length && !adCampaignMatchesLead(r.campaign, f.leadCampaigns)) return false;
    if (adsetSet.size && !adsetSet.has(r.adset)) return false;
    if (adSet.size && !adSet.has(r.ad)) return false;
    return true;
  });

  // Leads: Campaign↔campanha, Medium↔público (Ad Set), Content↔criativo (Ad Name)
  const leads = data.leads.filter((l) => {
    if (l.date < from || l.date > to) return false;
    if (f.onlyNewLeads && l.old) return false;
    if (scope === "leads") {
      if (leadCampaignSet.size && !leadCampaignSet.has(l.campaign)) return false;
    } else if (f.campaigns.length && !utmMatches(l.campaign, f.campaigns)) return false;
    if (f.adsets.length && !utmMatches(l.medium, f.adsets)) return false;
    if (f.ads.length && !utmMatches(l.content, f.ads)) return false;
    return true;
  });

  return { ads, leads };
}

/* ------------------------------------------------------------------ */
/* Agregações                                                          */
/* ------------------------------------------------------------------ */

export const safeDiv = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export type LeadClass = "traffic" | "organic" | "noutm";
export type LeadClassifier = (l: Pick<LeadAgg, "campaign" | "source" | "medium" | "content" | "term">) => LeadClass;

/**
 * Classificação dos leads da aba "Leads":
 *  - Sem UTMs : nenhuma UTM preenchida (campaign, source, medium, content e term vazios)
 *  - Tráfego  : a UTM aponta para a mídia paga — campanha, público (medium) ou criativo (content)
 *               existem na aba "Meta Ads" — ou o source é o código da Meta (fb, ig, an, msg)
 *               ou o medium indica mídia paga (cpc, paid…). "instagram"/"facebook" por extenso
 *               NÃO contam sozinhos (link da bio, post orgânico etc.)
 *  - Orgânico : tem alguma UTM, mas não veio do tráfego
 */
export function buildClassifier(ads: AdRow[]): LeadClassifier {
  const campaigns = new Set<string>();
  const adsets = new Set<string>();
  const adNames = new Set<string>();
  for (const r of ads) {
    campaigns.add(utmKey(r.campaign));
    adsets.add(utmKey(r.adset));
    adNames.add(utmKey(r.ad));
  }
  const known = (set: Set<string>, v: string) => v !== NO_UTM && set.has(utmKey(v));
  const sourceTerms = TRAFFIC_SOURCE_TERMS.map(normKey).filter(Boolean);
  const hasTerm = (source: string) => sourceTerms.some((t) => normKey(source).includes(t));

  return (l) => {
    if ([l.campaign, l.source, l.medium, l.content, l.term].every((v) => v === NO_UTM)) return "noutm";
    if (TRAFFIC_ONLY_BY_SOURCE_TERMS && sourceTerms.length) return hasTerm(l.source) ? "traffic" : "organic";
    if (hasTerm(l.source)) return "traffic";
    if (known(campaigns, l.campaign) || known(adsets, l.medium) || known(adNames, l.content)) return "traffic";
    const source = normKey(l.source);
    const medium = normKey(l.medium);
    if (PAID_SOURCES.includes(source)) return "traffic";
    if (PAID_MEDIUM_HINTS.some((h) => medium.includes(h))) return "traffic";
    return "organic";
  };
}

export interface AdTotals {
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  lpv: number;
  leads: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpl: number | null;
  loadRate: number | null; // LPV / cliques
  convRate: number | null; // leads / LPV
}

export function totalsOf(rows: AdRow[]): AdTotals {
  let spend = 0, reach = 0, impressions = 0, clicks = 0, lpv = 0, leads = 0;
  for (const r of rows) {
    spend += r.spend;
    reach += r.reach;
    impressions += r.impressions;
    clicks += r.clicks;
    lpv += r.lpv;
    leads += r.leads;
  }
  return {
    spend, reach, impressions, clicks, lpv, leads,
    ctr: safeDiv(clicks, impressions),
    cpc: safeDiv(spend, clicks),
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    cpl: safeDiv(spend, leads),
    loadRate: safeDiv(lpv, clicks),
    convRate: safeDiv(leads, lpv),
  };
}

export interface Summary {
  spend: number;
  leadsTraffic: number;
  leadsAC: number;
  leadsACWithUtm: number;
  leadsNoUtm: number;
  leadsPaid: number; // AC classificados como tráfego
  leadsOrganic: number;
  cplTraffic: number | null;
  cplAC: number | null;
  cplACUtm: number | null;
  meta: AdTotals;
}

export function summarize(slice: Slice, classify: LeadClassifier): Summary {
  const tm = totalsOf(slice.ads);

  let leadsAC = 0, withUtm = 0, noUtm = 0, paid = 0, organic = 0;
  for (const l of slice.leads) {
    leadsAC += l.count;
    const c = classify(l);
    if (c === "noutm") noUtm += l.count;
    else withUtm += l.count;
    if (c === "traffic") paid += l.count;
    if (c === "organic") organic += l.count;
  }

  const leadsTraffic = tm.leads;
  return {
    spend: tm.spend,
    leadsTraffic,
    leadsAC,
    leadsACWithUtm: withUtm,
    leadsNoUtm: noUtm,
    leadsPaid: paid,
    leadsOrganic: organic,
    // sem investimento no recorte não existe CPL (evita "R$ 0,00" enganoso)
    cplTraffic: tm.spend > 0 ? safeDiv(tm.spend, leadsTraffic) : null,
    cplAC: tm.spend > 0 ? safeDiv(tm.spend, leadsAC) : null,
    cplACUtm: tm.spend > 0 ? safeDiv(tm.spend, withUtm) : null,
    meta: tm,
  };
}

/** Variação relativa (cur vs prev). null quando não comparável. */
export function delta(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  return (cur - prev) / Math.abs(prev);
}

/* ------------------------------------------------------------------ */
/* Séries diárias                                                      */
/* ------------------------------------------------------------------ */

export interface DailyPoint {
  date: string;
  spend: number;
  leadsTraffic: number;
  leadsAC: number;
  cpl: number | null;
  impressions: number;
  clicks: number;
  lpv: number;
}

export function dailySeries(slice: Slice, from: string, to: string): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (const d of eachDay(from, to)) {
    map.set(d, {
      date: d, spend: 0, leadsTraffic: 0, leadsAC: 0, cpl: null, impressions: 0, clicks: 0, lpv: 0,
    });
  }
  for (const r of slice.ads) {
    const p = map.get(r.date);
    if (!p) continue;
    p.spend += r.spend;
    p.leadsTraffic += r.leads;
    p.impressions += r.impressions;
    p.clicks += r.clicks;
    p.lpv += r.lpv;
  }
  for (const l of slice.leads) {
    const p = map.get(l.date);
    if (p) p.leadsAC += l.count;
  }
  const out = [...map.values()];
  for (const p of out) p.cpl = safeDiv(p.spend, p.leadsTraffic);
  return out;
}

/* ------------------------------------------------------------------ */
/* Agrupamentos                                                        */
/* ------------------------------------------------------------------ */

export interface GroupRow extends AdTotals {
  key: string;
}

export function groupMeta(rows: AdRow[], by: "campaign" | "adset" | "ad"): GroupRow[] {
  const groups = new Map<string, AdRow[]>();
  for (const r of rows) {
    const k = r[by];
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [r]);
  }
  return [...groups.entries()]
    .map(([key, list]) => ({ key, ...totalsOf(list) }))
    .sort((a, b) => b.spend - a.spend);
}

export interface CountRow {
  name: string;
  value: number;
}

export function countLeadsBy(
  leads: LeadAgg[],
  by: "source" | "medium" | "content" | "term" | "campaign",
  top = 10
): CountRow[] {
  const map = new Map<string, number>();
  for (const l of leads) map.set(l[by], (map.get(l[by]) ?? 0) + l.count);
  const sorted = [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  if (sorted.length <= top) return sorted;
  const head = sorted.slice(0, top - 1);
  const rest = sorted.slice(top - 1).reduce((s, r) => s + r.value, 0);
  return [...head, { name: "Outros", value: rest }];
}

/** Melhor e pior criativo (por CPL). */
export function bestWorst(rows: GroupRow[]): { best: GroupRow | null; worst: GroupRow | null } {
  const withLeads = rows.filter((r) => r.leads > 0 && r.cpl !== null);
  const best = withLeads.length ? withLeads.reduce((a, b) => (b.cpl! < a.cpl! ? b : a)) : null;

  // pior: quem gastou sem gerar leads (maior gasto); se não houver, maior CPL
  const noLeads = rows.filter((r) => r.spend > 0 && r.leads === 0);
  let worst: GroupRow | null = null;
  if (noLeads.length) worst = noLeads.reduce((a, b) => (b.spend > a.spend ? b : a));
  else if (withLeads.length > 1) worst = withLeads.reduce((a, b) => (b.cpl! > a.cpl! ? b : a));
  if (worst && best && worst.key === best.key) worst = null;
  return { best, worst };
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
