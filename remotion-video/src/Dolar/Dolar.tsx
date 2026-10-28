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

// Datos reales (Valor Econômico, Reuters y BBC Brasil, 26/10/2026): el dólar cerró el viernes 23 cerca de R$ 4,99 y el lunes 26, tras la reelección de Lula, en R$ 5,40 (+8,2 %, mayor alza diaria desde 1999).
const VIERNES = 4.99;
const LUNES = 5.4;
const coma = (n: number, d: number) => n.toFixed(d).replace(".", ",");

// Gancho interactivo: conversor de US$ 1.000 a reales; la cifra sube cuando dice "valgan más".
const Conversor: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t0 = 0.15;
  const t1 = 4.3;
  if (s > t1 + 0.4) return null;
  const e = spring({ frame: frame - Math.round(t0 * fps), fps, config: { damping: 16, stiffness: 140, mass: 0.7 } });
  const sale = interpolate(s, [t1, t1 + 0.3], [0, 1], { ...clamp, easing: ease.in });
  const k = interpolate(s, [2.9, 4.1], [0, 1], { ...clamp, easing: ease.inOut });
  const valor = VIERNES + (LUNES - VIERNES) * k;
  const gana = spring({ frame: frame - Math.round(4.0 * fps), fps, config: { damping: 12, stiffness: 160, mass: 0.6 } });
  const sube = k > 0.02;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 270, display: "flex", justifyContent: "center", opacity: Math.min(1, e * 1.4) * (1 - sale), transform: `translateY(${(1 - e) * -60 - sale * -40}px) scale(${0.92 + 0.08 * e})` }}>
      <div style={{ background: T.card, borderRadius: 40, padding: "30px 48px 34px", boxShadow: "0 20px 60px rgba(0,0,0,0.45)", border: "1.5px solid rgba(255,255,255,0.14)", width: 800, textAlign: "center" }}>
        <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: "rgba(248,250,252,0.62)" }}>1 USD EN REALES</div>
        <div style={{ fontFamily: "Bebas Neue", fontSize: 200, lineHeight: 1.05, letterSpacing: 3, color: sube ? T.hero : T.ink, fontVariantNumeric: "tabular-nums", textShadow: sube ? `0 0 40px ${T.hero}55` : "none" }}>R$ {coma(valor, 2)}</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, height: 56 }}>
          <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: 32, letterSpacing: 4, color: "rgba(248,250,252,0.62)" }}>{k < 0.02 ? "VIERNES" : "LUNES"}</span>
          {gana > 0.02 ? (
            <span style={{ fontFamily: T.font, fontWeight: 800, fontSize: 40, color: "#04130d", background: T.hero, borderRadius: 999, padding: "4px 24px", opacity: Math.min(1, gana * 1.5), transform: `scale(${0.8 + 0.2 * Math.min(1, gana)})` }}>+R$ {coma(LUNES - VIERNES, 2)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Gráfico con datos reales: viernes R$ 4,99 → lunes R$ 5,40; la línea se dibuja cuando dice "el dólar subió".
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
  const pct = (((LUNES / VIERNES) - 1) * 100) * trazo;
  const precio = VIERNES + (LUNES - VIERNES) * trazo;
  const x1 = 90, y1 = 125, x2 = 590, y2 = 58;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 250, display: "flex", justifyContent: "center", opacity: o, transform: `translateY(${(1 - e) * -50}px) scale(${0.94 + 0.06 * e})` }}>
      <div style={{ background: T.card, borderRadius: 36, padding: "20px 40px 18px", boxShadow: "0 20px 60px rgba(0,0,0,0.45)", border: "1.5px solid rgba(255,255,255,0.14)", width: 800 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: "rgba(248,250,252,0.62)" }}>DÓLAR / REAL</span>
          <span style={{ fontFamily: T.font, fontWeight: 800, fontSize: 64, color: T.hero, fontVariantNumeric: "tabular-nums" }}>+{coma(pct, 1)}%</span>
        </div>
        <svg width="720" height="190" viewBox="0 0 720 190">
          <line x1="20" y1="172" x2="700" y2="172" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
          <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * trazo} y2={y1 + (y2 - y1) * trazo} stroke={T.hero} strokeWidth="10" strokeLinecap="round" />
          <circle cx={x1} cy={y1} r="12" fill={T.ink} />
          <circle cx={x1 + (x2 - x1) * trazo} cy={y1 + (y2 - y1) * trazo} r="14" fill={T.hero} opacity={trazo > 0.02 ? 1 : 0} />
          <text x={x1} y={y1 + 32} textAnchor="middle" fontFamily={T.font} fontWeight="700" fontSize="28" fill="rgba(248,250,252,0.8)">VIE R$ {coma(VIERNES, 2)}</text>
          <text x={x2 - 20} y={y2 - 24} textAnchor="middle" fontFamily={T.font} fontWeight="800" fontSize="30" fill={T.hero} opacity={trazo > 0.02 ? 1 : 0}>LUN R$ {coma(precio, 2)}</text>
        </svg>
        <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 26, color: "rgba(248,250,252,0.7)", textAlign: "center" }}>Mayor subida en un día desde 1999</div>
        <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 20, color: "rgba(248,250,252,0.45)", textAlign: "center", marginTop: 4 }}>Cierre 23 y 26 oct 2026 · Valor Econômico, BBC Brasil</div>
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
          <Conversor s={s} />
          <Grafico s={s} />
          <Cierre s={s} />
          {sfx("whoosh", 0.05, 0.4)}
          <Sequence from={Math.round(2.9 * DO_FPS)} durationInFrames={Math.round(1.5 * DO_FPS)}>
            <Audio src={staticFile("dolar/contador.wav")} volume={0.7} />
          </Sequence>
          {sfx("ding", 4.05, 0.3)}
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
