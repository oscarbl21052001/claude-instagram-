import { Audio, Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { AbsoluteFill, delayRender, continueRender, interpolate, staticFile, useCurrentFrame } from "remotion";

// Toma de dron de la playa de `video 4.1` (13,3–18,4 s) con dos textos que flotan fijos en el aire; el dron avanza y la cámara los atraviesa.
// Voz (tiempo de la toma): "12" −0,36 · "anticipo" 0,86–1,48 · "700" 2,0–2,4 · "mensuales" 2,96–3,56 · "refuerzos" 3,78–4,44.
// Cámara a velocidad CONSTANTE (z lineal): la escala sube sola de forma natural (PERSP / distancia), sin pausas ni tirones.
// Volumen: pocas capas con `translateZ`. Paleta intercambiable en `TEMAS`.

export const PLAYA_FPS = 30;
export const PLAYA_DURATION = 153; // 5,1 s
export const PLAYA_W = 1080;
export const PLAYA_H = 1920;

const PERSP = 1400;
const CAPAS = 9;
const PROF = 36; // grosor del volumen (px)

type Tema = { etiqueta: number[]; etiquetaFondo: number[]; cifra: number[]; cifraFondo: number[]; degradado?: string; sombra: string };
const TEMAS: Record<string, Tema> = {
  dorado: {
    etiqueta: [255, 248, 231], // crema
    etiquetaFondo: [120, 100, 70],
    cifra: [242, 190, 69], // mostaza
    cifraFondo: [74, 48, 6],
    degradado: "linear-gradient(180deg, #FFE7A0 0%, #F2BE45 45%, #D69A1C 100%)",
    sombra: "0 18px 40px rgba(0,20,40,0.35)",
  },
  verde: {
    etiqueta: [255, 255, 255],
    etiquetaFondo: [60, 90, 70],
    cifra: [64, 184, 120],
    cifraFondo: [8, 60, 36],
    degradado: "linear-gradient(180deg, #8EF0BC 0%, #3FB878 50%, #1E8F57 100%)",
    sombra: "0 18px 40px rgba(0,20,40,0.35)",
  },
  blanco: {
    etiqueta: [255, 255, 255],
    etiquetaFondo: [150, 165, 180],
    cifra: [255, 255, 255],
    cifraFondo: [120, 140, 160],
    sombra: "0 18px 40px rgba(0,20,40,0.4)",
  },
};
const TEMA = TEMAS.dorado;
const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;

type Linea = { texto: string; size: number; cifra: boolean; tracking: number };
type Bloque = {
  lineas: Linea[];
  t0: number; // segundo en que arranca la aproximación
  t1: number; // segundo en que la cámara cruza el plano del texto (desaparece justo después)
  x: number;
  y: number;
  rot: number;
};

// Cámara: z va de Z0 (lejos) a Z1 (pasa) de forma lineal entre t0 y t1.
const Z0 = -1000;
const Z1 = 1000;

const BLOQUES: Bloque[] = [
  {
    lineas: [
      { texto: "ANTICIPO", size: 64, cifra: false, tracking: 14 },
      { texto: "$12.000", size: 196, cifra: true, tracking: -3 },
    ],
    t0: -0.1,
    t1: 1.9,
    x: 540,
    y: 360,
    rot: -4,
  },
  {
    lineas: [
      { texto: "CUOTAS", size: 64, cifra: false, tracking: 14 },
      { texto: "$700", size: 230, cifra: true, tracking: -3 },
    ],
    t0: 1.65,
    t1: 3.75,
    x: 540,
    y: 380,
    rot: 4,
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
  const base = l.cifra ? TEMA.cifra : TEMA.etiqueta;
  const fondo = l.cifra ? TEMA.cifraFondo : TEMA.etiquetaFondo;
  const grad = l.cifra && front && TEMA.degradado;
  return (
    <div
      style={{
        fontFamily: "Poppins",
        fontWeight: 800,
        fontSize: l.size,
        lineHeight: 1.02,
        letterSpacing: l.tracking,
        whiteSpace: "nowrap",
        color: front ? mix(base, [255, 255, 255], l.cifra ? 0 : 0) : mix(base, fondo, Math.pow(i / CAPAS, 0.8)),
        backgroundImage: grad || undefined,
        WebkitBackgroundClip: grad ? "text" : undefined,
        WebkitTextFillColor: grad ? "transparent" : undefined,
        textShadow: i === CAPAS ? TEMA.sombra : undefined,
      }}
    >
      {l.texto}
    </div>
  );
};

const TextoFlotante: React.FC<{ b: Bloque }> = ({ b }) => {
  const frame = useCurrentFrame();
  const s = frame / PLAYA_FPS;
  if (s < b.t0 || s > b.t1 + 0.02) return null;
  const k = (s - b.t0) / (b.t1 - b.t0);
  const z = Z0 + (Z1 - Z0) * k; // velocidad constante
  const entra = interpolate(s, [Math.max(b.t0, 0), Math.max(b.t0, 0) + 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sale = interpolate(z, [560, 940], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blur = interpolate(z, [420, 940], [0, 16], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const W = 1500;
  const H = 560;
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
        perspectiveOrigin: "50% 70%",
      }}
    >
      <div style={{ width: "100%", height: "100%", transformStyle: "preserve-3d", transform: `translateZ(${z}px) rotateZ(${b.rot}deg) rotateX(4deg)` }}>
        {Array.from({ length: CAPAS + 1 }).map((_, kk) => {
          const i = CAPAS - kk;
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
