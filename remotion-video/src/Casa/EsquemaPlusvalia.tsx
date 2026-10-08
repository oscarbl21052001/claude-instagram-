import { Audio } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useEnter, useKitFonts } from "../kit";

// Esquema profesional (sin dibujos) sincronizado con el audio "AUDIO.mp4" (11,6 s):
// "Y cuando estas tres cosas están alineadas, tenés un producto pensado para disfrutar, rentabilizar y tener
//  grandes ganancias también con la plusvalía del inmueble."
// Estructura: los tres pilares → 3/3 alineados → "un producto pensado para" → Disfrutar · Rentabilizar · Grandes ganancias (plusvalía).
// No hay cifras inventadas: el único dato numérico (3/3) sale del propio discurso. El gráfico es ilustrativo.

export const ESQ_FPS = 30;
export const ESQ_DURATION = 348; // 11,6 s

// Segundos tomados de la transcripción por palabras (faster-whisper "medium")
const T = {
  panel: 0.05,
  pillar: [0.12, 0.2, 0.28], // las tres filas se escriben en la primera frase
  align: [2.0, 2.5, 3.0], // "estas tres cosas" · "están" · "alineadas"
  product: 3.64, // "tenés un producto pensado"
  rowA: 5.04, // "para disfrutar"
  rowB: 6.32, // "rentabilizar"
  rowC: 7.24, // "tener grandes ganancias"
  plus: 9.1, // "plusvalía del inmueble"
};

const C = {
  bg1: "#FBF9F4",
  bg2: "#F5F1E8",
  ink: "#1a1a1a",
  muted: "#7a705c",
  gold: "#C7AE6A",
  goldDeep: "#b99a45",
  goldInk: "#9c7d2f",
  line: "#E3DCCB",
  cream: "#e3d6b4",
  green: "#1f9d55",
};

const SAFE_X = 70;
const W = 1080 - SAFE_X * 2; // 940

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const out = Easing.out(Easing.cubic);

const PILLARS = ["Localización estratégica", "Constructora de renombre", "Amenities premium"];

// ---- base visual de tarjeta ----
const cardStyle = (enter: number): React.CSSProperties => ({
  boxSizing: "border-box",
  background: "#FFFFFF",
  border: "1.5px solid rgba(199,174,106,0.5)",
  borderRadius: 32,
  boxShadow: "0 20px 46px rgba(90,70,30,0.10), 0 2px 6px rgba(90,70,30,0.06)",
  opacity: interpolate(enter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
  transform: `translateY(${(1 - Math.min(enter, 1)) * 34}px) scale(${0.97 + 0.03 * Math.min(enter, 1)})`,
});

const Fondo: React.FC = () => {
  const t = useCurrentFrame() / ESQ_FPS;
  const blob = (cx: number, cy: number, size: number, a: number, period: number, ph: number) => (
    <div
      style={{
        position: "absolute",
        left: cx + Math.sin((t / period) * Math.PI * 2 + ph) * 70 - size / 2,
        top: cy + Math.cos((t / period) * Math.PI * 2 + ph) * 90 - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(226,190,100,${a}) 0%, transparent 66%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg2} 100%)` }}>
      {blob(180, 380, 1100, 0.14, 12, 0)}
      {blob(900, 1250, 1000, 0.11, 10, 2)}
    </AbsoluteFill>
  );
};

// ---- zona 1: los tres pilares ----
const PANEL = { top: 250, h: 470 };
const ROW = { h: 104, gap: 12, top: PANEL.top + 118 };

const Pilares: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const enter = useEnter(Math.round(T.panel * fps));
  const count = T.align.filter((a) => t >= a).length; // 0..3
  const railProg = out(clamp01((t - T.align[0]) / (T.align[2] - T.align[0] + 0.3)));
  const railTop = ROW.top + ROW.h / 2;
  const railLen = 2 * (ROW.h + ROW.gap);
  const kpiPop = Math.max(0, 1 - Math.abs(t - T.align[2]) * 2.2);
  return (
    <div style={{ position: "absolute", left: SAFE_X, top: PANEL.top, width: W, height: PANEL.h, ...cardStyle(enter) }}>
      <div style={{ position: "absolute", left: 44, top: 34, fontFamily: "Inter", fontWeight: 800, fontSize: 27, letterSpacing: 5, color: C.goldInk }}>
        LOS TRES PILARES
      </div>
      {/* KPI 3/3 (único dato: sale del discurso) */}
      <div style={{ position: "absolute", right: 44, top: 22, display: "flex", alignItems: "baseline", gap: 14, transform: `scale(${1 + 0.1 * kpiPop})`, transformOrigin: "right center" }}>
        <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 64, lineHeight: 1, color: count === 3 ? C.goldDeep : C.ink }}>
          {count}
          <span style={{ color: C.muted, fontWeight: 500 }}>/3</span>
        </div>
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 24, letterSpacing: 3, color: count === 3 ? C.goldInk : C.muted, opacity: count > 0 ? 1 : 0.35 }}>
          {count === 3 ? "ALINEADOS" : "ALINEANDO"}
        </div>
      </div>
      <div style={{ position: "absolute", left: 30, right: 30, top: 98, height: 2, background: C.line }} />
      {/* riel que conecta los tres números */}
      <div style={{ position: "absolute", left: 44 + 28 - 1.5, top: railTop - PANEL.top, width: 3, height: railLen, background: C.line, borderRadius: 2 }} />
      <div style={{ position: "absolute", left: 44 + 28 - 1.5, top: railTop - PANEL.top, width: 3, height: railLen * railProg, background: `linear-gradient(180deg, ${C.gold}, ${C.goldDeep})`, borderRadius: 2 }} />
      {PILLARS.map((txt, i) => (
        <Fila key={i} i={i} txt={txt} lit={t >= T.align[i]} />
      ))}
    </div>
  );
};

const Fila: React.FC<{ i: number; txt: string; lit: boolean }> = ({ i, txt, lit }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const typed = Math.max(0, Math.floor(((frame - T.pillar[i] * fps - 4) / fps) * 90));
  const y = ROW.top - PANEL.top + i * (ROW.h + ROW.gap);
  return (
    <div style={{ position: "absolute", left: 30, right: 30, top: y, height: ROW.h, display: "flex", alignItems: "center", gap: 28, padding: "0 14px" }}>
      <div
        style={{
          flexShrink: 0,
          width: 58,
          height: 58,
          borderRadius: 29,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Space Grotesk",
          fontWeight: 700,
          fontSize: 28,
          background: lit ? `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})` : "#FFFFFF",
          color: lit ? "#FFFFFF" : C.muted,
          border: lit ? "none" : `2px solid ${C.line}`,
          transition: "none",
        }}
      >
        {i + 1}
      </div>
      <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 44, letterSpacing: 0.3, color: C.ink, whiteSpace: "nowrap" }}>
        {[...txt].map((c, k) => (
          <span key={k} style={{ opacity: k < typed ? 1 : 0 }}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
};

// ---- conectores ----
const Conector: React.FC<{ from: number; at: number; y: number; h: number }> = ({ from, at, y, h }) => {
  const t = useCurrentFrame() / ESQ_FPS;
  const p = out(clamp01((t - from) / (at - from)));
  if (p <= 0) return null;
  return (
    <>
      <div style={{ position: "absolute", left: 540 - 1.5, top: y, width: 3, height: h * p, background: `linear-gradient(180deg, ${C.gold}, ${C.goldDeep})`, borderRadius: 2 }} />
      <div style={{ position: "absolute", left: 540 - 8, top: y + h * p - 8, width: 16, height: 16, borderRadius: 8, background: C.goldDeep, opacity: p > 0.96 ? 1 : 0 }} />
    </>
  );
};

// ---- zona 2: producto ----
const PROD = { top: 776, h: 118 };
const Producto: React.FC = () => {
  const { fps } = useVideoConfig();
  const enter = useEnter(Math.round(T.product * fps));
  const t = useCurrentFrame() / fps;
  const line = out(clamp01((t - T.product - 0.15) / 0.5));
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE_X,
        top: PROD.top,
        width: W,
        height: PROD.h,
        boxSizing: "border-box",
        borderRadius: 32,
        background: C.ink,
        boxShadow: "0 22px 50px rgba(40,30,10,0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: interpolate(enter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${(1 - Math.min(enter, 1)) * 30}px) scale(${0.97 + 0.03 * Math.min(enter, 1)})`,
      }}
    >
      <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 40, letterSpacing: 5, color: C.cream }}>UN PRODUCTO PENSADO PARA</div>
      <div style={{ position: "absolute", left: 44, bottom: 14, height: 3, width: (W - 88) * line, background: `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})`, borderRadius: 2 }} />
    </div>
  );
};

// ---- zona 3: resultados ----
const R = { A: 944, B: 1070, C: 1196, hAB: 110, hC: 322 };

const Resultado: React.FC<{ at: number; top: number; h: number; tag: string; title: string; children?: React.ReactNode }> = ({ at, top, h, tag, title, children }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const enter = useEnter(Math.round(at * fps));
  if (t < at - 0.02) return null;
  const glow = smooth(0, 0.5, t - at) * (1 - smooth(0.9, 1.6, t - at));
  return (
    <div style={{ position: "absolute", left: SAFE_X, top, width: W, height: h, ...cardStyle(enter), boxShadow: `0 20px 46px rgba(90,70,30,0.10), 0 0 ${40 * glow}px rgba(226,168,38,${0.55 * glow})` }}>
      <div style={{ position: "absolute", left: 0, top: 22, bottom: 22, width: 8, borderRadius: 4, background: `linear-gradient(180deg, ${C.gold}, ${C.goldDeep})` }} />
      <div style={{ position: "absolute", left: 44, top: 24, display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 30, color: C.goldDeep, letterSpacing: 2 }}>{tag}</div>
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 52, color: C.ink, letterSpacing: 0.3 }}>{title}</div>
      </div>
      {children}
    </div>
  );
};

// Gráfico ilustrativo (sin cifras): línea ascendente que se dibuja
const GW = 852;
const GH = 150;
const PTS: [number, number][] = [[0, 128], [110, 114], [210, 122], [330, 88], [440, 80], [560, 50], [680, 38], [852, 12]];
const pathD = (() => {
  let d = `M ${PTS[0][0]} ${PTS[0][1]}`;
  for (let i = 1; i < PTS.length - 1; i++) {
    const [x, y] = PTS[i];
    const [nx, ny] = PTS[i + 1];
    d += ` Q ${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const [lx, ly] = PTS[PTS.length - 1];
  d += ` T ${lx} ${ly}`;
  return d;
})();

const Grafico: React.FC = () => {
  const t = useCurrentFrame() / ESQ_FPS;
  const p = out(clamp01((t - T.plus - 0.1) / 1.0));
  const beat = t > T.plus + 1.1 ? Math.exp(-Math.pow((((t - T.plus - 1.1) * 1.6) % 1) / 0.12, 2)) : 0;
  const done = p > 0.985;
  const chip = smooth(0, 0.35, t - T.plus);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 44,
          top: 100,
          fontFamily: "Inter",
          fontWeight: 800,
          fontSize: 25,
          letterSpacing: 3,
          color: chip > 0.5 ? "#FFFFFF" : C.muted,
          background: chip > 0.5 ? `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})` : "transparent",
          border: chip > 0.5 ? "none" : `2px solid ${C.line}`,
          borderRadius: 999,
          padding: "10px 24px",
          transform: `scale(${1 + 0.06 * Math.max(0, 1 - Math.abs(t - T.plus - 0.2) * 3)})`,
          transformOrigin: "left center",
        }}
      >
        CON LA PLUSVALÍA DEL INMUEBLE
      </div>
      <svg width={GW} height={GH} viewBox={`0 0 ${GW} ${GH}`} style={{ position: "absolute", left: 44, top: 148, overflow: "visible" }}>
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.green} stopOpacity="0.20" />
            <stop offset="100%" stopColor={C.green} stopOpacity="0" />
          </linearGradient>
          <clipPath id="reveal">
            <rect x="0" y="-10" width={GW * p} height={GH + 20} />
          </clipPath>
        </defs>
        {[0.2, 0.45, 0.7, 0.95].map((g, i) => (
          <line key={i} x1="0" x2={GW} y1={GH * g} y2={GH * g} stroke={C.line} strokeWidth="1.5" />
        ))}
        <g clipPath="url(#reveal)">
          <path d={`${pathD} L ${GW} ${GH} L 0 ${GH} Z`} fill="url(#area)" />
          <path d={pathD} fill="none" stroke={C.green} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {done && (
          <>
            <circle cx={PTS[PTS.length - 1][0]} cy={PTS[PTS.length - 1][1]} r={14 + 12 * beat} fill={C.green} opacity={0.18 + 0.2 * beat} />
            <circle cx={PTS[PTS.length - 1][0]} cy={PTS[PTS.length - 1][1]} r="9" fill={C.green} />
          </>
        )}
      </svg>
      <div style={{ position: "absolute", right: 44, bottom: 8, fontFamily: "Inter", fontWeight: 500, fontSize: 21, color: C.muted, letterSpacing: 1 }}>
        Gráfico ilustrativo, sin datos reales
      </div>
    </>
  );
};

export const EsquemaPlusvalia: React.FC = () => {
  useKitFonts();
  return (
    <AbsoluteFill style={{ background: C.bg1 }}>
      <Audio src={staticFile("audio/casa_plusvalia.m4a")} />
      <Fondo />
      <Pilares />
      <Conector from={T.product - 0.25} at={T.product} y={PANEL.top + PANEL.h} h={PROD.top - (PANEL.top + PANEL.h)} />
      <Producto />
      <Conector from={T.rowA - 0.3} at={T.rowA} y={PROD.top + PROD.h} h={R.A - (PROD.top + PROD.h)} />
      <Resultado at={T.rowA} top={R.A} h={R.hAB} tag="01" title="Disfrutar" />
      <Resultado at={T.rowB} top={R.B} h={R.hAB} tag="02" title="Rentabilizar" />
      <Resultado at={T.rowC} top={R.C} h={R.hC} tag="03" title="Grandes ganancias">
        <Grafico />
      </Resultado>
    </AbsoluteFill>
  );
};
