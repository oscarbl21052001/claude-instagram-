import { Video } from "@remotion/media";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useEnter, useKitFonts } from "../kit";

// Clip "AÑADIR" (3,5 s): "Es simple, analizo tres cosas a la hora de invertir."
// Mientras dice "analizo tres cosas" aparecen en el cielo tres puntos numerados; su texto va totalmente difuminado (intriga).
// Paleta del esquema anterior: negro y dorados.

export const INTRIGA_FPS = 30;
export const INTRIGA_DURATION = 106;

// Segundos de la transcripción por palabras: analizo 1,14–1,62 · tres 1,62–1,94 · cosas 1,94–2,42
const START = [1.2, 1.55, 1.9];
// Texto que quedará oculto tras el desenfoque (son los tres puntos que luego se revelan)
const TEXTOS = ["Localización estratégica", "Constructora de renombre", "Amenities premium"];
const BLUR_PX = 20;

const P = { gold: "#C7AE6A", goldDeep: "#b99a45", cream: "#e3d6b4", sheen: "#F3EBB6", shade: "#8f7138", ink: "#1a1a1a" };
const METAL = `linear-gradient(135deg, ${P.shade} 0%, ${P.gold} 28%, ${P.sheen} 50%, ${P.gold} 72%, ${P.shade} 100%)`;

const CARD = { x: 90, w: 900, h: 128, top: 215, gap: 18 };

const Punto: React.FC<{ i: number }> = ({ i }) => {
  const frame = useCurrentFrame();
  const enter = useEnter(Math.round(START[i] * INTRIGA_FPS));
  const t = frame / INTRIGA_FPS;
  const y = CARD.top + i * (CARD.h + CARD.gap);
  // el texto difuminado respira apenas, para que se note vivo sin llegar a leerse
  const drift = Math.sin(t * 2.2 + i * 1.3) * 3;
  const o = Math.min(enter, 1);
  return (
    <div
      style={{
        position: "absolute",
        left: CARD.x,
        top: y,
        width: CARD.w,
        height: CARD.h,
        boxSizing: "border-box",
        borderRadius: 36,
        display: "flex",
        alignItems: "center",
        padding: "0 44px",
        gap: 34,
        background: "linear-gradient(180deg, rgba(40,34,20,0.82) 0%, rgba(14,12,8,0.9) 100%)",
        border: "1.5px solid rgba(199,174,106,0.6)",
        boxShadow: "0 22px 60px rgba(0,0,0,0.45), 0 0 50px rgba(226,190,100,0.16)",
        backdropFilter: "blur(14px)",
        opacity: interpolate(enter, [0, 0.45], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${(1 - o) * -46}px) scale(${0.94 + 0.06 * o})`,
      }}
    >
      <div
        style={{
          fontFamily: "Space Grotesk",
          fontWeight: 700,
          fontSize: 78,
          lineHeight: 1,
          backgroundImage: METAL,
          WebkitBackgroundClip: "text",
          color: "transparent",
          flexShrink: 0,
          width: 80,
        }}
      >
        {i + 1}.
      </div>
      <div
        style={{
          fontFamily: "Inter",
          fontWeight: 800,
          fontSize: 36,
          letterSpacing: 2,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          color: P.sheen,
          filter: `blur(${BLUR_PX}px)`,
          transform: `translateX(${drift}px)`,
          opacity: 1,
        }}
      >
        {TEXTOS[i]}
      </div>
    </div>
  );
};

export const TresCosas: React.FC = () => {
  useKitFonts();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("entrada/anadir_1080.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      {[0, 1, 2].map((i) => (
        <Punto key={i} i={i} />
      ))}
    </AbsoluteFill>
  );
};
