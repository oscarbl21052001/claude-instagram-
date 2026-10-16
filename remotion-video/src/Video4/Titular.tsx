import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { Easing, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from "remotion";
import { T } from "./Esquema";

// Titular del inicio (0,1–4,3 s) al estilo "palabra enorme + caja de texto seleccionado + mano": arriba, sobre la pared (ella queda por debajo, y > 650).
//   "¿INVIERTES" pequeño · "SOLO" enorme dorado · caja "con tu dinero?" con puntos de selección · mano que sujeta un billete.
// La mano suelta el billete al acabar la frase (3,2 s); al decir "estás perdiendo" (3,66 s) se tacha en rojo; sale antes de "¿Cómo funciona?".

const INK = "#1b1208";
const GOLD = "#F2C044";
const CREAM = "#FFF4DC";
const RED = "#D93A2B";
const SKIN = "#F3CFA6";
const SKIN_D = "#DDA877";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const back = Easing.out(Easing.back(1.8));
const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.cubic);
const easeIO = Easing.inOut(Easing.cubic);

const A_IN = 0.12;
const HAND_IN = 0.35;
const BOX_IN = 0.75;
const RELEASE = 3.2;
const HAND_OUT = 3.45;
const STRIKE_A = 3.66;
const STRIKE_B = 3.9;
const OUT_A = 4.0;
const OUT_B = 4.3;

const useTitularFonts = () => {
  const [handle] = useState(() => delayRender("Cargando Poppins del titular"));
  useEffect(() => {
    loadFont({ family: "Poppins", url: staticFile("fonts/Poppins-ExtraBold.woff2"), weight: "800" }).then(() => continueRender(handle));
  }, [handle]);
};

const POP: React.CSSProperties = {
  fontFamily: "Poppins",
  fontWeight: 800,
  whiteSpace: "nowrap",
  paintOrder: "stroke fill",
  letterSpacing: -2,
};

// Mano (dibujada) que pinza un billete por la esquina superior derecha. El origen (0,0) es la pinza.
const Mano: React.FC<{ open: number; fall: number; fadeBill: number }> = ({ open, fall, fadeBill }) => (
  <svg width={620} height={330} viewBox="-340 -60 620 330" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
    {/* billete (se suelta) */}
    <g transform={`translate(0 ${fall * 760}) rotate(${fall * 38 - 6} 0 0)`} opacity={fadeBill}>
      <rect x={-300} y={6} width={300} height={140} rx={10} fill="#8DBB82" stroke={INK} strokeWidth={6} />
      <rect x={-286} y={20} width={272} height={112} rx={6} fill="none" stroke="#3F7A3C" strokeWidth={3} />
      <circle cx={-150} cy={76} r={38} fill="#B9DBAE" stroke="#3F7A3C" strokeWidth={4} />
      <text x={-150} y={92} textAnchor="middle" fontFamily="Poppins" fontWeight={800} fontSize={50} fill="#2F6A2D">$</text>
      <circle cx={-262} cy={42} r={11} fill="#B9DBAE" stroke="#3F7A3C" strokeWidth={3} />
      <circle cx={-38} cy={110} r={11} fill="#B9DBAE" stroke="#3F7A3C" strokeWidth={3} />
    </g>
    {/* manga (cuero, como su chaqueta) */}
    <g transform="rotate(-10 150 20)">
      <rect x={110} y={-70} width={220} height={150} rx={34} fill="#8A4A22" stroke={INK} strokeWidth={6} />
      <rect x={96} y={-72} width={34} height={154} rx={14} fill="#6B3818" stroke={INK} strokeWidth={5} />
    </g>
    {/* dorso de la mano */}
    <path d="M 20 -34 C 60 -50 120 -46 150 -38 L 150 60 C 110 78 50 76 20 50 Z" fill={SKIN} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    {/* dedos recogidos */}
    <rect x={40} y={52} width={92} height={30} rx={15} fill={SKIN} stroke={INK} strokeWidth={5} />
    <rect x={56} y={72} width={76} height={28} rx={14} fill={SKIN_D} stroke={INK} strokeWidth={5} />
    {/* índice y pulgar: la pinza se abre al soltar */}
    <g transform={`rotate(${-open * 24} 40 -16)`}>
      <rect x={-60} y={-32} width={110} height={34} rx={17} fill={SKIN} stroke={INK} strokeWidth={5} />
    </g>
    <g transform={`rotate(${open * 24} 40 16)`}>
      <rect x={-52} y={4} width={100} height={34} rx={17} fill={SKIN_D} stroke={INK} strokeWidth={5} />
    </g>
  </svg>
);

export const Titular: React.FC = () => {
  useTitularFonts();
  const f = useCurrentFrame();
  const t = f / 30;
  if (t < A_IN || t > OUT_B + 0.05) return null;
  const o = easeIn(clamp01((f - T(OUT_A)) / (T(OUT_B) - T(OUT_A))));
  const ent = (a: number, d = 16) => clamp01((f - T(a)) / d);

  const eSmall = ent(A_IN, 12);
  const eSolo = ent(0.2, 18);
  const soloSc = interpolate(back(eSolo), [0, 1], [1.5, 1]);
  const eBox = easeOut(ent(BOX_IN, 12));
  const eHand = easeOut(ent(HAND_IN, 16));
  const open = easeOut(clamp01((f - T(RELEASE - 0.1)) / 5));
  const fallT = clamp01((f - T(RELEASE)) / 16);
  const fall = fallT * fallT;
  const fadeBill = 1 - clamp01((f - T(RELEASE + 0.3)) / 8);
  const handOut = easeIO(clamp01((f - T(HAND_OUT)) / 12));
  const bob = Math.sin(f / 7) * 3 * (1 - open);
  const sk = clamp01((f - T(STRIKE_A)) / (T(STRIKE_B) - T(STRIKE_A)));
  const shake = sk > 0 && sk < 1 ? Math.sin((f - T(STRIKE_A)) * 2.2) * 5 * (1 - sk) : 0;

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 700, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1 - o,
          transform: `translateY(${-o * 70}px) translateX(${shake}px)`,
          filter: o > 0.02 ? `blur(${o * 10}px)` : undefined,
        }}
      >
        {/* ¿INVIERTES */}
        <div style={{ ...POP, position: "absolute", left: 66, top: 185, fontSize: 72, color: CREAM, WebkitTextStroke: `10px ${INK}`, opacity: eSmall, transform: `translateY(${(1 - eSmall) * -24}px)`, textShadow: "0 6px 0 rgba(27,18,8,0.9), 0 12px 28px rgba(0,0,0,0.4)" }}>
          ¿INVIERTES
        </div>
        {/* SOLO */}
        <div
          style={{
            ...POP,
            position: "absolute",
            left: 54,
            top: 240,
            fontSize: 262,
            lineHeight: 1,
            letterSpacing: -6,
            color: GOLD,
            WebkitTextStroke: `16px ${INK}`,
            opacity: clamp01(eSolo * 3),
            transform: `scale(${soloSc})`,
            transformOrigin: "0 60%",
            filter: eSolo < 1 ? `blur(${(1 - eSolo) * 10}px)` : undefined,
            textShadow: "0 10px 0 rgba(27,18,8,0.9), 0 20px 40px rgba(0,0,0,0.45)",
          }}
        >
          SOLO
        </div>
        {/* caja "texto seleccionado" */}
        <div style={{ position: "absolute", left: 300, top: 508, transform: `scaleX(${eBox})`, transformOrigin: "0 50%", opacity: eBox > 0 ? 1 : 0 }}>
          <div
            style={{
              position: "relative",
              padding: "6px 30px 4px",
              background: "rgba(242,192,68,0.26)",
              borderLeft: `5px solid ${GOLD}`,
              borderRight: `5px solid ${GOLD}`,
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <span style={{ ...POP, fontSize: 80, color: CREAM, WebkitTextStroke: `8px ${INK}`, letterSpacing: -1, textShadow: "0 5px 0 rgba(27,18,8,0.9)" }}>con tu dinero?</span>
            <div style={{ position: "absolute", left: -14, top: -12, width: 22, height: 22, borderRadius: 11, background: GOLD, border: `4px solid ${INK}`, transform: `scale(${eBox > 0.9 ? 1 : 0})` }} />
            <div style={{ position: "absolute", right: -14, bottom: -12, width: 22, height: 22, borderRadius: 11, background: GOLD, border: `4px solid ${INK}`, transform: `scale(${eBox > 0.9 ? 1 : 0})` }} />
            {/* tachón rojo */}
            <div
              style={{
                position: "absolute",
                left: 14,
                top: "52%",
                height: 16,
                width: `calc(${easeOut(sk) * 100}% - 28px)`,
                borderRadius: 8,
                background: RED,
                border: `4px solid ${INK}`,
                boxSizing: "content-box",
                transform: "rotate(-2.5deg)",
                opacity: sk > 0 ? 1 : 0,
              }}
            />
          </div>
        </div>
        {/* mano con billete */}
        <div
          style={{
            position: "absolute",
            left: 590,
            top: 170,
            transformOrigin: "340px 60px",
            transform: `translate(${(1 - eHand) * 520 + handOut * 760}px, ${bob - handOut * 120}px) rotate(${(1 - eHand) * 14 + handOut * 12}deg) scale(0.85)`,
            opacity: eHand > 0 ? 1 : 0,
          }}
        >
          <Mano open={open} fall={fall} fadeBill={fadeBill} />
        </div>
      </div>
    </div>
  );
};
