import { Video } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useEnter, useKitFonts, Word } from "../kit";
import { HEAD, HEAD_FIRST, HEAD_LAST } from "./head";
import { WORDS } from "./words";

// Edición "esquema + PIP": el video original, un esquema animado en la mitad superior (de 4 a 30 s)
// y la persona recortada en un recuadro flotante (PIP) en la mitad inferior.
// Paleta aportada por la persona usuaria: #C7AE6A #000000 #d5c28f #b99a45 #1a1a1a #e3d6b4.

export const EDIT_FPS = 30;
export const EDIT_DURATION = 1064; // 35,47 s

const P = {
  black: "#000000",
  ink: "#1a1a1a",
  gold: "#C7AE6A",
  goldDeep: "#b99a45",
  goldMid: "#d5c28f",
  cream: "#e3d6b4",
  sheen: "#F3EBB6", // brillo central del degradado metálico de la muestra #C7AE6A
  shade: "#8f7138", // extremos oscuros de ese degradado
};
const METAL = `linear-gradient(135deg, ${P.shade} 0%, ${P.gold} 28%, ${P.sheen} 50%, ${P.gold} 72%, ${P.shade} 100%)`;
const GOLD_TEXT = `linear-gradient(100deg, ${P.goldDeep} 0%, ${P.sheen} 45%, ${P.gold} 100%)`;

// Tiempos (segundos)
const T_IN = 4.0; // empieza el paso al PIP
const T_IN_END = 5.3;
const T_OUT = 30.0; // empieza la vuelta al video completo
const T_OUT_END = 31.3;
const SCHEMA_EXIT = 29.5;

// Geometría (px, formato 1080x1920)
const FULL = { x: 0, y: 0, w: 1080, h: 1920, r: 0 };
const PIP = { x: 100, y: 925, w: 880, h: 560, r: 46 };
const PIP_ZOOM = 0.85; // escala del video dentro del PIP
const HEAD_DROP = 255; // el centro de la vista queda tantos px (del video) por debajo de la coronilla
const CAPTION_Y = 1565;
const SHOW_CAPTIONS = false; // subtítulos por palabras (desactivados a petición de la persona usuaria)

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

type Step = { at: number; text: string };
const STEPS: Step[] = [
  { at: 4.8, text: "La constructora **financia**" },
  { at: 7.7, text: "Entras con **capital mínimo**, **en pozo**" },
  { at: 15.2, text: "Al entregarse, el inmueble genera **renta**" },
  { at: 21.9, text: "Esa renta cubre las **cuotas** posteriores" },
  { at: 26.7, text: "Tu inversión se **amortiza**" },
];
const CARD = { left: 64, w: 952, h: 104, gap: 8, top: 345 };

const parse = (t: string) => {
  const chars: { c: string; hl: boolean }[] = [];
  t.split("**").forEach((seg, i) => [...seg].forEach((c) => chars.push({ c, hl: i % 2 === 1 })));
  return chars;
};

const StepCard: React.FC<{ index: number; step: Step }> = ({ index, step }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = Math.round(step.at * fps);
  const p = useEnter(at);
  const chars = parse(step.text);
  const typed = Math.max(0, Math.floor(((frame - at - 8) / fps) * 24));
  const typing = typed < chars.length;
  const top = CARD.top + index * (CARD.h + CARD.gap);
  // línea que une la tarjeta anterior con esta
  const lineP = index === 0 ? 0 : interpolate(frame, [at - 10, at + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <>
      {index > 0 && (
        <div
          style={{
            position: "absolute",
            left: CARD.left + 24 + 32 - 1.5,
            top: top - (CARD.h + CARD.gap) + CARD.h / 2 + 32,
            width: 3,
            height: (CARD.h + CARD.gap - 64) * lineP,
            background: `linear-gradient(180deg, ${P.gold}, ${P.goldDeep})`,
            opacity: 0.8,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: CARD.left,
          top,
          width: CARD.w,
          height: CARD.h,
          borderRadius: 30,
          display: "flex",
          alignItems: "center",
          gap: 26,
          padding: "0 32px 0 24px",
          boxSizing: "border-box",
          background: `linear-gradient(180deg, rgba(199,174,106,0.16) 0%, rgba(26,26,26,0.88) 70%)`,
          border: "1.5px solid rgba(199,174,106,0.42)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 60px rgba(185,154,69,0.10)",
          backdropFilter: "blur(18px)",
          opacity: interpolate(p, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - p) * 40}px) scale(${0.95 + 0.05 * p})`,
          filter: `blur(${(1 - Math.min(p, 1)) * 8}px)`,
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: 64,
            height: 64,
            borderRadius: 32,
            background: METAL,
            color: P.black,
            fontFamily: "Space Grotesk",
            fontWeight: 700,
            fontSize: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          }}
        >
          {index + 1}
        </div>
        <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 40, lineHeight: 1.15, color: P.cream, whiteSpace: "pre-wrap" }}>
          {chars.map((ch, i) => {
            const shown = i < typed;
            const style: React.CSSProperties = { opacity: shown ? 1 : 0 };
            if (ch.hl) {
              style.fontWeight = 800;
              style.color = P.gold;
            }
            return (
              <span key={i} style={style}>
                {ch.c}
                {typing && i === typed - 1 && (
                  <span style={{ display: "inline-block", width: 3, height: 34, marginLeft: 3, verticalAlign: "-5px", background: P.gold }} />
                )}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};

const Schema: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pT = useEnter(Math.round(4.15 * fps));
  const exit = interpolate(frame, [SCHEMA_EXIT * fps, (SCHEMA_EXIT + 0.7) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  if (frame < 4.0 * fps || exit >= 1) return null;
  return (
    <div style={{ opacity: 1 - exit, transform: `translateY(${-exit * 40}px)`, filter: `blur(${exit * 8}px)` }}>
      <div
        style={{
          position: "absolute",
          left: CARD.left,
          top: 190,
          fontFamily: "Bebas Neue",
          fontSize: 136,
          lineHeight: 1,
          letterSpacing: 2,
          backgroundImage: GOLD_TEXT,
          WebkitBackgroundClip: "text",
          color: "transparent",
          opacity: interpolate(pT, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${(1 - pT) * 34}px)`,
        }}
      >
        ¿CÓMO FUNCIONA?
      </div>
      <div
        style={{
          position: "absolute",
          left: CARD.left,
          top: 318,
          height: 3,
          width: 280 * Math.min(pT, 1),
          background: `linear-gradient(90deg, ${P.gold}, transparent)`,
        }}
      />
      {STEPS.map((s, i) => (
        <StepCard key={i} index={i} step={s} />
      ))}
    </div>
  );
};

const GoldBackground: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const t = frame / EDIT_FPS;
  const blob = (cx: number, cy: number, size: number, alpha: string, period: number, phase: number) => (
    <div
      style={{
        position: "absolute",
        left: cx + Math.sin((t / period) * Math.PI * 2 + phase) * 80 - size / 2,
        top: cy + Math.cos((t / period) * Math.PI * 2 + phase) * 100 - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${P.goldDeep}${alpha} 0%, transparent 66%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ opacity, background: `linear-gradient(180deg, ${P.ink} 0%, ${P.black} 100%)` }}>
      {blob(200, 380, 1200, "30", 11, 0)}
      {blob(900, 1250, 1100, "26", 9, 2)}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(0,0,0,0.6) 100%)" }} />
    </AbsoluteFill>
  );
};

const Captions: React.FC<{ words: Word[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const groups: Word[][] = [];
  words.forEach((w) => {
    const g = groups[groups.length - 1];
    if (!g || g.length >= 3 || /[.?!]$/.test(g[g.length - 1].text)) groups.push([w]);
    else g.push(w);
  });
  const idx = groups.findIndex((g, i) => {
    const start = g[0].start * fps;
    const hide = groups[i + 1] ? groups[i + 1][0].start * fps : g[g.length - 1].end * fps + 8;
    return frame >= start && frame < hide;
  });
  if (idx < 0) return null;
  const g = groups[idx];
  const startF = Math.round(g[0].start * fps);
  const lastEnd = g[g.length - 1].end * fps;
  const p = Math.min(1, (frame - startF) / 6);
  const out = groups[idx + 1] ? 1 : interpolate(frame, [lastEnd, lastEnd + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        right: 64,
        top: CAPTION_Y,
        transform: `translateY(calc(-50% + ${(1 - p) * 18}px))`,
        opacity: p * out,
        textAlign: "center",
        fontFamily: "Inter",
        fontWeight: 800,
        fontSize: 72,
        lineHeight: 1.1,
        textShadow: "0 6px 30px rgba(0,0,0,0.85)",
        WebkitTextStroke: "9px rgba(0,0,0,0.78)",
        paintOrder: "stroke fill",
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "0 0.38em",
      }}
    >
      {g.map((w, i) => {
        const s = w.start * fps;
        const e = w.end * fps;
        const active = frame >= s && frame < e;
        const spoken = frame >= e;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: w.highlight && (active || spoken) ? P.gold : P.cream,
              opacity: spoken || active ? 1 : 0.6,
              transform: `scale(${active ? 1.06 : 1})`,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

export const EsquemaPip: React.FC = () => {
  useKitFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [T_IN * fps, T_IN_END * fps, T_OUT * fps, T_OUT_END * fps], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: inOut,
  });
  const win = {
    x: lerp(FULL.x, PIP.x, p),
    y: lerp(FULL.y, PIP.y, p),
    w: lerp(FULL.w, PIP.w, p),
    h: lerp(FULL.h, PIP.h, p),
    r: lerp(FULL.r, PIP.r, p),
  };
  const bw = 6 * p;
  const innerW = win.w - 2 * bw;
  const innerH = win.h - 2 * bw;
  const s = lerp(1, PIP_ZOOM, p);
  const hf = Math.min(Math.max(frame, HEAD_FIRST), HEAD_LAST);
  const head = HEAD[hf - HEAD_FIRST];
  const fx = lerp(540, head[0], p);
  const fy = lerp(960, head[1] + HEAD_DROP, p);
  const left = Math.min(0, Math.max(innerW - 1080 * s, innerW / 2 - fx * s));
  const top = Math.min(0, Math.max(innerH - 1920 * s, innerH / 2 - fy * s));
  const cutout = p > 0 && frame >= HEAD_FIRST && frame <= HEAD_LAST;

  return (
    <AbsoluteFill style={{ background: P.black }}>
      <GoldBackground opacity={p} />
      <Schema />
      <div
        style={{
          position: "absolute",
          left: win.x,
          top: win.y,
          width: win.w,
          height: win.h,
          boxSizing: "border-box",
          padding: bw,
          borderRadius: win.r,
          background: METAL,
          boxShadow: p > 0 ? `0 30px 80px rgba(0,0,0,0.6), 0 0 ${90 * p}px rgba(185,154,69,${0.28 * p})` : "none",
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: Math.max(0, win.r - bw), overflow: "hidden", background: P.black }}>
          {/* fondo dentro del PIP: aparece al tiempo que se desvanece el fondo del video */}
          <AbsoluteFill
            style={{
              opacity: p,
              background: `radial-gradient(ellipse at 50% 30%, rgba(199,174,106,0.42) 0%, ${P.ink} 55%, ${P.black} 100%)`,
            }}
          />
          <div style={{ position: "absolute", left, top, width: 1080 * s, height: 1920 * s }}>
            <div style={{ position: "absolute", inset: 0, opacity: 1 - p }}>
              <Video src={staticFile("entrada/video_1080.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
            </div>
            {cutout && (
              <Img src={staticFile(`recorte/m_${String(frame).padStart(4, "0")}.webp`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            )}
          </div>
        </div>
      </div>
      {SHOW_CAPTIONS && <Captions words={WORDS} />}
    </AbsoluteFill>
  );
};
