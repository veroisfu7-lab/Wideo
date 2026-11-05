// Ролик «Ведро и труба».
import React from "react";
import * as THREE from "three";
import { useCurrentFrame } from "remotion";
// шрифт грузит Reel.tsx (TekturLocal)
import T from "./timeline.json";
import { WellScene, camPose, HA_FRAMES } from "./Scene";
import { poseA, Z1, mapA, mapB } from "./plan";
import { solveFacing } from "../Stickman";
import { Reel } from "../Reel";

const fontFamily = "TekturLocal";
const CAM = new THREE.PerspectiveCamera(28, 1080 / 1920, 0.5, 200);
const toScreen = (f: number, x: number, y: number, z: number) => {
  const c = camPose(f); CAM.position.copy(c.pos); CAM.lookAt(c.look); CAM.updateMatrixWorld(); CAM.updateProjectionMatrix();
  const v = new THREE.Vector3(x, y, z).project(CAM);
  return [(v.x * 0.5 + 0.5) * 1080, (0.5 - v.y * 0.5) * 1920];
};
// «ХА» над смеющимся (как «HA» в серии): появляется без фейда, ползёт вверх, живёт 14 кадров
const Ha: React.FC = () => {
  const f = useCurrentFrame();
  const a = poseA(mapA(f), f), j = solveFacing(a.pose, a.s);
  const [hx, hy] = toScreen(mapB(f), j.head[0], j.head[1] + 0.2, Z1);
  return (<>{HA_FRAMES.map((f0, i) => {
    const t = f - f0; if (t < 0 || t >= 14) return null;
    const side = i % 2 ? 1 : -1;
    return <div key={i} style={{ position: "absolute", left: hx + side * (34 + 6 * (i % 3)) - 30, top: hy - 40 - t * 1.6 - 8 * (i % 2), width: 60, textAlign: "center",
      fontFamily, fontSize: 30, letterSpacing: "0.08em", color: "#9A979B" }}>ХА</div>;
  })}</>);
};
export const WellMain: React.FC = () => <Reel T={T}><WellScene /></Reel>;
export const WellWithHa: React.FC = () => (<><WellMain /><div style={{ position: "absolute", inset: 0 }}><Ha /></div></>);
