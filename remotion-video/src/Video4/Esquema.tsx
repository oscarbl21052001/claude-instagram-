import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// Esquema del hueco gris de VIDEO 4 (14,73–31,03 s), inspirado en awesome-opus5-5-videos (solo el lenguaje visual, ninguna pieza copiada):
//  · titular en dos voces, sans negrita + serif cursiva ("They write or record.", "Already have reviews?");
//  · curva dibujada a pluma con notas manuscritas ("Two highs, stacked." y el gráfico de easing con anotaciones en rojo);
//  · interfaz de app con cursor virtual que hace clic en pestañas ("Six answers.", "Ask them all at once", insignias del móvil).
// Fase A (14,9–22,4 s): curva de plusvalía en obra. Fase B (22,6–31 s): "al entregarse", tres pestañas que se activan con el cursor.

export const V4_FPS = 30;
export const GAP_IN = 442; // 14,73 s: empieza el hueco gris
export const GAP_OUT = 931; // 31,03 s: vuelve ella
export const T = (s: number) => Math.round(s * V4_FPS);

const INK = "#1a1a1a";
const PEN = "#3a2a12";
const GOLD_DEEP = "#8f5f12";
const GOLD = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = Easing.out(Easing.cubic);
const easeIO = Easing.inOut(Easing.cubic);

const FONTS = [
  { family: "Playfair Display", file: "PlayfairDisplay-MediumItalic.woff2", weight: "500", style: "italic" },
  { family: "Caveat", file: "Caveat-Bold.woff2", weight: "700", style: "normal" },
];
export const useEsquemaFonts = () => {
  const [handle] = useState(() => delayRender("Cargando tipografías del esquema"));
  useEffect(() => {
    Promise.all(FONTS.map((f) => loadFont({ family: f.family, url: staticFile(`fonts/${f.file}`), weight: f.weight, style: f.style }))).then(() => continueRender(handle));
  }, [handle]);
};

const useSpr = (startS: number, damping = 20, stiffness = 90) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - T(startS), fps, config: { damping, stiffness } });
};

// aparición con desenfoque; sale con desenfoque hacia arriba
const useAppear = (inS: number, outS: number) => {
  const f = useCurrentFrame();
  const p = Math.min(useSpr(inS, 22, 100), 1);
  const out = clamp01((f - T(outS)) / 10);
  const visible = f >= T(inS) && f < T(outS) + 12;
  return { visible, opacity: clamp01(p * 2) * (1 - out), y: (1 - p) * 34 - out * 30, blur: (1 - p) * 10 + out * 10 };
};

// ---------- placa de título: tarjeta oscura con marco dorado, Bebas Neue en mayúsculas ----------
const Placa: React.FC<{ inS: number; outS: number; eyebrow?: string; main: string; typed?: [number, number] }> = ({ inS, outS, eyebrow, main, typed }) => {
  const f = useCurrentFrame();
  const a = useAppear(inS, outS);
  if (!a.visible) return null;
  const sh = clamp01((f - T(inS) - 10) / 28); // un solo destello que cruza la placa
  const n = typed ? Math.round(main.length * clamp01((f - T(typed[0])) / (T(typed[1]) - T(typed[0])))) : main.length;
  return (
    <div style={{ position: "absolute", left: 130, top: 230, width: 820, height: 230, opacity: a.opacity, transform: `translateY(${a.y}px)`, filter: `blur(${a.blur}px)` }}>
      <div
        style={{
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
          width: "100%",
          height: "100%",
          borderRadius: 44,
          border: "6px solid transparent",
          background: `linear-gradient(180deg, #2B2B2B 0%, ${INK} 100%) padding-box, ${GOLD} border-box`,
          boxShadow: "0 30px 70px rgba(70,44,18,0.45)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {eyebrow && <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 26, letterSpacing: 7, color: "#C7AE6A" }}>{eyebrow}</div>}
        <div style={{ fontFamily: "Bebas Neue", fontSize: 118, letterSpacing: 7, lineHeight: 1, color: "#F4EAD3", marginTop: eyebrow ? 8 : 0, whiteSpace: "nowrap" }}>
          {typed ? (
            <>
              <span>{main.slice(0, n)}</span>
              {/* cursor que parpadea mientras no ha terminado de teclear */}
              <span style={{ display: "inline-block", width: 7, height: 96, marginLeft: 2, marginRight: -9, transform: "translateY(10px)", background: "#E2A826", opacity: n >= main.length && f > T(typed[1]) + 20 ? 0 : Math.sin((f / V4_FPS) * 14) > -0.3 ? 1 : 0 }} />
              <span style={{ opacity: 0 }}>{main.slice(n)}</span>
            </>
          ) : (
            main
          )}
        </div>
        {sh > 0 && sh < 1 && (
          <div style={{ position: "absolute", top: -20, bottom: -20, left: -240 + sh * 1300, width: 150, background: "linear-gradient(100deg, rgba(255,248,225,0), rgba(255,248,225,0.3), rgba(255,248,225,0))", transform: "skewX(-18deg)" }} />
        )}
      </div>
    </div>
  );
};

// ---------- fase A: curva dibujada a pluma ----------
const P0: [number, number] = [170, 1280];
const P1: [number, number] = [520, 1270];
const P2: [number, number] = [650, 880];
const P3: [number, number] = [920, 780];
const bez = (u: number): [number, number] => {
  const k = 1 - u;
  return [
    k * k * k * P0[0] + 3 * k * k * u * P1[0] + 3 * k * u * u * P2[0] + u * u * u * P3[0],
    k * k * k * P0[1] + 3 * k * k * u * P1[1] + 3 * k * u * u * P2[1] + u * u * u * P3[1],
  ];
};
const CURVE_FROM = 16.4;
const CURVE_TO = 21.7;
const N = 140;

const Nota: React.FC<{ at: number; x: number; y: number; text: string; size?: number; rot?: number; color?: string }> = ({ at, x, y, text, size = 64, rot = -3, color = PEN }) => {
  const f = useCurrentFrame();
  const q = clamp01((f - T(at)) / 12);
  const out = clamp01((f - T(22.3)) / 10);
  if (q <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, fontFamily: "Caveat", fontWeight: 700, fontSize: size, color, whiteSpace: "nowrap", transform: `rotate(${rot}deg) translateY(${(1 - easeOut(q)) * 14}px)`, opacity: q * (1 - out), filter: `blur(${out * 8}px)` }}>
      {text}
    </div>
  );
};

const CurvaPluma: React.FC = () => {
  const f = useCurrentFrame();
  const a = useAppear(15.1, 22.3);
  if (!a.visible) return null;
  const prog = clamp01((f - T(CURVE_FROM)) / (T(CURVE_TO) - T(CURVE_FROM)));
  const upto = Math.round(prog * N);
  let d = "";
  for (let i = 0; i <= upto; i++) {
    const [x, y] = bez(i / N);
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  const tip = bez(prog);
  const axis = easeOut(clamp01((f - T(15.1)) / 16));
  const m1 = bez(0);
  const m3 = bez((21.4 - CURVE_FROM) / (CURVE_TO - CURVE_FROM));
  const dot = (p: [number, number], at: number, r = 13) => {
    const q = clamp01((f - T(at)) / 8);
    return q > 0 ? <circle cx={p[0]} cy={p[1]} r={r * easeOut(q)} fill="#F6F1E6" stroke={PEN} strokeWidth={5} /> : null;
  };
  const swoosh = easeOut(clamp01((f - T(21.5)) / 14));
  const band = easeOut(clamp01((f - T(17.8)) / 55));
  const pulse = 1 + 0.18 * Math.sin(((f - T(21.4)) / V4_FPS) * 7);
  return (
    <AbsoluteFill style={{ opacity: a.opacity, filter: `blur(${a.blur}px)` }}>
      <svg width={1080} height={1920}>
        <defs>
          <linearGradient id="gb" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8f7138" />
            <stop offset="45%" stopColor="#E6CE86" />
            <stop offset="100%" stopColor="#B98512" />
          </linearGradient>
        </defs>
        {/* ejes y guías (sin cifras: el gráfico es ilustrativo) */}
        <path d="M 150 1310 L 150 700" stroke={PEN} strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={0.55} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - axis} />
        <path d="M 150 1310 L 980 1310" stroke={PEN} strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={0.55} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - axis} />
        {[1100, 900].map((yy) => (
          <line key={yy} x1={150} x2={980} y1={yy} y2={yy} stroke={PEN} strokeWidth={1.5} strokeDasharray="4 12" opacity={0.28 * axis} />
        ))}
        {/* banda de financiación: corre por debajo del eje mientras la curva sube (la constructora financia durante la obra) */}
        {f >= T(17.8) && (
          <>
            <rect x={150} y={1338} width={830 * band} height={26} rx={13} fill="url(#gb)" />
            {Array.from({ length: 11 }).map((_, k) => {
              const x = 150 + ((k + 1) * 830) / 12;
              return x < 150 + 830 * band - 8 ? <line key={k} x1={x} x2={x} y1={1342} y2={1360} stroke="#FFF8E7" strokeWidth={3} strokeLinecap="round" opacity={0.85} /> : null;
            })}
          </>
        )}
        {d && <path d={d} fill="none" stroke={PEN} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />}
        {d && <path d={d} fill="none" stroke="#C9A55A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} transform="translate(0,-5)" />}
        {dot(m1, CURVE_FROM)}
        {f >= T(21.4) && (
          <>
            <circle cx={m3[0]} cy={m3[1]} r={34 * pulse} fill="rgba(226,168,38,0.28)" />
            <circle cx={m3[0]} cy={m3[1]} r={15} fill="#C9A55A" stroke={PEN} strokeWidth={5} />
          </>
        )}
        {/* subrayado manuscrito bajo "plusvalía" */}
        <path d="M 640 700 C 720 716, 820 706, 930 690" fill="none" stroke="#C0392B" strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - swoosh} opacity={0.9} />
        {f < T(CURVE_TO) && prog > 0 && <circle cx={tip[0]} cy={tip[1]} r={8} fill={PEN} opacity={0.9} />}
      </svg>
      <Nota at={CURVE_FROM} x={178} y={1040} text="mejor precio" />
      <Nota at={18.3} x={170} y={1372} text="mayor financiación" rot={-1.5} />
      <Nota at={21.45} x={655} y={618} text="plusvalía" size={78} rot={-4} color="#B03A2E" />
    </AbsoluteFill>
  );
};

// ---------- fase B: interfaz de app con cursor ----------
const TABS = [
  { key: "Revender", at: 23.84, until: 25.3, sub: "con ganancia." },
  { key: "Reinvertir", at: 25.3, until: 27.95, sub: "y seguir escalando tu patrimonio." },
  { key: "Renta", at: 27.95, until: 31.0, sub: "si no vendés: la rentabilidad." },
];
const CARD = { x: 90, y: 540, w: 900, h: 790 };
const TAB_Y = CARD.y + 70; // centro vertical de las pestañas
const TAB_W = 276;
const TAB_X0 = CARD.x + 36 + TAB_W / 2; // centro de la primera pestaña
const tabCx = (i: number) => TAB_X0 + i * TAB_W;
const CHIP = { cx: 540, cy: CARD.y + 640 };

// recorrido del cursor: [segundo, x, y]
const PATH: [number, number, number][] = [
  [22.7, 930, 1560],
  [23.7, tabCx(0) + 24, TAB_Y + 18],
  [24.4, tabCx(0) + 24, TAB_Y + 18],
  [25.2, tabCx(1) + 24, TAB_Y + 18],
  [26.4, tabCx(1) + 24, TAB_Y + 18],
  [27.85, tabCx(2) + 24, TAB_Y + 18],
  [28.4, tabCx(2) + 24, TAB_Y + 18],
  [29.55, CHIP.cx + 120, CHIP.cy + 14],
  [31.1, CHIP.cx + 120, CHIP.cy + 14],
];
const CLICKS = [23.84, 25.3, 28.0, 29.7];

const cursorAt = (f: number): [number, number] => {
  const s = f / V4_FPS;
  if (s <= PATH[0][0]) return [PATH[0][1], PATH[0][2]];
  for (let i = 1; i < PATH.length; i++) {
    if (s <= PATH[i][0]) {
      const q = easeIO(clamp01((s - PATH[i - 1][0]) / (PATH[i][0] - PATH[i - 1][0])));
      return [PATH[i - 1][1] + (PATH[i][1] - PATH[i - 1][1]) * q, PATH[i - 1][2] + (PATH[i][2] - PATH[i - 1][2]) * q];
    }
  }
  const l = PATH[PATH.length - 1];
  return [l[1], l[2]];
};

const Icono: React.FC<{ k: string; size?: number }> = ({ k, size = 120 }) => {
  const s = { fill: "none", stroke: INK, strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: "linear-gradient(180deg,#FFF8E7,#F1E2BC)", border: "3px solid #C7AE6A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(120,80,20,0.25)" }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 48 48">
        {k === "Revender" && (
          <>
            <path d="M6 24 L24 6 H40 V22 L22 40 Z" {...s} />
            <circle cx="32" cy="14" r="2.5" fill={INK} />
          </>
        )}
        {k === "Reinvertir" && (
          <>
            <path d="M10 22 A14 14 0 0 1 36 14" {...s} />
            <path d="M37 6 V15 H28" {...s} />
            <path d="M38 26 A14 14 0 0 1 12 34" {...s} />
            <path d="M11 42 V33 H20" {...s} />
          </>
        )}
        {k === "Renta" && (
          <>
            <path d="M6 22 L24 8 L42 22" {...s} />
            <path d="M12 20 V38 H36 V20" {...s} />
            <circle cx="24" cy="29" r="5" {...s} />
          </>
        )}
      </svg>
    </div>
  );
};

const Panel: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const t = TABS[i];
  const q = clamp01((f - T(t.at)) / 14);
  const out = i < TABS.length - 1 ? clamp01((f - (T(t.until) - 6)) / 6) : 0;
  if (q <= 0 || out >= 1) return null;
  const chipOn = i === 2 ? clamp01((f - T(29.7)) / 8) : 0;
  const chipIn = i === 2 ? easeOut(clamp01((f - T(28.5)) / 12)) : 0;
  return (
    <div style={{ position: "absolute", left: CARD.x + 36, top: CARD.y + 150, width: CARD.w - 72, height: 560, opacity: easeOut(q) * (1 - out), transform: `translateY(${(1 - easeOut(q)) * 36 - out * 20}px)`, filter: `blur(${(1 - q) * 8 + out * 8}px)`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 36 }}>
      <Icono k={t.key} />
      <div style={{ marginTop: 34, fontFamily: "Inter", fontWeight: 800, fontSize: 104, letterSpacing: -2, color: INK, lineHeight: 1 }}>{t.key}</div>
      <div style={{ marginTop: 14, fontFamily: "Playfair Display", fontStyle: "italic", fontWeight: 500, fontSize: 48, color: GOLD_DEEP, textAlign: "center" }}>{t.sub}</div>
      {i === 2 && (
        <div style={{ marginTop: 56, opacity: chipIn, transform: `translateY(${(1 - chipIn) * 24}px)`, display: "flex", alignItems: "center", gap: 14, padding: "0 34px", height: 84, borderRadius: 42, background: chipOn > 0.5 ? GOLD : INK, border: "3px solid #C7AE6A", color: chipOn > 0.5 ? INK : "#F4EAD3", fontFamily: "Inter", fontWeight: 800, fontSize: 30, letterSpacing: 3, boxShadow: chipOn > 0.5 ? "0 0 0 6px rgba(201,165,90,0.3), 0 14px 30px rgba(70,44,18,0.35)" : "0 12px 26px rgba(70,44,18,0.35)" }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>↻</span>
          FINANCIA LA INVERSIÓN
        </div>
      )}
    </div>
  );
};

const Esqueleto: React.FC = () => {
  const f = useCurrentFrame();
  const first = T(TABS[0].at);
  const gone = clamp01((f - first) / 8);
  const shimmer = 0.5 + 0.5 * Math.sin((f / V4_FPS) * 4);
  return (
    <div style={{ position: "absolute", left: CARD.x + 60, top: CARD.y + 230, width: CARD.w - 120, opacity: 1 - gone }}>
      {[0.72, 1, 0.55].map((w, k) => (
        <div key={k} style={{ height: k === 0 ? 96 : 34, width: `${w * 100}%`, margin: "0 auto 30px", borderRadius: 18, background: `rgba(26,26,26,${0.07 + 0.04 * shimmer})` }} />
      ))}
    </div>
  );
};

const Cursor: React.FC = () => {
  const f = useCurrentFrame();
  const s = f / V4_FPS;
  if (s < PATH[0][0] - 0.1) return null;
  const [x, y] = cursorAt(f);
  const inn = clamp01((s - PATH[0][0]) / 0.3);
  const out = clamp01((f - T(31.9)) / 8);
  // pequeño "hundimiento" al hacer clic y onda
  let press = 0;
  let ripple: { x: number; y: number; q: number } | null = null;
  for (const c of CLICKS) {
    const d = (f - T(c)) / V4_FPS;
    if (d > -0.08 && d < 0.14) press = Math.max(press, 1 - Math.abs(d) / 0.14);
    if (d >= 0 && d < 0.55) ripple = { x, y, q: d / 0.55 };
  }
  return (
    <>
      {ripple && <div style={{ position: "absolute", left: ripple.x - 60 * ripple.q - 8, top: ripple.y - 60 * ripple.q - 8, width: 120 * ripple.q + 16, height: 120 * ripple.q + 16, borderRadius: "50%", border: "5px solid rgba(143,95,18,0.8)", opacity: (1 - ripple.q) * (1 - out) }} />}
      <svg width={64} height={78} viewBox="0 0 24 36" style={{ position: "absolute", left: x - 4, top: y - 3, opacity: inn * (1 - out), transform: `scale(${1 - 0.12 * press})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 8px 10px rgba(40,26,8,0.45))" }}>
        <path d="M1.5 1.5 L1.5 28 L8.6 21.6 L13.4 33 L18 31 L13.2 19.8 L22.6 19.8 Z" fill="#FFFFFF" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
};

const InterfazApp: React.FC = () => {
  const f = useCurrentFrame();
  const a = useAppear(22.6, 31.9);
  if (!a.visible) return null;
  const idx = (() => {
    let k = -1;
    TABS.forEach((t, i) => {
      if (f >= T(t.at)) k = i;
    });
    return k;
  })();
  // indicador deslizante entre pestañas
  const target = Math.max(idx, 0);
  const prev = Math.max(idx - 1, 0);
  const moveQ = idx <= 0 ? 1 : easeOut(clamp01((f - T(TABS[idx].at)) / 12));
  const ind = tabCx(prev) + (tabCx(target) - tabCx(prev)) * moveQ;
  const hover = idx < 0 ? 0 : 1;
  return (
    <AbsoluteFill style={{ opacity: a.opacity, filter: `blur(${a.blur}px)` }}>
      <div style={{ position: "absolute", left: CARD.x, top: CARD.y + a.y, width: CARD.w, height: CARD.h, borderRadius: 52, background: "rgba(255,255,255,0.9)", border: "2px solid rgba(255,255,255,0.8)", boxShadow: "0 40px 90px rgba(70,44,18,0.4), 0 6px 18px rgba(70,44,18,0.18)" }}>
        {/* barra superior estilo ventana */}
        <div style={{ position: "absolute", left: 40, top: -26, display: "flex", gap: 10 }} />
        <div style={{ position: "absolute", left: 36, top: 36, width: CARD.w - 72, height: 68, borderRadius: 34, background: "rgba(26,26,26,0.07)" }}>
          <div style={{ position: "absolute", left: ind - TAB_W / 2 - CARD.x - 36 + 4, top: 4, width: TAB_W - 8, height: 60, borderRadius: 30, background: GOLD, opacity: hover, boxShadow: "0 6px 16px rgba(120,80,20,0.35)" }} />
          {TABS.map((t, i) => (
            <div key={t.key} style={{ position: "absolute", left: i * TAB_W, top: 0, width: TAB_W, height: 68, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter", fontWeight: 800, fontSize: 28, letterSpacing: 1, color: idx === i ? INK : "rgba(26,26,26,0.5)" }}>
              {t.key}
            </div>
          ))}
        </div>
      </div>
      <Esqueleto />
      {TABS.map((_, i) => (
        <Panel key={i} i={i} />
      ))}
      <Cursor />
    </AbsoluteFill>
  );
};

const Camel: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg, #EFE6D4 0%, #E6D8BF 45%, #DCCBAE 100%)" }}>
    <AbsoluteFill style={{ background: "radial-gradient(900px 700px at 50% 18%, rgba(255,252,243,0.55), rgba(255,252,243,0))" }} />
    <AbsoluteFill style={{ background: "radial-gradient(1400px 1400px at 50% 55%, rgba(0,0,0,0), rgba(90,58,20,0.12))" }} />
  </AbsoluteFill>
);

const IRIS_MAX = 1160; // radio que cubre la pantalla desde el centro
const IRIS_CX = 540;
const IRIS_CY = 960;
const IRIS_FRAMES = 18;

// A. Iris: un punto dorado crece hasta un círculo camel que cubre el hueco gris (se abre sobre ella, ya llena el plano cuando
// llega el corte a gris de 14,73 s) y se cierra sobre el fondo gris justo cuando ella reaparece (31,03 s).
export const Esquema: React.FC = () => {
  const f = useCurrentFrame();
  useEsquemaFonts();
  const open0 = GAP_IN - IRIS_FRAMES;
  const openQ = easeIO(clamp01((f - open0) / IRIS_FRAMES));
  const closeQ = easeIO(clamp01((f - GAP_OUT) / IRIS_FRAMES));
  const R = IRIS_MAX * openQ * (1 - closeQ);
  const dot = 26 * clamp01((f - (open0 - 8)) / 8) * (1 - clamp01((f - (GAP_OUT + IRIS_FRAMES)) / 8));
  if (f < open0 - 8 || f > GAP_OUT + IRIS_FRAMES + 9) return null;
  const ring = Math.max(0, 1 - R / 1000);
  return (
    <AbsoluteFill>
      {R > 0 && (
        <AbsoluteFill style={{ clipPath: `circle(${R}px at ${IRIS_CX}px ${IRIS_CY}px)` }}>
          <Camel />
          <Placa inS={14.9} outS={22.3} eyebrow="01 · EN OBRA" main="COMPRA DE POZO" />
          <CurvaPluma />
          <Placa inS={22.65} outS={31.9} eyebrow="02 · AL ENTREGARSE" main="TRES SALIDAS" />
          <InterfazApp />
        </AbsoluteFill>
      )}
      {R > 0 && R < IRIS_MAX && (
        <div style={{ position: "absolute", left: IRIS_CX - R, top: IRIS_CY - R, width: 2 * R, height: 2 * R, borderRadius: "50%", border: "5px solid rgba(243,235,182,0.9)", boxSizing: "border-box", opacity: 0.85 * ring, boxShadow: "0 0 40px rgba(226,168,38,0.55)" }} />
      )}
      {dot > 0.5 && R < 40 && (
        <div style={{ position: "absolute", left: IRIS_CX - dot, top: IRIS_CY - dot, width: 2 * dot, height: 2 * dot, borderRadius: "50%", background: "radial-gradient(circle, #FFF1C4 0%, #E2A826 70%)", boxShadow: "0 0 50px 14px rgba(226,168,38,0.65)" }} />
      )}
    </AbsoluteFill>
  );
};

// B. Cierre (41,15–44 s): la placa de título hace de caja de texto y teclea la palabra clave mientras ella la dice
// ("Escribí apalancamiento"); al terminar, el botón pasa de ENVIAR a ✓ ENVIADO. Vive sobre el vídeo real (ella sigue en pantalla).
export const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  const q = Math.min(useSpr(42.5, 20, 110), 1);
  const sent = clamp01((f - T(42.95)) / 6);
  const press = f >= T(42.95) && f < T(42.95) + 6 ? 1 : 0;
  return (
    <>
      <Placa inS={41.15} outS={44.6} eyebrow="ESCRIBÍ" main="APALANCAMIENTO" typed={[41.72, 42.5]} />
      {f >= T(42.5) && (
        <div style={{ position: "absolute", left: 540 - 170, top: 500, width: 340, height: 78, opacity: clamp01(q * 2), transform: `translateY(${(1 - q) * 24}px) scale(${1 - 0.06 * press})`, borderRadius: 39, border: "4px solid #C7AE6A", background: sent > 0.5 ? GOLD : INK, color: sent > 0.5 ? INK : "#F4EAD3", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter", fontWeight: 800, fontSize: 28, letterSpacing: 4, boxShadow: sent > 0.5 ? "0 0 0 6px rgba(201,165,90,0.3), 0 14px 30px rgba(70,44,18,0.35)" : "0 12px 26px rgba(70,44,18,0.35)" }}>
          {sent > 0.5 ? "✓ ENVIADO" : "ENVIAR ↗"}
        </div>
      )}
    </>
  );
};
