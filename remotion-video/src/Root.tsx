import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { DURATION, FPS, HEIGHT, WIDTH } from "./Reel/config";
import { KitDemo } from "./KitDemo/KitDemo";
import { Reel } from "./Reel/Reel";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="Reel"
        component={Reel}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="KitDemo"
        component={KitDemo}
        durationInFrames={240}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
