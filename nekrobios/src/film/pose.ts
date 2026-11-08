// Состояние персонажа как набор чисел (позиции целей, углы, мимика) → применение к скелету.
// Числовое состояние можно усреднять по времени: так двойник «отстаёт» и движется «как сквозь воду».
import * as THREE from "three";
import { Character, HANDS, HandPose, mixHand } from "../engine/character";
import { V3, lerp } from "./anim";

export type Arm = { t: V3; fwd: V3; back: V3; pole: V3 };
export type CS = {
  pos: V3; yaw: number;                       // yaw: градусы, 0 — лицом к +z, 180 — лицом к зеркалу
  hipsOff: V3;                                // смещение таза (локально)
  hips: V3; spine: V3; chest: V3; neck: V3; head: V3; // градусы (x — наклон вперёд, y — поворот влево, z — крен)
  armL: Arm; armR: Arm;                       // цели кистей в ЛОКАЛЬНЫХ координатах персонажа
  fingL: HandPose; fingR: HandPose;
  footL: V3; footR: V3;                       // лодыжки (локально)
  morph: { blink: number; wide: number; jaw: number; grin: number; pucker: number };
  gaze: V3 | null;                            // точка взгляда (мир)
};

export const restArm = (side: "L" | "R"): Arm => {
  const s = side === "L" ? 1 : -1;
  return { t: [0.215 * s, 0.875, 0.035], fwd: [0.05 * s, -1, 0.06], back: [s, 0.05, 0.0], pole: [0.25 * s, 0, -1] };
};
export const restState = (): CS => ({
  pos: [0, 0, 0], yaw: 180, hipsOff: [0, 0, 0],
  hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  armL: restArm("L"), armR: restArm("R"), fingL: HANDS.relaxed, fingR: HANDS.relaxed,
  footL: [0.105, 0.088, -0.015], footR: [-0.105, 0.088, -0.015],
  morph: { blink: 0, wide: 0, jaw: 0, grin: 0, pucker: 0 }, gaze: null,
});

const D2R = Math.PI / 180;
export const toWorld = (s: CS, v: V3) => {
  const c = Math.cos(s.yaw * D2R), sn = Math.sin(s.yaw * D2R);
  return new THREE.Vector3(s.pos[0] + v[0] * c + v[2] * sn, s.pos[1] + v[1], s.pos[2] - v[0] * sn + v[2] * c);
};
export const dirWorld = (s: CS, v: V3) => {
  const c = Math.cos(s.yaw * D2R), sn = Math.sin(s.yaw * D2R);
  return new THREE.Vector3(v[0] * c + v[2] * sn, v[1], -v[0] * sn + v[2] * c);
};
// мир → локальные координаты персонажа
export const toLocal = (s: CS, w: THREE.Vector3 | V3): V3 => {
  const p = Array.isArray(w) ? w : [w.x, w.y, w.z];
  const c = Math.cos(s.yaw * D2R), sn = Math.sin(s.yaw * D2R);
  const x = p[0] - s.pos[0], y = p[1] - s.pos[1], z = p[2] - s.pos[2];
  return [x * c - z * sn, y, x * sn + z * c];
};
export const dirLocal = (s: CS, w: V3): V3 => {
  const c = Math.cos(s.yaw * D2R), sn = Math.sin(s.yaw * D2R);
  return [w[0] * c - w[2] * sn, w[1], w[0] * sn + w[2] * c];
};

export function apply(ch: Character, s: CS) {
  ch.resetPose();
  ch.root.position.set(...s.pos);
  ch.root.rotation.set(0, s.yaw * D2R, 0);
  const hb = ch.bones["hips"];
  hb.position.set(ch.rest["hips"].head.x + s.hipsOff[0], ch.rest["hips"].head.y + s.hipsOff[1], ch.rest["hips"].head.z + s.hipsOff[2]);
  ch.rotate("hips", ...s.hips); ch.rotate("spine", ...s.spine); ch.rotate("chest", ...s.chest);
  ch.rotate("neck", ...s.neck); ch.rotate("head", ...s.head);
  ch.root.updateMatrixWorld(true);
  // ноги
  for (const [side, ft] of [["L", s.footL], ["R", s.footR]] as const) {
    ch.ik2(`thigh.${side}`, `shin.${side}`, toWorld(s, ft), dirWorld(s, [0, 0.15, 1]));
  }
  // руки
  for (const [side, a, fp] of [["L", s.armL, s.fingL], ["R", s.armR, s.fingR]] as const) {
    ch.ik2(`upperArm.${side}`, `foreArm.${side}`, toWorld(s, a.t), dirWorld(s, a.pole));
    ch.aimHand(side, dirWorld(s, a.fwd), dirWorld(s, a.back));
    ch.setHand(side, fp);
  }
  ch.setMorph(s.morph);
  ch.root.updateMatrixWorld(true);
  ch.lookEyes(s.gaze ? new THREE.Vector3(...s.gaze) : null);
}

// ------------------------------------------------------------------ смешивание состояний
const mixV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mixArm = (a: Arm, b: Arm, t: number): Arm => ({ t: mixV(a.t, b.t, t), fwd: mixV(a.fwd, b.fwd, t), back: mixV(a.back, b.back, t), pole: mixV(a.pole, b.pole, t) });
export function mix(a: CS, b: CS, t: number): CS {
  return {
    pos: mixV(a.pos, b.pos, t), yaw: lerp(a.yaw, b.yaw, t), hipsOff: mixV(a.hipsOff, b.hipsOff, t),
    hips: mixV(a.hips, b.hips, t), spine: mixV(a.spine, b.spine, t), chest: mixV(a.chest, b.chest, t), neck: mixV(a.neck, b.neck, t), head: mixV(a.head, b.head, t),
    armL: mixArm(a.armL, b.armL, t), armR: mixArm(a.armR, b.armR, t),
    fingL: mixHand(a.fingL, b.fingL, t), fingR: mixHand(a.fingR, b.fingR, t),
    footL: mixV(a.footL, b.footL, t), footR: mixV(a.footR, b.footR, t),
    morph: { blink: lerp(a.morph.blink, b.morph.blink, t), wide: lerp(a.morph.wide, b.morph.wide, t), jaw: lerp(a.morph.jaw, b.morph.jaw, t), grin: lerp(a.morph.grin, b.morph.grin, t), pucker: lerp(a.morph.pucker, b.morph.pucker, t) },
    gaze: a.gaze && b.gaze ? mixV(a.gaze, b.gaze, t) : t < 0.5 ? a.gaze : b.gaze,
  };
}
// «сквозь воду»: среднее по окну [t-w, t]
export function lagged(fn: (t: number) => CS, t: number, lag: number, win: number, n = 7): CS {
  let acc = fn(t - lag - win);
  for (let i = 1; i < n; i++) acc = mix(acc, fn(t - lag - win + (win * i) / (n - 1)), 1 / (i + 1));
  return acc;
}
export const clone = (s: CS): CS => JSON.parse(JSON.stringify(s));
