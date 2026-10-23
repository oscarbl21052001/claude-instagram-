import { Video } from "@remotion/media";
import { AbsoluteFill, Easing, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useBebas } from "../Playa/Video41Playa";
import { useKitFonts } from "../kit";

// SOLAIA: ella dice "Con tan solo un 12 % de anticipo y hasta 72 veces podés asegurar tu unidad en este paraíso" (0–6,2 s; corte al dron a 6,18 s).
// Versión A: dos tarjetas laterales (12 % ANTICIPO · 72 CUOTAS) + sello UNIDAD ASEGURADA. Versión B: lo mismo + calendario de 72 casillas.
// Tiempos de la voz (Whisper): "12 %" 0,88 · "anticipo" 1,78 · "72 veces" 2,60 · "asegurar tu unidad" 4,18 · "paraíso" 5,58.

const FPS = 30;
const T = (s: number) => Math.round(s * FPS);
export const SOLAIA_DURATION = Math.round(27.34 * FPS);
const GOLD = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = Easing.out(Easing.cubic);

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
            background: `linear-gradient(180deg, #1c150c 0%, #0d0a06 100%) padding-box, ${GOLD} border-box`,
            boxShadow: "0 26px 64px rgba(0,0,0,0.5)",
            overflow: "hidden",
            position: "relative",
            color: "#F4EAD3",
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
  const k = easeOut(clamp01((f - T(desde)) / (T(hasta) - T(desde))));
  const kk = easeOut(clamp01((f - T(desde) - 4) / 12));
  return (
    <>
      <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 22, letterSpacing: 7, color: "#C7AE6A", opacity: kk }}>{chico}</div>
      <div style={{ fontFamily: "Bebas Neue", fontSize: 150, lineHeight: 1, letterSpacing: 2, marginTop: 4, display: "flex", alignItems: "baseline", gap: 6, opacity: kk }}>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(objetivo * k)}</span>
        {sufijo && <span style={{ color: "#C7AE6A", fontSize: 100 }}>{sufijo}</span>}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, textAlign: "center", fontFamily: "Bebas Neue", fontSize: 54, letterSpacing: 8, lineHeight: 1, opacity: kk }}>{etiqueta}</div>
    </>
  );
};

const Sello: React.FC<{ top: number }> = ({ top }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fin = T(A.sale);
  if (f < T(A.sello) || f >= fin + 12) return null;
  const p = Math.min(spring({ frame: f - T(A.sello), fps, config: { damping: 14, stiffness: 140 } }), 1.15);
  const out = easeOut(clamp01((f - fin) / 9));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: clamp01(p * 2) * (1 - out), transform: `translateY(${out * 40}px) scale(${0.8 + 0.2 * p})` }}>
      <div style={{ padding: "12px 36px", borderRadius: 999, background: GOLD, color: "#2a1d08", fontFamily: "Bebas Neue", fontSize: 50, letterSpacing: 6, lineHeight: 1.1, boxShadow: "0 12px 34px rgba(0,0,0,0.45)" }}>✓ UNIDAD ASEGURADA</div>
    </div>
  );
};

// calendario: 12 columnas × 6 filas = 72 cuotas (si son mensuales, una fila por año); la barra superior es el anticipo
const Calendario: React.FC<{ top: number }> = ({ top }) => {
  const f = useCurrentFrame();
  const fin = T(A.sale);
  const t0 = T(2.6);
  const t1 = T(3.8);
  if (f < T(0.9) || f >= fin + 12) return null;
  const cell = 41;
  const gap = 6;
  const w = 12 * cell + 11 * gap;
  const out = easeOut(clamp01((f - fin) / 9));
  const entra = easeOut(clamp01((f - T(0.9)) / 10));
  const anticipo = easeOut(clamp01((f - T(0.9)) / 22));
  const brillo = clamp01(Math.sin(clamp01((f - T(A.sello)) / 22) * Math.PI));
  return (
    <div style={{ position: "absolute", left: (1080 - w) / 2, top, width: w, opacity: entra * (1 - out), transform: `translateY(${out * 60}px)` }}>
      <div style={{ height: 16, borderRadius: 8, background: "rgba(20,14,8,0.55)", marginBottom: 10, overflow: "hidden" }}>
        <div style={{ width: `${anticipo * 100}%`, height: "100%", background: "#F3EBB6", boxShadow: "0 0 14px rgba(243,235,182,0.8)" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(12, ${cell}px)`, gap, padding: 12, borderRadius: 24, background: "rgba(20,14,8,0.5)", boxShadow: `0 0 ${brillo * 36}px rgba(243,235,182,${brillo * 0.8})` }}>
        {Array.from({ length: 72 }).map((_, i) => {
          const ti = t0 + ((t1 - t0) * i) / 72;
          const a = easeOut(clamp01((f - ti) / 5));
          return (
            <div
              key={i}
              style={{
                width: cell,
                height: cell,
                borderRadius: 9,
                background: a > 0 ? GOLD : "rgba(255,255,255,0.12)",
                opacity: a > 0 ? 0.35 + 0.65 * a : 1,
                transform: `scale(${0.7 + 0.3 * a})`,
                boxShadow: a > 0.6 ? "0 2px 8px rgba(0,0,0,0.35)" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export const SolaiaIntro: React.FC<{ calendario?: boolean }> = ({ calendario = false }) => {
  useBebas();
  useKitFonts();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Video src={staticFile("solaia/solaia.mp4")} />
      <Placa lado="izq" desde={A.izq}>
        <Cifra desde={A.izq + 0.1} hasta={A.izq + 0.9} objetivo={12} sufijo="%" etiqueta="ANTICIPO" chico="SOLAIA" />
      </Placa>
      <Placa lado="der" desde={A.der}>
        <Cifra desde={A.der + 0.1} hasta={3.8} objetivo={72} etiqueta="CUOTAS" chico="HASTA" />
      </Placa>
      <Sello top={calendario ? 560 : 590} />
      {calendario && <Calendario top={650} />}
    </AbsoluteFill>
  );
};
