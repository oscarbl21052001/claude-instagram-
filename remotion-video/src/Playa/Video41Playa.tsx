import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, staticFile } from "remotion";
import { Bloque, TextoFlotante, useFuente } from "./PlayaTexto";

// `video 4.1.mov` completo (25,17 s, 1080x1920 a 30 fps, audio original) con dos textos que la cámara atraviesa sobre la toma de dron.
// El dron entra a 13,3 s. Voz (video completo): "12" 12,94 · "mil" 13,24 · "anticipo" 14,16–14,78 · "700" 15,30–15,70 · "mensuales" 16,26–16,86.
// Tiempos en segundos del video completo; el movimiento es el de `PlayaTexto` (velocidad constante).

export const V41_FPS = 30;
export const V41_DURATION = 755; // 25,17 s
export const V41_W = 1080;
export const V41_H = 1920;

const BLOQUES: Bloque[] = [
  {
    lineas: [
      { texto: "ANTICIPO", size: 64, cifra: false, tracking: 14 },
      { texto: "$12.000", size: 196, cifra: true, tracking: -3 },
    ],
    t0: 12.7,
    t1: 14.9,
    x: 540,
    y: 480,
    rot: -4,
  },
  {
    lineas: [
      { texto: "CUOTAS", size: 64, cifra: false, tracking: 14 },
      { texto: "$700", size: 230, cifra: true, tracking: -3 },
    ],
    t0: 14.95,
    t1: 17.05,
    x: 540,
    y: 500,
    rot: 4,
  },
];

export const Video41Playa: React.FC = () => {
  useFuente();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("playa/video41_1080.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      {BLOQUES.map((b) => (
        <TextoFlotante key={b.lineas[0].texto} b={b} />
      ))}
    </AbsoluteFill>
  );
};
