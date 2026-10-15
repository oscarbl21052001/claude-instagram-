import { Video } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { useKitFonts } from "../kit";
import { Esquema, T } from "./Esquema";

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
