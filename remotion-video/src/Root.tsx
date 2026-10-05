import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { KitDemo } from "./KitDemo/KitDemo";

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
    </>
  );
};
