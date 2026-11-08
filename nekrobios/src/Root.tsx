import React from "react";
import { Composition } from "remotion";
import { Film } from "./Film";
export const Root: React.FC = () => (<>
  <Composition id="Nekrobios" component={Film} durationInFrames={5400} fps={60} width={1080} height={1920} />
</>);
