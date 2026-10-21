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
  pintura: { desde: 3, hasta: 22 },
  texto: { desde: 10, hasta: 38 },
  finEntra: { desde: 9999, hasta: 10000 },
  lineas: ["350 METROS", "DEL MAR"],
  fontSize: 400,
  sube: { desde: 58, hasta: 102, destino: { x: 65, y: 340, w: 950, h: 528 }, capas: 16, paso: [0.9, 1.8] },
  sombra: "0 0 6px rgba(70,45,0,0.95), 0 0 22px rgba(70,45,0,0.7)",
};
export const CalleRua: React.FC = () => <CalleEscena config={RUA_CONFIG} />;
