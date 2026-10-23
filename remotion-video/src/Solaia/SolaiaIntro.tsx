import { Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { AbsoluteFill, Easing, Img, continueRender, delayRender, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useBebas } from "../Playa/Video41Playa";
import { useKitFonts } from "../kit";

// SOLAIA: ella dice "Con tan solo un 12 % de anticipo y hasta 72 veces podés asegurar tu unidad en este paraíso" (0–6,2 s; corte al dron a 6,18 s).
// Versión A: dos tarjetas laterales claras (12 % ANTICIPO · 72 CUOTAS) + sello UNIDAD ASEGURADA. Versión B: lo mismo + barra de pago en 3D detrás de ella
// (recorte de la persona con u2net_human_seg en public/solaia/cut/cNNNN.png, uno por fotograma, desde y=560).
// Tiempos de la voz (Whisper): "12 %" 0,88 · "anticipo" 1,78 · "72 veces" 2,60 · "asegurar tu unidad" 4,18 · "paraíso" 5,58.

const FPS = 30;
const T = (s: number) => Math.round(s * FPS);
export const SOLAIA_DURATION = Math.round(27.34 * FPS);
const GOLD = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = Easing.out(Easing.cubic);

export type EstiloSolaia = "base" | "serif" | "poppins";
// tipografía y color del texto de las tarjetas y del sello (prueba de Oscar: otra tipografía y otro color)
const ESTILOS = {
  base: { num: "Bebas Neue", numW: 400, numSize: 150, numStyle: "normal", lab: "Bebas Neue", labW: 400, labSize: 54, labLs: 8, ink: "#4a2e1a", acento: "#9a7a2e", sello: GOLD, selloInk: "#2a1d08" },
  serif: { num: "Playfair Display", numW: 500, numSize: 132, numStyle: "italic", lab: "Playfair Display", labW: 500, labSize: 34, labLs: 6, ink: "#14455c", acento: "#b08a3a", sello: GOLD, selloInk: "#14455c" },
  poppins: { num: "Poppins", numW: 800, numSize: 118, numStyle: "normal", lab: "Poppins", labW: 800, labSize: 28, labLs: 7, ink: "#c2562f", acento: "#8a5a2b", sello: "linear-gradient(135deg,#c2562f,#e07a4d)", selloInk: "#FFF6E4" },
} as const;
const EstiloCtx = { actual: "base" as EstiloSolaia };
const useEstilo = () => ESTILOS[EstiloCtx.actual];

const useFuentesSolaia = () => {
  const [handle] = useState(() => delayRender("Cargando tipografías de SOLAIA"));
  useEffect(() => {
    Promise.all([
      loadFont({ family: "Playfair Display", url: staticFile("fonts/PlayfairDisplay-MediumItalic.woff2"), weight: "500", style: "italic" }),
      loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-ExtraBold.woff2"), weight: "800" }),
    ]).then(() => continueRender(handle));
  }, [handle]);
};

const A = { izq: 0.8, der: 2.45, sello: 4.15, sale: 5.72 }; // segundos
const W = 440;
const H = 270;
const Y = 250;

const Placa: React.FC<{ lado: "izq" | "der"; desde: number; children: React.ReactNode }> = ({ lado, desde, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fin = T(A.sale);
  if (f < T(desde) || f >= fin + 12) return null;
  const s = lado === "izq" ? -1 : 1;
  const e = Math.min(spring({ frame: f - T(desde), fps, config: { damping: 18, stiffness: 80 } }), 1);
  const out = easeOut(clamp01((f - fin) / 9));
  const slide = s * ((1 - e) * 520 + out * 560);
  const x = lado === "izq" ? 48 : 1080 - 48 - W;
  return (
    <div style={{ position: "absolute", left: x, top: Y, width: W, height: H, perspective: 1800, opacity: clamp01(e * 2.2) * (1 - out) }}>
      <div style={{ width: "100%", height: "100%", transform: `translateX(${slide}px) rotateY(${-s * 8 * (0.4 + 0.6 * e)}deg) rotateZ(${-s * 0.5}deg)`, transformStyle: "preserve-3d" }}>
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            height: "100%",
            border: "8px solid transparent",
            borderRadius: 40,
            background: `linear-gradient(180deg, #FFFCF4 0%, #F1E6CD 100%) padding-box, ${GOLD} border-box`,
            boxShadow: "0 22px 54px rgba(60,40,15,0.38)",
            overflow: "hidden",
            position: "relative",
            color: useEstilo().ink,
            padding: "22px 26px",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const Cifra: React.FC<{ desde: number; hasta: number; objetivo: number; sufijo?: string; etiqueta: string; chico: string }> = ({ desde, hasta, objetivo, sufijo, etiqueta, chico }) => {
  const f = useCurrentFrame();
  const k = clamp01((f - T(desde)) / (T(hasta) - T(desde))); // lineal: cada número se ve
  const kk = easeOut(clamp01((f - T(desde) - 4) / 12));
  const e = useEstilo();
  return (
    <>
      <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 22, letterSpacing: 7, color: e.acento, opacity: kk }}>{chico}</div>
      <div style={{ fontFamily: e.num, fontWeight: e.numW, fontStyle: e.numStyle, fontSize: e.numSize, lineHeight: 1.05, letterSpacing: 2, marginTop: 4, display: "flex", alignItems: "baseline", gap: 6, opacity: kk }}>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(objetivo * k)}</span>
        {sufijo && <span style={{ color: e.acento, fontSize: e.numSize * 0.66 }}>{sufijo}</span>}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, textAlign: "center", fontFamily: e.lab, fontWeight: e.labW, fontStyle: e.numStyle, fontSize: e.labSize, letterSpacing: e.labLs, lineHeight: 1, opacity: kk }}>{etiqueta}</div>
    </>
  );
};

const Sello: React.FC<{ top: number }> = ({ top }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fin = T(A.sale);
  if (f < T(A.sello) || f >= fin + 12) return null;
  const p = Math.min(spring({ frame: f - T(A.sello), fps, config: { damping: 14, stiffness: 140 } }), 1.15);
  const e = useEstilo();
  const out = easeOut(clamp01((f - fin) / 9));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: clamp01(p * 2) * (1 - out), transform: `translateY(${out * 40}px) scale(${0.8 + 0.2 * p})` }}>
      <div style={{ padding: "12px 36px", borderRadius: 999, background: e.sello, color: e.selloInk, fontFamily: e.lab, fontWeight: e.labW, fontStyle: e.numStyle, fontSize: e.lab === "Bebas Neue" ? 50 : 34, letterSpacing: e.labLs, lineHeight: 1.25, boxShadow: "0 12px 34px rgba(0,0,0,0.45)" }}>✓ UNIDAD ASEGURADA</div>
    </div>
  );
};

// barra de pago en 3D: un tramo corto para el anticipo (12 %) y 6 bloques de 12 cuotas (72); inclinada hacia atrás, con grosor y sombra.
// Va detrás de ella: la persona recortada se pinta encima.
const BARRA_TOP = 700;
const Barra: React.FC = () => {
  const f = useCurrentFrame();
  const fin = T(A.sale);
  if (f < T(0.9) || f >= fin + 12) return null;
  const entra = easeOut(clamp01((f - T(0.9)) / 12));
  const out = easeOut(clamp01((f - fin) / 9));
  const anticipo = clamp01((f - T(0.9)) / T(0.8));
  const t0 = T(2.6);
  const t1 = T(3.95);
  const brillo = clamp01(Math.sin(clamp01((f - T(A.sello)) / 24) * Math.PI));
  const wAnt = 150;
  const wBloque = 112;
  const gap = 12;
  const total = wAnt + gap + 6 * wBloque + 5 * 6 + 24;
  const alto = 86;
  const cara = (frac: number, ant: boolean): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    borderRadius: 14,
    background: ant ? "linear-gradient(180deg,#FFFFFF,#EADFC4)" : GOLD,
    transformOrigin: "left center",
    transform: `scaleX(${frac})`,
    boxShadow: frac > 0 ? "0 0 18px rgba(243,235,182,0.55)" : undefined,
  });
  const pieza = (w: number, frac: number, ant = false, key?: number) => (
    <div key={key} style={{ position: "relative", width: w, height: alto, borderRadius: 18, background: "rgba(255,255,255,0.28)", border: "2px solid rgba(255,255,255,0.55)", boxSizing: "border-box", overflow: "hidden" }}>
      <div style={cara(frac, ant)} />
    </div>
  );
  return (
    <div style={{ position: "absolute", left: (1080 - total) / 2, top: BARRA_TOP, width: total, perspective: 1400, opacity: entra * (1 - out), transform: `translateY(${out * 70}px)` }}>
      <div style={{ transform: "rotateX(36deg) rotateZ(-2deg)", transformStyle: "preserve-3d", transformOrigin: "50% 100%" }}>
        {/* grosor y sombra */}
        <div style={{ position: "absolute", left: 6, right: 6, top: alto + 8, height: 30, borderRadius: 14, background: "rgba(40,26,10,0.45)", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 14, height: alto + 18, borderRadius: 18, background: "rgba(90,62,24,0.75)", filter: `drop-shadow(0 0 ${brillo * 26}px rgba(243,235,182,${brillo}))` }} />
        <div style={{ position: "relative", display: "flex", gap, padding: 12, alignItems: "center" }}>
          {pieza(wAnt, anticipo, true)}
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const a = easeOut(clamp01((f - (t0 + ((t1 - t0) * i) / 6)) / ((t1 - t0) / 6)));
              return pieza(wBloque, clamp01((f - (t0 + ((t1 - t0) * i) / 6)) / ((t1 - t0) / 6)) * (a > 0 ? 1 : 1), false, i);
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// persona recortada (por encima de la barra)
const Recorte: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T(0.9) || f >= T(A.sale) + 12 || f > 186) return null;
  return <Img src={staticFile(`solaia/cut/c${String(f).padStart(4, "0")}.png`)} style={{ position: "absolute", left: 0, top: 560, width: 1080, height: 1360 }} />;
};

export const SolaiaIntro: React.FC<{ calendario?: boolean; estilo?: EstiloSolaia }> = ({ calendario = false, estilo = "base" }) => {
  EstiloCtx.actual = estilo;
  useBebas();
  useKitFonts();
  useFuentesSolaia();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("solaia/solaia.mp4")} />
      {calendario && <Barra />}
      {calendario && <Recorte />}
      <Placa lado="izq" desde={A.izq}>
        <Cifra desde={A.izq + 0.1} hasta={1.7} objetivo={12} sufijo="%" etiqueta="ANTICIPO" chico="SOLAIA" />
      </Placa>
      <Placa lado="der" desde={A.der}>
        <Cifra desde={A.der + 0.1} hasta={4.0} objetivo={72} etiqueta="CUOTAS" chico="HASTA" />
      </Placa>
      <Sello top={590} />
    </AbsoluteFill>
  );
};
