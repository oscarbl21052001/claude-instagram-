import { Video } from "@remotion/media";
import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useKitFonts } from "../kit";
import { Cierre, Esquema, T } from "./Esquema";

// Edit "VIDEO 4" (43,97 s, 1080x1920, 30 fps): inversión en pozo con financiamiento de la constructora.
// El plano tiene un hueco sin imagen (fotogramas 442–930: fondo gris, solo se oye su voz). Ese hueco se tapa con un fondo camel
// y un esquema que se construye al ritmo de la frase (opción 4: "tres salidas al entregar"). Subtítulos como en CAPRI v3.7/3.8.
// Capas: vídeo → fondo camel + esquema (fundido de entrada/salida sobre los cortes) → subtítulos.

export const V4_FPS = 30;
export const V4_DURATION = 1319;
export const V4_W = 1080;
export const V4_H = 1920;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// ---------- subtítulos (estilo CAPRI v3.7/3.8: una línea, Inter Medium 30 px, blanco, 175 px del borde) ----------
// Texto de la transcripción (faster-whisper medium) con las correcciones de la persona: "de pozo", "vos podés", "apalancamiento".
const SUBS: { a: number; b: number; t: string; k?: string }[] = [
  { a: 0.0, b: 3.2, t: "Si estás invirtiendo solo con tu dinero," },
  { a: 3.66, b: 4.3, t: "estás perdiendo." },
  { a: 4.42, b: 5.4, t: "¿Cómo funciona?" },
  { a: 5.78, b: 7.15, t: "Básicamente, el financiamiento", k: "financiamiento" },
  { a: 7.18, b: 8.7, t: "te lo dan las constructoras.", k: "constructoras" },
  { a: 8.8, b: 10.2, t: "Es decir, que vos podés iniciar" },
  { a: 10.22, b: 11.3, t: "con un capital mínimo", k: "capital mínimo" },
  { a: 11.32, b: 12.5, t: "comprando de pozo", k: "de pozo" },
  { a: 12.58, b: 14.8, t: "y financiarte directamente con ellos.", k: "financiarte" },
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
  let kw: string | undefined;
  let kwStart = 0;
  for (const s of SUBS) {
    const a = T(s.a) - 1;
    const b = T(s.b);
    const o = Math.min(clamp01((f - a) / 4), clamp01((b + 4 - f) / 4));
    if (o > op) {
      op = o;
      text = s.t;
      kw = s.k;
      kwStart = s.a;
    }
  }
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 520, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)" }} />
      {op > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 270, display: "flex", flexDirection: "column", alignItems: "center", opacity: op }}>
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
            {kw && text.includes(kw) ? (
              <>
                {text.slice(0, text.indexOf(kw))}
                <span style={{ position: "relative", display: "inline-block" }}>
                  {kw}
                  <svg width="100%" height="14" viewBox="0 0 100 14" preserveAspectRatio="none" style={{ position: "absolute", left: 0, bottom: -12, overflow: "visible" }}>
                    <path
                      d="M 0 8 C 20 3, 45 12, 70 6 S 95 5, 100 7"
                      fill="none"
                      stroke="#E9CD7B"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1 - Easing.out(Easing.cubic)(clamp01((f - T(kwStart) - 6) / 14))}
                      style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}
                    />
                  </svg>
                </span>
                {text.slice(text.indexOf(kw) + kw.length)}
              </>
            ) : (
              text
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Empuje suave de cámara 4,4 → 14,7 s: un escalón por idea y vuelta a 1 antes de que el iris tape el plano.
const ZOOM_KEYS: [number, number][] = [
  [4.4, 1],
  [5.78, 1.025],
  [7.18, 1.05],
  [10.22, 1.07],
  [11.32, 1.09],
  [12.58, 1.11],
  [14.0, 1.11],
  [14.7, 1],
];
const useZoom = () => {
  const f = useCurrentFrame();
  const t = f / V4_FPS;
  if (t <= ZOOM_KEYS[0][0] || t >= ZOOM_KEYS[ZOOM_KEYS.length - 1][0]) return 1;
  for (let i = 0; i < ZOOM_KEYS.length - 1; i++) {
    const [t0, z0] = ZOOM_KEYS[i];
    const [t1, z1] = ZOOM_KEYS[i + 1];
    if (t >= t0 && t < t1) return interpolate(t, [t0, t0 + Math.min(0.5, t1 - t0), t1], [z0, z1, z1], { easing: Easing.inOut(Easing.cubic) });
  }
  return 1;
};

const BarraIdeas: React.FC = () => {
  const f = useCurrentFrame();
  const a = T(4.4);
  const b = T(14.2);
  if (f < a - 6 || f > b + 10) return null;
  const p = clamp01((f - a) / (b - a));
  const op = Math.min(clamp01((f - a + 6) / 8), clamp01((b + 10 - f) / 8));
  return (
    <div style={{ position: "absolute", left: 340, width: 400, bottom: 222, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.25)", opacity: op }}>
      <div style={{ width: `${p * 100}%`, height: "100%", borderRadius: 3, background: "linear-gradient(90deg, #C7AE6A, #F3EBB6)", boxShadow: "0 0 10px rgba(231,205,123,0.7)" }} />
    </div>
  );
};

export const Video4Edit: React.FC = () => {
  useKitFonts();
  const zoom = useZoom();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 35%" }}>
        <Video src={staticFile("entrada/VIDEO-4-completo.mp4")} style={{ width: V4_W, height: V4_H }} objectFit="cover" />
      </AbsoluteFill>
      <Esquema />
      <Cierre />
      <Subtitulos />
      <BarraIdeas />
    </AbsoluteFill>
  );
};
