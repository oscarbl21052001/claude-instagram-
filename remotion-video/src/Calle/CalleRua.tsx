import { CalleConfig, CalleEscena } from "./CalleDorada";
import { TEXTO_H, TEXTO_M, TEXTO_W } from "./datosRua";

// Clip "RUA SPOT 335" (8,4 s, dron que avanza por la calle hacia el mar, 720x1280 escalado a 1080x1920).
// Calle pintada con bordes rectos (tools/calle/pintar_recta.py + config/rua.json) y texto tumbado en la misma franja.
export const RUA_FPS = 30;
export const RUA_DURATION = 252;
export const RUA_CONFIG: CalleConfig = {
  video: "entrada/rua_1080.mp4",
  capas: "calle_rua",
  matrices: TEXTO_M,
  texW: TEXTO_W,
  texH: TEXTO_H,
  frames: RUA_DURATION,
  pintura: { desde: 8, hasta: 44 },
  texto: { desde: 34, hasta: 80 },
  finEntra: { desde: 9999, hasta: 10000 },
  lineas: ["A TAN SOLO", "350 METROS", "DEL MAR"],
  fontSize: 330,
};
export const CalleRua: React.FC = () => <CalleEscena config={RUA_CONFIG} />;
