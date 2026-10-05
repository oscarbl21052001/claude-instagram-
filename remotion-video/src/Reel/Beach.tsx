import { useLayoutEffect, useRef } from "react";
import { random, useCurrentFrame } from "remotion";
import { HEIGHT, WIDTH } from "./config";
import { applyPixelReveal } from "./pixelReveal";

const HORIZON = 0.46; // proporción de alto donde está el horizonte
const SHORE = 0.7; // donde empieza la arena

const cloud = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  [[0, 0, 70], [60, -20, 60], [120, 0, 75], [-55, 8, 50], [175, 12, 48]].forEach(
    ([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    },
  );
};

export const Beach: React.FC<{ reveal: number; seed: string }> = ({
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
    const hy = HEIGHT * HORIZON;
    const sy = HEIGHT * SHORE;

    // cielo
    let g = ctx.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, "#1e90ff");
    g.addColorStop(0.65, "#6ec6ff");
    g.addColorStop(1, "#d9f2ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, hy + 2);

    // sol con halo
    const sx = WIDTH * 0.76;
    const sunY = HEIGHT * 0.15;
    g = ctx.createRadialGradient(sx, sunY, 20, sx, sunY, 520);
    g.addColorStop(0, "rgba(255,248,200,0.95)");
    g.addColorStop(0.25, "rgba(255,236,150,0.45)");
    g.addColorStop(1, "rgba(255,236,150,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, hy);
    ctx.fillStyle = "#fffbe0";
    ctx.beginPath();
    ctx.arc(sx, sunY, 85, 0, Math.PI * 2);
    ctx.fill();

    // nubes a la deriva
    cloud(ctx, ((frame * 0.7 + 150) % (WIDTH + 500)) - 250, HEIGHT * 0.1, 1.1);
    cloud(ctx, ((frame * 0.45 + 700) % (WIDTH + 500)) - 250, HEIGHT * 0.25, 0.8);
    cloud(ctx, ((frame * 0.3 + 420) % (WIDTH + 500)) - 250, HEIGHT * 0.36, 0.6);

    // mar
    g = ctx.createLinearGradient(0, hy, 0, sy);
    g.addColorStop(0, "#0b6fb8");
    g.addColorStop(0.5, "#17a9d6");
    g.addColorStop(1, "#58dccb");
    ctx.fillStyle = g;
    ctx.fillRect(0, hy, WIDTH, sy - hy + 2);

    // brillos del sol sobre el agua
    for (let i = 0; i < 70; i++) {
      const y = hy + 10 + random(`sp-y${i}`) * (sy - hy - 30);
      const spread = 40 + ((y - hy) / (sy - hy)) * 260;
      const x = sx + (random(`sp-x${i}`) - 0.5) * spread * 2;
      const tw = 0.5 + 0.5 * Math.sin(frame * 0.35 + i * 1.7);
      ctx.fillStyle = `rgba(255,255,230,${0.15 + 0.6 * tw})`;
      ctx.fillRect(x, y, 14 + random(`sp-w${i}`) * 34, 4);
    }

    // olas: líneas de espuma que avanzan hacia la orilla
    for (let i = 0; i < 7; i++) {
      const ph = ((frame * 0.012 + i / 7) % 1);
      const y = hy + (sy - hy) * (ph * ph * 0.95 + 0.02);
      ctx.strokeStyle = `rgba(255,255,255,${0.15 + 0.55 * ph})`;
      ctx.lineWidth = 3 + ph * 10;
      ctx.beginPath();
      for (let x = 0; x <= WIDTH; x += 20) {
        const yy = y + Math.sin(x * 0.012 + frame * 0.1 + i) * (3 + ph * 10);
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    // arena mojada y seca
    g = ctx.createLinearGradient(0, sy - 30, 0, HEIGHT);
    g.addColorStop(0, "#c9a572");
    g.addColorStop(0.15, "#f0d9a0");
    g.addColorStop(1, "#f7e6b8");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    for (let x = 0; x <= WIDTH; x += 20) {
      ctx.lineTo(x, sy + Math.sin(x * 0.01 + frame * 0.05) * 12);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();
    ctx.fill();
    // espuma en la orilla
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 9;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 20) {
      const yy = sy + Math.sin(x * 0.01 + frame * 0.05) * 12;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    // granitos de arena
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(150,110,60,${0.12 + random(`g-a${i}`) * 0.2})`;
      ctx.fillRect(random(`g-x${i}`) * WIDTH, sy + 40 + random(`g-y${i}`) * (HEIGHT - sy - 40), 4, 4);
    }

    // palmera a la izquierda
    const px = 150;
    const sway = Math.sin(frame * 0.05) * 10;
    ctx.strokeStyle = "#6b4a2b";
    ctx.lineWidth = 34;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px, sy + 90);
    ctx.quadraticCurveTo(px + 40, sy - 260, px + 110 + sway, sy - 640);
    ctx.stroke();
    const topX = px + 110 + sway;
    const topY = sy - 640;
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI * (0.05 + (i / 6) * 0.9) + Math.sin(frame * 0.07 + i) * 0.04;
      const len = 260 + (i % 2) * 40;
      const ex = topX + Math.cos(ang) * len;
      const ey = topY + Math.sin(ang) * len * 0.6 + 90;
      ctx.fillStyle = i % 2 ? "#2f8f3a" : "#3aa84a";
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo((topX + ex) / 2, Math.min(topY, ey) - 90, ex, ey);
      ctx.quadraticCurveTo((topX + ex) / 2, Math.min(topY, ey) - 20, topX, topY + 14);
      ctx.fill();
    }

    // grading cálido
    ctx.fillStyle = "rgba(255,200,90,0.07)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    applyPixelReveal(ctx, reveal, seed, "#ffffff");
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
