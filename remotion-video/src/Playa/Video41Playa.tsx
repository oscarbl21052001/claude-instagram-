import { Audio, Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Bloque, TextoFlotante, useFuente } from "./PlayaTexto";

// `video 4.1.mov` completo (25,17 s, 1080x1920 a 30 fps, audio original) con dos textos que la cámara atraviesa sobre la toma de dron.
// El dron entra a 13,3 s. Voz (video completo): "12" 12,94 · "mil" 13,24 · "anticipo" 14,16–14,78 · "700" 15,30–15,70 · "mensuales" 16,26–16,86.
// Tiempos en segundos del video completo; el movimiento es el de `PlayaTexto` (velocidad constante).

export const V41_FPS = 30;
export const V41_DURATION = 755; // 25,17 s
export const V41_W = 1080;
export const V41_H = 1920;

// Escena 3 (render, 5,0–7,1 s): "SPOT 335" en el cielo; la cámara lo cruza al decir "Spot 335" (5,98–7,26).
const BLOQUE_SPOT: Bloque = {
  lineas: [
    { texto: "TE PRESENTO", size: 52, cifra: false, tracking: 12 },
    { texto: "SPOT 335", size: 190, cifra: true, tracking: -3 },
  ],
  t0: 4.95,
  t1: 7.0,
  x: 540,
  y: 400,
  rot: -3,
};

// Escena 8 (calle, 19,6–25,17 s): palabras clave de la voz, una a una (inicio de cada palabra).
const LISTA = [
  { texto: "EXPERIENCIAS", t: 22.6 },
  { texto: "COMODIDAD", t: 23.82 },
  { texto: "SERVICIOS", t: 24.56 },
];

const ListaFinal: React.FC = () => {
  const frame = useCurrentFrame();
  const s = frame / V41_FPS;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {LISTA.map((l) => {
        const k = interpolate(s, [l.t - 0.05, l.t + 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const e = 1 - Math.pow(1 - k, 3);
        return (
          <div key={l.texto} style={{ opacity: e, transform: `translateY(${(1 - e) * 26}px)`, textAlign: "center" }}>
            <div style={{ fontFamily: "Bebas Neue", fontSize: 128, lineHeight: 1.0, letterSpacing: 8, color: "#FFF8E7", textShadow: "0 6px 26px rgba(0,0,0,0.45)" }}>{l.texto}</div>
            <div style={{ height: 3, width: 150 * e, margin: "0 auto", background: "linear-gradient(90deg, transparent, #F2BE45, transparent)" }} />
          </div>
        );
      })}
    </div>
  );
};

const useBebas = () => {
  const [h] = useState(() => delayRender("Cargando Bebas Neue"));
  useEffect(() => {
    loadFont({ family: "Bebas Neue", url: staticFile("fonts/BebasNeue-Regular.woff2") }).then(() => continueRender(h));
  }, [h]);
};

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
  useBebas();
  const frame = useCurrentFrame();
  const fin = interpolate(frame / V41_FPS, [24.92, 25.15], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("playa/video41_1080.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      {[BLOQUE_SPOT, ...BLOQUES].map((b) => (
        <TextoFlotante key={b.lineas[0].texto} b={b} />
      ))}
      <ListaFinal />
      <AbsoluteFill style={{ background: "#000", opacity: 1 - fin }} />
    </AbsoluteFill>
  );
};
