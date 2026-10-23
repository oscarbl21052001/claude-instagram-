import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useBebas } from "../Playa/Video41Playa";

// CTA de SOLAIA: la placa se teclea y un cursor de ratón llega, hace clic y la placa pasa a "✓ UNIDAD RESERVADA". Efecto original:
// CTA final con el mismo efecto del cierre de APALANCAMIENTO (src/Video4/Esquema.tsx): placa negra con marco dorado arriba, la frase se teclea
// letra a letra con cursor dorado mientras ella dice "Invertí ahora", destello al entrar, y el botón ENVIAR ↗ se pulsa y pasa a ✓ ENVIADO (aquí la propia placa hace de botón).
const FPS = 30;
const T = (s: number) => Math.round(s * FPS);
const GOLD = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const CTA = { entra: 23.95, tecleaA: 24.1, tecleaB: 25.5, llega: 25.6, pulsa: 26.6, texto: "TU LUGAR EN BOMBINHAS", eyebrow: "SOLAIA" };

const useSpr = (startS: number, damping = 20, stiffness = 90) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - T(startS), fps, config: { damping, stiffness } });
};

const RESERVADA = "✓ UNIDAD RESERVADA";
const PLACA = { left: 60, top: 250, w: 960, h: 190 };
const CLIC = { x: 640, y: 372 }; // punta del cursor al hacer clic (sobre el texto de la placa)

export const CtaSolaia: React.FC = () => {
  useBebas();
  const f = useCurrentFrame();
  const p = Math.min(useSpr(CTA.entra, 22, 100), 1);
  const sh = clamp01((f - T(CTA.entra) - 10) / 28);
  const n = Math.round(CTA.texto.length * clamp01((f - T(CTA.tecleaA)) / (T(CTA.tecleaB) - T(CTA.tecleaA))));
  const done = f >= T(CTA.pulsa) + 3;
  const press = f >= T(CTA.pulsa) && f < T(CTA.pulsa) + 7 ? 1 : 0;
  const cur = interpolate(f, [T(CTA.llega), T(CTA.pulsa) - 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.3, 0.1, 0.2, 1) });
  const cx = CLIC.x + (1 - cur) * 330 + Math.sin(cur * Math.PI) * -26;
  const cy = CLIC.y + (1 - cur) * 330;
  const curOp = clamp01((f - T(CTA.llega)) / 5);
  const ring = clamp01((f - T(CTA.pulsa)) / 14);
  if (f < T(CTA.entra)) return null;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: PLACA.left, top: PLACA.top, width: PLACA.w, height: PLACA.h, opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 34}px) scale(${1 - 0.045 * press})`, filter: `blur(${(1 - p) * 10}px)` }}>
        <div
          style={{
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            width: "100%",
            height: "100%",
            borderRadius: 44,
            border: "6px solid transparent",
            background: done ? `${GOLD} padding-box, ${GOLD} border-box` : `linear-gradient(180deg, #d0663a 0%, #a8431f 100%) padding-box, ${GOLD} border-box`,
            boxShadow: done ? "0 0 0 8px rgba(243,235,182,0.35), 0 20px 50px rgba(70,44,18,0.4)" : "0 20px 50px rgba(70,44,18,0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 26, letterSpacing: 7, color: done ? "#5a3d10" : "#F3EBB6" }}>{CTA.eyebrow}</div>
          {done ? (
            <div style={{ fontFamily: "Bebas Neue", fontSize: 92, letterSpacing: 5, lineHeight: 1, color: "#2a1d08", marginTop: 4, whiteSpace: "nowrap" }}>{RESERVADA}</div>
          ) : (
            <div style={{ fontFamily: "Bebas Neue", fontSize: 92, letterSpacing: 5, lineHeight: 1, color: "#FFF6E4", marginTop: 4, whiteSpace: "nowrap" }}>
              <span>{CTA.texto.slice(0, n)}</span>
              <span style={{ display: "inline-block", width: 6, height: 76, marginLeft: 2, marginRight: -9, transform: "translateY(10px)", background: "#E2A826", opacity: n >= CTA.texto.length && f > T(CTA.tecleaB) + 20 ? 0 : Math.sin((f / FPS) * 14) > -0.3 ? 1 : 0 }} />
              <span style={{ opacity: 0 }}>{CTA.texto.slice(n)}</span>
            </div>
          )}
          {sh > 0 && sh < 1 && (
            <div style={{ position: "absolute", top: -20, bottom: -20, left: -240 + sh * 1300, width: 150, background: "linear-gradient(100deg, rgba(255,248,225,0), rgba(255,248,225,0.3), rgba(255,248,225,0))", transform: "skewX(-18deg)" }} />
          )}
        </div>
      </div>
      {ring > 0 && ring < 1 && (
        <div style={{ position: "absolute", left: CLIC.x - 60 * ring - 6, top: CLIC.y - 60 * ring - 6, width: 120 * ring + 12, height: 120 * ring + 12, borderRadius: "50%", border: "5px solid rgba(255,246,228,0.9)", opacity: 1 - ring }} />
      )}
      {f >= T(CTA.llega) && (
        <svg width={90} height={110} viewBox="0 0 24 30" style={{ position: "absolute", left: cx - 3, top: cy - 3, opacity: curOp, transform: `scale(${1 - 0.1 * press})`, transformOrigin: "3px 3px", filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.45))" }}>
          <path d="M2 2 L2 23 L7.6 18.2 L11.4 27 L15.2 25.3 L11.5 16.8 L18.6 16.8 Z" fill="#fff" stroke="#111" strokeWidth={1.6} strokeLinejoin="round" />
        </svg>
      )}
    </AbsoluteFill>
  );
};
