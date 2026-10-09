import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Easing, Freeze, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { useEnter, useKitFonts } from "../kit";

// Clip "VIDEO IDEAS" (6,2 s): "Y recordá, no se trata de mirar solo el valor, es sobre saber cómo y cuándo ingresar."
// Estructura "no es X, es Y": VALOR (tachado) → CÓMO + CUÁNDO = INGRESAR. Transición con zoom y desenfoque en el corte (3,27 s),
// que cae en la pausa de la voz. Zooms de énfasis en las palabras clave, empuje lento de cámara, sonidos sintéticos
// y un fotograma final congelado para que se lea el cierre.

export const IDEAS_FPS = 30;
const SRC_FRAMES = 185; // 6,17 s de vídeo original
const TAIL = 36; // 1,2 s de fotograma congelado
export const IDEAS_DURATION = SRC_FRAMES + TAIL;
const CUT = 98 / 30; // corte duro del clip original (3,2667 s)
const END = IDEAS_DURATION / IDEAS_FPS;

// Segundos de la transcripción por palabras (faster-whisper "medium")
const W = {
  recorda: 0.68,
  vWords: [1.3, 1.48, 1.68, 1.86, 2.04, 2.44, 2.66], // no · se · trata · de · mirar · solo · el
  valor: 2.8,
  strike: 2.95,
  label2: [3.8, 3.92, 4.16], // es · sobre · saber
  como: 4.5,
  plus: 5.15,
  cuando: 5.26,
  eq: 5.55,
  ingresar: 5.62,
};

const C = { ink: "#1a1a1a", gold: "#C7AE6A", goldDeep: "#b99a45", cream: "#e3d6b4", mustard: "#E2A826", shade: "#8f7138", sheen: "#F3EBB6" };
const METAL = `linear-gradient(135deg, ${C.shade} 0%, ${C.gold} 28%, ${C.sheen} 50%, ${C.gold} 72%, ${C.shade} 100%)`;

// Etiquetas que escriben la frase palabra a palabra (parecían subtítulos): desactivadas a petición de la persona usuaria.
const ETIQUETAS = false;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = Easing.out(Easing.cubic);

// ---------- cámara: empuje lento + zooms de énfasis + transición zoom/desenfoque ----------
const OUT_LEN = 0.2667; // fotogramas previos al corte que participan en la transición
const IN_LEN = 0.4; // y posteriores
const ZOOM_PEAK = 1.365;
const MAX_BLUR = 16;

const punch = (t: number) => [W.valor, W.como, W.cuando].reduce((s, k) => s + (t >= k ? 0.04 * Math.exp(-(t - k) * 9) : 0), 0);

const camera = (t: number) => {
  const A = t < CUT;
  let scale: number;
  let blur = 0;
  if (A) {
    scale = 1 + 0.05 * (t / CUT) + punch(t);
    const u = clamp01((t - (CUT - OUT_LEN)) / OUT_LEN);
    if (u > 0) {
      scale = (1 + 0.05 * ((CUT - OUT_LEN) / CUT)) * (1 + (ZOOM_PEAK / (1 + 0.05 * ((CUT - OUT_LEN) / CUT)) - 1) * Math.pow(u, 2.2));
      blur = MAX_BLUR * Math.pow(u, 2);
    }
  } else {
    const base = 1 + 0.07 * ((t - CUT) / (END - CUT)) + punch(t);
    const v = clamp01((t - CUT) / IN_LEN);
    scale = base * (1 + (ZOOM_PEAK - 1) * (1 - easeOut(v)));
    blur = MAX_BLUR * Math.pow(1 - v, 2);
  }
  return { scale, blur, origin: A ? "30% 70%" : "52% 72%" };
};

const VideoStack: React.FC<{ frozen: boolean }> = ({ frozen }) => {
  const frame = useCurrentFrame();
  const t = frame / IDEAS_FPS;
  const { scale, blur, origin } = camera(t);
  const streak = blur > 0.5;
  const copies = streak ? [1, 2, 3, 4] : [];
  const vid = (muted: boolean) => <Video src={staticFile("entrada/ideas_1440.mp4")} objectFit="cover" muted={muted} style={{ width: "100%", height: "100%" }} />;
  const inner = (muted: boolean) => (frozen ? <Freeze frame={SRC_FRAMES - 1}>{vid(true)}</Freeze> : vid(muted));
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: origin, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>{inner(false)}</AbsoluteFill>
      {copies.map((k) => (
        <AbsoluteFill
          key={k}
          style={{
            transform: `scale(${scale * (1 + k * 0.035 * (blur / MAX_BLUR))})`,
            transformOrigin: origin,
            filter: `blur(${blur * 1.2}px)`,
            opacity: 0.22,
          }}
        >
          {inner(true)}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

// ---------- tarjetas (estilo TresCosas / Contactanos) ----------
const cardBase = (enter: number): React.CSSProperties => ({
  boxSizing: "border-box",
  borderRadius: 30,
  background: "linear-gradient(180deg, rgba(40,34,20,0.88) 0%, rgba(14,12,8,0.93) 100%)",
  border: "1.5px solid rgba(199,174,106,0.6)",
  boxShadow: "0 18px 46px rgba(0,0,0,0.38)",
  backdropFilter: "blur(14px)",
  opacity: interpolate(enter, [0, 0.45], [0, 1], { extrapolateRight: "clamp" }),
  transform: `translateY(${(1 - Math.min(enter, 1)) * -34}px) scale(${0.95 + 0.05 * Math.min(enter, 1)})`,
});

const exitStyle = (t: number, from: number, len: number): React.CSSProperties => {
  const k = clamp01((t - from) / len);
  return k > 0 ? { opacity: 1 - k, filter: `blur(${k * 10}px)`, translate: `0 ${-26 * k}px` } : {};
};

// Etiqueta de texto que se revela palabra a palabra (sincronizada con la voz); la píldora crece con cada palabra
const Etiqueta: React.FC<{ words: string[]; times: number[]; top: number; exit?: { from: number; len: number } }> = ({ words, times, top, exit }) => {
  const t = useCurrentFrame() / IDEAS_FPS;
  const enter = useEnter(Math.round(times[0] * IDEAS_FPS));
  if (t < times[0] - 0.02) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", ...(exit ? exitStyle(t, exit.from, exit.len) : {}), opacity: interpolate(enter, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }) * (exit ? 1 - clamp01((t - exit.from) / exit.len) : 1) }}>
      <div
        style={{
          height: 52,
          padding: "0 30px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          borderRadius: 999,
          background: "rgba(20,17,10,0.88)",
          border: "1.5px solid rgba(199,174,106,0.55)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
        }}
      >
        {words.map((w, i) =>
          t >= times[i] ? (
            <span key={i} style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 27, letterSpacing: 4, color: C.cream }}>
              {w}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
};

const Valor: React.FC = () => {
  const t = useCurrentFrame() / IDEAS_FPS;
  const slam = useEnter(Math.round(W.valor * IDEAS_FPS));
  const enter = useEnter(Math.round(W.valor * IDEAS_FPS));
  if (t < W.valor - 0.02) return null;
  const line = easeOut(clamp01((t - W.strike) / 0.15));
  const dim = 1 - 0.4 * easeOut(clamp01((t - W.strike - 0.1) / 0.2));
  return (
    <div style={{ position: "absolute", left: 540 - 230, top: 300, width: 460, height: 124, display: "flex", alignItems: "center", justifyContent: "center", ...cardBase(enter), ...exitStyle(t, 3.1, 0.3), opacity: dim * clamp01(enter * 2) * (1 - clamp01((t - 3.1) / 0.3)) }}>
      <div style={{ position: "relative", fontFamily: "Inter", fontWeight: 800, fontSize: 56, letterSpacing: 8, color: C.cream, transform: `scale(${0.8 + 0.2 * Math.min(slam, 1.15)})` }}>
        VALOR
        <div style={{ position: "absolute", left: -12, top: "52%", height: 6, width: `calc(${line * 100}% + 24px)`, background: C.mustard, borderRadius: 3 }} />
      </div>
    </div>
  );
};

const Palabra: React.FC<{ at: number; text: string; left: number; width: number; top: number; height?: number }> = ({ at, text, left, width, top, height = 118 }) => {
  const t = useCurrentFrame() / IDEAS_FPS;
  const enter = useEnter(Math.round(at * IDEAS_FPS));
  if (t < at - 0.02) return null;
  return (
    <div style={{ position: "absolute", left, top, width, height, display: "flex", alignItems: "center", justifyContent: "center", ...cardBase(enter) }}>
      <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 48, letterSpacing: 6, color: C.cream }}>{text}</div>
      <div style={{ position: "absolute", left: 28, right: 28, bottom: 14, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${C.goldDeep}, ${C.gold})`, transform: `scaleX(${easeOut(clamp01((t - at - 0.1) / 0.3))})`, transformOrigin: "left" }} />
    </div>
  );
};

const Signo: React.FC<{ at: number; char: string; cy: number }> = ({ at, char, cy }) => {
  const t = useCurrentFrame() / IDEAS_FPS;
  const enter = useEnter(Math.round(at * IDEAS_FPS));
  if (t < at - 0.02) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - 22,
        top: cy - 22,
        width: 44,
        height: 44,
        borderRadius: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Space Grotesk",
        fontWeight: 700,
        fontSize: 38,
        lineHeight: 1,
        color: C.ink,
        background: METAL,
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        transform: `scale(${Math.min(enter, 1.2)})`,
      }}
    >
      {char}
    </div>
  );
};

const Ingresar: React.FC = () => {
  const t = useCurrentFrame() / IDEAS_FPS;
  const enter = useEnter(Math.round(W.ingresar * IDEAS_FPS));
  if (t < W.ingresar - 0.02) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 180,
        top: 474,
        width: 720,
        height: 120,
        boxSizing: "border-box",
        borderRadius: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, #E9C766 0%, ${C.mustard} 55%, #C98B12 100%)`,
        boxShadow: "0 18px 46px rgba(0,0,0,0.38)",
        opacity: interpolate(enter, [0, 0.45], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${(1 - Math.min(enter, 1)) * 30}px) scale(${0.95 + 0.05 * Math.min(enter, 1)})`,
      }}
    >
      <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 54, letterSpacing: 9, color: C.ink }}>INGRESAR</div>
    </div>
  );
};

export const VideoIdeas: React.FC = () => {
  useKitFonts();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {frame < SRC_FRAMES ? (
        <VideoStack frozen={false} />
      ) : (
        <Sequence from={SRC_FRAMES}>
          <VideoStack frozen />
        </Sequence>
      )}
      <Audio src={staticFile("audio/sfx_ideas.wav")} />
      {/* parte 1: "no se trata de mirar solo el valor" */}
      {ETIQUETAS && <Etiqueta words={["RECORDÁ"]} times={[W.recorda]} top={236} exit={{ from: 1.2, len: 0.2 }} />}
      {ETIQUETAS && <Etiqueta words={["NO", "SE", "TRATA", "DE", "MIRAR", "SOLO", "EL"]} times={W.vWords} top={236} exit={{ from: 3.1, len: 0.3 }} />}
      <Valor />
      {/* parte 2: "es sobre saber cómo y cuándo ingresar" */}
      {ETIQUETAS && <Etiqueta words={["ES", "SOBRE", "SABER"]} times={W.label2} top={236} />}
      <Palabra at={W.como} text="CÓMO" left={180} width={328} top={300} />
      <Signo at={W.plus} char="+" cy={359} />
      <Palabra at={W.cuando} text="CUÁNDO" left={572} width={328} top={300} />
      <Signo at={W.eq} char="=" cy={446} />
      <Ingresar />
    </AbsoluteFill>
  );
};
