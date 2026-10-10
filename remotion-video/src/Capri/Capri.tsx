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
const M_LAST = 1049; // fotogramas con recorte de ella
const RAMP_START = 294; // el fondo empieza a difuminarse 0,4 s antes del primer corte

const GOLD = { border: "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)", deep: "#8f7138", mustard: "#B98512", ink: "#1a1a1a" };
const METAL = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeIn = Easing.in(Easing.cubic);
const easeOut = Easing.out(Easing.cubic);

// ---------- cámara: zoom + desenfoque en los cortes 1 y 3 ----------
const ZOOM_PEAK = 1.34;
const MAX_BLUR = 18;
const OUT_LEN = 13; // 0,26 s antes del corte
const IN_LEN = 20; // 0,4 s después
const camera = (f: number) => {
  for (const c of [CUT1, CUT3]) {
    if (f >= c - OUT_LEN && f < c) {
      const v = (f - (c - OUT_LEN)) / OUT_LEN;
      return { scale: 1 + (ZOOM_PEAK - 1) * easeIn(v), blur: MAX_BLUR * v * v };
    }
    if (f >= c && f < c + IN_LEN) {
      const v = (f - c) / IN_LEN;
      return { scale: 1 + (ZOOM_PEAK - 1) * (1 - easeOut(v)), blur: MAX_BLUR * (1 - v) * (1 - v) };
    }
  }
  return { scale: 1, blur: 0 };
};

// ---------- alineación de ella en el corte 2 (medida con el recorte: ancho de la cabeza 203→177 px, coronilla y 1022→1011, centro x 516→522) ----------
// Mitad del ajuste en cada lado del corte: justo antes se encoge/desplaza un poco y justo después vuelve desde la posición intermedia.
const ALIGN = { len: 16, sh: Math.sqrt(177 / 203), dx: 6, dy: -11, pre: { px: 516, py: 1022 }, post: { px: 522, py: 1011 } };
const personAlign = (f: number): { transform: string; origin: string } | undefined => {
  if (f >= CUT2 - ALIGN.len && f < CUT2) {
    const q = easeIn(clamp01((f - (CUT2 - ALIGN.len)) / ALIGN.len));
    return { transform: `translate(${q * ALIGN.dx * 0.5}px, ${q * ALIGN.dy * 0.5}px) scale(${1 + q * (ALIGN.sh - 1)})`, origin: `${ALIGN.pre.px}px ${ALIGN.pre.py}px` };
  }
  if (f >= CUT2 && f < CUT2 + ALIGN.len) {
    const q = 1 - easeOut(clamp01((f - CUT2) / ALIGN.len));
    return { transform: `translate(${-q * ALIGN.dx * 0.5}px, ${-q * ALIGN.dy * 0.5}px) scale(${1 + q * (1 / ALIGN.sh - 1)})`, origin: `${ALIGN.post.px}px ${ALIGN.post.py}px` };
  }
  return undefined;
};
// fila (px) donde el recorte de ella termina contra la mesa, por escena: se funde con un degradado
const BOTTOM = (f: number) => (f < CUT2 ? 1680 : 1610); // por encima de la taza, que forma parte de la mesa y se difumina

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
      boxShadow: glow ? "0 0 0 3px rgba(226,168,38,0.35), 0 0 54px rgba(226,168,38,0.5), 0 26px 64px rgba(0,0,0,0.45)" : "0 26px 64px rgba(0,0,0,0.45)",
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
        {it.label && <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 28, letterSpacing: 5, color: GOLD.deep, marginBottom: 2 }}>{it.label}</div>}
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
    { start: T(9.3), main: "PARA INGRESAR", accent: "INGRESAR", x: 250, y: 290, w: 580, h: 104, mainSize: 40 },
    { start: T(10.2), label: "CON UN", main: "MONTO MÍNIMO", x: 150, y: 430, w: 780, h: 150, mainSize: 56 },
    { start: T(11.6), label: "Y UN", main: "GRAN FINANCIAMIENTO", x: 150, y: 690, w: 780, h: 150, mainSize: 52 },
  ];
  const act = f < items[1].start ? 0 : f < items[2].start ? 1 : 2;
  return (
    <>
      {items.map((it, i) => (
        <Tarjeta key={i} it={it} active={i === act} exitFrom={ESQ1_OUT} />
      ))}
      <Signo start={T(11.4)} y={635} exitFrom={ESQ1_OUT} />
    </>
  );
};

// ---------- esquema 2: explicación de Capri Residence (12,9–21 s), arriba a la izquierda ----------
const ESQ2_OUT = T(20.7);
const Esquema2: React.FC = () => {
  const f = useCurrentFrame();
  const X = 70;
  const W = 590;
  const H = 126;
  const items: Item[] = [
    { start: T(12.94), main: "CAPRI RESIDENCE", accent: "CAPRI", x: X, y: 250, w: W, h: 128, mainSize: 50 },
    { start: T(14.5), label: "UNO DE LOS", main: "MÁS COMPLETOS", x: X, y: 396, w: W, h: H },
    { start: T(16.28), label: "UNIDADES DE", main: "2 DORMITORIOS", x: X, y: 538, w: W, h: H },
    { start: T(18.12), label: "AMENITIES", main: "PREMIUM", x: X, y: 680, w: W, h: H },
    { start: T(19.36), label: "UBICACIÓN", main: "EXTRAORDINARIA", x: X, y: 822, w: W, h: H },
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
        <div style={{ position: "absolute", left: 34, top, width: 5, height: Math.max(bottom - top, 0), borderRadius: 3, background: METAL, opacity: 0.9 * (1 - out) }} />
      )}
      {items.map((it, i) =>
        f >= it.start ? (
          <div key={`d${i}`} style={{ position: "absolute", left: 24, top: it.y + it.h / 2 - 12, width: 24, height: 24, borderRadius: 12, background: METAL, boxShadow: "0 0 0 4px rgba(226,168,38,0.25)", opacity: 1 - out }} />
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
  const plateOp = f < RAMP_START ? 0 : f < CUT3 ? clamp01((f - RAMP_START) / 20) : 0;
  const hasMatte = f >= M_FIRST && f <= M_LAST;
  const n = String(Math.min(Math.max(f, M_FIRST), M_LAST)).padStart(4, "0");
  const b = BOTTOM(f);
  const al = personAlign(f);
  const drift = 1 + 0.05 * clamp01((f - CUT1) / (CUT3 - CUT1)); // el fondo respira muy despacio
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "50% 62%", filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
        <AbsoluteFill style={{ filter: plateOp > 0 && plateOp < 1 ? `blur(${plateOp * 26}px)` : undefined }}>
          <Video src={staticFile("entrada/edit_1080_50.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
        {plateOp > 0 && (
          <AbsoluteFill style={{ opacity: plateOp, overflow: "hidden" }}>
            <Img src={staticFile("edit_plate/plate.jpg")} style={{ width: "100%", height: "100%", transform: `scale(${drift})` }} />
          </AbsoluteFill>
        )}
        {/* tarjetas de detrás de ella */}
        <TarjetaVacia x={-70} y={170} w={500} h={1190} start={T(7.0)} end={T(9.0)} rotY={14} rotZ={-1.5} from="left" />
        <TarjetaVacia x={650} y={250} w={480} h={1060} start={T(7.4)} end={T(9.0)} rotY={-26} rotZ={0} from="right" />
        <TarjetaVacia x={710} y={250} w={440} h={1060} start={T(18.4)} end={T(20.7)} rotY={-22} rotZ={0} from="right" />
        {hasMatte && (
          <AbsoluteFill style={{ transform: al?.transform, transformOrigin: al?.origin }}>
            <Img src={staticFile(`recorte_edit/m_${n}.webp`)} style={{ width: "100%", height: "100%", WebkitMaskImage: `linear-gradient(to bottom, #000 0px, #000 ${b - 130}px, transparent ${b}px)`, maskImage: `linear-gradient(to bottom, #000 0px, #000 ${b - 130}px, transparent ${b}px)` }} />
          </AbsoluteFill>
        )}
        <Esquema1 />
        <Esquema2 />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
