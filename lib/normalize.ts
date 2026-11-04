import {
  NO_UTM,
  cleanName,
  cleanText,
  cleanUtm,
  normHeader,
  parseBool,
  parseDateISO,
  parseNumberBR,
} from "./parse";
import { SALES_PRODUCT } from "./config";
import { stageOf } from "./stage";
import type { AdRow, LeadAgg, SaleAgg } from "./types";

export type Row = unknown[];

/* ------------------------------------------------------------------ */
/* Mapeamento de colunas por cabeçalho (com fallback posicional)       */
/* ------------------------------------------------------------------ */

type Aliases = Record<string, string[]>;

function buildIndex(
  header: Row,
  aliases: Aliases,
  fallback: Record<string, number>,
  blocked?: RegExp
): Record<string, number> {
  const normalized = header.map(normHeader);
  const idx: Record<string, number> = {};
  for (const [field, names] of Object.entries(aliases)) {
    const wanted = names.map(normHeader);
    let found = normalized.findIndex((h) => wanted.includes(h));
    if (found < 0 && fallback[field] !== undefined) {
      const pos = fallback[field];
      const h = normalized[pos] ?? "";
      if (!(blocked && blocked.test(h))) found = pos;
    }
    idx[field] = found;
  }
  return idx;
}

const get = (row: Row, i: number): unknown => (i >= 0 ? row[i] : undefined);

/* ------------------------------------------------------------------ */
/* Meta Ads (A:Q)                                                      */
/* ------------------------------------------------------------------ */

const META_ALIASES: Aliases = {
  day: ["Day", "Dia", "Date", "Data"],
  campaign: ["Campaign Name", "Nome da campanha", "Campanha"],
  adset: ["Ad Set Name", "Nome do conjunto de anúncios", "Conjunto de anúncios", "Público"],
  ad: ["Ad Name", "Nome do anúncio", "Anúncio", "Criativo"],
  spend: ["Amount Spent", "Amount Spent (BRL)", "Valor usado", "Valor gasto", "Valor investido", "Spend", "Cost"],
  reach: ["Reach", "Alcance"],
  impressions: ["Impressions", "Impressões"],
  clicks: ["Link Clicks", "Cliques no link", "Clicks", "Cliques"],
  lpv: ["Landing Page Views", "Visualizações da página de destino", "LPV", "Page Views", "PageViews"],
  leads: ["Website Leads", "Leads no site", "Leads"],
};
const META_FALLBACK = { day: 0, campaign: 1, adset: 2, ad: 3, spend: 4, reach: 5, impressions: 6, clicks: 7, lpv: 8, leads: 9 };

export function parseMeta(rows: Row[], warnings: string[]): AdRow[] {
  if (rows.length < 2) return [];
  const idx = buildIndex(rows[0], META_ALIASES, META_FALLBACK);
  const out = new Map<string, AdRow>();
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const date = parseDateISO(get(row, idx.day));
    const campaignRaw = cleanText(get(row, idx.campaign));
    // linhas vazias, de template ("Campaign Name") ou sem data válida
    if (!date || !campaignRaw || normHeader(campaignRaw) === "campaign name") {
      if (row.some((c) => cleanText(c))) skipped++;
      continue;
    }
    const r: AdRow = {
      date,
      stage: stageOf(campaignRaw),
      campaign: cleanName(campaignRaw),
      adset: cleanName(get(row, idx.adset)),
      ad: cleanName(get(row, idx.ad)),
      spend: parseNumberBR(get(row, idx.spend)),
      reach: parseNumberBR(get(row, idx.reach)),
      impressions: parseNumberBR(get(row, idx.impressions)),
      clicks: parseNumberBR(get(row, idx.clicks)),
      lpv: parseNumberBR(get(row, idx.lpv)),
      leads: parseNumberBR(get(row, idx.leads)),
    };
    accumulate(out, r);
  }
  if (skipped > 0) warnings.push(`Meta Ads: ${skipped} linha(s) ignorada(s) (sem data/campanha ou template).`);
  return [...out.values()];
}

function accumulate(map: Map<string, AdRow>, r: AdRow) {
  const key = [r.date, r.campaign, r.adset, r.ad].join("\u0001");
  const cur = map.get(key);
  if (!cur) {
    map.set(key, r);
    return;
  }
  cur.spend += r.spend;
  cur.reach += r.reach;
  cur.impressions += r.impressions;
  cur.clicks += r.clicks;
  cur.lpv += r.lpv;
  cur.leads += r.leads;
}

/* ------------------------------------------------------------------ */
/* Leads — lê SOMENTE D:L (nunca Nome/Email/Telefone nas colunas A:C)  */
/* ------------------------------------------------------------------ */

const LEADS_ALIASES: Aliases = {
  campaign: ["Campaign", "Campanha", "UTM Campaign"],
  source: ["Source", "Origem", "UTM Source"],
  medium: ["Medium", "Mídia", "Meio", "UTM Medium"],
  content: ["Content", "Conteúdo", "UTM Content"],
  term: ["Term", "Termo", "UTM Term"],
  date: ["Data da Inscricao", "Data da Inscrição", "Data de Inscrição", "Data Inscrição", "Inscrição"],
  week: ["Semana", "Week"],
  old: ["É lead antigo?", "Lead antigo", "E lead antigo"],
};
// posições dentro do range D:L
const LEADS_FALLBACK = { campaign: 0, source: 1, medium: 2, content: 3, term: 4, date: 5, week: 6, old: 7 };
// defesa extra: nunca mapear colunas que pareçam dado pessoal
const PII_HEADER = /(^| )(nome|name|e mail|email|telefone|phone|celular|whatsapp|cpf)( |$)/;

export function parseLeads(rows: Row[], warnings: string[]): LeadAgg[] {
  if (rows.length < 2) return [];
  const idx = buildIndex(rows[0], LEADS_ALIASES, LEADS_FALLBACK, PII_HEADER);
  const out = new Map<string, LeadAgg>();
  let noDate = 0;

  for (const row of rows.slice(1)) {
    const date = parseDateISO(get(row, idx.date));
    const fields = {
      campaign: cleanUtm(get(row, idx.campaign)),
      source: cleanUtm(get(row, idx.source)),
      medium: cleanUtm(get(row, idx.medium)),
      content: cleanUtm(get(row, idx.content)),
      term: cleanUtm(get(row, idx.term)),
    };
    const hasAny = !!date || Object.values(fields).some((v) => v !== NO_UTM);
    if (!hasAny) continue; // linha vazia
    if (!date) {
      noDate++;
      continue;
    }
    const lead: LeadAgg = {
      date,
      ...fields,
      week: cleanText(get(row, idx.week)),
      old: parseBool(get(row, idx.old)),
      count: 1,
    };
    const key = [lead.date, lead.campaign, lead.source, lead.medium, lead.content, lead.term, lead.week, lead.old].join("\u0001");
    const cur = out.get(key);
    if (cur) cur.count += 1;
    else out.set(key, lead);
  }
  if (noDate > 0) warnings.push(`Leads: ${noDate} lead(s) sem Data da Inscrição foram ignorados.`);
  return [...out.values()];
}


/* ------------------------------------------------------------------ */
/* Vendas (aba Hotmart) — NUNCA lê Nome, Email e Telefone (colunas C:E) */
/* ------------------------------------------------------------------ */

const SALES_ALIASES: Aliases = {
  date: ["Data", "Data da Compra"],
  tx: ["transação_prod", "Transação", "Transacao"],
  gross: ["Valor Bruto", "Valor Pago", "Valor Real da Oferta"],
  commission: ["Comissão", "Comissao"],
  status: ["Status", "Status da Transação"],
  payment: ["Método de pagamento", "Metodo de pagamento", "Tipo de Pagamento"],
  offer: ["Código da oferta", "Codigo da oferta"],
  installments: ["Parcelas"],
  product: ["Nome do produto", "Nome do Produto"],
  source: ["utm_source"],
  medium: ["utm_medium"],
  campaign: ["utm_campaign"],
  term: ["utm_term"],
  content: ["utm_content"],
};

const normProduct = (v: unknown) => normHeader(cleanText(v));

/**
 * `rows` = colunas A:B + F:W da aba (Nome/Email/Telefone ficam fora da leitura).
 * Só entram vendas do produto SALES_PRODUCT; transações repetidas contam uma vez (vale a última linha).
 */
export function parseSales(rows: Row[], warnings: string[]): SaleAgg[] {
  if (rows.length < 2) return [];
  const idx = buildIndex(rows[0], SALES_ALIASES, {}, PII_HEADER);
  if (idx.date < 0 || idx.status < 0 || idx.product < 0) {
    warnings.push("Hotmart: colunas Data/Status/Nome do produto não encontradas.");
    return [];
  }
  const wanted = normProduct(SALES_PRODUCT);
  const byTx = new Map<string, Row>();
  let n = 0;
  for (const row of rows.slice(1)) {
    const prod = normProduct(get(row, idx.product));
    if (!prod || prod !== wanted) continue;
    const tx = cleanText(get(row, idx.tx)) || `__${n++}`;
    byTx.set(tx, row);
  }

  const out = new Map<string, SaleAgg>();
  for (const row of byTx.values()) {
    const date = parseDateISO(get(row, idx.date));
    if (!date) continue;
    const sale: SaleAgg = {
      date,
      status: cleanText(get(row, idx.status)).toUpperCase() || "DESCONHECIDO",
      payment: cleanText(get(row, idx.payment)).toUpperCase() || "—",
      offer: cleanText(get(row, idx.offer)) || "—",
      installments: Math.round(parseNumberBR(get(row, idx.installments))),
      source: cleanUtm(get(row, idx.source)),
      medium: cleanUtm(get(row, idx.medium)),
      campaign: cleanUtm(get(row, idx.campaign)),
      term: cleanUtm(get(row, idx.term)),
      content: cleanUtm(get(row, idx.content)),
      count: 1,
      gross: parseNumberBR(get(row, idx.gross)),
      commission: parseNumberBR(get(row, idx.commission)),
    };
    const key = [sale.date, sale.status, sale.payment, sale.offer, sale.installments, sale.source, sale.medium, sale.campaign, sale.term, sale.content].join("\u0001");
    const cur = out.get(key);
    if (cur) {
      cur.count += 1;
      cur.gross += sale.gross;
      cur.commission += sale.commission;
    } else out.set(key, sale);
  }
  return [...out.values()];
}
