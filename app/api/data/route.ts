import { NextResponse } from "next/server";
import { ConfigError, loadData } from "@/lib/sheets";
import type { ApiData, ApiError } from "@/lib/types";

/**
 * Sempre dinâmica: nada é "congelado" no build. O cache de 5 minutos é feito de dois jeitos:
 *  1) CDN (Vercel): `s-maxage=300` — a resposta é reaproveitada por 5 min e depois refeita
 *     de forma síncrona (sem servir dado velho).
 *  2) Memória da instância: a planilha é lida no máximo 1x a cada 5 min por instância, com
 *     leituras simultâneas compartilhadas. Se a leitura falhar, serve o último dado bom (até 30 min).
 * Erros nunca são cacheados.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TTL_MS = 5 * 60 * 1000;
const MAX_STALE_MS = 30 * 60 * 1000;

let cache: { at: number; data: ApiData } | null = null;
let inflight: Promise<ApiData> | null = null;

async function getData(): Promise<ApiData> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.data;
  if (inflight) return inflight;

  inflight = loadData()
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .catch((e: unknown) => {
      if (cache && Date.now() - cache.at < MAX_STALE_MS) {
        console.error("[/api/data] falha ao atualizar; servindo último dado válido:", e instanceof Error ? e.message : e);
        return cache.data;
      }
      throw e;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function GET() {
  try {
    const data = await getData();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=300" },
    });
  } catch (e) {
    const isConfig = e instanceof ConfigError;
    // Não vaza detalhes internos (chaves, IDs) para o navegador.
    console.error("[/api/data]", e instanceof Error ? e.message : e);
    const body: ApiError = {
      code: isConfig ? "CONFIG" : "SHEETS",
      error: isConfig
        ? "Credenciais do Google Sheets não configuradas no servidor."
        : "Não foi possível ler a planilha. Verifique SHEET_ID e se a planilha foi compartilhada com a Service Account.",
    };
    return NextResponse.json(body, {
      status: isConfig ? 503 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
