import { Easing, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import {
  CAPTION_CENTER_Y,
  CAPTION_EXIT_FRAMES,
  CAPTION_MAX_FONT,
  CHUNKS,
  Chunk,
  HEIGHT,
  WIDTH,
} from "./config";

const HIGHLIGHT = new Set(["PROPIEDADES", "EXTRANJERO", "CÓMO"]);

const Line: React.FC<{
  text: string;
  chunkIdx: number;
  lineIdx: number;
  exitT: number; // 0 = visible, 1 = desintegrado
}> = ({ text, chunkIdx, lineIdx, exitT }) => {
  const chars = Array.from(text);
  return (
    <div style={{ display: "flex", justifyContent: "center", whiteSpace: "pre" }}>
      {chars.map((ch, i) => {
        const id = `${chunkIdx}-${lineIdx}-${i}`;
        // cada letra empieza su desintegración en un momento distinto
        const delay = random(`d${id}`) * 0.45;
        const p = interpolate(exitT, [delay, delay + 0.55], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.in(Easing.quad),
        });
        const dx = (random(`x${id}`) - 0.35) * 320;
        const dy = -(40 + random(`y${id}`) * 260);
        const rot = (random(`r${id}`) - 0.5) * 90;
        const word = text.split(" ").find((w) => HIGHLIGHT.has(w));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: word ? "#ffe14d" : "#ffffff",
              transform: `translate(${dx * p}px, ${dy * p}px) rotate(${rot * p}deg) scale(${1 - 0.45 * p})`,
              filter: `blur(${p * 22}px)`,
              opacity: 1 - p,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

const ChunkView: React.FC<{ chunk: Chunk; idx: number }> = ({ chunk, idx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.round(chunk.start * fps);
  const end = Math.round(chunk.end * fps);
  if (frame < start || frame > end + CAPTION_EXIT_FRAMES) return null;

  const enter = interpolate(frame, [start, start + 6], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const exitT = interpolate(frame, [end, end + CAPTION_EXIT_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const maxChars = Math.max(...chunk.words.map((w) => w.length));
  const size = Math.min(CAPTION_MAX_FONT, (WIDTH - 90) / (maxChars * 0.72));

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: WIDTH,
        top: HEIGHT * CAPTION_CENTER_Y,
        transform: `translateY(-50%) scale(${0.82 + 0.18 * enter})`,
        opacity: enter,
        filter: `blur(${(1 - enter) * 14}px)`,
        fontFamily: "Poppins, sans-serif",
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.02,
        textAlign: "center",
        letterSpacing: -2,
        WebkitTextStroke: `${Math.round(size * 0.075)}px rgba(10,10,20,0.92)`,
        paintOrder: "stroke fill",
        textShadow: "0 12px 40px rgba(0,0,0,0.55)",
      }}
    >
      {chunk.words.map((w, li) => (
        <Line key={li} text={w} chunkIdx={idx} lineIdx={li} exitT={exitT} />
      ))}
    </div>
  );
};

export const Captions: React.FC = () => (
  <>
    {CHUNKS.map((c, i) => (
      <ChunkView key={i} chunk={c} idx={i} />
    ))}
  </>
);
