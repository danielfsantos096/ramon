/** Etapa da campanha: Captação, Avisos ou RMKT (definida pelo nome da campanha, ver STAGE_TERMS). */
export type Stage = "capt" | "avisos" | "rmkt";

/** Linha normalizada da aba "Meta Ads" (uma por dia/campanha/público/anúncio). */
export interface AdRow {
  date: string; // ISO yyyy-mm-dd
  stage: Stage;
  campaign: string;
  adset: string;
  ad: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  lpv: number; // Landing Page Views
  leads: number; // Website Leads
  checkouts: number; // Checkouts Initiated
  purchases: number; // Website Purchases
  purchaseValue: number; // Website Purchases Conversion Value
}

/**
 * Leads da aba "Leads" já AGREGADOS (contagem por combinação de UTMs/dia).
 * Nome, e-mail e telefone nunca são lidos — nada pessoal chega ao navegador.
 */
export interface LeadAgg {
  date: string; // ISO yyyy-mm-dd (Data da Inscrição)
  campaign: string; // "Sem UTM" quando vazio
  source: string;
  medium: string;
  content: string;
  term: string;
  week: string;
  old: boolean; // "É lead antigo?"
  count: number;
}

/**
 * Vendas da Hotmart já AGREGADAS (contagem/valores por dia + status + pagamento + oferta + UTMs).
 * Nome, e-mail e telefone do comprador nunca são lidos.
 */
export interface SaleAgg {
  date: string; // ISO yyyy-mm-dd
  product: string; // Nome do produto
  status: string; // COMPLETED, APPROVED, REFUNDED…
  payment: string; // CREDIT_CARD, PIX…
  offer: string; // Código da oferta
  installments: number;
  source: string; // utm_source ("Sem UTM" quando vazio)
  medium: string;
  campaign: string;
  term: string;
  content: string;
  count: number;
  gross: number; // soma de Valor Bruto
  commission: number; // soma de Comissão
}

export interface ApiData {
  generatedAt: string; // ISO datetime do servidor
  campaignStart: string | null; // menor data encontrada (ou CAMPAIGN_START)
  lastDate: string | null;
  ads: AdRow[];
  leads: LeadAgg[];
  /** Vendas dos produtos que contêm SALES_PRODUCT_TERM no nome (aba Hotmart). */
  sales: SaleAgg[];
  /** Preenchido quando a aba de vendas não pôde ser lida (o resto do dashboard segue funcionando). */
  salesError?: string;
  warnings: string[];
  demo?: boolean;
}

export interface ApiError {
  error: string;
  code: "CONFIG" | "SHEETS" | "UNKNOWN";
}
