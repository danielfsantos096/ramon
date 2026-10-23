/** Rótulo para UTMs vazias. */
export const NO_UTM = "Sem UTM";

const EMPTY_TOKENS = new Set([
  "",
  "-",
  "—",
  "(not set)",
  "(none)",
  "not set",
  "null",
  "undefined",
  "n/a",
]);

const ERROR_CELL = /^#(N\/A|REF!|VALUE!|DIV\/0!|NAME\?|NUM!|NULL!|ERROR!|CALC!)/i;

export function isErrorCell(v: unknown): boolean {
  return typeof v === "string" && ERROR_CELL.test(v.trim());
}

/** Texto limpo: trim, sem erros de fórmula (#N/A etc.). */
export function cleanText(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  return isErrorCell(s) ? "" : s;
}

/** UTM: vazio/placeholder vira "Sem UTM". */
export function cleanUtm(v: unknown): string {
  const s = cleanText(v);
  return EMPTY_TOKENS.has(s.toLowerCase()) ? NO_UTM : s;
}

/** Nome genérico (campanha/público/anúncio de mídia paga). */
export function cleanName(v: unknown, fallback = "(sem nome)"): string {
  const s = cleanText(v);
  return EMPTY_TOKENS.has(s.toLowerCase()) ? fallback : s;
}

/**
 * Converte "R$ 1.234,56", "225,84", "1.234", "225.84" ou números em number.
 * Valores vazios, #N/A e lixo viram 0.
 */
export function parseNumberBR(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const raw = cleanText(v);
  if (!raw) return 0;

  let s = raw.replace(/R\$|%|\s| /g, "").replace(/[^\d.,\-]/g, "");
  if (!s || s === "-") return 0;

  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) {
      // pt-BR: 1.234,56
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // en-US: 1,234.56
      s = s.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    // 225,84 (ou 1,234,567 → improvável)
    s = s.replace(/,(?=.*,)/g, "").replace(",", ".");
  } else if (lastDot >= 0) {
    // "1.234" / "1.234.567" = milhar pt-BR; "225.84" = decimal
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** dd/mm/aaaa (com ou sem hora), aaaa-mm-dd ou serial do Sheets → ISO. */
export function parseDateISO(v: unknown): string | null {
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const ms = Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000;
    return new Date(ms).toISOString().slice(0, 10);
  }
  const s = cleanText(v);
  if (!s) return null;

  if (/^\d{5}$/.test(s)) return parseDateISO(Number(s));

  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return toISO(y, Number(m[2]), Number(m[1]));
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return toISO(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

export function parseBool(v: unknown): boolean {
  const s = cleanText(v)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return ["sim", "s", "true", "verdadeiro", "1", "yes", "y", "x", "antigo"].includes(s);
}

/** Normaliza cabeçalho: sem acento, minúsculo, só letras/números. */
export function normHeader(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
