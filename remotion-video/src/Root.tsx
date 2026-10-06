import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { KitDemo } from "./KitDemo/KitDemo";
import { TOUR_DURATION, TOUR_FPS, TourApto } from "./Tour/TourApto";

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
        id="TourApto"
        component={TourApto}
        durationInFrames={TOUR_DURATION}
        fps={TOUR_FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
