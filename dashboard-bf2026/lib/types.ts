/** Linha normalizada da aba "Meta Ads" (uma por dia/campanha/público/anúncio). */
export interface AdRow {
  date: string; // ISO yyyy-mm-dd
  campaign: string;
  adset: string;
  ad: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  lpv: number; // Landing Page Views
  leads: number; // Website Leads
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

export interface ApiData {
  generatedAt: string; // ISO datetime do servidor
  campaignStart: string | null; // menor data encontrada (ou CAMPAIGN_START)
  lastDate: string | null;
  ads: AdRow[];
  leads: LeadAgg[];
  warnings: string[];
  demo?: boolean;
}

export interface ApiError {
  error: string;
  code: "CONFIG" | "SHEETS" | "UNKNOWN";
}
