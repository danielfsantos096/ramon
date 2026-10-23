import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { ConfigError, loadData } from "@/lib/sheets";
import type { ApiError } from "@/lib/types";

// Cache de 5 minutos: a planilha é lida no máximo 1x a cada 300s.
// `revalidate` cobre a rota estática (ISR); `unstable_cache` garante o mesmo TTL
// mesmo quando a rota é servida dinamicamente (ex.: build feito sem credenciais).
// Erros nunca entram no cache.
export const revalidate = 300;
export const runtime = "nodejs";

const getCachedData = unstable_cache(loadData, ["bf2026-sheet-data"], {
  revalidate: 300,
  tags: ["sheet-data"],
});

export async function GET() {
  try {
    const data = await getCachedData();
    return NextResponse.json(data);
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
