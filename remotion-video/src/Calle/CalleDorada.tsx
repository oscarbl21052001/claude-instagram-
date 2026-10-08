import { Video } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useKitFonts } from "../kit";
import { TEXTO_H, TEXTO_M, TEXTO_W } from "./datos";

// Video de dron con la calle principal pintada de mostaza dorado y un texto pegado al suelo.
// El texto sigue el giro de la cámara (matriz por fotograma, tools/calle/) y solo se ve sobre la calle pintada.

export type CalleConfig = {
  video: string; // en public/
  capas: string; // carpeta en public/ con p_NNNN.webp (alfa = calle pintada)
  matrices: number[][]; // matrix3d del texto por fotograma
  texW: number;
  texH: number;
  frames: number;
  pintura: { desde: number; hasta: number }; // barrido de la pintura hacia el mar (fotogramas)
  texto: { desde: number; hasta: number }; // aparición del texto en el sentido de lectura
  finEntra: { desde: number; hasta: number }; // la calle vuelve a entrar al final del giro (sin texto)
  lineas: string[];
};

export const CalleEscena: React.FC<{ config: CalleConfig }> = ({ config: c }) => {
  useKitFonts();
  const frame = useCurrentFrame();
  const n = String(Math.min(frame, c.frames - 1)).padStart(4, "0");
  const capa = staticFile(`${c.capas}/p_${n}.webp`);
  const ease = Easing.bezier(0.16, 1, 0.3, 1);

  // Barrido: la pintura avanza desde abajo (cerca de la cámara) hacia arriba (el mar).
  const sweep = interpolate(frame, [c.pintura.desde, c.pintura.hasta], [-160, 900], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const entraFin = interpolate(frame, [c.finEntra.desde, c.finEntra.hasta], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const final = frame >= c.finEntra.desde;
  const paintStyle: React.CSSProperties = final
    ? { opacity: entraFin }
    : {
        WebkitMaskImage: `linear-gradient(to top, #000 ${Math.max(sweep, 0)}px, transparent ${Math.max(sweep, 0) + 160}px)`,
        maskImage: `linear-gradient(to top, #000 ${Math.max(sweep, 0)}px, transparent ${Math.max(sweep, 0) + 160}px)`,
        opacity: 0.92,
      };

  // Texto: se revela a lo largo de la calle (eje x de la textura) y se recorta con la silueta de la calle pintada.
  const wipe = interpolate(frame, [c.texto.desde, c.texto.hasta], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const m = c.matrices[Math.min(frame, c.matrices.length - 1)];

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile(c.video)} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      <Img src={capa} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...paintStyle }} />
      {!final && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            WebkitMaskImage: `url(${capa})`,
            maskImage: `url(${capa})`,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: c.texW,
              height: c.texH,
              transformOrigin: "0 0",
              transform: `matrix3d(${m.join(",")})`,
              clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Bebas Neue",
              fontSize: 420,
              whiteSpace: "nowrap",
              lineHeight: 0.9,
              letterSpacing: 6,
              color: "#FFF8E7",
              textShadow: "0 0 30px rgba(60,40,0,0.45)",
              opacity: 0.96,
            }}
          >
            {c.lineas.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// Clip 1008 (2,07 s). Su pintura sigue el borde de la máscara del modelo (versión anterior).
export const CALLE_FPS = 30;
export const CALLE_DURATION = 62;
export const CALLE_TEXTO = ["300 METROS", "DEL MAR"];
export const CALLE_CONFIG: CalleConfig = {
  video: "entrada/calle_1080.mp4",
  capas: "calle",
  matrices: TEXTO_M,
  texW: TEXTO_W,
  texH: TEXTO_H,
  frames: CALLE_DURATION,
  pintura: { desde: 1, hasta: 13 },
  texto: { desde: 6, hasta: 18 },
  finEntra: { desde: 50, hasta: 57 },
  lineas: CALLE_TEXTO,
};
export const CalleDorada: React.FC = () => <CalleEscena config={CALLE_CONFIG} />;
