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

/**
 * Vendas: planilha separada ("Ramon Souza - Vendas Gerais", variável SALES_SHEET_ID), aba "Hotmart".
 * Lê só A:B e F:W — Nome, Email e Telefone (C:E) nunca saem da planilha.
 * Se falhar (sem permissão, ID ausente), o restante do dashboard continua funcionando.
 */
async function loadSales(warnings: string[]): Promise<{ sales: SaleAgg[]; salesError?: string }> {
  const salesId = process.env.SALES_SHEET_ID || SALES_SHEET_ID_DEFAULT;
  try {
    const { sheets } = getClient();
    const tab = SHEET_TABS.sales;
    const [left, right] = await Promise.all([
      readRange(sheets, salesId, `'${tab}'!A1:B`),
      readRange(sheets, salesId, `'${tab}'!F1:W`),
    ]);
    const n = Math.max(left.length, right.length);
    const merged: Row[] = [];
    for (let i = 0; i < n; i++) {
      const l = left[i] ?? [];
      merged.push([l[0] ?? "", l[1] ?? "", ...(right[i] ?? [])]);
    }
    return { sales: parseSales(merged, warnings) };
  } catch (e) {
    console.error("[sales]", e instanceof Error ? e.message : e);
    return {
      sales: [],
      salesError:
        "Não foi possível ler a aba Hotmart. Confira SALES_SHEET_ID e se a planilha de vendas foi compartilhada com a Service Account.",
    };
  }
}
