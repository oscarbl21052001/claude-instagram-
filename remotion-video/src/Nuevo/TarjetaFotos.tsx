import { AbsoluteFill, Easing, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// Tarjeta grande de fotos del edit CAPRI (marco dorado, entrada con resorte + perspectiva 3D, tres fotos 16:9 que entran una tras otra),
// aplicada a SPOT 335 cuando ella dice "experiencias, comodidad y servicios" (26,2 / 27,2 / 28,1 s).
// "lateral": tarjeta a la derecha como en Capri · "centro": tarjeta grande en el centro con el fondo desenfocado.

export type ModoTarjeta = "lateral" | "centro" | "ninguna";

const GOLD = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const FOTOS = ["nuevo/fotos/interior_sala.png", "nuevo/fotos/salon_fiestas.png", "nuevo/fotos/terraza.png"];

export const T_START = 780; // 26,0 s
const T_FOTOS = [787, 816, 843]; // "experiencias" 26,22 · "comodidad" 27,20 · "servicios" 28,10
export const T_END = 865; // corte a la playa (28,83 s): la tarjeta sale con el cross-zoom

const GEOM = {
  lateral: { x: 650, y: 90, w: 390, h: 650, rotY: -8, rotZ: 0.5, radius: 44, gap: 14, pad: 22 },
  centro: { x: 110, y: 205, w: 860, h: 1460, rotY: -8, rotZ: 0.5, radius: 64, gap: 22, pad: 22 },
};

// cuánto se desenfoca y oscurece el fondo (solo modo "centro")
export const fondoBlur = (f: number, modo: ModoTarjeta) => (modo === "centro" && f < T_END ? 14 * Easing.out(Easing.cubic)(clamp01((f - T_START) / 14)) : 0);
export const fondoOscuro = (f: number, modo: ModoTarjeta) => (modo === "centro" ? 0.3 * clamp01((f - T_START) / 14) : 0);

export const TarjetaFotos: React.FC<{ modo: ModoTarjeta }> = ({ modo }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (modo === "ninguna" || f < T_START || f >= T_END) return null;
  const g = GEOM[modo];
  const p = spring({ frame: f - T_START, fps, config: { damping: 18, stiffness: 80 } });
  const e = Math.min(p, 1);
  const slide = (1 - e) * 520;
  return (
    <div style={{ position: "absolute", left: g.x, top: g.y, width: g.w, height: g.h, perspective: 1800, opacity: clamp01(e * 2.2) }}>
      <div style={{ width: "100%", height: "100%", transform: `translateX(${slide}px) rotateY(${g.rotY * (0.4 + 0.6 * e)}deg) rotateZ(${g.rotZ}deg)`, transformStyle: "preserve-3d" }}>
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            height: "100%",
            border: "8px solid transparent",
            borderRadius: g.radius,
            background: `linear-gradient(180deg, #FFFFFF 0%, #F6F1E6 100%) padding-box, ${GOLD} border-box`,
            boxShadow: "0 26px 64px rgba(70,44,18,0.42)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", inset: 0, padding: g.pad, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {FOTOS.map((src, i) => {
              const q = clamp01((f - T_FOTOS[i]) / 11);
              const k = 1 - Math.pow(1 - q, 3);
              return (
                <Img
                  key={src}
                  src={staticFile(src)}
                  style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: g.radius * 0.45, opacity: k, transform: `translateY(${(1 - k) * 60}px) scale(${0.96 + 0.04 * k})`, boxShadow: "0 8px 22px rgba(70,44,18,0.35)" }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const OscurecerFondo: React.FC<{ modo: ModoTarjeta }> = ({ modo }) => {
  const f = useCurrentFrame();
  const o = f < T_END ? fondoOscuro(f, modo) : 0;
  return o > 0 ? <AbsoluteFill style={{ background: `rgba(20,14,8,${o})` }} /> : null;
};
