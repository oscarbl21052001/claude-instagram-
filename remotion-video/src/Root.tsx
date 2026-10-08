import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { CalleRail, RAIL_DURATION, RAIL_FPS } from "./Calle/CalleRail";
import { CALLE_DURATION, CALLE_FPS, CalleDorada } from "./Calle/CalleDorada";
import { EDIT_DURATION, EDIT_FPS, EsquemaPip } from "./Edit/EsquemaPip";
import { KitDemo } from "./KitDemo/KitDemo";
import { TOUR_DURATION, TOUR_FPS, TourApto } from "./Tour/TourApto";
import { UNIDAD_DURATION, UNIDAD_FPS, UnidadFlotante } from "./Unidad/UnidadFlotante";
import tipo101 from "./Unidad/units/tipo101";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="KitDemo"
        component={KitDemo}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="EsquemaPip"
        component={EsquemaPip}
        durationInFrames={EDIT_DURATION}
        fps={EDIT_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="CalleDorada"
        component={CalleDorada}
        durationInFrames={CALLE_DURATION}
        fps={CALLE_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="CalleRail"
        component={CalleRail}
        durationInFrames={RAIL_DURATION}
        fps={RAIL_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="TourApto"
        component={TourApto}
        durationInFrames={TOUR_DURATION}
        fps={TOUR_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="UnidadFlotante"
        component={UnidadFlotante}
        defaultProps={{ config: tipo101 }}
        durationInFrames={UNIDAD_DURATION}
        fps={UNIDAD_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
