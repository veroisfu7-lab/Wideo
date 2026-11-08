import React from "react";
import { Composition } from "remotion";
import { LabazMain } from "./Main";
import { TOTAL, FPS } from "./timeline";
export const Root: React.FC = () => (<>
  <Composition id="Labaz" component={LabazMain} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
</>);
