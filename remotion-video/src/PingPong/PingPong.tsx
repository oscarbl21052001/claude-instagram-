import { Audio, Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { AbsoluteFill, Easing, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PALABRAS, Palabra } from "./palabras";

export const PP_FPS = 30;
export const PP_DURATION = 2590; // 86,4 s
export const PP_W = 1080;
export const PP_H = 1920;

const T = {
  hero: "#2DD4BF",
  ink: "#F8FAFC",
  card: "rgba(8, 20, 28, 0.78)",
  font: "Poppins",
};
const ease = { out: Easing.bezier(0.16, 1, 0.3, 1), inOut: Easing.bezier(0.83, 0, 0.17, 1), in: Easing.bezier(0.7, 0, 0.84, 0) };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Preguntas del entrevistador (fuera de plano). Tiempos en segundos, sacados de la transcripción palabra por palabra.
const PREGUNTAS = [
  { n: 1, t0: 1.62, t1: 2.7, texto: "¿Con quién estamos?" },
  { n: 2, t0: 7.08, t1: 9.5, texto: "¿Qué te llevó a invertir en Bombinhas?" },
  { n: 3, t0: 34.2, t1: 37.2, texto: "¿Cómo fue que te decidiste a invertir?" },
  { n: 4, t0: 56.58, t1: 58.0, texto: "¿Cuáles fueron los miedos?" },
  { n: 5, t0: 69.02, t1: 70.9, texto: "¿Cómo contrarrestaste los miedos?" },
];
const TOTAL_PREG = PREGUNTAS.length;

// Tramos con subtítulos: el hook y las respuestas (la presentación lleva lower third en lugar de subtítulos).
const TRAMOS_SUBS: [number, number][] = [
  [0.0, 1.5],
  [9.6, 33.5],
  [37.3, 56.5],
  [58.1, 69.0],
  [71.2, 85.4],
];

// Planos: salto de zoom en cada cambio (corte con "punch-in"), con deriva lenta dentro del plano.
const PLANOS: { t: number; z0: number; z1: number }[] = [
  { t: 0, z0: 1.0, z1: 1.05 },
  { t: 1.5, z0: 1.0, z1: 1.04 },
  { t: 7.0, z0: 1.0, z1: 1.06 },
  { t: 16.0, z0: 1.15, z1: 1.2 },
  { t: 25.5, z0: 1.0, z1: 1.05 },
  { t: 34.0, z0: 1.0, z1: 1.06 },
  { t: 44.0, z0: 1.15, z1: 1.2 },
  { t: 56.3, z0: 1.0, z1: 1.04 },
  { t: 60.6, z0: 1.18, z1: 1.26 },
  { t: 69.0, z0: 1.0, z1: 1.06 },
  { t: 75.5, z0: 1.12, z1: 1.17 },
  { t: 83.3, z0: 1.12, z1: 1.12 },
  { t: 99, z0: 1, z1: 1 },
];

const ZOOM_MAR = 83.3; // empieza con "Bombinhas"

const useFuente = () => {
  const [handle] = useState(() => delayRender("fuentes"));
  useEffect(() => {
    Promise.all([
      loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-ExtraBold.woff2"), weight: "800" }),
      loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-Bold.woff2"), weight: "700" }),
      loadFont({ family: "Playfair Display", url: staticFile("fonts/PlayfairDisplay-MediumItalic.woff2"), weight: "500", style: "italic" }),
    ]).then(() => continueRender(handle));
  }, [handle]);
};

const Plano: React.FC<{ s: number }> = ({ s }) => {
  let i = 0;
  while (i < PLANOS.length - 2 && s >= PLANOS[i + 1].t) i++;
  const p = PLANOS[i];
  const k = interpolate(s, [p.t, PLANOS[i + 1].t], [0, 1], { ...clamp, easing: ease.inOut });
  let z = p.z0 + (p.z1 - p.z0) * k;
  // Al decir "Bombinhas es un paraíso" y girarse: zoom lento hacia el mar y la playa hasta el final
  const zf = interpolate(s, [ZOOM_MAR, 86.4], [0, 1], { ...clamp, easing: ease.inOut });
  let ox = 50;
  let oy = 52;
  if (s >= ZOOM_MAR) {
    z = 1.12 + (2.3 - 1.12) * zf;
    ox = 50 + (24 - 50) * zf;
    oy = 52 + (63 - 52) * zf;
  }
  // la cara está algo por encima del centro del encuadre
  return (
    <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${ox}% ${oy}%` }}>
      <Video src={staticFile("pingpong/pingpong_ligero.mp4")} objectFit="cover" style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};

const TarjetaPregunta: React.FC<{ s: number; q: (typeof PREGUNTAS)[number] }> = ({ s, q }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ini = q.t0 - 0.1;
  const fin = q.t1 + 1.1;
  if (s < ini || s > fin + 0.4) return null;
  const f0 = Math.round(ini * fps);
  const entra = spring({ frame: frame - f0, fps, config: { damping: 14, stiffness: 160, mass: 0.6 } });
  const sale = interpolate(s, [fin, fin + 0.3], [0, 1], { ...clamp, easing: ease.in });
  const o = Math.min(1, entra * 1.4) * (1 - sale);
  const y = (1 - entra) * -60 - sale * -40;
  const sc = 0.92 + 0.08 * entra - 0.04 * sale;
  const palabras = q.texto.split(" ");
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 250, display: "flex", justifyContent: "center", opacity: o, transform: `translateY(${y}px) scale(${sc})` }}>
      <div style={{ background: T.card, borderRadius: 36, padding: "30px 44px 34px", maxWidth: 940, boxShadow: "0 20px 60px rgba(0,0,0,0.45)", border: "1.5px solid rgba(255,255,255,0.14)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: T.font, fontWeight: 700, fontSize: 28, letterSpacing: 6, color: "rgba(248,250,252,0.62)", marginBottom: 14 }}>
          <span>PREGUNTA</span>
          <span>{String(q.n).padStart(2, "0")}/{String(TOTAL_PREG).padStart(2, "0")}</span>
        </div>
        <div style={{ fontFamily: T.font, fontWeight: 800, fontSize: 58, lineHeight: 1.12, color: T.ink, letterSpacing: -1 }}>
          {palabras.map((w, i) => {
            const k = spring({ frame: frame - f0 - 4 - i * 3, fps, config: { damping: 16, stiffness: 150, mass: 0.6 } });
            return (
              <span key={i} style={{ display: "inline-block", marginRight: 16, opacity: Math.min(1, k * 1.5), transform: `translateY(${(1 - k) * 22}px)` }}>
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const LowerThird: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ini = 2.9;
  const fin = 7.0;
  if (s < ini || s > fin + 0.4) return null;
  const e = spring({ frame: frame - Math.round(ini * fps), fps, config: { damping: 20, stiffness: 90, mass: 1 } });
  const sale = interpolate(s, [fin, fin + 0.3], [0, 1], { ...clamp, easing: ease.in });
  const o = Math.min(1, e * 1.4) * (1 - sale);
  return (
    <div style={{ position: "absolute", left: 60, bottom: 330, opacity: o, transform: `translateX(${(1 - e) * -80 + sale * -40}px)` }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 20, background: T.card, borderRadius: 28, padding: "22px 36px 22px 26px", boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
        <div style={{ width: 8, borderRadius: 4, background: T.hero }} />
        <div>
          <div style={{ fontFamily: T.font, fontWeight: 800, fontSize: 56, color: T.ink, lineHeight: 1.05, letterSpacing: -1 }}>Fernando Ruiz</div>
          <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: 32, color: "rgba(248,250,252,0.7)", marginTop: 6 }}>Buenos Aires, Argentina</div>
        </div>
      </div>
    </div>
  );
};

type Pagina = { palabras: Palabra[]; ini: number; fin: number };
const paginas: Pagina[] = (() => {
  const out: Pagina[] = [];
  for (const [a, b] of TRAMOS_SUBS) {
    const ws = PALABRAS.filter((w) => w.s >= a - 0.05 && w.s < b);
    let cur: Palabra[] = [];
    const flush = () => {
      if (cur.length) out.push({ palabras: cur, ini: cur[0].s, fin: cur[cur.length - 1].e });
      cur = [];
    };
    ws.forEach((w, i) => {
      if (cur.length && w.s - cur[cur.length - 1].e > 0.45) flush();
      cur.push(w);
      const fuerte = /[.,?!]$/.test(w.w);
      if (a > 0 && (cur.length >= 5 || fuerte)) flush(); // el hook (a = 0) va en una sola página
      if (i === ws.length - 1) flush();
    });
  }
  return out;
})();

const Subtitulos: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const idx = paginas.findIndex((p, i) => s >= p.ini - 0.04 && s < p.fin + 0.45 && (i === paginas.length - 1 || s < paginas[i + 1].ini - 0.04));
  if (idx < 0) return null;
  const p = paginas[idx];
  const hook = p.ini < 1.5;
  const f0 = Math.round(p.ini * fps);
  const entra = interpolate(frame - f0, [0, 6], [0, 1], { ...clamp, easing: ease.out });
  const sale = interpolate(s, [p.fin + 0.2, p.fin + 0.45], [1, 0], clamp);
  const texto = p.palabras.map((w) => w.w).join(" ");
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: hook ? 560 : 1390, textAlign: "center", opacity: entra * sale, transform: `translateY(${(1 - entra) * 10}px)` }}>
      <div style={{ fontFamily: T.font, fontWeight: 700, fontSize: hook ? 66 : 46, lineHeight: 1.2, letterSpacing: -0.3, color: "rgba(248,250,252,0.96)", textShadow: "0 2px 14px rgba(0,0,0,0.65)" }}>{texto}</div>
    </div>
  );
};

// Cierre: sello discreto de recomendación y oscurecimiento al final.
const Cierre: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const selloIni = 76.2;
  const selloFin = 83.0;
  const sello = spring({ frame: frame - Math.round(selloIni * fps), fps, config: { damping: 20, stiffness: 90, mass: 1 } });
  const selloSale = interpolate(s, [selloFin, selloFin + 0.3], [0, 1], { ...clamp, easing: ease.in });
  const k = interpolate(s, [83.3, 84.9], [0, 1], { ...clamp, easing: ease.out });
  return (
    <>
      {s >= selloIni && s < selloFin + 0.4 ? (
        <div style={{ position: "absolute", left: 60, top: 250, display: "flex", alignItems: "center", gap: 18, background: T.card, borderRadius: 999, padding: "16px 34px 16px 20px", opacity: Math.min(1, sello * 1.4) * (1 - selloSale), transform: `translateY(${(1 - sello) * -40}px)` }}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="none" stroke={T.hero} strokeWidth="3" />
            <path d="M12 23 L19 30 L32 15" fill="none" stroke={T.hero} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset={40 * (1 - interpolate(s, [selloIni + 0.2, selloIni + 0.7], [0, 1], clamp))} />
          </svg>
          <span style={{ fontFamily: T.font, fontWeight: 700, fontSize: 36, color: T.ink, letterSpacing: 0.5 }}>Lo recomienda</span>
        </div>
      ) : null}
      {s >= 83.2 ? (
        <>
          <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(0,0,0,${0.35 * k}) 0%, transparent 45%, rgba(0,0,0,${0.35 * k}) 100%)` }} />
        </>
      ) : null}
    </>
  );
};

const Capas: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const sacudida = interpolate(s, [60.9, 61.0, 61.35], [0, 1, 0], clamp);
  return (
    <>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,30,40,0.10), rgba(8,20,30,0.28))", mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 52%, transparent 52%, rgba(0,0,0,${0.5 + 0.12 * sacudida}) 100%)` }} />
      <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id="g">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 7} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#g)" />
        </svg>
      </AbsoluteFill>
    </>
  );
};

const sfx = (nombre: string, t: number, vol: number) => (
  <Sequence from={Math.max(0, Math.round(t * PP_FPS))} durationInFrames={Math.round(0.7 * PP_FPS)} key={`${nombre}${t}`}>
    <Audio src={staticFile(`pingpong/sfx/${nombre}.wav`)} volume={vol} />
  </Sequence>
);

export const PingPong: React.FC = () => {
  useFuente();
  const frame = useCurrentFrame();
  const s = frame / PP_FPS;
  const fadeOut = interpolate(s, [85.6, 86.35], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Plano s={s} />
      <Capas s={s} />
      <Subtitulos s={s} />
      <LowerThird s={s} />
      <Cierre s={s} />
      {PREGUNTAS.map((q) => (
        <TarjetaPregunta key={q.n} s={s} q={q} />
      ))}
      <AbsoluteFill style={{ background: "#000", opacity: 1 - fadeOut }} />
      {PREGUNTAS.map((q) => sfx("whoosh", q.t0 - 0.13, 0.5))}
      {sfx("ding", 2.9, 0.35)}
      {sfx("hit", 60.9, 0.7)}
      {sfx("ding", 76.2, 0.3)}
      {sfx("whoosh", 83.2, 0.4)}
    </AbsoluteFill>
  );
};
