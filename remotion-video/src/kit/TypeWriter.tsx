import { useCurrentFrame, useVideoConfig } from "remotion";
import { GlassCard } from "./GlassCard";
import { Icon } from "./Icons";
import { colors, fonts } from "./tokens";

// Barra de búsqueda con texto que se escribe letra a letra y cursor parpadeante.
export const TypeWriter: React.FC<{
  text: string;
  delay?: number;
  charsPerSecond?: number;
}> = ({ text, delay = 0, charsPerSecond = 18 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const typed = Math.max(0, Math.floor(((frame - delay - 10) / fps) * charsPerSecond));
  const shown = text.slice(0, typed);
  const caret = Math.floor(frame / 15) % 2 === 0 || typed < text.length;
  return (
    <GlassCard delay={delay} style={{ padding: "38px 46px", display: "flex", alignItems: "center", gap: 28 }}>
      <Icon name="search" size={58} color={colors.accentSoft} />
      <div style={{ fontFamily: fonts.body, fontWeight: 500, fontSize: 54, color: colors.fg, whiteSpace: "pre" }}>
        {shown}
        <span style={{ display: "inline-block", width: 5, height: 56, marginLeft: 6, verticalAlign: "-8px", background: caret ? colors.accentSoft : "transparent" }} />
      </div>
    </GlassCard>
  );
};
