// Ролик «Путь под ногами».
import React from "react";
import T from "./timeline.json";
import { Scene } from "./Scene";
import { Reel } from "../Reel";

export const Main: React.FC = () => <Reel T={T}><Scene /></Reel>;
