import { Video } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { useKitFonts } from "../kit";

// NUEVO.mov (FHS) con los subtítulos quemados originales borrados y sustituidos por subtítulos minimalistas estilo documental (como los de CAPRI).
// Solo donde ya había subtítulos; mismo momento de entrada y salida; texto = el que estaba en pantalla, con las erratas corregidas.
export const NUEVO_FPS = 30;
export const NUEVO_DURATION = 846;
export const NUEVO_W = 1080;
export const NUEVO_H = 1920;

// a/b = fotograma de entrada / último fotograma del subtítulo original (medidos sobre el vídeo)
const SUBS: { a: number; b: number; t: string }[] = [
  { a: 4, b: 57, t: "Tener tu departamento en Bombinhas" },
  { a: 62, b: 100, t: "es más fácil de lo que pensaste" },
  { a: 330, b: 377, t: "ya garantizás tu unidad" },
  { a: 384, b: 465, t: "con unidades de dos dormitorios en un emprendimiento" },
  { a: 481, b: 497, t: "diferenciado" },
  { a: 498, b: 598, t: "con amenities exclusivos en el rooftop y una ubicación" },
  { a: 607, b: 686, t: "privilegiada a tan solo cuatrocientos metros del mar" },
  { a: 699, b: 741, t: "Si querés saber más información" },
  { a: 763, b: 790, t: "este es el mejor momento" },
  { a: 803, b: 837, t: "contactame ahora mismo" },
];
const SUB_BOTTOM = Number(process.env.REMOTION_SUB_BOTTOM ?? 570); // distancia del texto al borde inferior (donde estaban los originales, y≈1300)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const NuevoSubs: React.FC = () => {
  useKitFonts();
  const f = useCurrentFrame();
  let op = 0;
  let text = "";
  for (const s of SUBS) {
    const o = Math.min(clamp01((f - s.a + 1) / 4), clamp01((s.b + 4 - f) / 4));
    if (o > op) {
      op = o;
      text = s.t;
    }
  }
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("entrada/nuevo_limpio.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      {op > 0 && (
        // velo oscuro muy suave tras el texto (los fondos son claros: calle, renders, blusa) para que el blanco se lea sin cajas ni contornos
        <div style={{ position: "absolute", left: 0, right: 0, bottom: SUB_BOTTOM - 95, height: 250, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.34) 50%, rgba(0,0,0,0) 100%)", opacity: op }} />
      )}
      {op > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: SUB_BOTTOM, display: "flex", flexDirection: "column", alignItems: "center", opacity: op }}>
          <div style={{ width: 56, height: 1.5, background: "rgba(255,255,255,0.85)", marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }} />
          <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 30, letterSpacing: 1.2, color: "#FFFFFF", whiteSpace: "nowrap", textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 2px 12px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.55)" }}>{text}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
