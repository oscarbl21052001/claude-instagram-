import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useEnter } from "./motion";
import { colors, fonts } from "./tokens";

export type Word = { text: string; start: number; end: number; highlight?: boolean };

// Subtítulos por grupos de palabras. La palabra activa se enciende; las ya dichas quedan
// en blanco y las que faltan, atenuadas. Las palabras clave usan el color de resalte.
export const WordCaptions: React.FC<{
  words: Word[];
  maxWords?: number;
  centerY?: number; // px desde arriba
  size?: number;
}> = ({ words, maxWords = 4, centerY = 1500, size = 84 }) => {
  const groups: Word[][] = [];
  words.forEach((w) => {
    const g = groups[groups.length - 1];
    if (!g || g.length >= maxWords) groups.push([w]);
    else g.push(w);
  });
  return (
    <>
      {groups.map((g, i) => (
        <Group key={i} words={g} centerY={centerY} size={size} nextStart={groups[i + 1]?.[0].start} />
      ))}
    </>
  );
};

const Group: React.FC<{ words: Word[]; centerY: number; size: number; nextStart?: number }> = ({
  words,
  centerY,
  size,
  nextStart,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.round(words[0].start * fps);
  const end = Math.round(words[words.length - 1].end * fps);
  const p = useEnter(start);
  // Un grupo desaparece justo cuando empieza el siguiente; solo el último hace fundido de salida.
  const hideAt = nextStart !== undefined ? Math.round(nextStart * fps) : end + 8;
  if (frame < start || frame >= hideAt) return null;
  const out =
    nextStart !== undefined
      ? 1
      : interpolate(frame, [end, end + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        right: 64,
        top: centerY,
        transform: `translateY(calc(-50% + ${(1 - p) * 26}px))`,
        opacity: Math.min(p * 2, 1) * out,
        textAlign: "center",
        fontFamily: fonts.body,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.12,
        textShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}
    >
      {words.map((w, i) => {
        const s = w.start * fps;
        const e = w.end * fps;
        const active = frame >= s && frame < e;
        const spoken = frame >= e;
        const color = w.highlight && (active || spoken) ? colors.highlight : colors.fg;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: i < words.length - 1 ? "0.28em" : 0,
              color,
              opacity: spoken || active ? 1 : 0.38,
              transform: `scale(${active ? 1.06 : 1})`,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
