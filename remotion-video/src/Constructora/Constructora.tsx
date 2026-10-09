import { Video } from "@remotion/media";
import { AbsoluteFill, interpolate, staticFile } from "remotion";
import { useEnter, useKitFonts } from "../kit";
import { useCurrentFrame } from "remotion";

// Clip "CONSTRUCTORA" (1,63 s, 1440x2530, 30 fps): grabación de pantalla de una historia de Instagram, limpiada y con texto nuevo.
// Limpieza (tools/constructora/): recorte del borde de la grabación y de la interfaz, logos y textos borrados con LaMa, tinte verde corregido,
// reducción de ruido y enfoque → `public/entrada/constructora_clean.mp4`. Aquí solo se añade el texto, con el estilo de "AMENITIES PREMIUM":
// Bebas Neue crema #FFF8E7 de 112 px con sombra suave, en la parte baja (dos líneas). El audio original estaba en silencio y no se incluye.

export const CONS_FPS = 30;
export const CONS_DURATION = 49;
export const CONS_W = 1440;
export const CONS_H = 2530;

const ENTRA = 8; // el texto aparece a los 0,27 s con un fundido suave
const CREMA = "#FFF8E7";

export const Constructora: React.FC = () => {
  useKitFonts();
  const frame = useCurrentFrame();
  const enter = useEnter(ENTRA);
  const e = Math.min(enter, 1);
  const op = interpolate(frame, [ENTRA, ENTRA + 6], [0, 0.96], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("entrada/constructora_clean.mp4")} muted objectFit="cover" style={{ width: "100%", height: "100%", transform: "scale(1.025)" }} />
      {/* velo oscuro suave abajo para leer el texto */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 560, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)", opacity: interpolate(frame, [ENTRA, ENTRA + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      <div style={{ position: "absolute", left: 0, width: CONS_W, top: 2293 - 120, height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: op, transform: `translateY(${(1 - e) * 26}px)` }}>
        {["CONSTRUCTORAS", "DE RENOMBRE"].map((l) => (
          <div key={l} style={{ fontFamily: "Bebas Neue", fontSize: 112, letterSpacing: 7, lineHeight: 1.0, color: CREMA, textShadow: "0 0 26px rgba(60,40,0,0.6), 0 3px 12px rgba(0,0,0,0.55)", whiteSpace: "nowrap" }}>
            {l}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
