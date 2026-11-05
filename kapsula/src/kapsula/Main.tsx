// Ролик «Капсула».
import React from "react";
import T from "./timeline.json";
import { KapsulaScene } from "./Scene";
import { Reel } from "../Reel";

export const KapsulaMain: React.FC = () => <Reel T={T}><KapsulaScene /></Reel>;
