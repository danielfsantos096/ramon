import type { AdRow, ApiData, LeadAgg } from "./types";

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

    campaigns.forEach((campaign, ci) => {
      adsets.forEach((adset, si) => {
        ads.forEach((ad, ai) => {
          const quality = 0.6 + rand() * 0.9;
          const spend = (8 + rand() * 30) * ramp * (ci === 0 ? 1 : 0.5);
          const impressions = Math.round(spend * (90 + rand() * 60));
          const clicks = Math.round(impressions * (0.008 + rand() * 0.014) * quality);
          const lpv = Math.round(clicks * (0.72 + rand() * 0.18));
          const l = Math.round(lpv * (0.18 + rand() * 0.14) * quality);
          rows.push({
            date, campaign, adset, ad,
            spend: +spend.toFixed(2),
            reach: Math.round(impressions * 0.7),
            impressions, clicks, lpv, leads: l,
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
    warnings: [],
    demo: true,
  };
}
