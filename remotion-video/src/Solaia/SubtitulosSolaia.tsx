import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";

// Subtítulos minimalistas de SOLAIA (mismo estilo que SPOT 335: Inter Medium 30 px blanca, línea fina encima, degradado suave abajo).
// Texto: Whisper medium sobre la voz de SOLAIA. Pendiente de confirmar: "Zimbros" (Whisper oyó "Cimbros"), "12 %", "72 veces", "un dormitorio".
const FPS = 30;
const T = (s: number) => Math.round(s * FPS);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const useInter = () => {
  const [h] = useState(() => delayRender("Cargando Inter"));
  useEffect(() => {
    loadFont({ family: "Inter", url: staticFile("fonts/Inter-Medium.woff2"), weight: "500" }).then(() => continueRender(h));
  }, [h]);
};

export const SUBS: { a: number; b: number; t: string }[] = [
  { a: 0.0, b: 2.3, t: "Con tan solo un 12 % de anticipo" },
  { a: 2.3, b: 3.78, t: "y hasta 72 veces," },
  { a: 3.88, b: 6.16, t: "podés asegurar tu unidad en este paraíso." },
  { a: 6.32, b: 7.66, t: "¿Te imaginás vivir en un lugar" },
  { a: 7.66, b: 9.8, t: "donde el confort y la calidad de vida" },
  { a: 10.14, b: 11.84, t: "se encuentran a pocos pasos del mar?" },
  { a: 12.24, b: 14.58, t: "Departamentos modernos de un dormitorio" },
  { a: 14.58, b: 17.08, t: "con amenities que incluyen salón de fiestas," },
  { a: 17.36, b: 18.5, t: "piscinas climatizadas," },
  { a: 18.78, b: 19.46, t: "lavandería," },
  { a: 19.82, b: 21.4, t: "gimnasio y minimercado." },
  { a: 21.7, b: 22.58, t: "SOLAIA Residence," },
  { a: 22.84, b: 24.04, t: "garantiza tu unidad" },
  { a: 24.04, b: 25.78, t: "y convertila en tu refugio" },
  { a: 25.78, b: 27.0, t: "en la playa de Zimbros." },
];

export const SubtitulosSolaia: React.FC<{ total: number }> = ({ total }) => {
  const f = useCurrentFrame();
  useInter();
  let op = 0;
  let text = "";
  for (const s of SUBS) {
    const a = T(s.a) - 2;
    const b = T(s.b);
    const o = Math.min(clamp01((f - a) / 5), clamp01((b + 6 - f) / 6));
    if (o > op) {
      op = o;
      text = s.t;
    }
  }
  // el degradado de contraste queda fijo todo el vídeo (sin parpadear entre frases)
  const grad = Math.min(clamp01(f / 10), clamp01((total - f) / 10));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 560, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)", opacity: grad }} />
      {op > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 330, display: "flex", flexDirection: "column", alignItems: "center", opacity: op }}>
          <div style={{ width: 56, height: 1.5, background: "rgba(255,255,255,0.8)", marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }} />
          <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 34, letterSpacing: 1.2, color: "#FFFFFF", textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 2px 14px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.5)", textAlign: "center", whiteSpace: "nowrap" }}>{text}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
