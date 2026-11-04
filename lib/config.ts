export const CAMPAIGN_TITLE = "Black Friday 2026 - Captação";
export const TIMEZONE = "America/Sao_Paulo";
export const REFRESH_MS = 5 * 60 * 1000;

/** Nomes das abas na planilha. */
export const SHEET_TABS = {
  meta: "Meta Ads",
  leads: "Leads",
  /** Aba de vendas da Hotmart na planilha "Ramon Souza - Vendas Gerais". */
  sales: "Hotmart",
} as const;

/**
 * Etapas das campanhas da aba "Meta Ads", identificadas pelo NOME DA CAMPANHA
 * (sem diferenciar maiúsculas/minúsculas nem acentos). O que não casar com nenhum termo é Captação.
 */
export const STAGE_TERMS = {
  avisos: ["avisos"],
  rmkt: ["rmkt"],
} as const;

/** Planilha de vendas "Ramon Souza - Vendas Gerais" (pode ser trocada pela variável SALES_SHEET_ID). */
export const SALES_SHEET_ID_DEFAULT = "1xALGG-tMubq932JcanQpzrcN9uX4Rtz8ufYlcxXUHV0";

/** Produto das vendas exibido na aba Hotmart (nome exato, sem diferenciar maiúsculas/acentos). */
export const SALES_PRODUCT = "TI TOTAL - Assinatura - Plataforma de Conteúdos";

/** Status da Hotmart que contam como venda. Reembolso, chargeback e cancelamento ficam de fora. */
export const SALES_PAID_STATUSES = ["COMPLETED", "APPROVED"];
/** Status exibidos como "devoluções" (reembolso/chargeback/disputa). */
export const SALES_REFUND_STATUSES = ["REFUNDED", "CHARGEBACK", "DISPUTE", "PARTIALLY_REFUNDED"];

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
 * Classificação dos leads da aba "Leads" (a lógica fica em lib/metrics.ts → buildClassifier):
 *  - Sem UTMs  → nenhuma UTM preenchida
 *  - Tráfego   → campanha, público (Medium) ou criativo (Content) existem na aba "Meta Ads",
 *                OU Source é um código da Meta (PAID_SOURCES), OU Medium indica mídia paga
 *  - Orgânico  → tem alguma UTM, mas não veio do tráfego
 * Ajuste as listas abaixo conforme o padrão de UTMs usado nas campanhas.
 */
export const PAID_SOURCES = ["fb", "ig", "an", "msg"]; // códigos de posicionamento da Meta (já normalizados)
export const PAID_MEDIUM_HINTS = ["cpc", "paid", "ppc", "cpm", "ads", "pago", "trafego", "tráfego"];

/**
 * Termos que, se aparecerem em QUALQUER parte do utm_source, classificam o lead como tráfego.
 * Sem diferenciar maiúsculas/minúsculas nem acentos. Ex.: "quente" casa "Público_Quente", "quente-ig"…
 */
export const TRAFFIC_SOURCE_TERMS = ["quente", "frio"];

/**
 * false (padrão): os termos acima SOMAM-SE às outras regras (campanha/público/criativo da Meta,
 *                 PAID_SOURCES, PAID_MEDIUM_HINTS).
 * true: tráfego = SOMENTE leads cujo utm_source contém um dos termos acima.
 */
export const TRAFFIC_ONLY_BY_SOURCE_TERMS = false;
