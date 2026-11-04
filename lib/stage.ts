import { STAGE_TERMS } from "./config";
import type { Stage } from "./types";

function norm(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const AVISOS = STAGE_TERMS.avisos.map(norm);
const RMKT = STAGE_TERMS.rmkt.map(norm);

/** Etapa pelo nome da campanha: contém "RMKT" → RMKT · contém "Avisos" → Avisos · senão Captação. */
export function stageOf(campaign: string): Stage {
  const c = norm(campaign);
  if (RMKT.some((t) => c.includes(t))) return "rmkt";
  if (AVISOS.some((t) => c.includes(t))) return "avisos";
  return "capt";
}

export const STAGE_LABEL: Record<Stage, string> = {
  capt: "Captação",
  avisos: "Avisos",
  rmkt: "RMKT",
};
