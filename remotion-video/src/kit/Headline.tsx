import { colors, fonts } from "./tokens";
import { useEnter } from "./motion";

// Titular por líneas: cada línea sube desde una máscara, escalonada.
export const Headline: React.FC<{
  lines: string[];
  delay?: number;
  size?: number;
  gradientLine?: number; // línea con degradado de acento
}> = ({ lines, delay = 0, size = 200, gradientLine }) => (
  <div style={{ fontFamily: fonts.display, fontSize: size, lineHeight: 0.92, letterSpacing: 2, color: colors.fg }}>
    {lines.map((line, i) => (
      <Line key={i} text={line} delay={delay + i * 6} gradient={gradientLine === i} />
    ))}
  </div>
);

const Line: React.FC<{ text: string; delay: number; gradient: boolean }> = ({ text, delay, gradient }) => {
  const p = useEnter(delay);
  return (
    <div style={{ overflow: "hidden", paddingBottom: 6 }}>
      <div
        style={{
          transform: `translateY(${(1 - p) * 110}%)`,
          ...(gradient
            ? {
                background: `linear-gradient(90deg, ${colors.accentSoft}, ${colors.pink})`,
                WebkitBackgroundClip: "text",
                color: "transparent",
              }
            : {}),
        }}
      >
        {text}
      </div>
    </div>
  );
};
