import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Freeze, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useEnter, useKitFonts } from "../kit";

// Clip "AMENITIES" (1,47 s, 1440x2544, 30 fps): terraza → tres recuadros apilados (piscina exterior, piscina interior, ducha con jardín).
// Cambios pedidos: (1) el texto "2 PISCINAS" pasa a "AMENITIES PREMIUM" con la tipografía y el color del texto de la calle (Bebas Neue crema),
// (2) los tres recuadros pasan a tarjetas oscuras con borde dorado como en el resto de ediciones, (3) imagen más nítida
// (reducción de ruido + enfoque, aplicados en `public/entrada/amenities_clean.mp4`; el texto antiguo se borró de ese vídeo).
// Duración, formato y audio originales.

export const AMEN_FPS = 30;
export const AMEN_DURATION = 44;
export const AMEN_W = 1440;
export const AMEN_H = 2544;

const SRC = "entrada/amenities_clean.mp4";
const BG_FREEZE = 7; // la terraza deja de moverse al entrar las tarjetas (queda de fondo, desenfocada)
const C = { gold: "#C7AE6A", cream: "#FFF8E7" };

// Tarjetas: x, y, ancho, alto; centro del recorte del vídeo que muestran (px del vídeo) y zoom; fotogramas de entrada y de "recuadro completo".
const CARD = { x: 60, w: 1320, h: 760, pad: 12 };
const CARDS = [
  { y: 105, cx: 721, cy: 484, zoom: 1.0, enter: 7, full: 10 },
  { y: 905, cx: 721, cy: 1277, zoom: 1.0, enter: 9, full: 12 },
  { y: 1705, cx: 721, cy: 2068, zoom: 1.03, enter: 11, full: 12 },
];

const Fondo: React.FC = () => {
  const frame = useCurrentFrame();
  const k = Math.min(1, Math.max(0, (frame - BG_FREEZE) / 8));
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1 + 0.05 * k})`, filter: `blur(${18 * k}px) brightness(${1 - 0.5 * k})` }}>
        <Freeze frame={Math.min(frame, BG_FREEZE)}>
          <Video src={staticFile(SRC)} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </Freeze>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Tarjeta: React.FC<{ i: number; sombraAbajo?: boolean }> = ({ i, sombraAbajo }) => {
  const frame = useCurrentFrame();
  const c = CARDS[i];
  const enter = useEnter(c.enter);
  if (frame < c.enter) return null;
  const iw = CARD.w - 2 * CARD.pad;
  const ih = CARD.h - 2 * CARD.pad;
  const s = c.zoom;
  const e = Math.min(enter, 1);
  return (
    <div
      style={{
        position: "absolute",
        left: CARD.x,
        top: c.y,
        width: CARD.w,
        height: CARD.h,
        boxSizing: "border-box",
        padding: CARD.pad,
        borderRadius: 44,
        background: "linear-gradient(180deg, rgba(40,34,20,0.95) 0%, rgba(14,12,8,0.97) 100%)",
        border: "2.5px solid rgba(199,174,106,0.75)",
        boxShadow: "0 26px 70px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,248,231,0.06)",
        opacity: interpolate(enter, [0, 0.45], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${(1 - e) * -46}px) scale(${0.95 + 0.05 * e})`,
      }}
    >
      <div style={{ position: "relative", width: iw, height: ih, borderRadius: 32, overflow: "hidden", background: "#000" }}>
        <Freeze frame={Math.max(frame, c.full)}>
          <Video
            src={staticFile(SRC)}
            muted
            style={{ position: "absolute", width: AMEN_W * s, height: AMEN_H * s, left: iw / 2 - c.cx * s, top: ih / 2 - c.cy * s }}
          />
        </Freeze>
        {sombraAbajo && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 300, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)" }} />}
      </div>
    </div>
  );
};

export const Amenities: React.FC = () => {
  useKitFonts();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Fondo />
      <Audio src={staticFile("audio/amenities.m4a")} />
      <Tarjeta i={0} />
      <Tarjeta i={1} />
      <Tarjeta i={2} sombraAbajo />
      {/* mismo sitio que el texto original (centro x≈720, y≈2365) */}
      <div style={{ position: "absolute", left: 0, width: AMEN_W, top: 2365 - 70, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Bebas Neue", fontSize: 112, letterSpacing: 7, lineHeight: 1, color: C.cream, textShadow: "0 0 26px rgba(60,40,0,0.6), 0 3px 12px rgba(0,0,0,0.55)", opacity: 0.96, whiteSpace: "nowrap" }}>
          AMENITIES PREMIUM
        </div>
      </div>
    </AbsoluteFill>
  );
};
