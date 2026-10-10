import { Video } from "@remotion/media";
import { AbsoluteFill, Easing, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useKitFonts } from "../kit";

// Edit "Capri Residence" (24,9 s, 1080x1920, 50 fps). Plano original con tres cortes (6,28 · 12,70 · 21,00 s).
//  · 6,28 s: el fondo real pasa a un fondo difuminado hecho con sus propios colores; el corte se tapa con zoom + desenfoque.
//  · 7–9 s: dos tarjetas vacías detrás de ella · 9,3–12,5 s: esquema de "monto mínimo + gran financiamiento".
//  · 12,70 s: corte mínimo (ella se alinea en tamaño y posición con el plano siguiente).
//  · 12,9–21 s: esquema arriba a la izquierda con la explicación + tarjeta grande vacía a la derecha (18,4 s).
//  · 21,00 s: transición con zoom y desenfoque; vuelve el fondo real.
// Tarjetas: fondo blanco con marco dorado. Contenido de las tarjetas grandes: pendiente (la persona lo enviará).
// Capas: vídeo → fondo difuminado → tarjetas de detrás → recorte de ella → esquema delantero.

export const CAPRI_FPS = 50;
export const CAPRI_DURATION = 1244;
export const CAPRI_W = 1080;
export const CAPRI_H = 1920;

const T = (s: number) => Math.round(s * CAPRI_FPS);
const CUT1 = 314; // 6,28 s
const CUT2 = 635; // 12,70 s
const CUT3 = 1050; // 21,00 s
const M_FIRST = 290;
const M_LAST = 1075; // fotogramas con recorte de ella (hasta 0,5 s después del tercer corte)
const BG_END = 1076; // el fondo sin ella se usa hasta aquí; después, el vídeo real
const RAMP_START = 294; // el fondo empieza a difuminarse 0,4 s antes del primer corte
const FRAME_ZOOM = 1.16; // encuadre más cercano desde el primer corte: ella se ve más grande
const FRAME_PIVOT = "540px 1200px"; // escala ×1,16 desde un punto alto: mismo tamaño, pero ella queda unos 110 px más abajo y deja más aire para los esquemas

const GOLD = { border: "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)", deep: "#8f7138", mustard: "#B98512", ink: "#1a1a1a" };
const METAL = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeIn = Easing.in(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);

// ---------- cámara: zoom + desenfoque en los cortes 1 y 3 ----------
const CORTES = [
  { c: CUT1, peak: 1.3, blur: 16, out: 6, inn: 20 },
  { c: CUT2, peak: 1.18, blur: 10, out: 11, inn: 18 }, // mismo tipo de transición, más suave: la escena continúa
  { c: CUT3, peak: 1.3, blur: 16, out: 13, inn: 20 },
];
const camera = (f: number) => {
  for (const k of CORTES) {
    if (f >= k.c - k.out && f < k.c) {
      const v = (f - (k.c - k.out)) / k.out;
      return { scale: 1 + (k.peak - 1) * easeIn(v), blur: k.blur * v * v };
    }
    if (f >= k.c && f < k.c + k.inn) {
      const v = (f - k.c) / k.inn;
      return { scale: 1 + (k.peak - 1) * (1 - easeOut(v)), blur: k.blur * (1 - v) * (1 - v) };
    }
  }
  return { scale: 1, blur: 0 };
};

// ---------- alineación de ella en los cortes 1 y 2 (medida con el recorte) ----------
// Después de cada corte, fondo y ella arrancan en la posición/tamaño que tenía ella justo antes y se asientan en ~0,4 s: su cabeza no salta.
//  corte 1 (6,28 s): mismo tamaño (ancho de cabeza ≈ 200 px), pero ella queda 64 px más abajo y 14 px a la izquierda → se sube 64 y se mueve 14.
//  corte 2 (12,70 s): ancho de cabeza 209→182 px (×1,148), coronilla y 1023→1010, centro x 516→523 → ampliación ×1,148 desde la cabeza.
// Siempre escala ≥ 1 y desplazamientos pequeños: nunca se ven bordes vacíos.
const ALIGNS = [
  { c: CUT1, len: 22, s: 1, dx: 14, dy: -64, px: 600, py: 1062 },
  { c: CUT2, len: 25, s: 209 / 182, dx: -7, dy: 13, px: 523, py: 1010 },
];
const personAlign = (f: number): { transform: string; origin: string } | undefined => {
  for (const k of ALIGNS) {
    if (f >= k.c && f < k.c + k.len) {
      const q = 1 - easeOut(clamp01((f - k.c) / k.len));
      return { transform: `translate(${q * k.dx}px, ${q * k.dy}px) scale(${1 + q * (k.s - 1)})`, origin: `${k.px}px ${k.py}px` };
    }
  }
  return undefined;
};
// encuadre general: a partir del primer corte la imagen es algo más cercana
const framing = (f: number) => {
  if (f < RAMP_START || f >= CUT3) return 1;
  return 1 + (FRAME_ZOOM - 1) * easeOut(clamp01((f - RAMP_START) / 20));
};

// ---------- piezas ----------
const useSpr = (start: number, damping = 20, stiffness = 90) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - start, fps, config: { damping, stiffness } });
};

const Marco: React.FC<{ style?: React.CSSProperties; radius?: number; glow?: boolean; children?: React.ReactNode }> = ({ style, radius = 34, glow, children }) => (
  <div
    style={{
      boxSizing: "border-box",
      border: "8px solid transparent",
      borderRadius: radius,
      background: `linear-gradient(180deg, #FFFFFF 0%, #F6F1E6 100%) padding-box, ${GOLD.border} border-box`,
      boxShadow: glow ? "0 0 0 3px rgba(226,168,38,0.35), 0 0 54px rgba(226,168,38,0.5), 0 26px 64px rgba(70,44,18,0.42)" : "0 26px 64px rgba(70,44,18,0.42)",
      ...style,
    }}
  >
    {children}
  </div>
);

// Tarjeta grande vacía (el contenido llegará después), con perspectiva 3D como las de la referencia
const TarjetaVacia: React.FC<{ x: number; y: number; w: number; h: number; start: number; end: number; rotY: number; rotZ: number; from: "left" | "right" }> = ({ x, y, w, h, start, end, rotY, rotZ, from }) => {
  const f = useCurrentFrame();
  const p = useSpr(start, 18, 80);
  if (f < start || f > end + 14) return null;
  const e = Math.min(p, 1);
  const out = clamp01((f - end) / 12);
  const slide = (1 - e) * (from === "left" ? -520 : 520) + out * (from === "left" ? -140 : 140);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, perspective: 1800, opacity: clamp01(e * 2.2) * (1 - out), filter: out > 0 ? `blur(${out * 12}px)` : undefined }}>
      <div style={{ width: "100%", height: "100%", transform: `translateX(${slide}px) rotateY(${rotY * (0.4 + 0.6 * e)}deg) rotateZ(${rotZ}deg)`, transformStyle: "preserve-3d" }}>
        <Marco radius={64} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
};

type Item = { start: number; label?: string; main: string; accent?: string; x: number; y: number; w: number; h: number; mainSize?: number };

const Tarjeta: React.FC<{ it: Item; active: boolean; exitFrom: number; exitLen?: number }> = ({ it, active, exitFrom, exitLen = 12 }) => {
  const f = useCurrentFrame();
  const p = useSpr(it.start);
  if (f < it.start) return null;
  const e = Math.min(p, 1.08);
  const out = clamp01((f - exitFrom) / exitLen);
  const [a, b] = it.accent ? it.main.split(it.accent) : [it.main, ""];
  const scale = (0.94 + 0.06 * Math.min(e, 1)) * (active ? 1.035 : 1);
  return (
    <div
      style={{
        position: "absolute",
        left: it.x,
        top: it.y,
        width: it.w,
        height: it.h,
        opacity: clamp01(e * 2.4) * (active ? 1 : 0.93) * (1 - out),
        transform: `translateY(${(1 - Math.min(e, 1)) * -34 - out * 30}px) scale(${scale})`,
        filter: out > 0 ? `blur(${out * 10}px)` : undefined,
      }}
    >
      <Marco glow={active} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {it.label && <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 26, letterSpacing: 5, color: GOLD.deep, marginBottom: 2 }}>{it.label}</div>}
        <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: it.mainSize ?? 48, letterSpacing: 2.5, color: GOLD.ink, whiteSpace: "nowrap" }}>
          {it.accent ? (
            <>
              {a}
              <span style={{ color: GOLD.mustard }}>{it.accent}</span>
              {b}
            </>
          ) : (
            it.main
          )}
        </div>
      </Marco>
    </div>
  );
};

const Signo: React.FC<{ start: number; y: number; exitFrom: number }> = ({ start, y, exitFrom }) => {
  const f = useCurrentFrame();
  const p = useSpr(start, 12, 130);
  if (f < start) return null;
  const out = clamp01((f - exitFrom) / 12);
  return (
    <div style={{ position: "absolute", left: 540 - 32, top: y - 32, width: 64, height: 64, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center", background: METAL, boxShadow: "0 8px 22px rgba(0,0,0,0.4)", fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 46, lineHeight: 1, color: GOLD.ink, transform: `scale(${Math.min(p, 1.2) * (1 - out)})`, opacity: 1 - out }}>
      +
    </div>
  );
};

// ---------- esquema 1: monto mínimo + gran financiamiento (9,3–12,5 s) ----------
const ESQ1_OUT = T(12.42);
const Esquema1: React.FC = () => {
  const f = useCurrentFrame();
  const items: Item[] = [
    { start: T(9.3), main: "PARA INGRESAR", accent: "INGRESAR", x: 250, y: 230, w: 580, h: 100, mainSize: 40 },
    { start: T(10.2), label: "CON UN", main: "MONTO MÍNIMO", x: 150, y: 360, w: 780, h: 140, mainSize: 56 },
    { start: T(11.6), label: "Y UN", main: "GRAN FINANCIAMIENTO", x: 150, y: 590, w: 780, h: 140, mainSize: 52 },
  ];
  const act = f < items[1].start ? 0 : f < items[2].start ? 1 : 2;
  return (
    <>
      {items.map((it, i) => (
        <Tarjeta key={i} it={it} active={i === act} exitFrom={ESQ1_OUT} />
      ))}
      <Signo start={T(11.4)} y={545} exitFrom={ESQ1_OUT} />
    </>
  );
};

// ---------- esquema 2: explicación de Capri Residence (12,9–21 s), arriba a la izquierda ----------
const ESQ2_OUT = T(20.7);
const Esquema2: React.FC = () => {
  const f = useCurrentFrame();
  const X = 40;
  const W = 480;
  const H = 134;
  const items: Item[] = [
    { start: T(12.94), main: "CAPRI RESIDENCE", accent: "CAPRI", x: X, y: 200, w: W, h: 140, mainSize: 40 },
    { start: T(14.5), label: "UNO DE LOS", main: "MÁS COMPLETOS", x: X, y: 356, w: W, h: H, mainSize: 42 },
    { start: T(16.28), label: "UNIDADES DE", main: "2 DORMITORIOS", x: X, y: 506, w: W, h: H, mainSize: 42 },
    { start: T(18.12), label: "AMENITIES", main: "PREMIUM", x: X, y: 656, w: W, h: H, mainSize: 42 },
    { start: T(19.36), label: "UBICACIÓN", main: "EXTRAORDINARIA", x: X, y: 806, w: W, h: H, mainSize: 42 },
  ];
  let act = 0;
  items.forEach((it, i) => {
    if (f >= it.start) act = i;
  });
  // hilo dorado que une las tarjetas y se va dibujando
  const last = items.filter((it) => f >= it.start).length;
  const top = items[0].y + items[0].h / 2;
  const bottom = items[Math.max(last - 1, 0)].y + items[Math.max(last - 1, 0)].h / 2;
  const out = clamp01((f - ESQ2_OUT) / 12);
  return (
    <>
      {f >= items[0].start && (
        <div style={{ position: "absolute", left: 22, top, width: 5, height: Math.max(bottom - top, 0), borderRadius: 3, background: METAL, opacity: 0.9 * (1 - out) }} />
      )}
      {items.map((it, i) =>
        f >= it.start ? (
          <div key={`d${i}`} style={{ position: "absolute", left: 12, top: it.y + it.h / 2 - 12, width: 24, height: 24, borderRadius: 12, background: METAL, boxShadow: "0 0 0 4px rgba(226,168,38,0.25)", opacity: 1 - out }} />
        ) : null
      )}
      {items.map((it, i) => (
        <Tarjeta key={i} it={it} active={i === act} exitFrom={ESQ2_OUT} />
      ))}
    </>
  );
};

// ---------- composición ----------
export const CapriEdit: React.FC = () => {
  useKitFonts();
  const f = useCurrentFrame();
  const { scale, blur } = camera(f);
  const plateOp = f < RAMP_START ? 0 : f < BG_END ? clamp01((f - RAMP_START) / 14) : 0;
  const hasMatte = f >= M_FIRST && f <= M_LAST;
  const n = String(Math.min(Math.max(f, M_FIRST), M_LAST)).padStart(4, "0");
  const al = personAlign(f);
  const fr = framing(f);
  const ORIGIN = "50% 62%";
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* FONDO: vídeo real + fondo progresivo (real abajo, camel liso arriba). El zoom y el desenfoque de las transiciones actúan SOLO aquí */}
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: ORIGIN, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
        <AbsoluteFill style={{ transform: `scale(${fr})`, transformOrigin: FRAME_PIVOT }}>
          <AbsoluteFill style={{ transform: al?.transform, transformOrigin: al?.origin }}>
            <Video src={staticFile("entrada/edit_1080_50.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
            {plateOp > 0 && <Img src={staticFile(`edit_bg/b_${n}.jpg`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: plateOp }} />}
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
      {/* tarjetas grandes vacías (detrás de ella): enteras en el plano y simétricas */}
      <TarjetaVacia x={40} y={150} w={470} h={930} start={T(6.45)} end={T(9.25)} rotY={9} rotZ={-1} from="left" />
      <TarjetaVacia x={570} y={150} w={470} h={930} start={T(6.8)} end={T(9.25)} rotY={-9} rotZ={1} from="right" />
      <TarjetaVacia x={560} y={200} w={480} h={740} start={T(16.4)} end={T(20.7)} rotY={-8} rotZ={0.5} from="right" />
      {/* ELLA: siempre nítida (sin desenfoque en ningún momento); solo sigue el zoom del fondo */}
      {hasMatte && (
        <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: ORIGIN }}>
          <AbsoluteFill style={{ transform: `scale(${fr})`, transformOrigin: FRAME_PIVOT }}>
            <AbsoluteFill style={{ transform: al?.transform, transformOrigin: al?.origin }}>
              <Img src={staticFile(`recorte_hq/m_${n}.webp`)} style={{ width: "100%", height: "100%" }} />
            </AbsoluteFill>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      <Esquema1 />
      <Esquema2 />
    </AbsoluteFill>
  );
};
