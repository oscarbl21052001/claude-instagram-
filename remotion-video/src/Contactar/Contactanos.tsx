import { Video } from "@remotion/media";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useKitFonts } from "../kit";

// Clip "CONTACTAR" (5,7 s): "Bueno, bueno, ¿y cómo hacen los clientes para invertir en proyectos así? Es simple, contactarnos."
// Abajo: el texto CONTÁCTANOS con volumen real (capas apiladas en 3D) y una flecha mostaza hacia abajo que palpita.
// Color mostaza = el de la calle pintada (#E2A826); cara del texto en blanco cálido, como el texto de la calle.

export const CONTACTAR_FPS = 30;
export const CONTACTAR_DURATION = 171;

// Segundos de la transcripción por palabras: "simple," 3,66–3,98 · "contactarnos." 4,36–4,84
const T = { text: 4.2, arrow: 4.5 };

const MUSTARD = [226, 168, 38]; // #E2A826
const DEEP = [74, 48, 6];
const mix = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(",")})`;

const TEXT = "CONTÁCTANOS";
const TEXT_Y = 1470; // centro vertical del texto (px)
const ARROW_Y = 1625; // centro vertical de la flecha (px)

// Pila de capas: la cara delantera y N capas detrás, cada vez más oscuras, dan el grosor.
const Capas: React.FC<{ n: number; depth: number; render: (i: number, front: boolean, color: string) => React.ReactNode }> = ({ n, depth, render }) => (
  <>
    {Array.from({ length: n + 1 }).map((_, k) => {
      const i = n - k; // pintar primero las más lejanas
      const front = i === 0;
      const color = mix(MUSTARD, DEEP, Math.pow(i / n, 0.8));
      return (
        <div key={i} style={{ position: "absolute", inset: 0, transform: `translateZ(${-(i / n) * depth}px)` }}>
          {render(i, front, color)}
        </div>
      );
    })}
  </>
);

const Texto: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = spring({ frame: frame - T.text * fps, fps, config: { damping: 11, stiffness: 110, mass: 0.7 } });
  const k = Math.max(0, Math.min(p, 1.15));
  const appear = interpolate(t, [T.text, T.text + 0.18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const depth = 38 * Math.min(k, 1);
  const sway = Math.sin((t - T.text) * 2.4) * 9; // el giro suave deja ver el grosor
  const sweep = interpolate(t, [T.text + 0.25, T.text + 0.9], [-30, 130], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (t < T.text) return null;
  const W = 700;
  const H = 140;
  return (
    <div style={{ position: "absolute", left: 540 - W / 2, top: TEXT_Y - H / 2, width: W, height: H, opacity: appear }}>
      <div style={{ perspective: 1300, width: "100%", height: "100%" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transform: `rotateX(${(1 - Math.min(k, 1)) * 80 + 14}deg) rotateY(${sway}deg) scale(${0.7 + 0.3 * k})`,
          }}
        >
          <Capas
            n={26}
            depth={depth}
            render={(i, front, color) => (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Bebas Neue",
                  fontSize: 104,
                  letterSpacing: 4,
                  whiteSpace: "nowrap",
                  color: front ? "#FFF8E7" : color,
                  backgroundImage: front
                    ? `linear-gradient(105deg, #FFF3D0 0%, #FFF8E7 ${sweep - 14}%, #ffffff ${sweep}%, #FFF8E7 ${sweep + 14}%, #F6E2AE 100%)`
                    : undefined,
                  WebkitBackgroundClip: front ? "text" : undefined,
                  WebkitTextFillColor: front ? "transparent" : undefined,
                  textShadow: front ? undefined : i === 26 ? "0 30px 60px rgba(0,0,0,0.55)" : undefined,
                }}
              >
                {TEXT}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};

const Flecha: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = spring({ frame: frame - T.arrow * fps, fps, config: { damping: 10, stiffness: 120, mass: 0.7 } });
  if (t < T.arrow) return null;
  // latido: dos pulsos seguidos, como la flecha de la casa
  const ph = ((t - T.arrow - 0.4) * 1.6) % 1;
  const beat = t < T.arrow + 0.4 ? 0 : Math.exp(-Math.pow(ph / 0.07, 2)) + 0.65 * Math.exp(-Math.pow((ph - 0.24) / 0.07, 2));
  const k = Math.max(0.001, Math.min(p, 1.2)) * (1 + 0.16 * beat);
  const bob = Math.sin((t - T.arrow) * 4.2) * 7; // pequeño balanceo hacia abajo
  const W = 150;
  const H = 182;
  const shape = "polygon(30% 0%, 70% 0%, 70% 46%, 100% 46%, 50% 100%, 0% 46%, 30% 46%)";
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 540 - 190,
          top: ARROW_Y - 190 + bob,
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(226,168,38,${0.38 + 0.3 * beat}) 0%, rgba(226,168,38,0) 62%)`,
          transform: `scale(${(0.8 + 0.3 * beat) * Math.min(p, 1)})`,
        }}
      />
      <div style={{ position: "absolute", left: 540 - W / 2, top: ARROW_Y - H / 2 + bob, width: W, height: H }}>
        <div style={{ perspective: 1000, width: "100%", height: "100%" }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              transformStyle: "preserve-3d",
              transform: `rotateX(16deg) rotateY(${Math.sin((t - T.arrow) * 2.1) * 16}deg) scale(${k})`,
            }}
          >
            <Capas
              n={22}
              depth={38}
              render={(i, front, color) => (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    clipPath: shape,
                    background: front ? `linear-gradient(180deg, #F4C24A 0%, #E2A826 55%, #C98B12 100%)` : color,
                  }}
                />
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export const Contactanos: React.FC = () => {
  useKitFonts();
  const t = useCurrentFrame() / CONTACTAR_FPS;
  // velo suave abajo para que el texto se lea sobre el fondo, que aparece con el texto
  const veil = interpolate(t, [T.text - 0.2, T.text + 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("entrada/contactar_1080.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 56%, rgba(0,0,0,0.5) 100%)", opacity: veil }} />
      <Texto />
      <Flecha />
    </AbsoluteFill>
  );
};
