import { Audio, Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { AbsoluteFill, Easing, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const DO_FPS = 30;
export const DO_DURATION = 514; // 17,13 s
export const DO_W = 1080;
export const DO_H = 1920;

const T = { hero: "#34D399", ink: "#F8FAFC", card: "rgba(8, 14, 12, 0.78)", font: "Poppins" };
const ease = { out: Easing.bezier(0.16, 1, 0.3, 1), inOut: Easing.bezier(0.83, 0, 0.17, 1), in: Easing.bezier(0.7, 0, 0.84, 0) };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Subtítulos por frases (tiempos de la transcripción palabra por palabra).
// "Lula" es una suposición: la transcripción automática dice "NULA".
const FRASES: { t0: number; t1: number; texto: string }[] = [
  { t0: 0.0, t1: 2.3, texto: "Algo pasó esta semana en Brasil," },
  { t0: 2.46, t1: 4.35, texto: "que hace que tus dólares valgan más." },
  { t0: 4.42, t1: 6.0, texto: "Debido a la reelección de Lula," },
  { t0: 6.32, t1: 8.6, texto: "el dólar subió frente al real brasileño." },
  { t0: 8.76, t1: 9.9, texto: "Para vos, argentino," },
  { t0: 9.96, t1: 11.1, texto: "que todavía estabas en duda" },
  { t0: 11.06, t1: 12.6, texto: "si vas a venir esta temporada" },
  { t0: 13.0, t1: 14.45, texto: "o comprar tu primer inmueble," },
  { t0: 14.64, t1: 16.5, texto: "ahora es el mejor momento." },
];

// Planos del vídeo original (cortes detectados en 4,43 s, 8,77 s y 14,6 s).
const PLANOS: { t: number; z0: number; z1: number }[] = [
  { t: 0, z0: 1.0, z1: 1.05 },
  { t: 4.43, z0: 1.1, z1: 1.15 },
  { t: 8.77, z0: 1.0, z1: 1.05 },
  { t: 14.6, z0: 1.12, z1: 1.17 },
  { t: 99, z0: 1, z1: 1 },
];

const useFuente = () => {
  const [handle] = useState(() => delayRender("fuentes"));
  useEffect(() => {
    Promise.all([
      loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-ExtraBold.woff2"), weight: "800" }),
      loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-Bold.woff2"), weight: "700" }),
      loadFont({ family: "Bebas Neue", url: staticFile("fonts/BebasNeue-Regular.woff2") }),
      loadFont({ family: "Inter", url: staticFile("fonts/Inter-Medium.woff2"), weight: "500" }),
    ]).then(() => continueRender(handle));
  }, [handle]);
};

const Plano: React.FC<{ s: number; zoom: boolean }> = ({ s, zoom }) => {
  let z = 1;
  if (zoom) {
    let i = 0;
    while (i < PLANOS.length - 2 && s >= PLANOS[i + 1].t) i++;
    const p = PLANOS[i];
    const k = interpolate(s, [p.t, PLANOS[i + 1].t], [0, 1], { ...clamp, easing: ease.inOut });
    z = p.z0 + (p.z1 - p.z0) * k;
  }
  return (
    <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: "50% 45%" }}>
      <Video src={staticFile("dolar/dolar_ligero.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};

// Subtítulos minimalistas del taller (mismos que SOLAIA / SPOT 335 / PINGPONG): Inter Medium blanca, una línea, línea fina encima y degradado negro suave abajo.
const Subtitulos: React.FC = () => {
  const frame = useCurrentFrame();
  let op = 0;
  let texto = "";
  for (const p of FRASES) {
    const a = Math.round(p.t0 * DO_FPS) - 2;
    const b = Math.round((p.t1 + 0.1) * DO_FPS);
    const o = Math.min(clamp01((frame - a) / 5), clamp01((b + 6 - frame) / 6));
    if (o > op) {
      op = o;
      texto = p.texto;
    }
  }
  const grad = Math.min(clamp01(frame / 10), clamp01((DO_DURATION - frame) / 10));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 560, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)", opacity: grad }} />
      {op > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 330, display: "flex", flexDirection: "column", alignItems: "center", opacity: op }}>
          <div style={{ width: 56, height: 1.5, background: "rgba(255,255,255,0.8)", marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.5)" }} />
          <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 34, letterSpacing: 1.2, color: "#FFFFFF", textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 2px 14px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.5)", textAlign: "center", whiteSpace: "nowrap" }}>{texto}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// Titular del gancho: palabra a palabra, "MÁS" en verde.
const Gancho: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t0 = 0.15;
  const t1 = 4.3;
  if (s > t1 + 0.4) return null;
  const sale = interpolate(s, [t1, t1 + 0.3], [1, 0], { ...clamp, easing: ease.in });
  const lineas = [["TU", "DÓLAR"], ["VALE", "MÁS"]];
  let n = 0;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 300, textAlign: "center", opacity: sale }}>
      {lineas.map((l, li) => (
        <div key={li} style={{ fontFamily: "Bebas Neue", fontSize: 190, lineHeight: 0.98, letterSpacing: 4, textShadow: "0 6px 30px rgba(0,0,0,0.6)" }}>
          {l.map((w) => {
            const k = spring({ frame: frame - Math.round(t0 * fps) - n++ * 4, fps, config: { damping: 14, stiffness: 170, mass: 0.6 } });
            return (
              <span key={w} style={{ display: "inline-block", marginRight: 28, color: w === "MÁS" ? T.hero : T.ink, opacity: Math.min(1, k * 1.6), transform: `translateY(${(1 - k) * 36}px)` }}>
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// Gráfico sin cifras: USD sube frente a BRL, la línea se dibuja cuando dice "el dólar subió".
const Grafico: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t0 = 4.5;
  const t1 = 8.6;
  if (s < t0 || s > t1 + 0.4) return null;
  const e = spring({ frame: frame - Math.round(t0 * fps), fps, config: { damping: 18, stiffness: 110, mass: 0.9 } });
  const sale = interpolate(s, [t1, t1 + 0.3], [0, 1], { ...clamp, easing: ease.in });
  const o = Math.min(1, e * 1.4) * (1 - sale);
  const trazo = interpolate(s, [6.4, 7.5], [0, 1], { ...clamp, easing: ease.out });
  const L = 520;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 260, display: "flex", justifyContent: "center", opacity: o, transform: `translateY(${(1 - e) * -50}px) scale(${0.94 + 0.06 * e})` }}>
      <div style={{ background: T.card, borderRadius: 36, padding: "28px 40px 30px", boxShadow: "0 20px 60px rgba(0,0,0,0.45)", border: "1.5px solid rgba(255,255,255,0.14)", width: 760 }}>
        <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: "rgba(248,250,252,0.62)", marginBottom: 6 }}>USD / BRL</div>
        <svg width="680" height="300" viewBox="0 0 680 300">
          <line x1="10" y1="280" x2="670" y2="280" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
          <path d="M20 230 L150 210 L260 225 L370 175 L500 110 L640 40" fill="none" stroke={T.hero} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={L + 200} strokeDashoffset={(L + 200) * (1 - trazo)} />
          <circle cx="640" cy="40" r="13" fill={T.hero} opacity={clamp01((trazo - 0.9) * 10)} />
        </svg>
      </div>
    </div>
  );
};

// Cierre: "MEJOR MOMENTO" sobrio arriba, con línea que se dibuja.
const Cierre: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t0 = 15.5;
  if (s < t0) return null;
  const fadeOut = interpolate(s, [16.8, 17.1], [1, 0], clamp);
  const palabras = ["MEJOR", "MOMENTO"];
  const linea = interpolate(s, [t0 + 0.3, t0 + 0.9], [0, 1], { ...clamp, easing: ease.out });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 300, textAlign: "center", opacity: fadeOut }}>
      <div style={{ fontFamily: "Bebas Neue", fontSize: 170, lineHeight: 1, letterSpacing: 4, textShadow: "0 6px 30px rgba(0,0,0,0.6)" }}>
        {palabras.map((w, i) => {
          const k = spring({ frame: frame - Math.round(t0 * fps) - i * 4, fps, config: { damping: 14, stiffness: 170, mass: 0.6 } });
          return (
            <span key={w} style={{ display: "inline-block", marginRight: 26, color: i === 1 ? T.hero : T.ink, opacity: Math.min(1, k * 1.6), transform: `translateY(${(1 - k) * 36}px)` }}>
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ margin: "14px auto 0", height: 4, width: 420 * linea, background: T.hero, borderRadius: 2 }} />
    </div>
  );
};

const Capas: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 52%, transparent 55%, rgba(0,0,0,0.4) 100%)" }} />
);

const sfx = (nombre: string, t: number, vol: number) => (
  <Sequence from={Math.max(0, Math.round(t * DO_FPS))} durationInFrames={Math.round(0.7 * DO_FPS)} key={`${nombre}${t}`}>
    <Audio src={staticFile(`pingpong/sfx/${nombre}.wav`)} volume={vol} />
  </Sequence>
);

const Base: React.FC<{ b: boolean }> = ({ b }) => {
  useFuente();
  const frame = useCurrentFrame();
  const s = frame / DO_FPS;
  const fadeOut = interpolate(s, [16.8, 17.1], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Plano s={s} zoom={b} />
      {b ? <Capas /> : null}
      <Subtitulos />
      {b ? (
        <>
          <Gancho s={s} />
          <Grafico s={s} />
          <Cierre s={s} />
          {sfx("whoosh", 0.05, 0.4)}
          {sfx("whoosh", 4.45, 0.4)}
          {sfx("ding", 7.0, 0.3)}
          {sfx("whoosh", 15.4, 0.4)}
        </>
      ) : null}
      <AbsoluteFill style={{ background: "#000", opacity: 1 - fadeOut }} />
    </AbsoluteFill>
  );
};

export const DolarA: React.FC = () => <Base b={false} />;
export const DolarB: React.FC = () => <Base b />;
