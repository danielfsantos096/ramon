import { SALES_PAID_STATUSES, SALES_REFUND_STATUSES } from "./config";
import { NO_UTM } from "./parse";
import { eachDay, safeDiv } from "./metrics";
import type { SaleAgg } from "./types";

const paid = new Set(SALES_PAID_STATUSES.map((s) => s.toUpperCase()));
const refund = new Set(SALES_REFUND_STATUSES.map((s) => s.toUpperCase()));

export const isPaid = (s: SaleAgg) => paid.has(s.status);
export const isRefund = (s: SaleAgg) => refund.has(s.status);

export function salesInRange(sales: SaleAgg[], from: string, to: string): SaleAgg[] {
  return sales.filter((s) => s.date >= from && s.date <= to);
}

export interface SalesSummary {
  orders: number; // vendas pagas
  gross: number; // faturamento bruto
  commission: number; // comissão (líquido do produtor)
  ticket: number | null;
  refunds: number; // devoluções (reembolso/chargeback/disputa)
  refundRate: number | null;
  other: number; // canceladas, expiradas etc.
  withUtm: number; // vendas pagas com alguma UTM
}

export function summarizeSales(rows: SaleAgg[]): SalesSummary {
  let orders = 0, gross = 0, commission = 0, refunds = 0, other = 0, withUtm = 0;
  for (const s of rows) {
    if (isPaid(s)) {
      orders += s.count;
      gross += s.gross;
      commission += s.commission;
      if ([s.source, s.medium, s.campaign, s.term, s.content].some((v) => v !== NO_UTM)) withUtm += s.count;
    } else if (isRefund(s)) refunds += s.count;
    else other += s.count;
  }
  return {
    orders, gross, commission, refunds, other, withUtm,
    ticket: safeDiv(gross, orders),
    refundRate: safeDiv(refunds, orders + refunds),
  };
}

export interface SalesDaily {
  date: string;
  orders: number;
  gross: number;
  spend: number;
}

export function salesDaily(rows: SaleAgg[], spendByDate: Map<string, number>, from: string, to: string): SalesDaily[] {
  const map = new Map<string, SalesDaily>();
  for (const d of eachDay(from, to)) map.set(d, { date: d, orders: 0, gross: 0, spend: spendByDate.get(d) ?? 0 });
  for (const s of rows) {
    if (!isPaid(s)) continue;
    const p = map.get(s.date);
    if (!p) continue;
    p.orders += s.count;
    p.gross += s.gross;
  }
  return [...map.values()];
}

export interface SalesGroup {
  key: string;
  orders: number;
  gross: number;
  share: number; // % das vendas pagas
}

export function groupSales(rows: SaleAgg[], by: (s: SaleAgg) => string): SalesGroup[] {
  const map = new Map<string, SalesGroup>();
  let total = 0;
  for (const s of rows) {
    if (!isPaid(s)) continue;
    total += s.count;
    const key = by(s);
    const cur = map.get(key) ?? { key, orders: 0, gross: 0, share: 0 };
    cur.orders += s.count;
    cur.gross += s.gross;
    map.set(key, cur);
  }
  const out = [...map.values()];
  for (const g of out) g.share = total > 0 ? g.orders / total : 0;
  return out.sort((a, b) => b.gross - a.gross || b.orders - a.orders);
}

const PAYMENT_LABEL: Record<string, string> = {
  CREDIT_CARD: "Cartão de crédito",
  PIX: "Pix",
  PIX_AUTOMATIC: "Pix automático",
  BILLET: "Boleto",
  WALLET: "Carteira digital",
  PAYPAL: "PayPal",
  GOOGLE_PAY: "Google Pay",
  HOTMART: "Saldo Hotmart",
};
export const paymentLabel = (v: string) => PAYMENT_LABEL[v] ?? v;

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completa",
  APPROVED: "Aprovada",
  CANCELED: "Cancelada",
  REFUNDED: "Reembolsada",
  CHARGEBACK: "Chargeback",
  DISPUTE: "Em disputa",
  EXPIRED: "Expirada",
  WAITING_PAYMENT: "Aguardando pagamento",
  BILLET_PRINTED: "Boleto emitido",
  DELAYED: "Atrasada",
};
export const statusLabel = (v: string) => STATUS_LABEL[v] ?? v;
