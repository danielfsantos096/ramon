import "server-only";
import { google } from "googleapis";
import { SALES_SHEET_ID_DEFAULT, SHEET_TABS } from "./config";
import { parseLeads, parseMeta, parseSales, type Row } from "./normalize";
import type { ApiData, SaleAgg } from "./types";
import { demoData } from "./demo";

export class ConfigError extends Error {}

/* ------------------------------------------------------------------ */
/* Cliente Google Sheets (somente servidor, somente leitura)           */
/* ------------------------------------------------------------------ */

function getClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.SHEET_ID;
  if (!email || !rawKey || !sheetId) {
    throw new ConfigError(
      "Variáveis SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY precisam estar configuradas."
    );
  }
  const key = rawKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

async function readRange(
  sheets: ReturnType<typeof google.sheets>,
  sheetId: string,
  range: string
): Promise<Row[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  return (res.data.values as Row[] | undefined) ?? [];
}

/* ------------------------------------------------------------------ */
/* Orquestração                                                        */
/* ------------------------------------------------------------------ */

export async function loadData(): Promise<ApiData> {
  if (process.env.DEMO_MODE === "true") return demoData();

  const { sheets, sheetId } = getClient();
  const warnings: string[] = [];

  const [metaRows, leadRows] = await Promise.all([
    // Aba "Meta Ads": A:Q (colunas auxiliares à direita de Q ficam fora)
    readRange(sheets, sheetId, `'${SHEET_TABS.meta}'!A1:Q`),
    // Aba "Leads": SOMENTE D:L (UTMs e data). Nome, Email e Telefone ficam fora do range.
    readRange(sheets, sheetId, `'${SHEET_TABS.leads}'!D1:L`),
  ]);

  const ads = parseMeta(metaRows, warnings);
  const leads = parseLeads(leadRows, warnings);
  const { sales, salesError } = await loadSales(warnings);

  const dates = [...ads.map((a) => a.date), ...leads.map((l) => l.date)].sort();
  // Início da captação = primeiro dia com investimento nas campanhas de captação
  const captDates = ads.filter((a) => a.stage === "capt" && a.spend > 0).map((a) => a.date).sort();
  const override = process.env.CAMPAIGN_START && /^\d{4}-\d{2}-\d{2}$/.test(process.env.CAMPAIGN_START)
    ? process.env.CAMPAIGN_START
    : null;

  return {
    generatedAt: new Date().toISOString(),
    campaignStart: override ?? captDates[0] ?? dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
    ads,
    leads,
    sales,
    salesError,
    warnings,
  };
}

/** Traduz o erro da API do Google em uma mensagem que diz o que corrigir (sem vazar IDs ou chaves). */
function describeSheetsError(e: unknown): string {
  const err = e as { code?: number | string; status?: number; message?: string };
  const code = Number(err?.code ?? err?.status);
  const msg = String(err?.message ?? "");
  if (code === 403 || /permission|PERMISSION_DENIED/i.test(msg)) {
    return "Sem permissão (403): a planilha de vendas ainda não foi compartilhada com a Service Account (e-mail em GOOGLE_SERVICE_ACCOUNT_EMAIL) como Leitor. Quem é dono da planilha precisa compartilhar.";
  }
  if (code === 404 || /not found/i.test(msg)) {
    return "Planilha de vendas não encontrada (404): confira SALES_SHEET_ID.";
  }
  if (code === 400 || /unable to parse range/i.test(msg)) {
    return `Aba "${SHEET_TABS.sales}" não encontrada na planilha de vendas (400): confira o nome da aba.`;
  }
  if (code === 429) return "Limite de leituras do Google atingido (429): tente de novo em alguns minutos.";
  if (code === 401 || /invalid_grant|unauthorized/i.test(msg)) {
    return "Credenciais do Google inválidas (401): confira GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY.";
  }
  return `Falha ao ler a aba Hotmart${Number.isFinite(code) ? ` (código ${code})` : ""}.`;
}

async function readSalesTab(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string, warnings: string[]) {
  const tab = SHEET_TABS.sales;
  // Só A:B e F:W — Nome, Email e Telefone (C:E) nunca saem da planilha.
  const [left, right] = await Promise.all([
    readRange(sheets, spreadsheetId, `'${tab}'!A1:B`),
    readRange(sheets, spreadsheetId, `'${tab}'!F1:W`),
  ]);
  const n = Math.max(left.length, right.length);
  const merged: Row[] = [];
  for (let i = 0; i < n; i++) {
    const l = left[i] ?? [];
    merged.push([l[0] ?? "", l[1] ?? "", ...(right[i] ?? [])]);
  }
  return parseSales(merged, warnings);
}

/**
 * Vendas, aba "Hotmart". Ordem de tentativa:
 *  1) planilha "Ramon Souza - Vendas Gerais" (SALES_SHEET_ID ou padrão);
 *  2) aba "Hotmart" da própria planilha da campanha (SHEET_ID) — plano B, por exemplo uma aba
 *     alimentada com IMPORTRANGE da planilha de vendas.
 * Se nenhuma funcionar, só a aba Hotmart mostra o motivo; o restante do dashboard segue normal.
 */
async function loadSales(warnings: string[]): Promise<{ sales: SaleAgg[]; salesError?: string }> {
  const { sheets, sheetId } = getClient();
  const primary = process.env.SALES_SHEET_ID || SALES_SHEET_ID_DEFAULT;
  const ids = primary === sheetId ? [primary] : [primary, sheetId];

  let firstError: unknown = null;
  for (const id of ids) {
    try {
      return { sales: await readSalesTab(sheets, id, warnings) };
    } catch (e) {
      console.error("[sales]", id === primary ? "planilha de vendas" : "planilha da campanha", e instanceof Error ? e.message : e);
      if (firstError === null) firstError = e;
    }
  }
  return { sales: [], salesError: describeSheetsError(firstError) };
}
