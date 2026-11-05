// Регистрация роликов. Новый ролик: папка src/<имя>/ (Scene.tsx + timeline.json + Main.tsx) и ещё одна строка ниже.
import React from "react";
import { Composition } from "remotion";
import { Main as PathMain } from "./path/Main";
import PATH from "./path/timeline.json";
import { HGMain } from "./hourglass/Main";
import HG from "./hourglass/timeline.json";
import { WellWithHa } from "./well/Main";
import WL from "./well/timeline.json";
import { KapsulaMain } from "./kapsula/Main";
import KP from "./kapsula/timeline.json";

export const Root: React.FC = () => (<>
  <Composition id="Path" component={PathMain} durationInFrames={PATH.total} fps={PATH.fps} width={1080} height={1920} />
  <Composition id="Hourglass" component={HGMain} durationInFrames={HG.total} fps={HG.fps} width={1080} height={1920} />
  <Composition id="Well" component={WellWithHa} durationInFrames={WL.total} fps={WL.fps} width={1080} height={1920} />
  <Composition id="Kapsula" component={KapsulaMain} durationInFrames={KP.total} fps={KP.fps} width={1080} height={1920} />
</>);
