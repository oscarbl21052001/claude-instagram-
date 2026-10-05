import { random } from "remotion";
import { HEIGHT, WIDTH } from "./config";

const CELL = 60;

// Borra las celdas que aún no se han "revelado" (disolución por píxeles) y
// pinta un destello en las que acaban de aparecer. progress: 0 → 1.
export const applyPixelReveal = (
  ctx: CanvasRenderingContext2D,
  progress: number,
  seed: string,
  flash: string,
) => {
  if (progress >= 1) return;
  const cols = Math.ceil(WIDTH / CELL);
  const rows = Math.ceil(HEIGHT / CELL);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // umbral: mezcla de azar y barrido de arriba hacia abajo
      const t = 0.55 * random(`${seed}-${r}-${c}`) + 0.4 * (r / rows);
      const p = progress * 1.0;
      if (p < t) {
        ctx.clearRect(c * CELL, r * CELL, CELL, CELL);
      } else if (p - t < 0.07) {
        ctx.fillStyle = flash;
        ctx.globalAlpha = 1 - (p - t) / 0.07;
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        ctx.globalAlpha = 1;
      }
    }
  }
};
