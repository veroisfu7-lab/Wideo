import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import T from "./timeline.json";

export const Root: React.FC = () => (
  <Composition id="RetiredLeague" component={Main} durationInFrames={T.total} fps={T.fps} width={1920} height={1080} />
);
