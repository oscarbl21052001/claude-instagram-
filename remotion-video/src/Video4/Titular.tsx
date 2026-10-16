import { Easing, interpolate, useCurrentFrame } from "remotion";
import { T } from "./Esquema";

// Titular del inicio (0,1–4,3 s): "¿INVIERTES SOLO CON TU DINERO?" arriba, sobre la pared (ella queda por debajo, y > 650).
// Entra con golpe de escala, "SOLO CON TU DINERO" en dorado; al decir "estás perdiendo" (3,66 s) se tacha en rojo y se va antes de "¿Cómo funciona?".

const INK = "#1b1208";
const GOLD = "#F2C044";
const CREAM = "#FFF4DC";
const RED = "#D93A2B";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const back = Easing.out(Easing.back(1.8));
const easeOut = Easing.out(Easing.cubic);
const easeIn = Easing.in(Easing.cubic);

const A_IN = 0.12;
const STRIKE_A = 3.66;
const STRIKE_B = 3.9;
const OUT_A = 4.0;
const OUT_B = 4.3;

const BASE: React.CSSProperties = {
  fontFamily: "Chewy",
  fontSize: 118,
  lineHeight: 1.02,
  letterSpacing: 2,
  textAlign: "center",
  whiteSpace: "nowrap",
  WebkitTextStroke: `14px ${INK}`,
  paintOrder: "stroke fill",
  textShadow: "0 8px 0 rgba(27,18,8,0.9), 0 16px 34px rgba(0,0,0,0.45)",
};

export const Titular: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  if (t < A_IN || t > OUT_B + 0.05) return null;
  const e = clamp01((f - T(A_IN)) / 16);
  const sc = interpolate(back(e), [0, 1], [1.45, 1]);
  const op = clamp01((f - T(A_IN)) / 5);
  const o = easeIn(clamp01((f - T(OUT_A)) / (T(OUT_B) - T(OUT_A))));
  const sk = clamp01((f - T(STRIKE_A)) / (T(STRIKE_B) - T(STRIKE_A)));
  const shake = sk > 0 && sk < 1.6 ? Math.sin((f - T(STRIKE_A)) * 2.2) * 5 * (1 - clamp01((f - T(STRIKE_A)) / 14)) : 0;
  const blur = interpolate(1 - back(e), [0, 1], [0, 14]) * 0 + o * 10 + (1 - e) * 10;
  const line2 = (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span style={{ ...BASE, color: GOLD }}>CON TU DINERO?</span>
      <div
        style={{
          position: "absolute",
          left: -18,
          top: "52%",
          height: 16,
          width: `calc(${easeOut(sk) * 100}% + 36px)`,
          borderRadius: 8,
          background: RED,
          border: `4px solid ${INK}`,
          boxSizing: "content-box",
          transform: "rotate(-3deg)",
          opacity: sk > 0 ? 1 : 0,
        }}
      />
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 215, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          opacity: op * (1 - o),
          transform: `translateY(${-o * 70}px) translateX(${shake}px) scale(${sc})`,
          transformOrigin: "50% 50%",
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        }}
      >
        <div style={{ ...BASE, color: CREAM }}>
          ¿INVIERTES{" "}
          <span style={{ color: GOLD }}>
            SOLO
          </span>
        </div>
        <div style={{ textAlign: "center" }}>{line2}</div>
      </div>
    </div>
  );
};
