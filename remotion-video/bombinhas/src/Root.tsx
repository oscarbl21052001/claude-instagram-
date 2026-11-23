import React from "react";
import { Composition } from "remotion";
import { Bombinhas } from "./Bombinhas";

export const FPS = 30;
export const TOTAL = 828;

export const Root: React.FC = () => (
  <Composition id="Bombinhas" component={Bombinhas} durationInFrames={TOTAL}
    fps={FPS} width={1080} height={1920} />
);
