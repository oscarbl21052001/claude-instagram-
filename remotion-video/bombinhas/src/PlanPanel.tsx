import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CLIPS, VIDEO_START, theme } from "./theme";

export const PANEL_H = 640;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const GOLD = theme.colors.hero;

export const getStarts = (fps: number) => {
  const starts: number[] = []; let t = VIDEO_START;
  CLIPS.forEach(([, , dd]) => { starts.push(t); t += Math.round(dd * fps); });
  return starts;
};

// altura del panel del plano: entra tras el hook y se retira en el cierre
export const panelHeight = (frame: number, starts: number[]) => {
  const grow = interpolate(frame, [84, 108], [0, 1], { easing: theme.ease.inOut, ...clamp });
  const s8 = starts[8];
  const shrink = interpolate(frame, [s8, s8 + 14], [1, 0], { easing: theme.ease.inOut, ...clamp });
  return PANEL_H * Math.min(grow, shrink);
};

type R = { x: number; y: number; w: number; h: number };
// zonas iluminadas (coordenadas en píxeles de cada imagen)
const P1: Record<string, R> = {
  pool: { x: 600, y: 15, w: 355, h: 208 },
  jac: { x: 958, y: 135, w: 172, h: 92 },
  social: { x: 722, y: 392, w: 340, h: 262 },
  game: { x: 425, y: 448, w: 155, h: 280 },
};
const P2APT: R = { x: 10, y: 440, w: 365, h: 360 };
const P3: Record<string, R> = {
  kitchen: { x: 130, y: 50, w: 625, h: 85 },
  living: { x: 125, y: 345, w: 335, h: 215 },
  tv: { x: 125, y: 655, w: 375, h: 45 },
};
const SIZE = { p1: [1188, 804], p2: [1234, 854], p3: [1384, 754] } as const;
const IMG = { p1: "plans/plan1.png", p2: "plans/plan2.png", p3: "plans/plan3.png" } as const;
const KEY1 = ["jac", "social", "social", "game", "pool"];
const ctr = (r: R): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];

const Layer: React.FC<{ id: "p1" | "p2" | "p3"; cx: number; cy: number; z: number; opacity: number; rects: { r: R; o: number }[] }> = ({ id, cx, cy, z, opacity, rects }) => {
  const frame = useCurrentFrame();
  const [w, h] = SIZE[id];
  const base = Math.min(1080 / w, PANEL_H / h);
  const pulse = (Math.sin(frame / 7) + 1) / 2;
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: "absolute", left: 540, top: PANEL_H / 2, width: 0, height: 0,
        transform: `scale(${z * base}) translate(${-cx}px, ${-cy}px)` }}>
        <Img src={staticFile(IMG[id])} style={{ position: "absolute", left: 0, top: 0, width: w, height: h, maxWidth: "none", clipPath: "inset(18px 40px 22px 16px)" }} />
        <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {id === "p1" && ([[1030, 248, "01"], [832, 628, "02"], [476, 540, "03"], [838, 221, "04"]] as [number, number, string][]).map(([x, y, n]) => (
            <g key={n}>
              <circle cx={x} cy={y} r={19} fill={theme.colors.text} stroke={theme.colors.bg} strokeWidth={2} />
              <text x={x} y={y + 6.5} textAnchor="middle" fontSize={19} fontWeight={700} fontFamily={theme.fonts.display} fill={theme.colors.bg}>{n}</text>
            </g>
          ))}
          {rects.map(({ r, o }, i) => o > 0.01 && (
            <g key={i} opacity={o}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={6} fill={GOLD} fillOpacity={0.3 + pulse * 0.16} />
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={6} fill="none" stroke={GOLD} strokeWidth={4 / (z * base) * 1.6}
                style={{ filter: `drop-shadow(0 0 ${6 + pulse * 8}px ${GOLD})` }} />
            </g>
          ))}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

export const PlanPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const starts = getStarts(fps);
  const H = panelHeight(frame, starts);
  if (H < 2) return null;
  let idx = -1;
  for (let i = 0; i < starts.length; i++) if (frame >= starts[i]) idx = i;
  idx = Math.max(idx, 0);
  const lf = frame - starts[idx];
  const e = spring({ frame: lf, fps, config: { damping: 22, stiffness: 70 } });

  const bp = theme.blueprint;
  const g = 40;
  const layers: React.ReactNode[] = [];

  if (idx <= 4) {
    const target = (i: number) => { const [cx, cy] = ctr(P1[KEY1[i]]); return { cx, cy, z: 1.45 }; };
    const full = { cx: 594, cy: 402, z: 1 };
    const a = idx === 0 ? full : target(idx - 1), b = target(idx);
    const cx = a.cx + (b.cx - a.cx) * e, cy = a.cy + (b.cy - a.cy) * e, z = a.z + (b.z - a.z) * e;
    const cur = KEY1[idx], prev = idx === 0 ? "" : KEY1[idx - 1];
    const rects = (Object.keys(P1)).map((k) => ({ r: P1[k], o: k === cur ? (k === prev ? 1 : e) : k === prev ? 1 - e : 0 }));
    const appear = 1;
    layers.push(<Layer key="p1" id="p1" cx={cx} cy={cy} z={z} opacity={appear} rects={rects} />);
  } else {
    // idx 5: plano de pisos -> uno se amplía -> plano del piso piloto
    const l5 = idx === 5 ? lf : 999;
    const p1Out = idx === 5 ? interpolate(lf, [0, 10], [1, 0], clamp) : 0;
    if (p1Out > 0) layers.push(<Layer key="p1o" id="p1" cx={ctr(P1.pool)[0]} cy={ctr(P1.pool)[1]} z={1.45} opacity={p1Out} rects={[{ r: P1.pool, o: 1 }]} />);
    const [ax, ay] = ctr(P2APT);
    const zoom = interpolate(l5, [18, 48], [1, 2.3], { easing: theme.ease.inOut, ...clamp });
    const camx = 617 + (ax - 617) * Math.min(1, (zoom - 1) / 1.3), camy = 427 + (ay - 427) * Math.min(1, (zoom - 1) / 1.3);
    const p2o = idx === 5 ? interpolate(lf, [0, 10], [0, 1], clamp) * interpolate(lf, [38, 54], [1, 0], clamp) : 0;
    if (p2o > 0) layers.push(<Layer key="p2" id="p2" cx={camx} cy={camy} z={zoom} opacity={p2o} rects={[{ r: P2APT, o: interpolate(lf, [6, 20], [0, 1], clamp) }]} />);
    const p3o = idx === 5 ? interpolate(lf, [38, 54], [0, 1], clamp) : 1;
    const p3z = idx === 5 ? interpolate(lf, [38, 62], [0.82, 1], { easing: theme.ease.out, ...clamp }) : 1;
    const hk = idx === 5 ? "kitchen" : idx === 6 ? "living" : "tv";
    const ho = idx === 5 ? interpolate(lf, [54, 68], [0, 1], clamp) : e;
    const pk = idx === 6 ? "kitchen" : idx === 7 ? "living" : "";
    const rects = Object.keys(P3).map((k) => ({ r: P3[k], o: k === hk ? ho : k === pk ? 1 - e : 0 }));
    layers.push(<Layer key="p3" id="p3" cx={692} cy={377} z={p3z} opacity={p3o} rects={rects} />);
  }

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: H, overflow: "hidden", background: bp.bg,
      boxShadow: "0 18px 40px rgba(0,0,0,0.45)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: PANEL_H }}>
        <AbsoluteFill style={{ opacity: 0.35, backgroundImage: `linear-gradient(${bp.grid} 1px, transparent 1px), linear-gradient(90deg, ${bp.grid} 1px, transparent 1px)`, backgroundSize: `${g}px ${g}px` }} />
        {layers}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: GOLD, opacity: 0.9 }} />
    </div>
  );
};
