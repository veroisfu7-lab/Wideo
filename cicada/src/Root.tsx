import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
import T from "./timeline.json";

export const Root: React.FC = () => (
  <Composition id="Cicada" component={Film} durationInFrames={T.total} fps={T.fps} width={1080} height={1920} />
);
