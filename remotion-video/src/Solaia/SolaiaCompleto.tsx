import { Video } from "@remotion/media";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { CtaSolaia } from "./CtaSolaia";
import { KW_DURATION, PalabrasClave } from "./PalabrasClave";
import { SubtitulosSolaia } from "./SubtitulosSolaia";
import { SOLAIA_DURATION, SolaiaIntro } from "./SolaiaIntro";

// SOLAIA completo: cifras + barra (0–6 s, línea con halo) y pastillas con icono (11,5–21,6 s) sobre el mismo vídeo.
export { SOLAIA_DURATION };
export const SolaiaCompleto: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Video src={staticFile("solaia/solaia.mp4")} />
    <SolaiaIntro calendario estilo="poppins" sinTarjeta variante="halo" enLinea sinVideo />
    <Sequence from={Math.round(11.5 * 30)} durationInFrames={KW_DURATION} layout="none">
      <PalabrasClave estilo={4} sinVideo />
    </Sequence>
    <SubtitulosSolaia total={SOLAIA_DURATION} />
    <CtaSolaia />
    <Audio src={staticFile("solaia/sfx_cta.wav")} />
  </AbsoluteFill>
);
