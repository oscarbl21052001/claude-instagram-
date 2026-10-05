import { useLayoutEffect, useRef } from "react";
import { random, useCurrentFrame } from "remotion";
import { HEIGHT, WIDTH } from "./config";
import { applyPixelReveal } from "./pixelReveal";

const CELL = 30; // tamaño de la rejilla de caracteres
const TAIL = 22;
const GLYPHS = "01234567890ABCDEFGHJKLMNPRSTUVXZ:.=*+-<>|/\\";

export const MatrixRain: React.FC<{ reveal: number; seed: string }> = ({
  reveal,
  seed,
}) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // fondo casi negro con un velo verde
    const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    g.addColorStop(0, "#00130a");
    g.addColorStop(1, "#000a05");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.font = `bold ${CELL - 4}px "DejaVu Sans Mono", Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const cols = Math.ceil(WIDTH / CELL);
    const rows = Math.ceil(HEIGHT / CELL);
    for (let col = 0; col < cols; col++) {
      const speed = 0.25 + random(`s${col}`) * 0.55; // celdas por fotograma
      const offset = random(`o${col}`) * (rows + TAIL);
      const head = ((frame * speed + offset) % (rows + TAIL)) - 2;
      for (let k = 0; k < TAIL; k++) {
        const row = Math.floor(head) - k;
        if (row < 0 || row >= rows) continue;
        const glyph =
          GLYPHS[
            Math.floor(
              random(`${col}-${row}-${Math.floor(frame / 3 + k)}`) * GLYPHS.length,
            )
          ];
        const a = 1 - k / TAIL;
        if (k === 0) ctx.fillStyle = "#e6fff0";
        else ctx.fillStyle = `rgba(0, ${Math.round(120 + 135 * a)}, ${Math.round(50 * a)}, ${a})`;
        ctx.shadowColor = "#00ff66";
        ctx.shadowBlur = k === 0 ? 14 : 0;
        ctx.fillText(glyph, col * CELL + CELL / 2, row * CELL + CELL / 2);
      }
    }
    ctx.shadowBlur = 0;

    // viñeta oscura
    const v = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 300, WIDTH / 2, HEIGHT / 2, 1250);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    applyPixelReveal(ctx, reveal, seed, "#39ff88");
  }, [frame, reveal, seed]);

  return (
    <canvas
      ref={ref}
      width={WIDTH}
      height={HEIGHT}
      style={{ position: "absolute", inset: 0, width: WIDTH, height: HEIGHT }}
    />
  );
};
