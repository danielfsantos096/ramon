export const CAMPAIGN_TITLE = "Black Friday 2026 - Captação";
export const TIMEZONE = "America/Sao_Paulo";
export const REFRESH_MS = 5 * 60 * 1000;

/** Nomes das abas na planilha. */
export const SHEET_TABS = {
  meta: "Meta Ads",
  leads: "Leads",
} as const;

/** Cor da Meta (azul). */
export const META_COLOR = "#1877F2";

/** Cores de métricas. */
export const COLORS = {
  leadsTraffic: "#14b8a6",
  leadsAC: "#94a3b8",
  cpl: "#f59e0b",
  spend: "#ec4899",
  organic: "#a78bfa",
  noUtm: "#64748b",
  funnel: ["#6366f1", "#3b82f6", "#0ea5e9", "#14b8a6"],
  series: [
    "#6366f1",
    "#14b8a6",
    "#f59e0b",
    "#ec4899",
    "#3b82f6",
    "#a78bfa",
    "#84cc16",
    "#f97316",
  ],
} as const;

/**
 * Classificação dos leads da aba "Leads":
 *  - Sem UTMs  → Campaign vazia
 *  - Tráfego   → Campaign preenchida E (Source é uma plataforma paga OU Medium indica mídia paga)
 *  - Orgânico  → Campaign preenchida que não se encaixa em tráfego pago
 * Ajuste as listas abaixo conforme o padrão de UTMs usado nas campanhas.
 */
export const PAID_SOURCES = [
  "fb",
  "facebook",
  "ig",
  "instagram",
  "meta",
  "an",
  "tiktok",
];
export const PAID_MEDIUM_HINTS = ["cpc", "paid", "ppc", "cpm", "ads", "pago", "trafego", "tráfego"];
