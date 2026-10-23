const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export const DASH = "—";

export function formatBRL(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? DASH : brl.format(n);
}

export function formatInt(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? DASH : int.format(n);
}

export function formatCompact(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? DASH : compact.format(n);
}

/** Recebe razão (0.0123) e devolve "1,23%". */
export function formatPct(ratio: number | null | undefined, digits = 2): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return DASH;
  return (
    (ratio * 100).toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + "%"
  );
}

/** "2026-10-23" → "23/10". */
export function formatDayShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** "2026-10-23" → "23/10/2026". */
export function formatDayFull(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function truncate(s: string, max = 22): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
