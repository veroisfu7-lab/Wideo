// Ролик «Песочные часы».
import React from "react";
import T from "./timeline.json";
import { HGScene } from "./Scene";
import { Reel } from "../Reel";

export const HGMain: React.FC = () => <Reel T={T}><HGScene /></Reel>;
