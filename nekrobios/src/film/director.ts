import * as THREE from "three";
import { Engine, Hud } from "../engine/engine";
import { getInputProps } from "remotion";
const DBG = getInputProps() as any;

export const FPS = 60;
export function direct(E: Engine, f: number): Hud {
  const t = f / FPS;
  E.world.update(t);
  E.cam.fov = 54; if (DBG.cam) { E.cam.position.set(...(DBG.cam as [number,number,number])); E.cam.lookAt(...(DBG.at as [number,number,number])); E.cam.fov = DBG.fov ?? 30; E.cam.updateProjectionMatrix(); } else { E.cam.position.set(0.25, 1.45, 2.1); E.cam.lookAt(0.05, 1.3, 0.75); } E.cam.updateProjectionMatrix();
  for (const c of [E.hero, E.double]) {
    c.root.position.set(0.05, 0, 0.75); c.root.rotation.y = (globalThis as any).ROT ?? 0;
    c.rotate("upperArm.L", 0, 0, -28); c.rotate("upperArm.R", 0, 0, 28);
  }
  E.P.focus = DBG.focus ?? 1.4;
  if (DBG.nohair) E.hero.hair.visible = false;
  if (DBG.nohead) E.hero.head.visible = false;
  if (DBG.nodouble) E.double.root.visible = false;
  if (DBG.noshadow) E.world.key.castShadow = false;
  return {};
}
