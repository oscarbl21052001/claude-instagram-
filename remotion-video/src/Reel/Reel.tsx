import { loadFont } from "@remotion/fonts";
import { Video } from "@remotion/media";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Beach } from "./Beach";
import { Captions } from "./Captions";
import { T } from "./config";
import { MatrixRain } from "./MatrixRain";

const pad = (n: number) => String(n).padStart(4, "0");

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Cargando Poppins"));

  useEffect(() => {
    loadFont({
      family: "Poppins",
      url: staticFile("fonts/Poppins-ExtraBold.woff2"),
      weight: "800",
    }).then(() => continueRender(handle));
  }, [handle]);

  const matrixReveal = interpolate(frame, [T.toMatrixStart, T.toMatrixEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const beachReveal = interpolate(frame, [T.toBeachStart, T.toBeachEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* 1. Fondo: metraje original (con el audio) */}
      <Video src={staticFile("source.mp4")} style={{ width: "100%", height: "100%" }} />

      {/* 2. Fondo digital Matrix */}
      {frame >= T.toMatrixStart && frame <= T.toBeachEnd ? (
        <MatrixRain reveal={matrixReveal} seed="matrix" />
      ) : null}

      {/* 3. Fondo playa soleada */}
      {frame >= T.toBeachStart ? <Beach reveal={beachReveal} seed="beach" /> : null}

      {/* 4. Subtítulos: delante del fondo y detrás del sujeto */}
      <Captions />

      {/* 5. Sujeto recortado, siempre por encima */}
      <Img
        src={staticFile(`subject/s_${pad(frame + 1)}.webp`)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </AbsoluteFill>
  );
};
