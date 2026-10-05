import { interpolate } from "remotion";
import { useEnter } from "./motion";
import { colors, fonts } from "./tokens";

export const Tag: React.FC<{ text: string; delay?: number; color?: string }> = ({
  text,
  delay = 0,
  color = colors.highlight,
}) => {
  const p = useEnter(delay);
  return (
    <div
      style={{
        display: "inline-block",
        padding: "14px 32px",
        borderRadius: 999,
        background: color,
        color: "#fff",
        fontFamily: fonts.body,
        fontWeight: 800,
        fontSize: 34,
        letterSpacing: 3,
        textTransform: "uppercase",
        opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${(1 - p) * 24}px) scale(${0.9 + 0.1 * p})`,
        boxShadow: `0 12px 40px ${color}55`,
      }}
    >
      {text}
    </div>
  );
};
