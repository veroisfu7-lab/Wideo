import React from "react";
import { Composition } from "remotion";
import { MafiaMain, TOTAL } from "./Main";
export const Root: React.FC = () => (<>
  <Composition id="Mafia" component={MafiaMain} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
</>);
