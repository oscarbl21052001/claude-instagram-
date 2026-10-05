import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "./tokens";

// Fondo "Cinema": degradado casi negro (nunca #000 puro) y luces ambientales
// que oscilan despacio, más viñeta y grano muy sutil.
export const Background: React.FC<{ tint?: string }> = ({ tint = colors.accent }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const blob = (
    cx: number,
    cy: number,
    size: number,
    color: string,
    alpha: string,
    period: number,
    phase: number,
  ) => (
    <div
      style={{
        position: "absolute",
        left: cx * width + Math.sin((t / period) * Math.PI * 2 + phase) * 90 - size / 2,
        top: cy * height + Math.cos((t / period) * Math.PI * 2 + phase) * 110 - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}${alpha} 0%, transparent 68%)`,
      }}
    />
  );
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(180deg, ${colors.bgElevated} 0%, ${colors.bgDeep} 100%)` }}
    >
      {blob(0.2, 0.22, 1300, tint, "55", 11, 0)}
      {blob(0.85, 0.58, 1100, colors.accentIndigo, "40", 9, 2)}
      {blob(0.3, 0.9, 1000, colors.pink, "22", 13, 4)}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.05, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
