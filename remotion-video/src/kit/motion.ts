import { Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { motion } from "./tokens";

export const expoOut = Easing.bezier(...motion.expoOut);

// Progreso 0 → 1 con el resorte del estilo Cinema, empezando en `delay` fotogramas.
export const useEnter = (delay = 0, durationInFrames?: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: motion.spring,
    durationInFrames,
  });
};
