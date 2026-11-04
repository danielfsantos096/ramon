import { stageOf } from "./stage";
import type { AdRow, ApiData, LeadAgg, SaleAgg } from "./types";

/** Dados fictícios determinísticos — ative com DEMO_MODE=true para pré-visualizar sem credenciais. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function demoData(): ApiData {
  const rand = rng(2026);
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);

  const campaigns = ["BF2026 | Captação | Frio", "BF2026 | Captação | Remarketing"];
  const adsets = ["Lookalike 1%", "Interesses - Marketing", "Aberto", "Engajados 30d"];
  const ads = ["Criativo 01 - Vídeo", "Criativo 02 - Carrossel", "Criativo 03 - Estático", "Criativo 04 - UGC"];
  const placements = ["Feed", "Stories", "Reels", "Explorar"];

  const rows: AdRow[] = [];
  const leads: LeadAgg[] = [];

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = iso(d);
    const ramp = 0.6 + (d.getTime() - start.getTime()) / (end.getTime() - start.getTime());

    const inCapt = d.getTime() <= end.getTime() - 8 * 86400000;
    (inCapt ? campaigns : []).forEach((campaign, ci) => {
      adsets.forEach((adset, si) => {
        ads.forEach((ad, ai) => {
          const quality = 0.6 + rand() * 0.9;
          const spend = (8 + rand() * 30) * ramp * (ci === 0 ? 1 : 0.5);
          const impressions = Math.round(spend * (90 + rand() * 60));
          const clicks = Math.round(impressions * (0.008 + rand() * 0.014) * quality);
          const lpv = Math.round(clicks * (0.72 + rand() * 0.18));
          const l = Math.round(lpv * (0.18 + rand() * 0.14) * quality);
          rows.push({
            date, stage: stageOf(campaign), campaign, adset, ad,
            spend: +spend.toFixed(2),
            reach: Math.round(impressions * 0.7),
            impressions, clicks, lpv, leads: l,
            checkouts: 0, purchases: 0, purchaseValue: 0,
          });
          // leads do AC (com UTM) a partir dos leads Meta
          for (let k = 0; k < l; k++) {
            leads.push({
              date,
              campaign: campaign + "|" + (1000 + ci),
              source: rand() > 0.15 ? "fb" : "ig",
              medium: adset,
              content: ad,
              term: placements[Math.floor(rand() * placements.length)],
              week: "S" + (Math.floor((d.getTime() - start.getTime()) / 604800000) + 1),
              old: rand() > 0.9,
              count: 1,
            });
          }
          void si; void ai;
        });
      });
    });

    // orgânico e sem UTM
    const organic = Math.round(3 + rand() * 8);
    for (let k = 0; k < organic; k++) {
      leads.push({
        date, campaign: "BF2026 | Bio", source: rand() > 0.5 ? "instagram" : "email",
        medium: rand() > 0.5 ? "organico" : "bio", content: "Sem UTM", term: "Sem UTM",
        week: "", old: false, count: 1,
      });
    }
    const none = Math.round(rand() * 6);
    for (let k = 0; k < none; k++) {
      leads.push({
        date, campaign: "Sem UTM", source: "Sem UTM", medium: "Sem UTM", content: "Sem UTM", term: "Sem UTM",
        week: "", old: rand() > 0.8, count: 1,
      });
    }
  }

  // Avisos (últimos 7 dias, terminam há 2 dias) e RMKT (últimos 5 dias, em andamento)
  const extra: [string, number, number][] = [["BF2026 | Avisos | Lista", 7, 2], ["BF2026 | RMKT | Vendas", 5, 0]];
  for (const [campaign, from, to] of extra) {
    for (let k = from; k >= to; k--) {
      const dt = new Date(end);
      dt.setUTCDate(dt.getUTCDate() - k);
      for (const adset of ["Leads quentes", "Visitantes LP 14d"]) {
        for (const ad of ["Aviso 01 - Vídeo", "Aviso 02 - Estático", "Aviso 03 - Depoimento"]) {
          const spend = 20 + rand() * 40;
          const impressions = Math.round(spend * (80 + rand() * 50));
          const clicks = Math.round(impressions * (0.01 + rand() * 0.02));
          rows.push({
            date: iso(dt), stage: stageOf(campaign), campaign, adset, ad,
            spend: +spend.toFixed(2), reach: Math.round(impressions * 0.6), impressions, clicks,
            lpv: Math.round(clicks * (0.7 + rand() * 0.2)), leads: 0,
            ...(stageOf(campaign) === "rmkt"
              ? (() => {
                  const co = Math.round(clicks * (0.08 + rand() * 0.08));
                  const pu = Math.round(co * (0.15 + rand() * 0.25));
                  return { checkouts: co, purchases: pu, purchaseValue: pu * 497 };
                })()
              : { checkouts: 0, purchases: 0, purchaseValue: 0 }),
          });
        }
      }
    }
  }

  // Vendas (Hotmart) a partir do fim da captação
  const sales: SaleAgg[] = [];
  const payments = ["CREDIT_CARD", "CREDIT_CARD", "PIX", "PIX", "WALLET", "BILLET"];
  const utms: [string, string, string, string][] = [
    ["quente", "Leads quentes", "RMKT | Vendas", "Aviso 01 - Vídeo"],
    ["quente", "Visitantes LP 14d", "RMKT | Vendas", "Aviso 02 - Estático"],
    ["frio", "Lookalike 1%", "BF2026 | Captação | Frio", "Criativo 01 - Vídeo"],
    ["Sem UTM", "Sem UTM", "Sem UTM", "Sem UTM"],
  ];
  for (let k = 10; k >= 0; k--) {
    const dt = new Date(end);
    dt.setUTCDate(dt.getUTCDate() - k);
    const n = Math.round(1 + rand() * 7);
    for (let i = 0; i < n; i++) {
      const u = utms[Math.floor(rand() * utms.length)];
      const r = rand();
      const gross = r > 0.7 ? 747 : 497;
      sales.push({
        date: iso(dt),
        status: r > 0.93 ? "REFUNDED" : r > 0.88 ? "CANCELED" : r > 0.6 ? "APPROVED" : "COMPLETED",
        payment: payments[Math.floor(rand() * payments.length)],
        offer: "ieg0jgxq", installments: 1 + Math.floor(rand() * 12),
        source: u[0], medium: u[1], campaign: u[2], term: "Instagram_Stories", content: u[3],
        count: 1, gross, commission: +(gross * 0.87).toFixed(2),
      });
    }
  }

  // agrega leads idênticos
  const agg = new Map<string, LeadAgg>();
  for (const l of leads) {
    const key = [l.date, l.campaign, l.source, l.medium, l.content, l.term, l.week, l.old].join("|");
    const cur = agg.get(key);
    if (cur) cur.count += l.count;
    else agg.set(key, { ...l });
  }

  return {
    generatedAt: new Date().toISOString(),
    campaignStart: iso(start),
    lastDate: iso(end),
    ads: rows,
    leads: [...agg.values()],
    sales,
    warnings: [],
    demo: true,
  };
}
