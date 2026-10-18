import { Audio, Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";

// Toma de dron de la playa de `video 4.1` (13,3–18,4 s) con dos textos verdes que flotan fijos en el aire; el dron avanza y la cámara los atraviesa.
// Voz (tiempo de la toma): "12" −0,36 · "anticipo" 0,86–1,48 · "700" 2,0–2,4 · "mensuales" 2,96–3,56 · "refuerzos" 3,78–4,44.
// Profundidad: capas apiladas en translateZ con perspectiva (como CONTÁCTANOS). La cámara = z creciente; al pasar cerca del plano de la cámara se desvanece.

export const PLAYA_FPS = 30;
export const PLAYA_DURATION = 153; // 5,1 s
export const PLAYA_W = 1080;
export const PLAYA_H = 1920;

const PERSP = 1400;
const CAPAS = 16;
const PROF = 74; // grosor del volumen (px)

const DARK = [10, 62, 20];
const LIGHT = [76, 175, 60];
const SHADE_D = [4, 26, 8];
const SHADE_L = [30, 92, 28];
const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;

type Linea = { texto: string; size: number; claro: boolean };
type Bloque = {
  lineas: Linea[];
  t: number[]; // tiempos clave (s de la toma)
  z: number[]; // profundidad de la cámara respecto al texto (px; negativo = lejos)
  x: number; // centro horizontal (px)
  y: number; // centro vertical (px)
  rot: number; // inclinación (°)
};

const BLOQUES: Bloque[] = [
  {
    lineas: [
      { texto: "ANTICIPO", size: 150, claro: false },
      { texto: "$12.000", size: 250, claro: true },
    ],
    t: [0, 0.4, 1.0, 1.75],
    z: [-1500, -650, -250, 1250],
    x: 520,
    y: 330,
    rot: -8,
  },
  {
    lineas: [
      { texto: "CUOTAS", size: 190, claro: false },
      { texto: "$700", size: 330, claro: true },
    ],
    t: [1.85, 2.3, 3.0, 3.75],
    z: [-1500, -650, -250, 1250],
    x: 500,
    y: 350,
    rot: 7,
  },
];

const useFuente = () => {
  const [handle] = useState(() => delayRender("Cargando Poppins ExtraBold"));
  useEffect(() => {
    loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-ExtraBold.woff2"), weight: "800" }).then(() => continueRender(handle));
  }, [handle]);
};

const Linea3D: React.FC<{ l: Linea; i: number }> = ({ l, i }) => {
  const front = i === 0;
  const base = l.claro ? LIGHT : DARK;
  const shade = l.claro ? SHADE_L : SHADE_D;
  return (
    <div
      style={{
        fontFamily: "Poppins",
        fontWeight: 800,
        fontSize: l.size,
        lineHeight: 0.98,
        letterSpacing: -2,
        whiteSpace: "nowrap",
        color: front ? mix(base, [255, 255, 255], l.claro ? 0.04 : 0) : mix(base, shade, Math.pow(i / CAPAS, 0.7)),
        textShadow: i === CAPAS ? "0 40px 60px rgba(0,0,0,0.35)" : undefined,
      }}
    >
      {l.texto}
    </div>
  );
};

const TextoFlotante: React.FC<{ b: Bloque }> = ({ b }) => {
  const frame = useCurrentFrame();
  const s = frame / PLAYA_FPS;
  if (s < b.t[0] || s > b.t[3] + 0.05) return null;
  const zc = interpolate(s, b.t, b.z, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0.0, 0.75, 0.6),
  });
  const entra = interpolate(s, [b.t[0], b.t[0] + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sale = interpolate(zc, [650, 1150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lejos = Math.max(0, (-zc - 900) / 700);
  const blur = lejos * 8 + interpolate(zc, [500, 1200], [0, 22], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const W = 1500;
  const H = 760;
  // la cámara avanza: el texto queda quieto en el mundo y se acerca (z positivo relativo al plano del texto)
  const z = -(-zc); // zc negativo = lejos del texto
  return (
    <div
      style={{
        position: "absolute",
        left: b.x - W / 2,
        top: b.y - H / 2,
        width: W,
        height: H,
        opacity: entra * sale,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        perspective: PERSP,
        perspectiveOrigin: "50% 62%",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `translateZ(${z}px) rotateZ(${b.rot}deg) rotateX(6deg) rotateY(${b.rot > 0 ? -8 : 8}deg)`,
        }}
      >
        {Array.from({ length: CAPAS + 1 }).map((_, k) => {
          const i = CAPAS - k;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transform: `translateZ(${-(i / CAPAS) * PROF}px)`,
              }}
            >
              {b.lineas.map((l) => (
                <Linea3D key={l.texto} l={l} i={i} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PlayaTexto: React.FC = () => {
  useFuente();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("playa/dron_v41.mp4")} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
      <Audio src={staticFile("playa/voz_dron.m4a")} />
      {BLOQUES.map((b) => (
        <TextoFlotante key={b.lineas[0].texto} b={b} />
      ))}
    </AbsoluteFill>
  );
};
