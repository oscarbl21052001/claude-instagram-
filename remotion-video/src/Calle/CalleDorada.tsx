import { Video } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useKitFonts } from "../kit";
import { TEXTO_H, TEXTO_M, TEXTO_W } from "./datos";

// Vídeo de dron con la calle principal pintada de mostaza dorado y un texto pegado al suelo.
// El texto sigue el giro de la cámara (matriz por fotograma, tools/calle/procesar.py) y solo se ve sobre la calle.

export const CALLE_FPS = 30;
export const CALLE_DURATION = 62; // 2,07 s
export const CALLE_TEXTO = ["300 METROS", "DEL MAR"];

const PINTURA = { desde: 1, hasta: 13 }; // barrido de la pintura hacia el mar (fotogramas)
const TEXTO = { desde: 6, hasta: 18 }; // aparición del texto en el sentido de lectura
const FIN_ENTRA = { desde: 50, hasta: 57 }; // la calle vuelve a entrar al final del giro

export const CalleDorada: React.FC = () => {
  useKitFonts();
  const frame = useCurrentFrame();
  const n = String(Math.min(frame, CALLE_DURATION - 1)).padStart(4, "0");
  const capa = staticFile(`calle/p_${n}.webp`);
  const ease = Easing.bezier(0.16, 1, 0.3, 1);

  // Barrido: la pintura avanza desde abajo (cerca de la cámara) hacia arriba (el mar).
  const sweep = interpolate(frame, [PINTURA.desde, PINTURA.hasta], [-160, 900], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const entraFin = interpolate(frame, [FIN_ENTRA.desde, FIN_ENTRA.hasta], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const final = frame >= FIN_ENTRA.desde;
  const paintStyle: React.CSSProperties = final
    ? { opacity: entraFin }
    : {
        WebkitMaskImage: `linear-gradient(to top, #000 ${Math.max(sweep, 0)}px, transparent ${Math.max(sweep, 0) + 160}px)`,
        maskImage: `linear-gradient(to top, #000 ${Math.max(sweep, 0)}px, transparent ${Math.max(sweep, 0) + 160}px)`,
        opacity: 0.92,
      };

  // Texto: se revela a lo largo de la calle (eje x de la textura) y se recorta con la silueta de la calle.
  const wipe = interpolate(frame, [TEXTO.desde, TEXTO.hasta], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const m = TEXTO_M[Math.min(frame, TEXTO_M.length - 1)];

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("entrada/calle_1080.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
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
              width: TEXTO_W,
              height: TEXTO_H,
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
            {CALLE_TEXTO.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
