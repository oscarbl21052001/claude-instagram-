import { CalleConfig, CalleEscena, CALLE_TEXTO } from "./CalleDorada";
import { TEXTO_H, TEXTO_M, TEXTO_W } from "./datosRail";

// Clip RAIL (3,3 s, mismo plano que 1008 a otra velocidad). Calle pintada con bordes rectos (tools/calle/pintar_recta.py).
export const RAIL_FPS = 30;
export const RAIL_DURATION = 99;
export const RAIL_CONFIG: CalleConfig = {
  video: "entrada/rail_1080.mp4",
  capas: "calle_rail",
  matrices: TEXTO_M,
  texW: TEXTO_W,
  texH: TEXTO_H,
  frames: RAIL_DURATION,
  pintura: { desde: 2, hasta: 20 },
  texto: { desde: 12, hasta: 30 },
  finEntra: { desde: 87, hasta: 94 },
  lineas: CALLE_TEXTO,
};
export const CalleRail: React.FC = () => <CalleEscena config={RAIL_CONFIG} />;
