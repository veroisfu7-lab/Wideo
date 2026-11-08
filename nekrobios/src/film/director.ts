// Режиссура: по номеру кадра выставляет камеру, позы героя и двойника, реквизит, эффекты стекла, параметры плёнки и данные HUD.
import * as THREE from "three";
import { getInputProps } from "remotion";
import { Engine, Hud } from "../engine/engine";
import { HANDS, mixHand, aimQuat } from "../engine/character";
import { attach } from "../engine/extras";
import { GLASS } from "../engine/mirror";
import { BENCH, LAMP } from "../engine/world";
import { CS, apply, restState, restArm, toWorld, toLocal, dirLocal, lagged, mix, clone } from "./pose";
import { V3, clamp01, smooth, smoother, inOut, outCubic, inCubic, keys, keysV, lerp, lerpV, seg, wob, shake, hash } from "./anim";
import { EV, FPS, shotAt } from "./shots";
import LIP from "./lipsync.json";

const DBG = getInputProps() as any;
const v3 = (a: V3) => new THREE.Vector3(...a);
const arr = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];
const nrm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const GC = (GLASS.y0 + GLASS.y1) / 2; // центр стекла по y

// ------------------------------------------------------------------ общие помощники постановки
function cam(E: Engine, pos: V3, at: V3, fov: number, roll = 0) {
  E.cam.position.set(...pos); E.cam.up.set(0, 1, 0); E.cam.lookAt(...at);
  if (roll) E.cam.rotateZ(roll * Math.PI / 180);
  E.cam.fov = fov; E.cam.updateProjectionMatrix(); E.cam.updateMatrixWorld(true);
}
// рука к мировой цели (запястье), направления пальцев/тыла в мире
function armW(s: CS, side: "L" | "R", wrist: V3, fwd: V3, back: V3, pole: V3) {
  const a = { t: toLocal(s, wrist), fwd: dirLocal(s, fwd), back: dirLocal(s, back), pole };
  if (side === "L") s.armL = a; else s.armR = a;
}
function stand(x: number, z: number, yaw = 180): CS { const s = restState(); s.pos = [x, 0, z]; s.yaw = yaw; return s; }
function breathe(s: CS, t: number, k = 1) { s.chest[0] += Math.sin(t * 1.6) * 0.8 * k; s.head[0] += Math.sin(t * 1.6 - 0.6) * 0.5 * k; s.head[1] += wob(t * 0.4, 3) * 1.2 * k; }
const eyeW = (E: Engine, ch: "hero" | "double") => { const c = E[ch]; const p = new THREE.Vector3(); c.headGroup.getWorldPosition(p); return p; };
// точка на стекле (локальные координаты стекла) → мир
const glassW = (gx: number, gy: number, z = 0): V3 => [gx, GC + gy, z];
// проекция точки «Зазеркалья» (зеркальное отражение по z) на экран
function projMirror(E: Engine, p: THREE.Vector3) { const q = p.clone(); q.z = -q.z; return E.project(q); }
function projUV(E: Engine, p: THREE.Vector3) { const v = p.clone().project(E.cam); return [v.x * 0.5 + 0.5, v.y * 0.5 + 0.5] as [number, number]; }

// точки лица для трекинга (локальные координаты головы)
const FACE_PTS: V3[] = [
  [0, 0.085, 0.085], [-0.04, 0.07, 0.075], [0.04, 0.07, 0.075], [-0.06, 0.03, 0.05], [0.06, 0.03, 0.05],
  [-0.032, 0.024, 0.085], [0.032, 0.024, 0.085], [-0.032, 0.0, 0.08], [0.032, 0.0, 0.08], [0, 0.005, 0.095],
  [0, -0.03, 0.115], [-0.013, -0.04, 0.1], [0.013, -0.04, 0.1], [-0.024, -0.066, 0.09], [0.024, -0.066, 0.09],
  [0, -0.06, 0.097], [0, -0.074, 0.093], [-0.058, -0.04, 0.045], [0.058, -0.04, 0.045], [-0.04, -0.09, 0.06],
  [0.04, -0.09, 0.06], [0, -0.112, 0.07], [-0.07, 0.0, 0.0], [0.07, 0.0, 0.0],
];
const FACE_EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 6], [5, 9], [6, 9], [0, 9], [5, 7], [6, 8], [7, 9], [8, 9], [9, 10], [10, 11], [10, 12], [11, 13], [12, 14],
  [13, 15], [14, 15], [13, 16], [14, 16], [3, 17], [4, 18], [17, 13], [18, 14], [17, 19], [18, 20], [19, 21], [20, 21], [16, 21], [3, 22], [4, 23], [22, 17], [23, 18],
  [7, 3], [8, 4], [11, 17], [12, 18],
];
function facePts(E: Engine, ch: "hero" | "double", mirror: boolean) {
  const c = E[ch]; c.root.updateMatrixWorld(true);
  return FACE_PTS.map((p) => { const w = new THREE.Vector3(...p).applyMatrix4(c.headGroup.matrixWorld); return mirror ? projMirror(E, w) : E.project(w); });
}

// ------------------------------------------------------------------ сцена 1: полировка
const POL = { pos: [0.11, 0, 0.5] as V3 };
function ragOnGlass(t: number): V3 {
  const a = (2 * Math.PI * (t - EV.polishStart)) / 1.15;
  const k = seg(t, 0.0, 11.3);
  const cx = 0.10 - 0.16 * smooth(seg(t, 6, 11.3)), cy = 1.34 + 0.05 * Math.sin(t * 0.9);
  void k;
  return [cx + 0.07 * Math.cos(a), cy + 0.055 * Math.sin(a), 0.026];
}
const POL_FWD: V3 = nrm([-0.3, 0.92, -0.12]);
function heroPolish(t: number): CS {
  const s = stand(POL.pos[0], POL.pos[2]);
  const g = ragOnGlass(t);
  const w: V3 = [g[0] - POL_FWD[0] * 0.08, g[1] - POL_FWD[1] * 0.08, g[2] + 0.03];
  armW(s, "R", w, POL_FWD, [0, 0, 1], [-0.6, -0.6, -0.4]);
  s.fingR = HANDS.rag;
  s.chest = [5, 3, 0]; s.head = [8, -6, 0]; s.neck = [3, -2, 0];
  s.gaze = [g[0], g[1], g[2]];
  breathe(s, t, 0.6);
  return s;
}
// мазки тряпки (для очистки стекла): прошлые позиции
function strokes(E: Engine, tEnd: number) {
  const list: [number, number, number, number][] = [];
  const n = 40, t0 = EV.polishStart;
  const te = Math.min(tEnd, 11.35);
  // до кадра — уже протёртая раньше область лица и груди (герой полировал до начала ролика)
  const pre: [number, number, number][] = [[0.0, 0.62, 0.2], [0.12, 0.5, 0.16], [-0.12, 0.52, 0.16], [0.0, 0.38, 0.18], [0.16, 0.3, 0.13], [-0.16, 0.3, 0.13], [0.0, 0.78, 0.13]];
  for (const [x, y, r] of pre) list.push([x, y, r, 0.92]);
  if (te > t0) for (let i = 0; i < n - pre.length; i++) {
    const tt = t0 + ((te - t0) * (i + 1)) / (n - pre.length);
    const g = ragOnGlass(tt);
    list.push([g[0], g[1] - GC, 0.1, 1]);
  }
  E.mirror.setStrokes(list);
}
// бросок тряпки на верстак
const RAG_LAND: V3 = [0.86, BENCH.y + 0.02, 0.42];
function heroToss(t: number): CS {
  const u = t - 11.0;
  const pol = heroPolish(Math.min(t, 11.3));
  const s = clone(pol);
  // рука рывком вправо (к верстаку)
  const out: CS = stand(POL.pos[0], POL.pos[2]);
  out.armR = { t: [-0.58, 1.24, 0.22], fwd: [-1, 0.05, 0.2], back: [0, 1, 0], pole: [-0.3, -0.8, -0.5] };
  const k = outCubic(seg(u, 0.3, 0.68));
  let r = mix(s, out, k);
  r.fingR = mixHand(HANDS.rag, HANDS.flat, smooth(seg(u, 0.58, 0.7)));
  // голова вправо (к верстаку), потом медленно обратно к зеркалу
  const hy = keys(u, [[0.25, -6], [0.6, -48], [1.65, -48], [3.3, 0]], inOut);
  r.head = [keys(u, [[0.3, 8], [0.6, 4], [3.3, 2]]), hy, 0]; r.neck = [2, hy * 0.25, 0];
  r.chest = [keys(u, [[0.3, 5], [0.7, 2]]), keys(u, [[0.3, 3], [0.7, -10], [1.7, -10], [3.4, 0]], inOut), 0];
  // рука медленно опускается
  const down = smooth(seg(u, 1.7, 3.6));
  r.armR = { t: lerpV(r.armR.t, restArm("R").t, down), fwd: lerpV(r.armR.fwd, restArm("R").fwd, down), back: lerpV(r.armR.back, restArm("R").back, down), pole: lerpV(r.armR.pole, restArm("R").pole, down) };
  r.fingR = mixHand(r.fingR, HANDS.relaxed, down);
  r.morph.wide = keys(u, [[1.4, 0], [2.0, 0.45], [5, 0.55]]);
  const hyR = (hy * Math.PI) / 180;
  r.gaze = [POL.pos[0] - Math.sin(hyR) * 2 * -1, 1.62, POL.pos[2] - Math.cos(hyR) * 2];
  r.gaze = [POL.pos[0] + Math.sin(-hyR) * 2, 1.62, POL.pos[2] - Math.cos(hyR) * 2];
  breathe(r, t, 0.5 + 0.8 * seg(u, 1.6, 2.4));
  return r;
}
function doubleToss(t: number): CS {
  const u = t - 11.0;
  const r = lagged(heroToss, t, 0.48, 0.32, 9);
  // голову поворачивает только когда настоящий уже замер
  const hy = keys(u, [[0.25, -6], [1.12, -48], [3.45, -48], [4.6, 0]], (x) => smoother(x));
  r.head = [keys(u, [[0.3, 8], [1.1, 4], [4.6, 2]]), hy, 0]; r.neck = [2, hy * 0.25, 0];
  const hyR = (hy * Math.PI) / 180;
  r.gaze = [POL.pos[0] + Math.sin(-hyR) * 2, 1.62, POL.pos[2] - Math.cos(hyR) * 2];
  r.morph.wide = 0;
  return r;
}
function ragPos(t: number, lag: number): { held: boolean; p: V3; rot: number } {
  const tt = t - lag;
  const tRel = 11.0 + 0.62, tLand = 11.0 + 0.95 + lag * 0.5;
  if (tt < tRel) return { held: true, p: [0, 0, 0], rot: 0 };
  const k = clamp01((tt - tRel) / (tLand - tRel - lag * 0.5));
  const start: V3 = [0.62, 1.2, 0.42];
  const p = lerpV(start, RAG_LAND, k); p[1] += Math.sin(k * Math.PI) * 0.12;
  return { held: false, p, rot: k * 2.5 };
}

// ------------------------------------------------------------------ сцена 2: телефон
const PH = { pos: [0.05, 0, 0.62] as V3 };
function phonePose(t: number): { c: V3; up: V3; n: V3 } {
  const k = smooth(seg(t, EV.phoneUp, EV.phoneUp + 1.3));
  const c = lerpV([0.0, 1.02, 0.47], [0.13, 1.53, 0.47], k);
  c[1] += Math.sin(t * 1.3) * 0.004 + wob(t * 0.8, 5) * 0.003; c[0] += wob(t * 0.7, 9) * 0.003;
  const n = nrm(lerpV([0.1, 0.9, 0.3], [0.12, 0.28, 1.0], k));
  const up = nrm(lerpV([0, 0.3, -1], [0.04, 0.96, -0.28], k));
  return { c, up, n };
}
function heroPhone(t: number): CS {
  const s = stand(PH.pos[0], PH.pos[2]);
  const ph = phonePose(t);
  const right = nrm(arr(v3(ph.up).cross(v3(ph.n))));
  const w: V3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) w[i] = ph.c[i] - ph.up[i] * 0.135 + right[i] * 0.012 - ph.n[i] * 0.024;
  const fwd = nrm([ph.up[0] - right[0] * 0.08, ph.up[1] - right[1] * 0.08, ph.up[2] - right[2] * 0.08]);
  armW(s, "R", w, fwd, [-ph.n[0], -ph.n[1], -ph.n[2]], [-0.7, -0.7, -0.2]);
  s.fingR = { thumb: { curl: 4, spread: 26 }, index: { curl: 6, spread: 3 }, middle: { curl: 7 }, ring: { curl: 9, spread: -3 }, pinky: { curl: 11, spread: -6 } };
  s.head = [14 * smooth(seg(t, EV.phoneUp, EV.phoneUp + 1.2)), 0, 0]; s.chest = [4, 0, 0];
  s.gaze = ph.c;
  breathe(s, t, 0.7);
  return s;
}
function placePhone(obj: THREE.Object3D, ph: { c: V3; up: V3; n: V3 }) {
  const n = v3(ph.n).normalize(), up = v3(ph.up).normalize(); const right = up.clone().cross(n).normalize(); const up2 = n.clone().cross(right);
  const M = new THREE.Matrix4().makeBasis(right, up2, n).setPosition(...ph.c);
  obj.matrixAutoUpdate = false; obj.matrix.copy(M); obj.matrixWorldNeedsUpdate = true;
}
const ENTITY_POS: V3 = [-0.48, 0, 2.95];

// ------------------------------------------------------------------ сцена 3: верстак и папка
const DESK = { x: 1.45, z: 0.1 };
function heroDesk(t: number, phase: "a" | "b"): CS {
  const s = stand(DESK.x, 0.92);
  s.hipsOff = [0, -0.04, 0.02];
  s.spine = [22, 0, 0]; s.chest = [16, 0, 0]; s.neck = [10, 0, 0]; s.head = [18, 0, 0];
  const y = BENCH.y + 0.03;
  if (phase === "a") {
    const u = t - 33;
    // смахивает инструменты (обе руки вширь), потом тянет папку, развязывает, открывает
    const L: V3 = keysV(u, [[0, [1.7, 1.1, 0.75]], [0.5, [1.62, y + 0.06, 0.22]], [1.2, [1.85, y + 0.02, 0.05]], [1.6, [1.7, y + 0.08, 0.3]], [2.4, [1.62, y + 0.01, 0.2]], [4.3, [1.62, y + 0.01, 0.2]], [5.2, [1.5, y + 0.03, 0.28]], [7, [1.5, y + 0.03, 0.28]]]);
    const R: V3 = keysV(u, [[0, [1.2, 1.1, 0.75]], [0.5, [1.3, y + 0.06, 0.18]], [1.2, [1.08, y + 0.02, 0.02]], [1.5, [1.2, y + 0.1, 0.32]], [2.0, [1.38, y + 0.02, 0.18]], [2.6, [1.6, y + 0.02, 0.1]], [3.2, [1.6, y + 0.03, -0.05]], [4.3, [1.5, y + 0.02, 0.05]], [5.0, [1.36, y + 0.03, 0.12]], [5.9, [1.22, y + 0.12, 0.12]], [6.5, [1.18, y + 0.04, 0.3]], [7, [1.18, y + 0.04, 0.3]]]);
    armW(s, "L", L, [0, -0.2, -1], [0, 1, 0], [0.8, -0.5, -0.3]);
    armW(s, "R", R, [0, -0.2, -1], [0, 1, 0], [-0.8, -0.5, -0.3]);
    s.fingL = HANDS.relaxed; s.fingR = u > 2.4 && u < 4.5 ? HANDS.rag : HANDS.relaxed;
  } else {
    const u = t - 40;
    const f = new THREE.Vector3();
    s.pos = [DESK.x - 0.06, 0, 0.8]; s.spine = [26, 0, 0]; s.chest = [18, -6, 0];
    s.armL = { t: toLocal(s, [1.66, y, 0.3]), fwd: dirLocal(s, [0, -0.3, -1]), back: dirLocal(s, [0, 1, 0]), pole: [0.8, -0.5, -0.3] };
    const k = seg(u, 4.2, 7.6);
    const tip = fingerTip(k);
    const w: V3 = [tip[0] + 0.04, tip[1] + 0.05, tip[2] + 0.14];
    const appear = smooth(seg(u, 3.2, 4.2));
    const away: V3 = [1.42, 1.15, 0.62];
    armW(s, "R", lerpV(away, w, appear), nrm([-0.25, -0.35, -0.9]), [0, 1, 0.2], [-0.8, -0.5, -0.3]);
    s.fingR = HANDS.point;
    void f;
  }
  return s;
}
let FOLDER_REF: any = null;
function fingerTip(k: number): V3 {
  // по трём подчёркнутым строкам
  const F = FOLDER_REF; if (!F) return [1.45, BENCH.y, 0.1];
  const uy = [1662, 1718, 1774]; const L = 3 * (1420 - 118);
  let d = k * L; let line = Math.min(2, Math.floor(d / (1420 - 118))); const x = 118 + (d - line * (1420 - 118));
  const p = F.paperToWorld(Math.min(x, 1420), uy[line] + 8);
  return [p.x, p.y + 0.004, p.z];
}

// ------------------------------------------------------------------ сцена 4: отрыв отражения
const S4 = { x: 0.0, z: 0.95 };
function heroStill(t: number): CS { const s = stand(S4.x, S4.z); s.armL = restArm("L"); s.armR = restArm("R"); breathe(s, t, 1.2); s.morph.wide = 0.35; s.gaze = [0, 1.6, -1]; return s; }
function walkZ(t: number, ts: number[], z0: number, stepL: number) {
  // ts — времена касаний; корень плавно движется; возвращает z корня и позиции стоп
  let z = z0; const feet = { L: z0, R: z0 }; let liftL = 0, liftR = 0;
  for (let i = 0; i < ts.length; i++) {
    const t1 = ts[i], t0 = t1 - 0.62;
    const k = clamp01((t - t0) / (t1 - t0));
    const side = i % 2 === 0 ? "R" : "L";
    const target = z0 - stepL * (i + 1);
    if (t >= t1) { feet[side] = target; }
    else if (t > t0) { feet[side] = lerp(z0 - stepL * Math.max(0, i - 1), target, 0.35 * inOut(k) + 0.65 * k); if (side === "L") liftL = Math.sin(k * Math.PI) * 0.06; else liftR = Math.sin(k * Math.PI) * 0.06; }
    else if (i === 0) feet[side] = z0;
  }
  z = (feet.L + feet.R) / 2;
  return { z, feetL: feet.L, feetR: feet.R, liftL, liftR };
}
function doubleWalk(t: number): CS {
  const u = t - 48;
  const steps = [EV.step1, EV.step2, EV.step3];
  const w = walkZ(t, steps, S4.z, 0.2);
  // стопы: левая/правая — мировые z; корень — между ними
  const s = stand(S4.x, w.z);
  s.footL = toLocal(s, [S4.x - 0.105 * -1 * -1, 0.088 + w.liftL, w.feetL]);
  s.footL = toLocal(s, [S4.x - 0.105, 0.088 + w.liftL, w.feetL + 0.015]);
  s.footR = toLocal(s, [S4.x + 0.105, 0.088 + w.liftR, w.feetR + 0.015]);
  s.hipsOff = [0, -0.02 * (Math.abs(w.liftL) + Math.abs(w.liftR)) / 0.06, 0];
  // руки на груди
  const k = smooth(seg(u, 0.6, 2.0));
  const fold = { L: { t: [-0.07, 1.23, 0.17] as V3, fwd: [-1, 0.1, 0.1] as V3, back: [0, 0.6, 0.8] as V3, pole: [0.9, -0.5, -0.2] as V3 }, R: { t: [0.08, 1.27, 0.19] as V3, fwd: [1, 0.15, 0.1] as V3, back: [0, 0.6, 0.8] as V3, pole: [-0.9, -0.5, -0.2] as V3 } };
  s.armL = { t: lerpV(restArm("L").t, fold.L.t, k), fwd: lerpV(restArm("L").fwd, fold.L.fwd, k), back: lerpV(restArm("L").back, fold.L.back, k), pole: lerpV(restArm("L").pole, fold.L.pole, k) };
  s.armR = { t: lerpV(restArm("R").t, fold.R.t, k), fwd: lerpV(restArm("R").fwd, fold.R.fwd, k), back: lerpV(restArm("R").back, fold.R.back, k), pole: lerpV(restArm("R").pole, fold.R.pole, k) };
  s.fingL = mixHand(HANDS.relaxed, HANDS.grip, k * 0.5); s.fingR = s.fingL;
  // наклон головы набок
  const tl = smooth(seg(u, 2.0, 2.9));
  s.head = [-4 * tl, 0, 17 * tl]; s.neck = [0, 0, 5 * tl];
  s.chest[0] = -2;
  s.gaze = [S4.x, 1.6, 3.0];
  breathe(s, t, 0.4);
  return s;
}

// ------------------------------------------------------------------ сцена 4b: лицо двойника
function doubleFace(t: number): CS {
  const u = t - 55;
  const s = stand(0.0, 0.17);
  const fold = { L: { t: [-0.07, 1.23, 0.17] as V3, fwd: [-1, 0.1, 0.1] as V3, back: [0, 0.6, 0.8] as V3, pole: [0.9, -0.5, -0.2] as V3 } };
  s.armL = fold.L;
  s.head = [-2, 0, keys(u, [[0, 17], [2.5, 9], [6, 4]])]; s.neck = [0, 0, 3];
  // правая рука прижимается ладонью к стеклу (изнутри)
  const k = smooth(seg(t, EV.palm - 1.2, EV.palm));
  const palmC: V3 = [0.155, 1.6, 0.013];
  const wr: V3 = [palmC[0], palmC[1] - 0.085, palmC[2] + 0.025];
  const foldR = { t: [0.08, 1.27, 0.19] as V3, fwd: [1, 0.15, 0.1] as V3, back: [0, 0.6, 0.8] as V3, pole: [-0.9, -0.5, -0.2] as V3 };
  const pressed = { t: toLocal(s, wr), fwd: dirLocal(s, [0.05, 1, 0]), back: dirLocal(s, [0, 0, 1]), pole: [-0.8, -0.6, 0.2] as V3 };
  s.armR = { t: lerpV(foldR.t, pressed.t, k), fwd: lerpV(foldR.fwd, pressed.fwd, k), back: lerpV(foldR.back, pressed.back, k), pole: lerpV(foldR.pole, pressed.pole, k) };
  s.fingR = mixHand(HANDS.grip, HANDS.flat, k); s.fingL = mixHand(HANDS.relaxed, HANDS.grip, 0.5);
  // ухмылка — механически, ступеньками
  const g = seg(t, EV.grin, EV.grin + 3.2);
  const gs = Math.floor(g * 9) / 9 * 0.8 + g * 0.2;
  s.morph.grin = smooth(gs) * 1.0;
  s.gaze = [0.0, 1.66, 2.5];
  breathe(s, t, 0.25);
  return s;
}

// ------------------------------------------------------------------ сцена 5: удар
const WRENCH_ON_BENCH: V3 = [0.92, BENCH.y + 0.0105, 0.5];
function heroAttack(t: number): CS {
  const u = t - 66;
  // позиция корня: отскок назад, шаг к верстаку, два шага к зеркалу
  const px = keys(u, [[0, 0.02], [0.6, 0.02], [1.2, 0.36], [2.6, 0.36], [3.4, 0.24], [4.3, 0.12]]);
  const pz = keys(u, [[0, 0.72], [0.55, 1.18], [1.0, 1.18], [1.5, 0.98], [2.6, 0.98], [3.4, 0.72], [4.3, 0.46]], inOut);
  const yaw = keys(u, [[0, 180], [1.0, 182], [1.4, 228], [2.2, 228], [2.7, 186], [4.0, 182]]);
  const s = stand(px, pz, yaw);
  // присед при приземлении
  s.hipsOff = [0, -0.1 * Math.exp(-Math.pow((u - 0.6) / 0.22, 2)) - 0.04 * Math.exp(-Math.pow((u - 2.0) / 0.4, 2)), 0];
  s.spine = [keys(u, [[0, 0], [0.3, -10], [0.7, 8], [1.6, 18], [2.1, 10], [2.6, -4], [4.4, 4], [5.2, -12], [6.3, -14], [6.95, 22], [7, 22]]), 0, 0];
  s.chest = [keys(u, [[0, 0], [5.2, -8], [6.3, -10], [6.95, 14]]), keys(u, [[5, 0], [6.3, 12], [6.95, -14]]), 0];
  s.head = [keys(u, [[0, 0], [0.3, -12], [1.0, -4], [1.6, 10], [2.2, -6], [2.6, -2], [6.95, 4]]), 0, 0];
  // ноги: отскок — шаги
  const stepL = keys(u, [[0, 0], [2.9, 0], [3.3, 1], [4.3, 1]]);
  void stepL;
  // руки
  const y = BENCH.y;
  const grabT: V3 = [WRENCH_ON_BENCH[0] - 0.1, y + 0.08, WRENCH_ON_BENCH[2] + 0.02];
  if (u < 1.05) {
    // защитная поза: руки вверх
    const k = smooth(seg(u, 0.05, 0.4)) * (1 - smooth(seg(u, 0.7, 1.05)));
    s.armL = { t: lerpV(restArm("L").t, [0.2, 1.42, 0.25], k), fwd: lerpV(restArm("L").fwd, [0, 1, 0.3], k), back: lerpV(restArm("L").back, [0, 0, -1], k), pole: [0.6, -0.7, -0.3] };
    s.armR = { t: lerpV(restArm("R").t, [-0.2, 1.42, 0.25], k), fwd: lerpV(restArm("R").fwd, [0, 1, 0.3], k), back: lerpV(restArm("R").back, [0, 0, -1], k), pole: [-0.6, -0.7, -0.3] };
    s.fingL = mixHand(HANDS.relaxed, HANDS.flat, k); s.fingR = s.fingL;
  } else if (u < 2.6) {
    const reach = smooth(seg(u, 1.2, 1.75)) * (1 - smooth(seg(u, 2.0, 2.6)));
    const wr = toLocal(s, grabT);
    const carry: V3 = [-0.24, 1.08, 0.22];
    const tt = u < 2.0 ? lerpV(restArm("R").t, wr, reach) : lerpV(carry, wr, reach);
    s.armR = { t: tt, fwd: lerpV([0, -1, 0.3], dirLocal(s, [0, -0.4, -1]), reach), back: lerpV([-1, 0, 0], dirLocal(s, [0.3, 1, 0]), reach), pole: [-0.7, -0.7, -0.2] };
    s.fingR = u > 1.75 ? HANDS.grip : mixHand(HANDS.relaxed, HANDS.flat, reach);
  } else {
    // шаги с ключом, замах над головой, удар
    const up = smooth(seg(u, 4.4, 5.6));
    const sw = inCubic(seg(u, 6.3, 6.95));
    const carry: V3 = [-0.24, 1.08, 0.22];
    const over: V3 = [-0.14, 1.98, -0.06];
    const hit: V3 = toLocal(s, [0.25, 1.43, 0.24]);
    const t1 = lerpV(carry, over, up);
    const tr = sw > 0 ? lerpV(over, hit, sw) : t1;
    tr[0] += shake(t, 2, 1.4) * 0.006 * (u > 5.4 && u < 6.3 ? 1 : 0); tr[1] += shake(t, 7, 1.4) * 0.006 * (u > 5.4 && u < 6.3 ? 1 : 0);
    s.armR = { t: tr, fwd: lerpV([0, 0.2, 1], [0, 1, 0.2], up), back: lerpV([-1, 0, 0], [-1, 0, -0.2], up), pole: lerpV([-0.7, -0.7, -0.2], [-0.8, 0.3, -0.4], up) };
    if (sw > 0) s.armR.fwd = lerpV([0, 1, 0.2], dirLocal(s, [0.1, 0.35, -1]), sw);
    s.fingR = HANDS.grip;
    // левая — к ключу (двумя руками) при замахе
    s.armL = { t: lerpV(restArm("L").t, [0.1, 1.2, 0.3], up * (1 - sw)), fwd: restArm("L").fwd, back: restArm("L").back, pole: restArm("L").pole };
  }
  // крик
  s.morph.jaw = keys(u, [[1.9, 0], [2.15, 0.85], [2.9, 0.75], [3.3, 0.1], [6.5, 0.2], [6.95, 0.7]]);
  s.morph.wide = keys(u, [[0, 0.4], [0.2, 1], [7, 1]]);
  s.gaze = [0, 1.55, -1.5];
  return s;
}
// ключ в руке: ось ключа = направление большого пальца
function wrenchInHand(E: Engine) {
  const c = E.hero; c.root.updateMatrixWorld(true);
  const hb = c.bones["hand.R"]; const M = c.hf.R.elements;
  const q = new THREE.Quaternion(); hb.getWorldQuaternion(q);
  const X = new THREE.Vector3(M[0], M[1], M[2]).applyQuaternion(q), Y = new THREE.Vector3(M[3], M[4], M[5]).applyQuaternion(q), Z = new THREE.Vector3(M[6], M[7], M[8]).applyQuaternion(q);
  const wp = new THREE.Vector3(); hb.getWorldPosition(wp);
  const grip = wp.clone().addScaledVector(X, 0.075).addScaledVector(Y, -0.022);
  const dir = Z.clone().normalize();
  const yv = X.clone().sub(dir.clone().multiplyScalar(X.dot(dir))).normalize();
  const zv = dir.clone().cross(yv);
  const Rm = new THREE.Matrix4().makeBasis(dir, yv, zv).setPosition(grip.clone().addScaledVector(dir, 0.19));
  E.wrench.matrixAutoUpdate = false; E.wrench.matrix.copy(Rm); E.wrench.matrixWorldNeedsUpdate = true;
  return { grip, dir, head: grip.clone().addScaledVector(dir, 0.36) };
}

// ------------------------------------------------------------------ сцена 5b: жидкое стекло (слоумо)
const IMPACT: V3 = [0.0, 1.35, 0.0];
const tauOf = (u: number) => (u < 4.5 ? u * 0.22 : 0.99 + (u - 4.5) * 0.3);
function heroSink(tau: number, t: number): CS {
  const s = stand(0.13, 0.46, 182);
  s.spine = [18, 0, 0]; s.chest = [12, -12, 0]; s.head = [6, 0, 0];
  // кисть: от удара тонет к стеклу, потом утягивается внутрь
  const sinkK = smooth(clamp01(tau / 0.6));
  const pull = smooth(clamp01((tau - 0.8) / 1.1));
  const w: V3 = [0.26 - 0.18 * sinkK - 0.03 * pull, 1.43 - 0.08 * sinkK - 0.02 * pull, 0.24 - 0.14 * sinkK - 0.2 * pull];
  armW(s, "R", w, nrm([-0.3, 0.3, -1]), nrm([0, 1, 0.2]), [-0.8, 0.2, -0.4]);
  s.fingR = HANDS.grip;
  s.armL = { t: [0.26, 1.0, -0.05], fwd: [0.1, -1, 0.1], back: [1, 0, 0], pole: [0.7, -0.6, -0.4] };
  s.fingL = HANDS.relaxed;
  s.morph.wide = 1; s.morph.jaw = 0.8;
  s.spine[0] += 8 * pull; s.chest[0] += 6 * pull;
  void t;
  return s;
}

// ------------------------------------------------------------------ сцена 6: подмена
function imposter(t: number): CS {
  const u = t - 81;
  const s = stand(0.02, 0.74, 172);
  // поправляет рукава: левая тянет правый манжет вниз
  const sl = smooth(seg(u, 0.7, 1.4)) * (1 - smooth(seg(u, 2.0, 2.5)));
  const pull = smooth(seg(u, 1.4, 2.0));
  s.armR = { t: lerpV(restArm("R").t, [-0.05, 1.05, 0.28], sl), fwd: lerpV(restArm("R").fwd, [1, 0.1, 0.2], sl), back: lerpV(restArm("R").back, [0, 1, 0], sl), pole: [-0.7, -0.6, -0.3] };
  const cuffR: V3 = [-0.05 + 0.08, 1.05, 0.30];
  s.armL = { t: lerpV(restArm("L").t, lerpV([0.0, 1.12, 0.3], cuffR, pull), sl), fwd: lerpV(restArm("L").fwd, [-1, -0.2, 0], sl), back: lerpV(restArm("L").back, [0, 1, 0.3], sl), pole: [0.7, -0.6, -0.3] };
  s.fingL = mixHand(HANDS.relaxed, HANDS.grip, sl);
  // поправляет волосы
  const hk = smooth(seg(u, 2.1, 2.7)) * (1 - smooth(seg(u, 3.3, 4.0)));
  if (hk > 0) {
    const hair: V3 = [-0.06 + 0.04 * Math.sin((u - 2.5) * 5) * (u > 2.6 ? 1 : 0), 1.86, 0.05];
    s.armR = { t: lerpV(s.armR.t, hair, hk), fwd: lerpV(s.armR.fwd, [0.6, 0.5, 0.6], hk), back: lerpV(s.armR.back, [-0.3, 0.8, -0.5], hk), pole: [-0.9, 0.0, -0.4] };
    s.fingR = mixHand(HANDS.relaxed, HANDS.claw, hk * 0.6);
  }
  s.head = [keys(u, [[0, 2], [1.0, 10], [2.2, 6], [3.0, -4], [4.3, 0]]), 0, 0];
  s.gaze = [0, 1.6, -1];
  return s;
}
function imposterTurn(t: number): CS {
  const u = t - 85.2;
  const s = stand(0.02, 0.70, 180);
  const k = smoother(seg(u, 0.1, 0.95));
  s.head = [keys(u, [[0, 0], [0.5, -3], [1, 0]]), -78 * k, 0]; s.neck = [0, -14 * k, 0]; s.chest = [0, -10 * k, 0];
  s.gaze = [0.6, 1.69, 0.70];
  if (u < 0.6) s.gaze = [0.02 + (0.6 - 0.02) * k, 1.69, 0.2 + 0.5 * k];
  // «Ты следующий» — по огибающей шёпота (sound/sfx.py → lipsync.json)
  const li = Math.round((t - (LIP as any).start) * 60);
  const fr = (LIP as any).frames as number[][];
  if (li >= 0 && li < fr.length) { s.morph.jaw = fr[li][1]; s.morph.pucker = fr[li][2]; }
  return s;
}

// ================================================================== главный режиссёр
export function direct(E: Engine, f: number): Hud {
  const S = shotAt(f);
  const t = S.t, u = S.u;
  const P = E.P; P.seed = f;
  E.world.update(t);
  FOLDER_REF = E.folder;
  const hud: Hud = { shot: S.id, t, u };
  const mu = E.mirror.mat.uniforms; mu.uT.value = t;
  E.hero.root.visible = false; E.double.root.visible = false; E.wrench.visible = false;
  // постоянная грязь стекла до полировки, чистые области — после
  mu.uDirt.value = 0.82;
  strokes(E, t);
  // ключ лежит на верстаке до сцены 5
  if (t < EV.grab) { E.wrench.visible = true; E.wrench.position.set(...WRENCH_ON_BENCH); E.wrench.rotation.set(0, 0.35, 0); }
  // тряпка на верстаке после броска
  if (t >= EV.ragLand && t < 81) { E.ragBench.visible = true; E.ragBench.position.set(...RAG_LAND); E.ragBench.rotation.set(0, 2.5, 0); }
  P.volPos = [LAMP.pos.x, LAMP.pos.y - 0.02, LAMP.pos.z];

  switch (S.id) {
    case "s1a": {
      const k = smooth(u / 6);
      const cp: V3 = [0.05 - 0.05 * k + wob(t * 0.3, 1) * 0.01, 1.18 + wob(t * 0.25, 2) * 0.008, 3.35 - 0.42 * k];
      cam(E, cp, [0.0, 1.13, 0], 54);
      P.focus = cp[2] - 0.05; P.aperture = 7; P.edgeBlur = 9; P.vol = 0.09; P.grain = 0.06; P.exposure = 1.05;
      P.black = 1 - smooth(seg(u, 0, 1.2));
      hud.plate = clamp01((t - EV.plate) / 0.5) * (1 - clamp01((t - 5.5) / 0.4));
      break;
    }
    case "s1b": {
      E.hero.root.visible = true; E.double.root.visible = true;
      const hs = heroPolish(t); apply(E.hero, hs); apply(E.double, hs);
      E.rag.visible = true; E.ragD.visible = true;
      attach(E.rag, E.hero, "R", new THREE.Vector3(0.07, -0.026, 0.0), new THREE.Euler(0, 0, 0), 0.72);
      attach(E.ragD, E.double, "R", new THREE.Vector3(0.07, -0.026, 0.0), new THREE.Euler(0, 0, 0), 0.72);
      const g = ragOnGlass(t);
      const k = smooth(u / 5);
      // вдоль стекла под скользящим углом: рука с тряпкой и её отражение встречаются у поверхности
      cam(E, [-0.40 + 0.03 * k + wob(t * 0.5, 4) * 0.003, 1.36 - 0.01 * k + wob(t * 0.4, 5) * 0.002, 0.06 + 0.01 * k], [0.03 + 0.5 * g[0], 1.31, 0.0], 40);
      P.focus = Math.hypot(-0.40 + 0.03 * k - g[0], 0.06); mu.uDirt.value = 0.62; P.aperture = 16; P.maxCoc = 26; P.edgeBlur = 6; P.vol = 0.03; P.exposure = 1.1;
      break;
    }
    case "s1c": {
      E.hero.root.visible = true; E.double.root.visible = true;
      const hs = heroToss(t); apply(E.hero, hs);
      const ds = doubleToss(t); apply(E.double, ds);
      // тряпка: в руке → полёт на верстак
      for (const [obj, ch, lag] of [[E.rag, E.hero, 0], [E.ragD, E.double, 0.48]] as const) {
        const r = ragPos(t, lag);
        obj.visible = true;
        if (r.held) attach(obj, ch, "R", new THREE.Vector3(0.072, -0.03, 0.0), new THREE.Euler(0, 0, 0));
        else { obj.matrixAutoUpdate = true; obj.position.set(...r.p); obj.rotation.set(0.3, r.rot, 0.2); }
      }
      if (t >= EV.ragLand) E.rag.visible = false;
      if (t >= EV.ragLand + 0.48) E.ragD.visible = false;
      if (t < EV.ragLand) E.ragBench.visible = false;
      const pushin = smooth(u / 5);
      cam(E, [0.42 - 0.02 * pushin, 1.72, 1.15 - 0.06 * pushin], [0.02, 1.66, -0.5], 40);
      P.focus = 1.82 - 0.06 * pushin; P.aperture = 13; P.maxCoc = 24; P.edgeBlur = 6; P.vol = 0.05;
      const fr = projMirror(E, new THREE.Vector3(-GLASS.x + 0.02, 1.5, 0));
      hud.desync = { a: clamp01((t - EV.desyncHud) / 0.3), x: 590, y: 470, val: 0.48, warn: 0 };
      void fr;
      break;
    }
    case "s2a": {
      E.hero.root.visible = true; E.double.root.visible = true;
      const hs = heroPhone(t); apply(E.hero, hs); apply(E.double, hs);
      const ph = phonePose(t);
      E.phone.visible = true; E.phoneM.visible = true;
      placePhone(E.phone, ph); placePhone(E.phoneM, ph);
      const on = smooth(seg(t, EV.phoneOn, EV.phoneOn + 0.25));
      E.phoneScreenMat.uniforms.uOn.value = on; E.usePhoneFeed = true;
      E.phoneScreenMat.uniforms.uT.value = t;
      (E.phoneM as any).screen.material.color.setRGB(0.3 * on + 0.01, 0.34 * on + 0.01, 0.4 * on + 0.012);
      const k = smooth(u / 8);
      cam(E, [0.3 - 0.01 * k + wob(t * 0.6, 3) * 0.004, 1.72 + wob(t * 0.5, 6) * 0.003, 1.0 - 0.03 * k], [0.04, 1.5, -0.2], 46);
      // экран телефона на кадре: углы
      E.scene.updateMatrixWorld(true); E.phone.updateMatrixWorld(true);
      const hw = 0.0675 / 2, hh = 0.143 / 2;
      const corners = [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => E.project(new THREE.Vector3(x, y, 0.0045).applyMatrix4(E.phone.matrixWorld)));
      // лента: прямоугольник кадра «за телефоном», шире в 1.7 раза
      const uvs = [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => projUV(E, new THREE.Vector3(x, y, 0).applyMatrix4(E.phone.matrixWorld)));
      const cx = uvs.reduce((a, b) => a + b[0], 0) / 4, cy = uvs.reduce((a, b) => a + b[1], 0) / 4;
      const sw = Math.abs(uvs[1][0] - uvs[0][0]) * 1.7, sh = Math.abs(uvs[0][1] - uvs[3][1]) * 1.7;
      E.double.root.updateMatrixWorld(true);
      const fc = projUV(E, eyeW(E, "double").setZ(-eyeW(E, "double").z));
      const rect = [fc[0] - sw / 2, fc[1] - sh * 0.62, sw, sh];
      void cx; void cy;
      E.phoneScreenMat.uniforms.uRect.value.set(rect[0], rect[1], rect[2], rect[3]);
      // точки лица отражения → в координаты экрана телефона
      const fp = facePts(E, "double", true);
      const mapped = fp.map((p) => {
        const uvx = p.x / E.W, uvy = 1 - p.y / E.H;
        const a = (uvx - rect[0]) / rect[2], b = (uvy - rect[1]) / rect[3];
        // билинейно по углам (0: верх-лево, 1: верх-право, 2: низ-право, 3: низ-лево)
        const top = { x: lerp(corners[0].x, corners[1].x, a), y: lerp(corners[0].y, corners[1].y, a) };
        const bot = { x: lerp(corners[3].x, corners[2].x, a), y: lerp(corners[3].y, corners[2].y, a) };
        return { x: lerp(bot.x, top.x, b), y: lerp(bot.y, top.y, b), in: a > 0.02 && a < 0.98 && b > 0.05 && b < 0.95 };
      });
      hud.phone = { corners, on, track: clamp01((t - EV.track) / 0.6), label: clamp01((t - EV.trackLabel) / 0.4), pts: mapped, edges: FACE_EDGES };
      P.focus = 0.52; P.aperture = 8; P.maxCoc = 20; P.edgeBlur = 7; P.vol = 0.04;
      break;
    }
    case "s2b": {
      E.double.root.visible = true; E.phoneM.visible = true;
      const ds = heroPhone(t); apply(E.double, ds);
      const ph = phonePose(t); placePhone(E.phoneM, ph);
      (E.phoneM as any).screen.material.color.setRGB(0.3, 0.34, 0.4);
      // камера = камера телефона (сзади)
      const n = v3(ph.n), up = v3(ph.up);
      const right = up.clone().cross(n).normalize();
      const lensP = v3(ph.c).addScaledVector(up, 0.047).addScaledVector(right, -0.012).addScaledVector(n, -0.009);
      const look = lensP.clone().addScaledVector(n, -1); look.y += 0.24;
      const sh1 = (t > EV.redFrame ? 1 : 0) * 0.002;
      cam(E, [lensP.x + shake(t, 1, 0.6) * sh1, lensP.y + shake(t, 2, 0.6) * sh1, lensP.z], [look.x, look.y + 0.05, look.z], 62, keys(u, [[0, 2], [9, -1]]));
      E.entity.visible = true; E.entity.position.set(...ENTITY_POS); E.entity.rotation.set(0, Math.PI + 0.15, 0);
      // фокус: лицо → тёмный угол
      const fpull = smooth(seg(t, EV.focusPull, EV.focusPull + 0.6));
      P.focus = lerp(1.05, 3.9, fpull); P.aperture = 11; P.maxCoc = 22; P.edgeBlur = 4;
      // силуэт проступает сквозь шум
      const sil = seg(t, EV.silhouette, EV.silhouette + 0.3) * (1 - seg(t, EV.silhouette + 1.0, EV.silhouette + 1.3));
      const flick = hash(f * 0.37) > 0.35 ? 1 : 0.15;
      E.entityRim.value = sil * flick * 1.2;
      E.entity.visible = sil > 0.01 || hash(f * 1.7) > 0.93 && t > EV.redFrame;
      if (!E.entity.visible) E.entityRim.value = 0;
      P.grain = 0.06 + 0.12 * sil + 0.04 * seg(t, EV.redFrame, EV.redFrame + 0.3);
      // марево внутри стекла вокруг сущности
      const headV = new THREE.Vector3(ENTITY_POS[0], 2.35, -ENTITY_POS[2]);
      const ray = headV.clone().sub(E.cam.position); const kk = -E.cam.position.z / ray.z; const hit = E.cam.position.clone().addScaledVector(ray, kk);
      mu.uHaze.value.set(hit.x, hit.y - GC, 0.12, 0.2); mu.uHazeAmt.value = seg(t, EV.redFrame, EV.redFrame + 0.5) * 0.8;
      // красная рамка вокруг пустоты (проекция области 1.9–2.7 м)
      const bb = [[-0.3, 1.85], [0.3, 1.85], [0.3, 2.75], [-0.3, 2.75]].map(([dx, y]) => projMirror(E, new THREE.Vector3(ENTITY_POS[0] + dx, y, ENTITY_POS[2])));
      const xs = bb.map((p) => p.x), ys = bb.map((p) => p.y);
      const face = facePts(E, "double", true);
      const fx = face.map((p) => p.x), fy = face.map((p) => p.y);
      hud.phoneFull = {
        faceBox: [Math.min(...fx), Math.min(...fy), Math.max(...fx), Math.max(...fy)], pts: face, edges: FACE_EDGES,
        redBox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
        green: 1 - seg(t, EV.focusPull - 0.2, EV.focusPull + 0.3), flicker: t > EV.focusPull - 0.3 && t < EV.redFrame + 0.4 ? (hash(f) > 0.5 ? 1 : 0) : 0,
        red: seg(t, EV.redFrame, EV.redFrame + 0.15), err: seg(t, EV.errorWin, EV.errorWin + 0.25), glitch: 0,
      };
      const gl = (t > EV.errorWin - 0.1 && t < EV.errorWin + 0.45) || (t > EV.silhouette - 0.1 && t < EV.silhouette + 0.2) || (hash(f * 3.1) > 0.97 && t > EV.redFrame);
      P.glitch = gl ? 0.6 + 0.4 * hash(f) : 0;
      hud.phoneFull.glitch = P.glitch;
      P.vol = 0.03; P.chroma = 2.4; P.exposure = 1.55;
      P.gain = [1.0, 1.02, 1.04];
      E.world.moon.intensity = 1.0;
      break;
    }
    case "s3a":
    case "s3b": {
      E.hero.root.visible = true;
      E.folder.group.visible = true;
      // папка: въезжает справа, завязки, крышка (до позы — палец ищет строки на листе)
      const fin = smooth(seg(t, 34.0, 34.65));
      E.folder.group.position.set(lerp(1.95, DESK.x, fin), BENCH.y + 0.001, DESK.z + 0.02);
      E.folder.group.rotation.set(0, Math.PI / 2 * 0 + lerp(0.25, 0.02, fin), 0);
      E.folder.group.updateMatrixWorld(true);
      const hs = heroDesk(t, S.id === "s3a" ? "a" : "b"); apply(E.hero, hs);
      E.hero.head.visible = false; E.hero.hair.visible = false;
      for (const e of E.hero.eyes) e.visible = false;
      const tieK = smooth(seg(t, EV.ties, EV.ties + 1.4));
      E.folder.ties.forEach((ti, i) => { ti.rotation.set(0, (i ? 1 : -1) * tieK * 1.1, 0); ti.position.x = E.folder.W / 2 - 0.01 + tieK * 0.03; });
      const open = inOut(seg(t, EV.coverOpen, EV.coverOpen + 1.4));
      E.folder.coverPivot.rotation.z = open * Math.PI * 0.985;
      // инструменты сдвинуты
      const sweep = smooth(seg(t, EV.toolsSweep, EV.toolsSweep + 0.5));
      E.world.benchTools.position.set(-0.32 * sweep, 0, -0.06 * sweep);
      const p = S.id === "s3b" ? seg(t, EV.diagram, EV.diagram + 4.2) : 0;
      const under = S.id === "s3b" ? seg(t, EV.finger, 47.6) : 0;
      if (S.id === "s3b" || open > 0.5) E.folder.drawPaper(p, t, under, S.id === "s3b" ? 0.5 * seg(t, 40.5, 42) : 0);
      (E.folder.paper.material as THREE.MeshPhysicalMaterial).emissive.setRGB(0.025 * p, 0.025 * p, 0.025 * p);
      if (S.id === "s3a") {
        const k = smooth(u / 7);
        cam(E, [DESK.x + wob(t * 0.4, 1) * 0.004, 1.58 - 0.08 * k, DESK.z + 0.03], [DESK.x, BENCH.y, DESK.z + 0.02], 48, 0);
        E.cam.up.set(0, 0, -1); E.cam.lookAt(DESK.x, BENCH.y, DESK.z + 0.02); E.cam.updateMatrixWorld(true);
        P.focus = 1.58 - 0.08 * k - BENCH.y; P.aperture = 5; P.edgeBlur = 7;
      } else {
        // наезд на схему, потом на строку
        const k1 = smoother(seg(u, 0, 3.8)), k2 = smoother(seg(u, 3.6, 5.2));
        const c1 = E.folder.paperToWorld(768, 820), c2 = E.folder.paperToWorld(768, 1700);
        const c = c1.clone().lerp(c2, k2);
        const h = lerp(0.42, 0.25, k1) + 0.09 * k2;
        cam(E, [c.x + 0.01, c.y + h, c.z + 0.035], [c.x, c.y, c.z], 46);
        E.cam.up.set(0, 0, -1); E.cam.position.set(c.x + 0.005, c.y + h, c.z + 0.03); E.cam.lookAt(c.x, c.y, c.z); E.cam.updateMatrixWorld(true);
        E.world.benchTools.children[4].visible = false; // киянка не лезет в макро
        P.focus = h; P.aperture = 9; P.edgeBlur = 9; P.maxCoc = 22; P.exposure = 0.48; P.bloom = 0.25; P.bloomThreshold = 1.6;
        E.world.key.intensity = 3.0; E.world.key.color.set("#FFCC94");
        hud.quote = { a: seg(t, EV.finger - 0.3, EV.finger + 0.2), k: under };
      }
      P.vol = 0.0; P.exposure = 1.1;
      E.world.key.intensity = 7; E.world.key.position.set(1.25, 2.05, 0.55); E.world.key.target.position.set(1.45, 0.9, 0.1);
      break;
    }
    case "s4a": {
      E.hero.root.visible = true; E.double.root.visible = true;
      apply(E.hero, heroStill(t));
      apply(E.double, doubleWalk(t));
      const k = smooth(u / 7);
      cam(E, [0.34 - 0.04 * k + wob(t * 0.4, 1) * 0.004, 1.64 + wob(t * 0.35, 2) * 0.003, 1.95 - 0.12 * k], [-0.08, 1.42 - 0.04 * k, 0], 33);
      const dz = E.double.root.position.z;
      P.focus = Math.hypot(0.34, 0.0, 1.95 - 0.12 * k + dz); P.aperture = 10; P.edgeBlur = 7; P.vol = 0.05;
      hud.desync = { a: 1, x: 590, y: 400, val: lerp(0.48, 3.4, seg(u, 0.4, 7)), warn: seg(u, 3, 7) };
      mu.uGlow.value.setRGB(0, 0.012 * seg(u, 3, 7), 0.014 * seg(u, 3, 7));
      break;
    }
    case "s4b": {
      E.double.root.visible = true;
      apply(E.double, doubleFace(t));
      E.double.teeth.visible = true;
      E.double.U.uMetal.value = smooth(seg(t, EV.metal, EV.metal + 1.6));
      E.double.U.uWet.value = 0.5 * smooth(seg(t, EV.metal, EV.metal + 1.6));
      E.double.EU.uMetal.value = smooth(seg(t, EV.eyes, EV.eyes + 1.2)); E.double.EU.uSil.value = smooth(seg(t, EV.eyes + 0.6, EV.eyes + 1.5));
      const k = smooth(u / 11);
      cam(E, [0.025 + wob(t * 0.3, 1) * 0.003, 1.695 + wob(t * 0.3, 2) * 0.002, 0.45 - 0.07 * k], [0.0, 1.665, -0.3], 30);
      P.focus = 0.45 - 0.07 * k + 0.075; P.aperture = 13; P.maxCoc = 22; P.edgeBlur = 8; P.vol = 0.0;
      const crit = seg(t, EV.critical, EV.critical + 0.1);
      hud.desync = { a: 1, x: 140, y: 1500, val: lerp(3.4, 5.0, smooth(seg(t, 55, EV.critical))), warn: 1, crit, blink: crit > 0 ? (Math.floor((t - EV.critical) * 4) % 2) : 0 };
      mu.uGlow.value.setRGB(0.02 * crit * (0.6 + 0.4 * Math.sin(t * 9)), 0.0, 0.004 * crit);
      P.gain = [1.0 + 0.06 * crit, 1.0, 1.0];
      E.world.rim.intensity = 6;
      E.world.mkey.color.set("#C9D8E6"); E.world.mkey.intensity = 3.5; E.world.mkey.position.set(0.35, 1.25, -0.8);
      E.world.mfill.intensity = 1.2;
      break;
    }
    case "s5a": {
      E.hero.root.visible = true; E.double.root.visible = true;
      const hs = heroAttack(t); apply(E.hero, hs);
      const ds = doubleFace(Math.min(t - 66 + EV.palm + 1.5, 64.5)); ds.morph.grin = 1; apply(E.double, ds);
      E.double.teeth.visible = true; E.double.U.uMetal.value = 1; E.double.EU.uMetal.value = 1; E.double.EU.uSil.value = 1;
      E.wrench.visible = true;
      if (t < EV.grab + 0.35) { E.wrench.position.set(...WRENCH_ON_BENCH); E.wrench.rotation.set(0, 0.35, 0); }
      else wrenchInHand(E);
      const act = seg(u, 0, 0.3) * (1 - seg(u, 1.0, 1.6)) + seg(u, 2.6, 3.2) + 1.5 * seg(u, 6.2, 6.95);
      const a = 0.6 + 1.6 * clamp01(act);
      const base: V3 = [0.98, 1.47, 2.2];
      const cp: V3 = [base[0] + shake(t, 1, 0.5) * 0.012 * a, base[1] + shake(t, 2, 0.5) * 0.01 * a, base[2] + shake(t, 3, 0.4) * 0.01 * a - 0.3 * smooth(seg(u, 3, 7))];
      const at: V3 = keysV(u, [[0, [0.05, 1.3, 0.5]], [1.0, [0.2, 1.2, 0.8]], [2.2, [0.45, 1.2, 0.7]], [3.2, [0.25, 1.35, 0.5]], [7, [0.1, 1.45, 0.25]]]);
      cam(E, cp, [at[0] + shake(t, 4, 0.7) * 0.02 * a, at[1] + shake(t, 5, 0.7) * 0.02 * a, at[2]], 46, shake(t, 6, 0.5) * 1.2 * a);
      P.focus = E.cam.position.distanceTo(E.hero.root.position.clone().setY(1.4)); P.aperture = 7; P.edgeBlur = 8; P.vol = 0.05;
      E.world.rim.intensity = 7;
      if (t > EV.impact - 0.04) P.flash = 0.06;
      break;
    }
    case "s5b": {
      const tau = tauOf(u);
      E.hero.root.visible = true; E.double.root.visible = false;
      E.heroClip.constant = 0;
      const hs = heroSink(tau, t); apply(E.hero, hs);
      E.wrench.visible = true; wrenchInHand(E);
      // жидкость
      mu.uRipple.value.set(IMPACT[0], IMPACT[1] - GC, tau, 1.0);
      const clawT = tau - 0.45;
      mu.uRipple2.value.set(0.07, 1.27 - GC, Math.max(0, clawT), clawT > 0 ? 0.8 : 0);
      mu.uLiquid.value = 1;
      // рука из стекла хватает запястье
      E.claw.root.visible = clawT > -0.02;
      E.hero.root.updateMatrixWorld(true);
      const wr = E.hero.worldPos("hand.R");
      const entry = new THREE.Vector3(0.07, 1.27, 0.0);
      const dir = wr.clone().sub(entry).normalize();
      const reachK = outCubic(clamp01(clawT / 0.17));
      const tip = entry.clone().addScaledVector(dir, -0.06).lerp(wr.clone().addScaledVector(dir, -0.04), reachK);
      E.claw.root.position.copy(tip);
      E.claw.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      E.claw.root.rotateZ(Math.PI * 0.55);
      E.claw.grip(smooth(clamp01((clawT - 0.15) / 0.14)), 10 * (1 - reachK));
      E.claw.U.uWet.value = 1;
      E.drops.mesh.visible = true; E.drops.smoke.visible = true; E.drops.update(tau, v3(IMPACT).add(new THREE.Vector3(0, 0, 0.02)), 1);
      const k = smooth(u / 8);
      const back = smooth(seg(u, 4.5, 8));
      cam(E, [-0.24 - 0.08 * back, 1.42 + 0.03 * back, 0.36 + 0.2 * back], [0.04, 1.33, 0.02], 36 + 6 * back);
      P.focus = E.cam.position.distanceTo(new THREE.Vector3(0.05, 1.33, 0.06)); P.aperture = 12; P.maxCoc = 22; P.edgeBlur = 8; P.vol = 0.02;
      mu.uGlow.value.setRGB(0.0, 0.01 * seg(tau, 0, 0.3), 0.012 * seg(tau, 0, 0.3));
      P.flash = 0.12 * Math.exp(-u * 5);
      P.chroma = 2.0;
      break;
    }
    case "s6a": {
      E.hero.root.visible = true; E.double.root.visible = false;
      apply(E.hero, imposter(t));
      E.wrench.visible = true; E.wrench.matrixAutoUpdate = true; E.wrench.position.set(0.42, 0.0092, 0.92); E.wrench.rotation.set(0, -0.9, Math.PI / 2 * 0); E.wrench.rotation.set(Math.PI / 2, 0, -0.9);
      E.wrench.rotation.set(0, -0.9, 0);
      mu.uPrints.value.set(0.36, 0.02 + 0.075 * smooth(seg(u, 0, 4.5)), 0, 1);
      mu.uDirt.value = 0.82;
      const k = smooth(u / 4.2);
      cam(E, [0.95 + wob(t * 0.2, 1) * 0.003, 1.22, 3.25 - 0.1 * k], [0.08, 1.02, 0.25], 50);
      P.focus = 2.7; P.aperture = 6; P.edgeBlur = 8; P.vol = 0.08;
      break;
    }
    case "s6b": {
      E.hero.root.visible = true;
      apply(E.hero, imposterTurn(t));
      const g = Math.exp(-Math.pow((t - EV.glint) / 0.07, 2));
      E.hero.EU.uGlint.value = g; E.hero.EU.uMetal.value = 0.12 * g;
      const k = smooth(u / 2.6);
      cam(E, [0.6 - 0.04 * k, 1.70, 0.70], [0.0, 1.675, 0.70], 28);
      P.focus = 0.6 - 0.04 * k - 0.07; P.aperture = 11; P.maxCoc = 20; P.edgeBlur = 8; P.vol = 0.0;
      mu.uPrints.value.set(0.36, 0.1, 0, 1);
      if (t >= EV.cut) P.black = 1;
      break;
    }
    case "end": {
      P.black = 1; E.showMirror = false;
      cam(E, [0, 1.2, 3], [0, 1.2, 0], 50);
      hud.title = { a1: seg(t, EV.title1, EV.title1 + 0.25), a2: seg(t, EV.title2, EV.title2 + 0.25), g: hash(f) };
      break;
    }
  }
  if (DBG.focus) P.focus = DBG.focus;
  if (DBG.cam) { cam(E, DBG.cam, DBG.at, DBG.fov ?? E.cam.fov); }
  return hud;
}
