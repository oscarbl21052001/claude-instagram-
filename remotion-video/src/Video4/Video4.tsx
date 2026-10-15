import { Video } from "@remotion/media";
import { AbsoluteFill, Easing, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useKitFonts } from "../kit";

// Edit "VIDEO 4" (43,97 s, 1080x1920, 30 fps): inversión en pozo con financiamiento de la constructora.
// El plano tiene un hueco sin imagen (fotogramas 442–930: fondo gris, solo se oye su voz). Ese hueco se tapa con un fondo camel
// y un esquema que se construye al ritmo de la frase (opción 4: "tres salidas al entregar"). Subtítulos como en CAPRI v3.7/3.8.
// Capas: vídeo → fondo camel + esquema (fundido de entrada/salida sobre los cortes) → subtítulos.

export const V4_FPS = 30;
export const V4_DURATION = 1319;
export const V4_W = 1080;
export const V4_H = 1920;

const T = (s: number) => Math.round(s * V4_FPS);
const GAP_IN = 442; // 14,73 s: empieza el hueco gris
const GAP_OUT = 931; // 31,03 s: vuelve ella

const GOLD = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";
const DEEP = "#8f7138";
const INK = "#1a1a1a";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = Easing.out(Easing.cubic);

const useSpr = (start: number, damping = 20, stiffness = 90) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - start, fps, config: { damping, stiffness } });
};

// ---------- tarjetas ----------
const CARD_W = 640;
const CARD_H = 190;
const CARD_X = 160;
const CENTER_X = CARD_X + CARD_W / 2;
const DY = 100; // todo el esquema baja 100 px: queda centrado en la zona útil (y 300–1500)

type Card = { y: number; at: number; main: string; label?: string; mainSize?: number; glow: [number, number]; out: number };

const Tarjeta: React.FC<{ c: Card }> = ({ c }) => {
  const f = useCurrentFrame();
  const p = useSpr(T(c.at), 19, 85);
  if (f < T(c.at)) return null;
  const e = Math.min(p, 1);
  const out = clamp01((f - T(c.out)) / 10);
  const active = f >= T(c.glow[0]) && f < T(c.glow[1]);
  return (
    <div
      style={{
        position: "absolute",
        left: CARD_X,
        top: c.y + DY,
        width: CARD_W,
        height: CARD_H,
        opacity: clamp01(e * 2.2) * (1 - out),
        transform: `translateY(${(1 - e) * 70 - out * 40}px)`,
        filter: `blur(${(1 - e) * 8 + out * 10}px)`,
      }}
    >
      <div
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          border: "8px solid transparent",
          borderRadius: 40,
          background: `linear-gradient(180deg, #FFFFFF 0%, #F6F1E6 100%) padding-box, ${GOLD} border-box`,
          boxShadow: active
            ? "0 0 0 3px rgba(226,168,38,0.35), 0 0 54px rgba(226,168,38,0.5), 0 22px 54px rgba(70,44,18,0.4)"
            : "0 22px 54px rgba(70,44,18,0.38)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {c.label && (
          <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 25, letterSpacing: 5, color: DEEP, marginBottom: 4 }}>{c.label}</div>
        )}
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: c.mainSize ?? 54, letterSpacing: 2.5, color: INK, whiteSpace: "nowrap" }}>{c.main}</div>
      </div>
    </div>
  );
};

// Cabecera oscura con marco dorado (reutiliza el tono azul/negro de las tarjetas "protagonistas" de CAPRI)
const Cabecera: React.FC<{ at: number; out: number; text: string }> = ({ at, out: outAt, text }) => {
  const f = useCurrentFrame();
  const p = useSpr(T(at), 20, 90);
  if (f < T(at)) return null;
  const e = Math.min(p, 1);
  const out = clamp01((f - T(outAt)) / 10);
  return (
    <div
      style={{
        position: "absolute",
        left: CARD_X + 60,
        top: 300 + DY,
        width: CARD_W - 120,
        height: 108,
        opacity: clamp01(e * 2.2) * (1 - out),
        transform: `translateY(${(1 - e) * -50 - out * 40}px)`,
        filter: `blur(${(1 - e) * 8 + out * 10}px)`,
      }}
    >
      <div
        style={{
          boxSizing: "border-box",
          width: "100%",
          height: "100%",
          border: "6px solid transparent",
          borderRadius: 54,
          background: `linear-gradient(180deg, #2B2B2B 0%, ${INK} 100%) padding-box, ${GOLD} border-box`,
          boxShadow: "0 18px 44px rgba(70,44,18,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter",
          fontWeight: 800,
          fontSize: 38,
          letterSpacing: 6,
          color: "#F4EAD3",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Hilo dorado vertical que baja por detrás de las tarjetas
const Hilo: React.FC<{ from: number; to: number; out: number }> = ({ from, to, out: outAt }) => {
  const f = useCurrentFrame();
  const q = easeOut(clamp01((f - T(from)) / (T(to) - T(from))));
  const out = clamp01((f - T(outAt)) / 10);
  if (f < T(from)) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: CENTER_X - 3,
        top: 400 + DY,
        width: 6,
        height: 700,
        borderRadius: 3,
        background: GOLD,
        opacity: 0.9 * (1 - out),
        transformOrigin: "top",
        transform: `scaleY(${q})`,
        boxShadow: "0 0 18px rgba(226,168,38,0.45)",
      }}
    />
  );
};

// ---------- esquema ----------
// Fase A (14,9–22,5 s): en obra. Fase B (22,76–31 s): al entregarse → tres salidas, y la renta financia la inversión.
const FASE_A: Card[] = [
  { y: 520, at: 16.4, main: "MEJOR PRECIO", glow: [16.4, 17.9], out: 22.3 },
  { y: 760, at: 17.98, main: "MAYOR FINANCIACIÓN", mainSize: 44, glow: [17.98, 19.3], out: 22.3 },
  { y: 1000, at: 21.0, main: "PLUSVALÍA", label: "EN OBRA", glow: [21.0, 22.3], out: 22.3 },
];
const FASE_B: Card[] = [
  { y: 520, at: 23.84, main: "REVENDER", label: "CON GANANCIA", glow: [23.84, 24.9], out: 31.0 },
  { y: 760, at: 25.3, main: "REINVERTIR", label: "Y SEGUIR ESCALANDO", glow: [25.3, 27.6], out: 31.0 },
  { y: 1000, at: 27.9, main: "RENTA", label: "SI NO VENDÉS", glow: [29.44, 31.0], out: 31.0 },
];

const Bucle: React.FC = () => {
  const f = useCurrentFrame();
  const q = easeOut(clamp01((f - T(30.2)) / 22));
  const pill = useSpr(T(30.5), 18, 110);
  const out = clamp01((f - T(31.0)) / 10);
  if (f < T(30.2)) return null;
  const x0 = CARD_X + CARD_W;
  const y0 = 1000 + DY + CARD_H / 2;
  const y1 = 760 + DY + CARD_H / 2;
  const d = `M ${x0 + 4} ${y0} C ${x0 + 150} ${y0}, ${x0 + 150} ${y1}, ${x0 + 14} ${y1}`;
  return (
    <>
      <svg width={V4_W} height={V4_H} style={{ position: "absolute", left: 0, top: 0, opacity: 1 - out }}>
        <defs>
          <linearGradient id="g4" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#8f7138" />
            <stop offset="50%" stopColor="#F3EBB6" />
            <stop offset="100%" stopColor="#B98512" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="url(#g4)" strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - q} style={{ filter: "drop-shadow(0 6px 10px rgba(70,44,18,0.4))" }} />
        <polygon
          points={`${x0 - 10},${y1} ${x0 + 24},${y1 - 24} ${x0 + 24},${y1 + 24}`}
          fill="#B98512"
          opacity={clamp01((q - 0.9) * 10)}
          style={{ filter: "drop-shadow(0 4px 6px rgba(70,44,18,0.4))" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: x0 + 150 * 0.75 - 78 + 4,
          top: (y0 + y1) / 2 - 24,
          width: 156,
          height: 48,
          borderRadius: 24,
          background: INK,
          border: "2px solid #C7AE6A",
          color: "#F4EAD3",
          fontFamily: "Inter",
          fontWeight: 800,
          fontSize: 20,
          letterSpacing: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: clamp01(pill * 2) * (1 - out),
          transform: `scale(${Math.min(pill, 1.15)})`,
        }}
      >
        FINANCIA
      </div>
    </>
  );
};

// Fondo camel claro (mismo degradado que CAPRI v3) con un velo de luz suave arriba
const Camel: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg, #E5CA9C 0%, #DDBC8D 45%, #CEA676 100%)" }}>
    <AbsoluteFill style={{ background: "radial-gradient(900px 700px at 50% 18%, rgba(255,245,222,0.45), rgba(255,245,222,0))" }} />
    <AbsoluteFill style={{ background: "radial-gradient(1400px 1400px at 50% 55%, rgba(0,0,0,0), rgba(90,58,20,0.22))" }} />
  </AbsoluteFill>
);

const Esquema: React.FC = () => {
  const f = useCurrentFrame();
  // fundido de entrada sobre el corte de 14,73 s (la imagen real pasa a gris justo en GAP_IN) y de salida sobre el de 31,03 s
  const inn = clamp01((f - (GAP_IN - 8)) / 10);
  const out = 1 - clamp01((f - GAP_OUT) / 14);
  const op = Math.min(inn, out);
  if (op <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <Camel />
      <Hilo from={16.4} to={21.4} out={22.3} />
      <Hilo from={23.84} to={28.4} out={31.0} />
      <Cabecera at={14.9} out={22.3} text="COMPRA DE POZO" />
      <Cabecera at={22.76} out={31.0} text="AL ENTREGARSE" />
      {FASE_A.map((c) => (
        <Tarjeta key={c.main} c={c} />
      ))}
      {FASE_B.map((c) => (
        <Tarjeta key={c.main} c={c} />
      ))}
      <Bucle />
    </AbsoluteFill>
  );
};

// ---------- subtítulos (estilo CAPRI v3.7/3.8: una línea, Inter Medium 30 px, blanco, 175 px del borde) ----------
// Texto de la transcripción (faster-whisper medium) con las correcciones de la persona: "de pozo", "vos podés", "apalancamiento".
const SUBS: { a: number; b: number; t: string }[] = [
  { a: 0.0, b: 3.2, t: "Si estás invirtiendo solo con tu dinero," },
  { a: 3.66, b: 4.3, t: "estás perdiendo." },
  { a: 4.42, b: 5.4, t: "¿Cómo funciona?" },
  { a: 5.78, b: 7.15, t: "Básicamente, el financiamiento" },
  { a: 7.18, b: 8.7, t: "te lo dan las constructoras." },
  { a: 8.8, b: 10.2, t: "Es decir, que vos podés iniciar" },
  { a: 10.22, b: 11.3, t: "con un capital mínimo" },
  { a: 11.32, b: 12.5, t: "comprando de pozo" },
  { a: 12.58, b: 14.8, t: "y financiarte directamente con ellos." },
  { a: 14.86, b: 16.3, t: "Cuando invertís de esta forma," },
  { a: 16.42, b: 17.6, t: "comprás al mejor precio" },
  { a: 17.7, b: 19.3, t: "y con la mayor financiación." },
  { a: 19.38, b: 20.55, t: "Es ahí, durante la obra," },
  { a: 20.6, b: 22.4, t: "cuando tu inmueble gana plusvalía." },
  { a: 22.52, b: 24.9, t: "Al entregarse, podés revender con ganancia" },
  { a: 24.96, b: 27.6, t: "o reinvertir y seguir escalando tu patrimonio." },
  { a: 27.66, b: 31.0, t: "Y si no querés vender, aprovechás la rentabilidad." },
  { a: 31.24, b: 32.85, t: "Lo interesante es que una vez que" },
  { a: 32.9, b: 33.95, t: "el inmueble se entregue," },
  { a: 34.04, b: 35.95, t: "vas a poder ayudarte con la rentabilidad" },
  { a: 36.12, b: 37.9, t: "para financiar esa inversión." },
  { a: 38.06, b: 39.95, t: "Invertir inteligente no es invertir" },
  { a: 40.04, b: 41.2, t: "con todo tu dinero." },
  { a: 41.28, b: 43.9, t: "Escribí “apalancamiento” y te cuento más." },
];

const Subtitulos: React.FC = () => {
  const f = useCurrentFrame();
  let op = 0;
  let text = "";
  for (const s of SUBS) {
    const a = T(s.a) - 1;
    const b = T(s.b);
    const o = Math.min(clamp01((f - a) / 4), clamp01((b + 4 - f) / 4));
    if (o > op) {
      op = o;
      text = s.t;
    }
  }
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 420, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)" }} />
      {op > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 175, display: "flex", flexDirection: "column", alignItems: "center", opacity: op }}>
          <div style={{ width: 56, height: 1.5, background: "rgba(255,255,255,0.8)", marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }} />
          <div
            style={{
              fontFamily: "Inter",
              fontWeight: 500,
              fontSize: 30,
              letterSpacing: 1.2,
              color: "#FFFFFF",
              textShadow: "0 1px 3px rgba(0,0,0,0.75), 0 2px 12px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.5)",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </div>
        </div>
      )}
    </>
  );
};

export const Video4Edit: React.FC = () => {
  useKitFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Video src={staticFile("entrada/VIDEO-4-completo.mp4")} style={{ width: V4_W, height: V4_H }} objectFit="cover" />
      <Esquema />
      <Subtitulos />
    </AbsoluteFill>
  );
};
