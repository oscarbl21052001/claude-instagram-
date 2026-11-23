import React from "react";
import {
  AbsoluteFill, continueRender, delayRender, OffthreadVideo, Sequence, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import { PlanPanel, panelHeight, getStarts } from "./PlanPanel";
import { CLIPS, HOOK_FRAMES, VIDEO_START, theme } from "./theme";

// Fuentes locales (public/fonts): Cinzel + Josefin Sans, del par "Real Estate Luxury" de ui-ux-pro-max
const FONT_FILES: [string, string, string][] = [
  ["Cinzel", "600", "Cinzel-600-latin.woff2"], ["Cinzel", "700", "Cinzel-700-latin.woff2"],
  ["Josefin Sans", "400", "JosefinSans-400-latin.woff2"], ["Josefin Sans", "600", "JosefinSans-600-latin.woff2"],
  ["Josefin Sans", "700", "JosefinSans-700-latin.woff2"],
];
const fontsReady = (() => {
  const handle = delayRender("fonts");
  return Promise.all(FONT_FILES.map(async ([fam, w, file]) => {
    const ff = new FontFace(fam, `url(${staticFile("fonts/" + file)})`, { weight: w });
    await ff.load();
    document.fonts.add(ff);
  })).then(() => continueRender(handle), () => continueRender(handle));
})();
void fontsReady;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const F = theme.fonts.display;
const SERIF = theme.fonts.serif;
const C = theme.colors;

// ---------- Capa de vídeo: escala fija (sin zoom variable) ----------
const Shot: React.FC<{ file: string; from: number; top: number }> = ({ file, from, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flash = interpolate(frame, [0, 5], [0.28, 0], clamp);
  return (
    <AbsoluteFill style={{ top, height: 1920 - top, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: "scale(1.06)" }}>
        <OffthreadVideo src={staticFile(file)} startFrom={Math.round(from * fps)} muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: C.hero, opacity: flash, mixBlendMode: "soft-light" }} />
    </AbsoluteFill>
  );
};

const useExit = (dur: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [dur - 10, dur - 1], [0, 1], { easing: theme.ease.in, ...clamp });
};

const Word: React.FC<{ w: string; i: number; delay: number; size: number; color?: string; serif?: boolean }> =
({ w, i, delay, size, color, serif }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay - i * 4, fps, config: theme.spring.snappy });
  return (
    <span style={{
      display: "inline-block", opacity: p, fontSize: size, fontWeight: serif ? 700 : 600,
      fontFamily: serif ? SERIF : F, letterSpacing: serif ? "0.04em" : "-0.01em", color: color ?? C.text,
      transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
      textShadow: "0 2px 24px rgba(0,0,0,0.45)",
    }}>{w}</span>
  );
};

// ---------- HOOK: plano arquitectónico que se dibuja ----------
const draw = (frame: number, start: number, len: number) =>
  interpolate(frame, [start, start + len], [1, 0], { easing: theme.ease.out, ...clamp });

const Blueprint: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bp = theme.blueprint;
  const k = 1.3; // ritmo de dibujo más pausado para que se aprecie
  const gridO = interpolate(frame, [0, 16], [0, 0.5], clamp);
  const slide = interpolate(frame, [84, 108], [0, 1], { easing: theme.ease.inOut, ...clamp });
  const lineProps = (start: number, len = 22, w = 6) => ({
    pathLength: 1, strokeDasharray: 1, strokeDashoffset: draw(frame, start * k, len * k),
    stroke: bp.line, strokeWidth: w, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  });
  const dim = (start: number) => ({
    pathLength: 1, strokeDasharray: 1, strokeDashoffset: draw(frame, start * k, 16 * k),
    stroke: C.hero, strokeWidth: 3.5, fill: "none", strokeLinecap: "round" as const,
  });
  const t1 = spring({ frame: frame - 44, fps, config: theme.spring.smooth });
  const t2 = spring({ frame: frame - 54, fps, config: theme.spring.smooth });
  const rule = interpolate(frame, [60, 80], [0, 1], { easing: theme.ease.out, ...clamp });
  const glow = interpolate(frame, [30, 60], [0, 1], clamp);
  const gridSize = 60;
  const shift = interpolate(frame, [0, HOOK_FRAMES], [0, -20]);
  return (
    <AbsoluteFill style={{ transform: `translateY(${-slide * 1920}px)`, background: bp.bg, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <g opacity={gridO} transform={`translate(0 ${shift})`}>
          {Array.from({ length: 19 }).map((_, i) => (
            <line key={"v" + i} x1={i * gridSize} y1={-40} x2={i * gridSize} y2={1960} stroke={bp.grid} strokeWidth={i % 5 === 0 ? 2 : 1} />
          ))}
          {Array.from({ length: 34 }).map((_, i) => (
            <line key={"h" + i} x1={0} y1={i * gridSize} x2={1080} y2={i * gridSize} stroke={bp.grid} strokeWidth={i % 5 === 0 ? 2 : 1} />
          ))}
        </g>
        <g transform="translate(-43.2 176) scale(1.08)" style={{ filter: `drop-shadow(0 0 ${10 * glow}px rgba(244,233,218,0.55))` }}>
          <path d="M150 300 H930 V780 H150 Z" {...lineProps(4, 26, 11)} />
          <path d="M150 420 H930" {...lineProps(12)} />
          <path d="M520 300 V420" {...lineProps(14, 14)} />
          <path d="M520 420 V560 M520 640 V780" {...lineProps(16)} />
          <path d="M520 600 H930" {...lineProps(18)} />
          <path d="M520 560 A40 40 0 0 1 560 600" {...lineProps(24, 14, 5)} />
          <path d="M310 420 A50 50 0 0 0 360 470" {...lineProps(26, 14, 5)} />
          <path d="M700 300 H860" {...lineProps(28, 12, 14)} />
          <path d="M150 560 V660" {...lineProps(30, 12, 14)} />
          {/* mobiliario esquemático */}
          <path d="M600 660 h120 v90 h-120 z M600 690 h120" {...lineProps(32, 16, 4)} />
          <circle cx="260" cy="600" r="46" {...{ ...lineProps(34, 18, 4), strokeDasharray: undefined, strokeDashoffset: undefined, opacity: interpolate(frame, [44, 58], [0, 1], clamp) }} />
          <path d="M650 340 h200 v50 h-200 z" {...lineProps(36, 14, 4)} />
        </g>
        <g transform="translate(-43.2 176) scale(1.08)">
          <path d="M150 250 H930 M150 232 V268 M930 232 V268" {...dim(30)} />
          <path d="M984 300 V780 M966 300 H1002 M966 780 H1002" {...dim(34)} />
        </g>
      </svg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 1140, textAlign: "center" }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 70, letterSpacing: "0.1em", color: C.text,
          opacity: t1, transform: `translateY(${interpolate(t1, [0, 1], [30, 0])}px)` }}>
          VISITANDO PROYECTOS
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 70, letterSpacing: "0.1em", color: C.hero, marginTop: 14,
          opacity: t2, transform: `translateY(${interpolate(t2, [0, 1], [30, 0])}px)` }}>
          EN BOMBINHAS
        </div>
        <div style={{ width: 420 * rule, height: 3, background: C.text, opacity: 0.85, marginTop: 34 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Subtítulo narrativo ----------
const Caption: React.FC<{ words: string[]; dur: number; accent?: number }> = ({ words, dur, accent }) => {
  const x = useExit(dur);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 330, opacity: 1 - x, transform: `translateY(${-x * 30}px)` }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", padding: "0 90px" }}>
        {words.map((w, i) => <Word key={i} w={w} i={i} delay={4} size={74} color={i === accent ? C.hero : undefined} />)}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Iconos de línea ----------
const Icon: React.FC<{ kind: "jacuzzi" | "social" | "billar" | "piscina" | "key"; color: string; size?: number }> = ({ kind, color, size = 56 }) => {
  const common = { fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {kind === "jacuzzi" && (<g {...common}><path d="M3 11h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" /><path d="M8 3c-1 1.2 1 2 0 3.2M12 3c-1 1.2 1 2 0 3.2M16 3c-1 1.2 1 2 0 3.2" /></g>)}
      {kind === "social" && (<g {...common}><path d="M5 5h14l-1.2 6a5 5 0 0 1-9.6 0z" /><path d="M12 15v5M8 20h8" /></g>)}
      {kind === "piscina" && (<g {...common}><path d="M3 14c2 0 2-2 4.5-2S10 14 12 14s2.5-2 4.5-2S19 14 21 14M3 19c2 0 2-2 4.5-2S10 19 12 19s2.5-2 4.5-2S19 19 21 19" /><path d="M8 11V5a2 2 0 0 1 4 0M14 11V5a2 2 0 0 1 4 0" /></g>)}
      {kind === "billar" && (<g {...common}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.4" /><path d="M10.6 12h2.8" /></g>)}
      {kind === "key" && (<g {...common}><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3M21 12v2" /></g>)}
    </svg>
  );
};

// ---------- Iconos animados (trazo fino que se dibuja y sigue vivo) ----------
const AnimIcon: React.FC<{ kind: "jacuzzi" | "social" | "billar" | "piscina" | "key"; color: string; size?: number }> = ({ kind, color, size = 72 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const draw = interpolate(frame, [4, 30], [1, 0], { easing: theme.ease.out, ...clamp });
  const common = { fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const D = { pathLength: 1, strokeDasharray: 1, strokeDashoffset: draw };
  const live = interpolate(frame, [26, 40], [0, 1], clamp);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ overflow: "visible" }}>
      {kind === "jacuzzi" && (<g {...common}>
        <path d="M3 11h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z" {...D} />
        {[0, 1, 2].map((i) => { const ph = (t * 0.8 + i * 0.33) % 1; return <circle key={i} cx={8 + i * 4 + Math.sin(t * 5 + i) * 0.7} cy={10 - ph * 8} r={0.9 + (i % 2) * 0.5} opacity={live * (1 - ph)} />; })}
      </g>)}
      {kind === "social" && (<g {...common}>
        <path d="M5 5h14l-1.2 6a5 5 0 0 1-9.6 0z" {...D} />
        <path d="M12 15v5M8 20h8" {...D} />
        <path d={`M${7.2 + 0} ${8.5 - 0}h9.6`} opacity={live} transform={`translate(0 ${Math.sin(t * 3) * 0.6})`} />
        <circle cx={17.5} cy={4} r={1.6} opacity={live} transform={`rotate(${t * 40} 17.5 4)`} />
      </g>)}
      {kind === "piscina" && (<g {...common}>
        <path d="M8 11V5a2 2 0 0 1 4 0M14 11V5a2 2 0 0 1 4 0" {...D} />
        {[0, 1].map((r) => <path key={r} d="M0 0c2 0 2-2 4.5-2S7 0 9 0s2.5-2 4.5-2S16 0 18 0" transform={`translate(${3 + Math.sin(t * 3 + r) * 1.2} ${14 + r * 5})`} {...D} />)}
      </g>)}
      {kind === "billar" && (<g {...common}>
        <rect x={2.5} y={6} width={19} height={12} rx={2.5} {...D} />
        <circle cx={7 + (Math.sin(t * 2.4) + 1) * 4.5} cy={12} r={1.9} opacity={live} />
        <circle cx={17} cy={12} r={1.3} opacity={live} />
      </g>)}
      {kind === "key" && (<g {...common} transform={`rotate(${Math.sin(t * 3) * 10} 12 12)`}>
        <circle cx={8} cy={12} r={4} {...D} /><path d="M12 12h9M18 12v3M21 12v2" {...D} />
      </g>)}
    </svg>
  );
};

// ---------- Mini plano: contorno dorado + punto que marca dónde estamos ----------
const ROOMS: [number, number, number, number][] = [
  [8, 8, 62, 52], [74, 8, 52, 52], [130, 8, 62, 30], [8, 64, 70, 48], [82, 64, 62, 48], [148, 42, 44, 70],
];
const MiniPlan: React.FC<{ room: number; side: "L" | "R"; dur: number }> = ({ room, side, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const x = useExit(dur);
  const p = spring({ frame: frame - 14, fps, config: theme.spring.smooth });
  const draw = interpolate(frame, [16, 46], [1, 0], { easing: theme.ease.out, ...clamp });
  const [rx, ry, rw, rh] = ROOMS[room];
  const pulse = (Math.sin(frame / 7) + 1) / 2;
  return (
    <AbsoluteFill style={{ paddingTop: 515, paddingLeft: 70, paddingRight: 70, alignItems: side === "L" ? "flex-start" : "flex-end" }}>
      <div style={{ opacity: p * (1 - x), transform: `translateY(${interpolate(p, [0, 1], [14, 0])}px)`,
        padding: 10, background: "rgba(13,33,55,0.62)", border: "1px solid rgba(244,233,218,0.18)", borderRadius: 14 }}>
        <svg width={200} height={120} viewBox="0 0 200 120">
          <rect x={4} y={4} width={192} height={112} rx={4} fill="none" stroke={C.text} strokeOpacity={0.8} strokeWidth={1.6} pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />
          {ROOMS.map((r, i) => <rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} fill="none" stroke={C.text} strokeOpacity={0.35} strokeWidth={1} pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />)}
          <rect x={rx} y={ry} width={rw} height={rh} fill={C.hero} fillOpacity={0.18 + pulse * 0.14} stroke={C.hero} strokeWidth={2.2} opacity={interpolate(frame, [30, 44], [0, 1], clamp)} />
          <circle cx={rx + rw / 2} cy={ry + rh / 2} r={4 + pulse * 3} fill={C.hero} opacity={interpolate(frame, [30, 44], [0, 1], clamp)} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Tarjeta ESPACIO COMÚN: cristal oscuro, a la izquierda, numerada ----------
const CommonCard: React.FC<{ n: number; label: string; icon: "jacuzzi" | "social" | "billar" | "piscina"; dur: number }> = ({ n, label, icon, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const x = useExit(dur);
  const p = spring({ frame: frame - 4, fps, config: theme.spring.smooth });
  const num = n;
  const bar = interpolate(frame, [10, 34], [0, 1], { easing: theme.ease.out, ...clamp });
  const breathe = 1 + Math.sin(frame / 22) * 0.008;
  return (
    <AbsoluteFill style={{ fontFamily: F, paddingTop: 700, alignItems: "center" }}>
      <div style={{
        opacity: p * (1 - x),
        transform: `translateY(${interpolate(p, [0, 1], [36, 0]) - x * 18}px) scale(${interpolate(p, [0, 1], [0.94, 1]) * breathe})`,
        display: "flex", alignItems: "center", gap: 24, padding: "24px 38px 24px 28px",
        background: C.glass, border: "1px solid rgba(244,233,218,0.18)", borderRadius: 999,
        backdropFilter: "blur(14px)", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.55)",
      }}>
        <div style={{ fontSize: 56, fontWeight: 700, color: C.hero, fontVariantNumeric: "tabular-nums",
          textShadow: `0 0 40px ${C.glow}` }}>{String(num).padStart(2, "0")}</div>
        <div style={{ width: 2, height: 56 * bar, background: C.text, opacity: 0.45, borderRadius: 2 }} />
        <AnimIcon kind={icon} color={C.hero} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.24em", color: C.textDim, textTransform: "uppercase" }}>Área común</div>
          <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: "0.04em", color: C.text, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Tarjeta PISO PILOTO: tarjeta crema sólida, a la derecha, con llave ----------
const PilotCard: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const x = useExit(dur);
  const p = spring({ frame: frame - 4, fps, config: theme.spring.smooth });
  const rule = interpolate(frame, [12, 36], [0, 1], { easing: theme.ease.out, ...clamp });
  const key = spring({ frame: frame - 14, fps, config: theme.spring.bouncy });
  const breathe = 1 + Math.sin(frame / 22) * 0.008;
  return (
    <AbsoluteFill style={{ paddingTop: 700, alignItems: "center" }}>
      <div style={{
        opacity: p * (1 - x),
        transform: `translateY(${interpolate(p, [0, 1], [36, 0]) - x * 18}px) scale(${interpolate(p, [0, 1], [0.94, 1]) * breathe})`,
        background: C.text, borderRadius: 14, padding: "26px 40px 28px 36px", display: "flex", gap: 26, alignItems: "center",
        boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)", borderLeft: `8px solid ${C.hero}`,
      }}>
        <div style={{ transform: `scale(${interpolate(key, [0, 1], [0.4, 1])}) rotate(${interpolate(key, [0, 1], [-40, 0])}deg)`, opacity: key }}>
          <AnimIcon kind="key" color={C.bg} size={72} />
        </div>
        <div>
          <div style={{ fontFamily: F, fontSize: 22, fontWeight: 600, letterSpacing: "0.28em", color: "#7A6A55", textTransform: "uppercase" }}>Visita al</div>
          <div style={{ fontFamily: SERIF, fontSize: 48, fontWeight: 700, letterSpacing: "0.06em", color: C.bg, marginTop: 4 }}>PISO PILOTO</div>
          <div style={{ width: 300 * rule, height: 3, background: C.hero, marginTop: 10, borderRadius: 2 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Cierre ----------
const EndCard: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const x = interpolate(frame, [dur - 8, dur - 1], [0, 1], { easing: theme.ease.in, ...clamp });
  const veil = interpolate(frame, [0, 22], [0, 1], { easing: theme.ease.out, ...clamp });
  const check = spring({ frame: frame - 28, fps, config: theme.spring.bouncy });
  const dr = interpolate(frame, [30, 52], [1, 0], { easing: theme.ease.out, ...clamp });
  const count = Math.round(interpolate(spring({ frame: frame - 46, fps, config: { damping: 30, stiffness: 60 } }), [0, 1], [0, 5]));
  const underline = interpolate(frame, [48, 74], [0, 1], { easing: theme.ease.out, ...clamp });
  const sub = spring({ frame: frame - 70, fps, config: theme.spring.smooth });
  return (
    <AbsoluteFill style={{ opacity: 1 - x }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(26,18,11,0.72), rgba(26,18,11,0.0) 62%)", opacity: veil }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 290 }}>
        <div style={{ width: 120, height: 120, borderRadius: 60, border: `4px solid ${C.text}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${interpolate(check, [0, 1], [0.5, 1])})`, opacity: check,
          boxShadow: "0 0 50px rgba(0,0,0,0.35)", marginBottom: 40 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="1" pathLength={1} strokeDashoffset={dr} />
          </svg>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          {["SU", "INVERSIÓN,"].map((w, i) => <Word key={w} w={w} i={i} delay={14} size={80} serif />)}
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 8 }}>
          {["HECHA", "REALIDAD."].map((w, i) => <Word key={w} w={w} i={i + 2} delay={14} size={80} serif color={C.hero} />)}
        </div>
        <div style={{ width: 360 * underline, height: 4, background: C.text, borderRadius: 2, marginTop: 30, opacity: 0.85 }} />
        <div style={{ marginTop: 34, fontFamily: F, fontSize: 34, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase",
          color: C.text, opacity: sub, transform: `translateY(${interpolate(sub, [0, 1], [20, 0])}px)`,
          fontVariantNumeric: "tabular-nums", textShadow: "0 2px 16px rgba(0,0,0,0.55)" }}>
          Bombinhas
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- Acabado: grano + viñeta + grade ----------
const Finish: React.FC = () => {
  const frame = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return (
    <>
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AbsoluteFill style={{ backgroundColor: C.hero, mixBlendMode: "soft-light", opacity: 0.12 }} />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.28), transparent 26%, transparent 74%, rgba(0,0,0,0.18))" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ pointerEvents: "none", backgroundImage: noise, backgroundSize: "220px",
        backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`, opacity: 0.05, mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 56%, rgba(0,0,0,0.24) 100%)" }} />
    </>
  );
};

// ---------- Composición ----------
export const Bombinhas: React.FC = () => {
  const { fps } = useVideoConfig();
  let t = VIDEO_START;
  const starts: number[] = [];
  const durs: number[] = [];
  CLIPS.forEach(([, , dd]) => { starts.push(t); durs.push(Math.round(dd * fps)); t += Math.round(dd * fps); });
  const at = (i: number) => starts[i];
  const d = (i: number) => durs[i];
  const gf = useCurrentFrame();
  const top = panelHeight(gf, getStarts(fps));
  const seq = (i: number, el: React.ReactNode) => (
    <Sequence from={at(i)} durationInFrames={d(i)}>{el}</Sequence>
  );

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {CLIPS.map(([file, from], i) => (
        <Sequence key={i} from={at(i)} durationInFrames={d(i)}><Shot file={file} from={from} top={top} /></Sequence>
      ))}
      <Finish />
      <PlanPanel />
      {seq(0, <CommonCard n={1} label="Jacuzzi" icon="jacuzzi" dur={d(0)} />)}
      {seq(1, <CommonCard n={2} label="Área social" icon="social" dur={d(1)} />)}
      {seq(3, <CommonCard n={3} label="Sala de juegos" icon="billar" dur={d(3)} />)}
      {seq(4, <CommonCard n={4} label="Piscina" icon="piscina" dur={d(4)} />)}
      {seq(5, <PilotCard dur={d(5)} />)}
      {seq(8, <EndCard dur={d(8)} />)}
      <Sequence from={0} durationInFrames={HOOK_FRAMES + 12}><Blueprint /></Sequence>
    </AbsoluteFill>
  );
};
