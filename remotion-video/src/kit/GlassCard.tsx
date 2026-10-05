import { CSSProperties, ReactNode } from "react";
import { interpolate } from "remotion";
import { useEnter } from "./motion";
import { colors, radius } from "./tokens";

// Tarjeta de cristal: superficie translúcida, borde fino, desenfoque y brillo superior.
// Entra con resorte (escala, desplazamiento, opacidad y desenfoque).
export const GlassCard: React.FC<{
  children: ReactNode;
  delay?: number;
  glow?: string;
  style?: CSSProperties;
}> = ({ children, delay = 0, glow, style }) => {
  const p = useEnter(delay);
  const opacity = interpolate(p, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "relative",
        borderRadius: radius,
        background: `linear-gradient(180deg, rgba(255,255,255,0.09) 0%, ${colors.surface} 38%)`,
        border: `1.5px solid ${colors.border}`,
        backdropFilter: "blur(22px)",
        boxShadow: `0 40px 90px rgba(0,0,0,0.45)${glow ? `, 0 0 120px ${glow}` : ""}`,
        opacity,
        transform: `translateY(${(1 - p) * 56}px) scale(${0.93 + 0.07 * p})`,
        filter: `blur(${(1 - Math.min(p, 1)) * 10}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
