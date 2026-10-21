import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

// CTA final con el mismo efecto del cierre de APALANCAMIENTO (src/Video4/Esquema.tsx): placa negra con marco dorado arriba, la frase se teclea
// letra a letra con cursor dorado mientras ella dice "Invertí ahora", destello al entrar, y el botón ENVIAR ↗ se pulsa y pasa a ✓ ENVIADO.
const FPS = 30;
const T = (s: number) => Math.round(s * FPS);
const INK = "#1a1a1a";
const GOLD = "linear-gradient(135deg, #8f7138 0%, #C7AE6A 28%, #F3EBB6 50%, #C7AE6A 72%, #8f7138 100%)";
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export const CTA = { entra: 28.95, tecleaA: 29.05, tecleaB: 30.0, boton: 30.5, pulsa: 31.5, texto: "INVERTÍ AHORA", eyebrow: "SPOT 335" };

const useSpr = (startS: number, damping = 20, stiffness = 90) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - T(startS), fps, config: { damping, stiffness } });
};

export const CierreCta: React.FC = () => {
  const f = useCurrentFrame();
  const p = Math.min(useSpr(CTA.entra, 22, 100), 1);
  const q = Math.min(useSpr(CTA.boton, 20, 110), 1);
  const sh = clamp01((f - T(CTA.entra) - 10) / 28);
  const n = Math.round(CTA.texto.length * clamp01((f - T(CTA.tecleaA)) / (T(CTA.tecleaB) - T(CTA.tecleaA))));
  const sent = clamp01((f - T(CTA.pulsa)) / 6);
  const press = f >= T(CTA.pulsa) && f < T(CTA.pulsa) + 6 ? 1 : 0;
  if (f < T(CTA.entra)) return null;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 130, top: 230, width: 820, height: 230, opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 34}px)`, filter: `blur(${(1 - p) * 10}px)` }}>
        <div
          style={{
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            width: "100%",
            height: "100%",
            borderRadius: 44,
            border: "6px solid transparent",
            background: `linear-gradient(180deg, #2B2B2B 0%, ${INK} 100%) padding-box, ${GOLD} border-box`,
            boxShadow: "0 30px 70px rgba(70,44,18,0.45)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 26, letterSpacing: 7, color: "#C7AE6A" }}>{CTA.eyebrow}</div>
          <div style={{ fontFamily: "Bebas Neue", fontSize: 118, letterSpacing: 7, lineHeight: 1, color: "#F4EAD3", marginTop: 8, whiteSpace: "nowrap" }}>
            <span>{CTA.texto.slice(0, n)}</span>
            <span style={{ display: "inline-block", width: 7, height: 96, marginLeft: 2, marginRight: -9, transform: "translateY(10px)", background: "#E2A826", opacity: n >= CTA.texto.length && f > T(CTA.tecleaB) + 20 ? 0 : Math.sin((f / FPS) * 14) > -0.3 ? 1 : 0 }} />
            <span style={{ opacity: 0 }}>{CTA.texto.slice(n)}</span>
          </div>
          {sh > 0 && sh < 1 && (
            <div style={{ position: "absolute", top: -20, bottom: -20, left: -240 + sh * 1300, width: 150, background: "linear-gradient(100deg, rgba(255,248,225,0), rgba(255,248,225,0.3), rgba(255,248,225,0))", transform: "skewX(-18deg)" }} />
          )}
        </div>
      </div>
      {f >= T(CTA.boton) && (
        <div
          style={{
            position: "absolute",
            left: 540 - 170,
            top: 500,
            width: 340,
            height: 78,
            opacity: clamp01(q * 2),
            transform: `translateY(${(1 - q) * 24}px) scale(${1 - 0.06 * press})`,
            borderRadius: 39,
            border: "4px solid #C7AE6A",
            background: sent > 0.5 ? GOLD : INK,
            color: sent > 0.5 ? INK : "#F4EAD3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter",
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: 4,
            boxShadow: sent > 0.5 ? "0 0 0 6px rgba(201,165,90,0.3), 0 14px 30px rgba(70,44,18,0.35)" : "0 12px 26px rgba(70,44,18,0.35)",
          }}
        >
          {sent > 0.5 ? "✓ ENVIADO" : "ENVIAR ↗"}
        </div>
      )}
    </AbsoluteFill>
  );
};
