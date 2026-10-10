import { Video } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useKitFonts } from "../kit";

// Clip "UNIDADES" (2,67 s, 1440x2560, 30 fps): "Llevamos más de 15 unidades comercializadas." (0–2,64 s).
// Texto protagonista "+15 / UNIDADES VENDIDAS" en mostaza con volumen real (capas apiladas en 3D, como CONTÁCTANOS): entra desde abajo, desenfocado,
// por DETRÁS de la mujer (capa de recorte encima: `public/recorte_unidades/`, tools/recorte/recorte.py) y se asienta en la zona alta.
// Capas: vídeo → velo oscuro superior → texto 3D → recorte de la mujer. Audio original.

export const UN_FPS = 30;
export const UN_DURATION = 80;
export const UN_W = 1440;
export const UN_H = 2560;

const T0 = 3; // fotograma de inicio de la entrada (0,1 s: antes de "más", 0,42 s, para que se lea con tiempo)
const ENTRADA = 30; // fotogramas hasta asentarse (1 s); legible desde ~0,7 s
const FIN_Y = 640; // centro vertical final del bloque (px); la zona segura superior de Reels queda libre
const INI_Y = 2230; // centro inicial: oculto tras el torso de la mujer
const CAPAS = 30;
const MUSTARD = [226, 168, 38];
const DEEP = [74, 48, 6];
const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;

const ease = Easing.bezier(0.3, 0.05, 0.2, 1); // sube con decisión y frena suave (se ve salir de detrás de ella)

const Linea: React.FC<{ texto: string; size: number; spacing: number; front: boolean; color: string; sweep: number; sombra: boolean }> = ({ texto, size, spacing, front, color, sweep, sombra }) => (
  <div
    style={{
      fontFamily: "Bebas Neue",
      fontSize: size,
      letterSpacing: spacing,
      lineHeight: 0.92,
      whiteSpace: "nowrap",
      color: front ? "#F2BE45" : color,
      backgroundImage: front ? `linear-gradient(180deg, #FFDD85 0%, #F2BE45 38%, #E2A826 62%, #B98512 100%)` : undefined,
      WebkitBackgroundClip: front ? "text" : undefined,
      WebkitTextFillColor: front ? "transparent" : undefined,
      textShadow: sombra ? "0 46px 70px rgba(0,0,0,0.55)" : undefined,
      position: "relative",
    }}
  >
    {texto}
    {front && (
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(105deg, rgba(255,255,255,0) ${sweep - 14}%, rgba(255,250,225,0.85) ${sweep}%, rgba(255,255,255,0) ${sweep + 14}%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {texto}
      </span>
    )}
  </div>
);

const Texto: React.FC = () => {
  const frame = useCurrentFrame();
  const e = ease(Math.min(1, Math.max(0, (frame - T0) / ENTRADA)));
  if (frame < T0) return null;
  const y = INI_Y + (FIN_Y - INI_Y) * e;
  const blur = 30 * Math.pow(1 - e, 2.2);
  const op = interpolate(frame, [T0, T0 + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const depth = 96 * Math.min(1, 0.35 + 0.65 * e);
  const sway = Math.sin((frame - T0) / UN_FPS * 2.3) * 8 * e;
  const tilt = (1 - e) * 62 + 11; // se endereza al subir
  const sweep = interpolate(frame, [T0 + 30, T0 + 58], [-30, 130], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const W = 1360;
  const H = 640;
  return (
    <div style={{ position: "absolute", left: (UN_W - W) / 2, top: y - H / 2, width: W, height: H, opacity: op, filter: blur > 0.4 ? `blur(${blur}px)` : undefined }}>
      <div style={{ perspective: 1700, width: "100%", height: "100%" }}>
        <div style={{ width: "100%", height: "100%", transformStyle: "preserve-3d", transform: `rotateX(${tilt}deg) rotateY(${sway}deg) scale(${0.55 + 0.45 * e})` }}>
          {Array.from({ length: CAPAS + 1 }).map((_, k) => {
            const i = CAPAS - k;
            const front = i === 0;
            const color = mix(MUSTARD, DEEP, Math.pow(i / CAPAS, 0.75));
            return (
              <div key={i} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: `translateZ(${-(i / CAPAS) * depth}px)` }}>
                <Linea texto="+15" size={430} spacing={6} front={front} color={color} sweep={sweep} sombra={i === CAPAS} />
                <Linea texto="UNIDADES VENDIDAS" size={160} spacing={9} front={front} color={color} sweep={sweep} sombra={i === CAPAS} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const Unidades: React.FC = () => {
  useKitFonts();
  const frame = useCurrentFrame();
  const velo = interpolate(frame, [T0, T0 + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const n = String(Math.min(frame, UN_DURATION - 1)).padStart(4, "0");
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("entrada/unidades_1440.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      {/* velo oscuro suave arriba: el mostaza se lee mejor sobre la fachada clara */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1500, background: "linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0) 100%)", opacity: velo }} />
      <Texto />
      <Img src={staticFile(`recorte_unidades/m_${n}.webp`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
