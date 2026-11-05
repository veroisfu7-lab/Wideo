// «Ведро и труба»: вся постановка — чистые функции от кадра (без React/three), её же читает генератор событий для звука.
// Оси: x вправо, y вверх, z к камере. Персонажи плоские в плоскостях z = const.
import T from "./timeline.json";

export type V2 = [number, number];
export type Pose = { pelvis: V2; lean: number; footN: V2; footF: V2; handN: V2; handF: V2; headOff?: V2 };
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const seg = (f: number, a: number, b: number, e: (t: number) => number = inOut) => e(clamp01((f - a) / Math.max(1e-6, b - a)));
export const keys = (f: number, ks: [number, number][], e: (t: number) => number = inOut) => {
  if (f <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (f <= ks[i][0]) { const [f0, v0] = ks[i - 1], [f1, v1] = ks[i]; return lerp(v0, v1, e(clamp01((f - f0) / Math.max(1e-6, f1 - f0)))); }
  return ks[ks.length - 1][1];
};
const LEG_MAX = (0.39 + 0.39) * 0.985;
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const lerp2 = (a: V2, b: V2, t: number): V2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// ------------------------------------------------------------------ декорации
export const TANK = { x0: -2.0, x1: -1.3, z0: -2.2, z1: 0.55, h: 1.15, water: 1.07 };
export const PIPE_Z = 0.3, PIPE_R = 0.065, PIPE_X0 = -1.2;
export const BARREL_B = { x: 1.45, z: PIPE_Z, r: 0.34, h: 0.95 };
export const BARREL_A = { x: 0.3, z: -2.35, r: 0.34, h: 0.95 };
export const PIPE_X1 = 1.11;                                   // у бочки B, дальше колено вверх (стояк) и излив в бочку
export const RISER = { x: 1.15, top: 1.08, spoutX: 1.32 };
export const SECTIONS: V2[] = [[-1.2, -0.43], [-0.41, 0.34], [0.36, PIPE_X1]];
export const PILE = { x: -0.75, z: 1.45 };                     // стопка секций у бака (лежит с начала)
export const Z1 = -1.8, Z2 = 1.15;                            // первый (вёдра) и второй (труба)
export const TURN = T.turn;                                     // все тайминги ниже — в кадрах 14-секундной раскадровки
export const K = T.total / 420;   // (старое) среднее растяжение; карты времени ниже                                 // растяжка до T.total: кадр ролика = K × кадр раскадровки                                     // 244: открыл кран

// ------------------------------------------------------------------ шаги
type Foot = "N" | "F";
export type Step = { f0: number; f1: number; foot: Foot; x0: number; x1: number };
class Walker {
  pos: Record<Foot, number>; steps: Step[] = [];
  constructor(n: number, f: number) { this.pos = { N: n, F: f }; }
  step(f0: number, f1: number, foot: Foot, x1: number) { this.steps.push({ f0, f1, foot, x0: this.pos[foot], x1 }); this.pos[foot] = x1; return this; }
  walk(f0: number, f1: number, x1: number, n: number) {
    const x0 = (this.pos.N + this.pos.F) / 2, dir = Math.sign(x1 - x0) || 1, L = Math.abs(x1 - x0) / n, d = (f1 - f0) / (n + 0.6);
    let back: Foot = (this.pos.N - this.pos.F) * dir < 0 ? "N" : "F";
    for (let k = 0; k < n; k++) {
      const tgt = k === n - 1 ? x1 + dir * 0.12 : x0 + dir * (L * (k + 1) + 0.12);
      this.step(f0 + k * d, f0 + (k + 1) * d, back, tgt); back = back === "N" ? "F" : "N";
    }
    this.step(f0 + n * d, f1, back, x1 - dir * 0.12);
    return this;
  }
}
const footAt = (steps: Step[], init: Record<Foot, number>, foot: Foot, f: number) => {
  let x = init[foot], lift = 0;
  for (const s of steps) {
    if (s.foot !== foot) continue;
    if (f >= s.f1) { x = s.x1; continue; }
    if (f > s.f0) { const t = (f - s.f0) / (s.f1 - s.f0); x = lerp(s.x0, s.x1, 0.35 * inOut(t) + 0.65 * t); lift = 0.075 * Math.sin(Math.PI * t); }
    break;
  }
  return { x, lift };
};
const pelvisFrom = (fN: V2, fF: V2, dx: number): V2 => {
  const x = (fN[0] + fF[0]) / 2 + dx;
  let y = Infinity;
  for (const p of [fN, fF]) y = Math.min(y, p[1] + Math.sqrt(Math.max(0, LEG_MAX * LEG_MAX - (x - p[0]) ** 2)) - 0.004);
  return [x, Math.min(y, 0.9)];
};
const shoulderOf = (pel: V2, lean: number, s: number): V2 => [pel[0] + s * Math.sin(lean) * 0.5, pel[1] + Math.cos(lean) * 0.5];
const pelvisSmooth = (steps: Step[], init: Record<Foot, number>, facing: (f: number) => number, f: number): V2 => {
  let pel: V2 = [0, 0];
  for (let k = -2; k <= 2; k++) { const g = f + k; const a = footAt(steps, init, "N", g), b = footAt(steps, init, "F", g); const p = pelvisFrom([a.x, a.lift], [b.x, b.lift], facing(g) * 0.03); pel = [pel[0] + p[0] / 5, pel[1] + p[1] / 5]; }
  return pel;
};
const pourTilt = (f: number, p: number[]) => seg(f, p[0] + 4, p[0] + 9) * (1 - seg(f, p[1] - 5, p[1]));

// ------------------------------------------------------------------ ПЕРВЫЙ: носит вёдра
export const A = {
  pour1: [36, 52], back1: [55, 75], dip1: [75, 87], laugh: [90, 112], walk2: [114, 138], pour2: [140, 170],
  back2: [173, 214], dip2: [214, 228], rest: [228, 250], walk3: [250, 300], notice: [312, 326], drop: 326, land: 332,
};
const INIT_A: Record<Foot, number> = { N: -0.88, F: -1.12 };
const WA = new Walker(INIT_A.N, INIT_A.F)
  .walk(0, 36, -0.2, 3)
  .walk(A.back1[0], A.back1[1], -0.9, 3)
  .walk(A.walk2[0], A.walk2[1], -0.2, 3)
  .walk(A.back2[0], A.back2[1], -0.9, 3)
  .walk(A.walk3[0], A.walk3[1], -0.5, 2);
export const STEPS_A = WA.steps;
export const facingA = (f: number) => keys(f, [[52, 1], [55, -1], [87, -1], [90, 1], [170, 1], [173, -1], [228, -1], [231, 1]], (t) => t);
export const bucketFullA = (f: number) => (f < 42) || (f >= 82 && f < 146) || (f >= 221 && f < A.land);
export const tiredA = (f: number) => seg(f, 120, 290, (t) => t);
let FR = 0;   // реальный кадр текущего вызова poseA: смех качается в реальном темпе, даже когда раскадровка растянута
const laughBob = (f: number) => (f > A.laugh[0] + 3 && f < A.laugh[1] - 3 ? Math.sin(FR * 0.55) : 0) * (1 - seg(f, A.laugh[1] - 6, A.laugh[1]));

export function poseA(f: number, fr = f * K): { pose: Pose; s: number; bucket: { hand: V2; tilt: number; on: boolean; fall?: number } } {
  const s = facingA(f), sg = s < 0 ? -1 : 1;
  const nA = footAt(STEPS_A, INIT_A, "N", f), fA = footAt(STEPS_A, INIT_A, "F", f);
  const fN: V2 = [nA.x, nA.lift], fF: V2 = [fA.x, fA.lift];
  const pel = pelvisSmooth(STEPS_A, INIT_A, facingA, f);
  FR = fr;
  const tired = seg(fr, 330, 720, (t) => t);   // усталость копится по реальному времени (рейсы повторяются)
  let lean = 0.03 + 0.2 * tired;
  const dipU = Math.max(Math.sin(Math.PI * seg(f, A.dip1[0], A.dip1[1], (t) => t)), Math.sin(Math.PI * seg(f, A.dip2[0], A.dip2[1], (t) => t)));
  lean += 0.42 * dipU;
  const restU = Math.sin(Math.PI * seg(f, A.rest[0], A.rest[1], (t) => t));
  lean += 0.18 * restU;
  const lu = Math.sin(Math.PI * seg(f, A.laugh[0], A.laugh[1], (t) => t));
  lean += -0.16 * Math.min(1, lu * 2) + 0.07 * laughBob(f);
  const slump = seg(f, A.land, A.land + 20);
  const notice = Math.sin(Math.PI * 0.5 * seg(f, A.notice[0], A.notice[0] + 6)) * (1 - seg(f, A.land, A.land + 12));
  lean += 0.22 * slump - 0.22 * notice - 0.2 * tired * notice;
  pel[1] -= 0.06 * dipU + 0.04 * slump + 0.015 * Math.abs(laughBob(f)) + 0.03 * tired;
  const sh = shoulderOf(pel, lean, sg);
  const swing = (fF[0] - fN[0]) * 0.45 * (1 - 0.5 * tired);
  let hN: V2 = [sh[0] + sg * 0.06, sh[1] - 0.56], hF: V2 = [sh[0] - sg * 0.02 + swing * 0.5, sh[1] - 0.54];
  for (const p of [A.pour1, A.pour2]) {
    const u = seg(f, p[0], p[0] + 6) * (1 - seg(f, p[1] - 4, p[1]));
    const rim: V2 = [BARREL_A.x + 0.04, BARREL_A.h + 0.2];
    hN = lerp2(hN, rim, u); hF = lerp2(hF, [rim[0] - 0.1, rim[1] - 0.12], u * 0.8);
  }
  for (const p of [A.dip1, A.dip2]) {
    const u = Math.sin(Math.PI * seg(f, p[0], p[1], (t) => t));
    const into: V2 = [TANK.x1 - 0.2, TANK.h + 0.2 - 0.12 * Math.sin(Math.PI * seg(f, p[0] + 3, p[1] - 3, (t) => t))];
    hN = lerp2(hN, into, Math.min(1, u * 1.6));
  }
  const point: V2 = [sh[0] + 0.55, sh[1] + 0.08 + 0.03 * laughBob(f)];
  hF = lerp2(hF, point, Math.min(1, lu * 2.2));
  hN = lerp2(hN, [sh[0] + sg * 0.03, sh[1] - 0.57], slump); hF = lerp2(hF, [sh[0] - sg * 0.01, sh[1] - 0.57], slump);
  // голова: смех вверх, усталость вниз; заметил — голова вскинута и повёрнута к светящейся бочке (вправо)
  const head: V2 = [0.05 * notice, -0.03 * tired + 0.015 * laughBob(f) + 0.03 * Math.min(1, lu * 2) - 0.05 * slump + 0.075 * notice];
  const tilt = Math.max(pourTilt(f, A.pour1), pourTilt(f, A.pour2));
  return { pose: { pelvis: pel, lean, footN: fN, footF: fF, handN: hN, handF: hF, headOff: head }, s, bucket: { hand: hN, tilt, on: f < A.drop, fall: seg(f, A.drop + 2, A.land, (t) => t * t) } };
}
// HA_FRAMES — в конце файла (реальные кадры)

// ------------------------------------------------------------------ ВТОРОЙ: вёдра → бросил ведро → лопата → секции трубы → кран
export const B = {
  pour: [36, 54], toss: [55, 66], grabShovel: [64, 74], turn: [74, 77],
  digs: [80, 94, 108, 122, 136], digLen: 14, dropShovel: [150, 158], toPile: [158, 166], pick: [166, 176], turn2: [176, 179],
  place: [[180, 190], [200, 210], [220, 230]] as [number, number][], placeHit: 7,
  walk: [[190, 200], [210, 220]] as [number, number][], toValve: [230, 236], kneel: [234, 240], valve: [238, TURN],
  stand: [250, 262], turn3: [264, 267], sit: [268, 282],
};
export const TOSS_LAND = B.toss[0] + 9;
export const DIG_X = (k: number) => 0.82 - 0.38 * k;
export const DIG_HIT = (k: number) => DIG_X(k) - 0.72;
export const PLACE_STAND = [-0.8, -0.03, 0.72];
const INIT_B: Record<Foot, number> = { N: 0.0, F: -0.24 };
const WB = new Walker(INIT_B.N, INIT_B.F).walk(0, 34, 0.82, 3);
for (let k = 1; k < B.digs.length; k++) WB.walk(B.digs[k - 1] + 10, B.digs[k] + 1, DIG_X(k), 1);
WB.walk(B.toPile[0], B.toPile[1], PLACE_STAND[0], 1);
WB.walk(B.walk[0][0], B.walk[0][1], PLACE_STAND[1], 2);
WB.walk(B.walk[1][0], B.walk[1][1], PLACE_STAND[2], 2);
WB.walk(B.toValve[0], B.toValve[1], 0.88, 1);
export const STEPS_B = WB.steps;
export const facingB = (f: number) => keys(f, [[B.turn[0], 1], [B.turn[1], -1], [B.turn2[0], -1], [B.turn2[1], 1], [B.turn3[0], 1], [B.turn3[1], -1]], (t) => t);
export const FLOW_RISER = TURN + 12, FLOW_HIT = TURN + 18;     // вода дошла до стояка / пошла в бочку
export const whiteB = (f: number) => seg(f, FLOW_HIT, FLOW_HIT + 12);
export const trenchLeft = (f: number) => {
  let x = PIPE_X1;
  B.digs.forEach((d, k) => { x = Math.min(x, lerp(x, k === B.digs.length - 1 ? PIPE_X0 - 0.05 : DIG_HIT(k) - 0.12, seg(f, d + 5, d + 9))); });
  return x;
};
export const valveA = (f: number) => Math.PI - seg(f, B.valve[0] + 1, B.valve[1]) * Math.PI / 2;   // рычаг: влево → вверх
export const LEVER = { x: RISER.x, y: 0.3, len: 0.2 };
export const flowX = (f: number) => lerp(PIPE_X0, PIPE_X1, seg(f, TURN, FLOW_RISER, (t) => 1 - Math.pow(1 - t, 1.5)));
export const levelB = (f: number) => keys(f, [[0, 0.78], [44, 0.78], [52, 0.83], [FLOW_HIT, 0.83], [330, 0.93]], (t) => t);
// уровень в бочке первого — по числу вылитых вёдер в реальном времени (рейсы повторяются)
export const levelA = (fr: number) => 0.28 + 0.045 * POURS_A_REAL.reduce((n, r) => n + seg(fr, r, r + 14, (t) => t), 0);

// секции: где каждая (x-центр, y, z, на месте ли)
export type Sec = { c: V2; z: number; placed: boolean };
export function sectionState(k: number, f: number, hands: V2): Sec {
  const L = SECTIONS[k], cx = (L[0] + L[1]) / 2;
  const pileC: V2 = [PILE.x, 0.065 + (k === 2 ? 0.115 : 0)];
  const pileZ = PILE.z + (k === 0 ? -0.07 : k === 1 ? 0.07 : 0);
  const [p0, p1] = B.place[k], hit = p0 + B.placeHit;
  const carry: V2 = [hands[0], hands[1] - 0.02 + 0.07 * (2 - k)];
  if (f >= hit) return { c: [cx, 0.035], z: PIPE_Z, placed: true };
  if (f < B.pick[0] + 5) return { c: pileC, z: pileZ, placed: false };
  const lift = seg(f, B.pick[0] + 5, B.pick[1]);
  let c = lerp2(pileC, carry, lift), z = lerp(pileZ, Z2 + 0.15, lift);
  if (f >= p0) { const u = seg(f, p0, hit, (t) => 0.35 * inOut(t) + 0.65 * t * t); c = lerp2(carry, [cx, 0.035], u); z = lerp(Z2 + 0.15, PIPE_Z, u); }
  return { c, z, placed: false };
}

export const SHOVEL_LOW = 0.82;
type DigKey = [number, number, number, number, number, number, number];
const DIG: DigKey[] = [
  [0, 0.15, 0.0, -0.05, 1.05, 0.2, 0.85],
  [4, 0.08, 0.0, 0.0, 1.25, 0.25, 1.0],
  [5, 0.45, -0.1, -0.02, 0.98, 0.24, 0.62],
  [9, 0.3, -0.08, -0.15, 0.95, 0.22, 0.6],
  [11, 0.05, 0.0, -0.1, 1.2, 0.12, 1.12],
  [16, 0.15, 0.0, -0.05, 1.05, 0.2, 0.85],
];
const digSample = (u: number) => {
  let i = 0; while (i < DIG.length - 2 && u > DIG[i + 1][0]) i++;
  const a = DIG[i], b = DIG[i + 1], t = inOut(clamp01((u - a[0]) / (b[0] - a[0])));
  return a.map((v, k) => lerp(v, b[k], t));
};
export const SH_REST_LOW: V2 = [0.98, 0.6], SH_REST_HIGH: V2 = [1.04, 1.0];
export function poseB(f: number): { pose: Pose; s: number; bucket: { hand: V2; tilt: number; on: boolean; fly?: number }; shovel: { low: V2; high: V2; on: boolean }; hands: V2 } {
  const s = facingB(f), sg = s < 0 ? -1 : 1;
  const n = footAt(STEPS_B, INIT_B, "N", f), fr = footAt(STEPS_B, INIT_B, "F", f);
  let fN: V2 = [n.x, n.lift], fF: V2 = [fr.x, fr.lift];
  const pel = pelvisSmooth(STEPS_B, INIT_B, facingB, f);
  let lean = 0.04;
  const bump = (a: number, b: number) => Math.sin(Math.PI * seg(f, a, b, (t) => t));
  const bendShovel = bump(B.grabShovel[0], B.grabShovel[1]) * 0.6;
  const bendDrop = bump(B.dropShovel[0], B.dropShovel[1]);
  const bendPick = bump(B.pick[0], B.pick[1]);
  const bendPlace = Math.max(...B.place.map(([a, b]) => bump(a, b)));
  const kneel = seg(f, B.kneel[0], B.kneel[1]) * (1 - seg(f, B.stand[0], B.stand[1]));
  const sit = seg(f, B.sit[0], B.sit[1]);
  const tossU = bump(B.toss[0], B.toss[1]);
  lean += 0.3 * bendShovel + 0.45 * bendDrop + 0.55 * bendPick + 0.6 * bendPlace + 0.42 * kneel - 0.3 * sit - 0.12 * tossU;
  pel[1] -= 0.18 * bendShovel + 0.18 * bendDrop + 0.24 * bendPick + 0.26 * bendPlace + 0.4 * kneel + 0.62 * sit;
  if (sit > 0) { const fx = pel[0] + sg * 0.62; fN = lerp2(fN, [fx + sg * 0.05, 0], sit); fF = lerp2(fF, [fx - sg * 0.04, 0], sit); }
  if (kneel > 0) fF = lerp2(fF, [pel[0] - sg * 0.35, 0], kneel);
  let du: number[] | null = null;
  for (let k = 0; k < B.digs.length; k++) {
    const d0 = B.digs[k];
    if (f >= d0 - 4 && f < d0 + B.digLen) { du = digSample(clamp01((f - d0) / B.digLen) * 16);
      const w = seg(f, d0 - 4, d0) * (k === B.digs.length - 1 ? 1 - seg(f, d0 + 10, d0 + 14) : 1);
      lean = lerp(lean, du[1], w); pel[1] += du[2] * w; }
  }
  const sh = shoulderOf(pel, lean, sg);
  const swing = (fF[0] - fN[0]) * 0.45;
  let hN: V2 = [sh[0] + sg * 0.05 - swing * 0.3, sh[1] - 0.56], hF: V2 = [sh[0] - sg * 0.02 + swing * 0.5, sh[1] - 0.54];
  // выливание
  const pu = seg(f, B.pour[0], B.pour[0] + 6) * (1 - seg(f, B.pour[1] - 4, B.pour[1]));
  const rimB: V2 = [BARREL_B.x - BARREL_B.r + 0.02, BARREL_B.h + 0.2];
  hN = lerp2(hN, rimB, pu); hF = lerp2(hF, [rimB[0] - 0.1, rimB[1] - 0.12], pu * 0.8);
  // бросок пустого ведра назад: замах вперёд-вверх → выброс
  const back = seg(f, B.toss[0], B.toss[0] + 4) * (1 - seg(f, B.toss[0] + 5, B.toss[1]));
  hN = lerp2(hN, [sh[0] + sg * 0.42, sh[1] + 0.12], back);
  // лопата
  const g2 = seg(f, B.grabShovel[0], B.grabShovel[0] + 5);
  if (f < B.turn[1]) hF = lerp2(hF, SH_REST_HIGH, g2);
  let low: V2 = SH_REST_LOW, high: V2 = SH_REST_HIGH, shovelOn = false;
  if (f >= B.grabShovel[0] + 5 && f < B.dropShovel[0] + 6) {
    shovelOn = true;
    const fwd = (fx: number, fy: number): V2 => [pel[0] + sg * fx, pel[1] - 0.82 + fy];
    if (du) { high = fwd(du[3], du[4]); low = fwd(du[5], du[6]); }
    else { high = [sh[0] - sg * 0.02, sh[1] - 0.25]; low = [sh[0] + sg * 0.22, sh[1] - 0.48]; }
    if (f < B.turn[1] + 4) { const u = seg(f, B.grabShovel[0] + 5, B.turn[1] + 4); high = lerp2(SH_REST_HIGH, high, u); low = lerp2(SH_REST_LOW, low, u); }
    if (f >= B.dropShovel[0]) { const u = seg(f, B.dropShovel[0], B.dropShovel[0] + 6); low = lerp2(low, [pel[0] + sg * 0.45, 0.25], u); }
    hF = high; hN = low;
  }
  // секции: подбирает стопку, несёт перед собой, кладёт по одной
  const carry: V2 = [sh[0] + sg * 0.32, sh[1] - 0.42];
  const carryW = seg(f, B.pick[0] + 2, B.pick[1]) * (1 - seg(f, B.place[2][0] + B.placeHit, B.place[2][1]));
  hN = lerp2(hN, [carry[0] + 0.12, carry[1]], carryW); hF = lerp2(hF, [carry[0] - 0.12, carry[1]], carryW);
  const pickU = bump(B.pick[0], B.pick[0] + 8);
  hN = lerp2(hN, [PILE.x + 0.12, 0.2], pickU * (1 - carryW)); hF = lerp2(hF, [PILE.x - 0.12, 0.2], pickU * (1 - carryW));
  for (let k = 0; k < 3; k++) {
    const [p0, p1] = B.place[k], L = SECTIONS[k], cx = (L[0] + L[1]) / 2;
    const u = Math.sin(Math.PI * seg(f, p0, p1, (t) => t));
    hN = lerp2(hN, [cx + 0.18, 0.12], u * 0.9); hF = lerp2(hF, [cx - 0.18, 0.12], u * 0.9);
  }
  // кран на стояке у бочки
  const va = valveA(f);
  const lever: V2 = [LEVER.x + LEVER.len * Math.cos(va), LEVER.y + LEVER.len * Math.sin(va)];
  const onV = seg(f, B.kneel[0] + 2, B.valve[0] + 1) * (1 - seg(f, B.stand[0], B.stand[0] + 6));
  hN = lerp2(hN, lever, onV); hF = lerp2(hF, [lever[0] - 0.05, lever[1] - 0.04], onV * 0.85);
  hN = lerp2(hN, [pel[0] - sg * 0.32, 0.03], sit); hF = lerp2(hF, [pel[0] - sg * 0.26, 0.03], sit);
  const head: V2 = [0.02 * sg * sit, 0.03 * seg(f, 300, 330) - 0.03 * bendPlace];
  const hands = lerp2(hN, hF, 0.5);
  return {
    pose: { pelvis: pel, lean, footN: fN, footF: fF, handN: hN, handF: hF, headOff: head }, s,
    bucket: { hand: hN, tilt: pourTilt(f, B.pour), on: f < B.toss[0] + 5, fly: seg(f, B.toss[0] + 5, TOSS_LAND, (t) => t) },
    shovel: { low, high, on: shovelOn }, hands,
  };
}
export const BUCKET_B_GROUND: V2 = [1.92, 0];
export const BUCKET_B_Z = -0.25;

// ------------------------------------------------------------------ камера
export const camState = (f: number) => {
  const u = seg(f, 328, 400);
  const d = lerp(lerp(15.0, 14.6, seg(f, 0, 330, (t) => t)), 12.8, u);
  const tx = lerp(-0.1, 0.1, u), ty = lerp(0.95, 0.9, u);
  return { tx, ty, d };
};

// ------------------------------------------------------------------ события для звука
// ------------------------------------------------------------------ карты времени: кадр ролика → кадр раскадровки (для каждого свой)
// Второй: копает и укладывает размереннее, после поворота темп почти обычный. Первый: рейс «бак → бочка → бак» повторяется,
// поэтому он всё время занят, а финал после поворота короткий.
type Seg4 = [number, number, number, number];   // [реал0, реал1, раскадровка0, раскадровка1]
export const MAP_B: Seg4[] = [[0, 119, 0, 54], [119, 174, 54, 77], [174, 415, 77, 150], [415, 493, 150, 180], [493, 633, 180, 230], [633, 672, 230, 244], [672, 885, 244, 405], [885, 900, 405, 416]];
export const MAP_A: Seg4[] = [[0, 198, 0, 90], [198, 330, 90, 112], [330, 350, 112, 114], [350, 405, 114, 138], [405, 480, 138, 170], [480, 487, 170, 173], [487, 560, 173, 214], [560, 600, 214, 228], [600, 885, 228, 405], [885, 900, 405, 416]];
const mapOf = (m: Seg4[], fr: number) => { for (const [r0, r1, o0, o1] of m) if (fr < r1) return o0 + (o1 - o0) * Math.max(0, fr - r0) / (r1 - r0); const l = m[m.length - 1]; return l[3]; };
export const mapA = (fr: number) => mapOf(MAP_A, fr), mapB = (fr: number) => mapOf(MAP_B, fr);
// все реальные кадры, когда раскадровочный кадр e наступает у персонажа
export const realTimes = (m: Seg4[], e: number) => { const out: number[] = []; for (const [r0, r1, o0, o1] of m) if (e >= o0 && e < o1) out.push(Math.round(r0 + (e - o0) / (o1 - o0) * (r1 - r0))); return out; };
export const POURS_A_REAL = [A.pour1, A.pour2].flatMap((p) => realTimes(MAP_A, p[0] + 9));
export const TURN_REAL = realTimes(MAP_B, TURN)[0];
const LAUGH_R = [realTimes(MAP_A, A.laugh[0])[0], realTimes(MAP_A, A.laugh[1] - 1)[0]];
export const HA_FRAMES = Array.from({ length: Math.floor((LAUGH_R[1] - LAUGH_R[0] - 14) / 7) }, (_, i) => LAUGH_R[0] + 5 + i * 7);

export function events() {
  const ev: { f: number; kind: string; who?: string; x?: number }[] = [];
  const add = (who: "A" | "B", f: number, kind: string, x?: number) => { for (const r of realTimes(who === "A" ? MAP_A : MAP_B, f)) ev.push({ f: r, kind, who, x }); };
  for (const s of STEPS_A) add("A", s.f1, "step", s.x1);
  for (const s of STEPS_B) add("B", s.f1, "step", s.x1);
  add("A", A.pour1[0] + 6, "pour", BARREL_A.x); add("A", A.pour2[0] + 6, "pour", BARREL_A.x); add("B", B.pour[0] + 6, "pour", BARREL_B.x);
  add("A", A.dip1[0] + 7, "dip"); add("A", A.dip2[0] + 7, "dip");
  for (const h of HA_FRAMES) ev.push({ f: h, kind: "laugh" });
  add("B", B.toss[0] + 4, "toss_bucket"); add("B", TOSS_LAND, "bucketDown", BUCKET_B_GROUND[0]); add("B", B.grabShovel[0] + 5, "grab");
  B.digs.forEach((d, k) => { add("B", d + 5, "dig", DIG_HIT(k)); add("B", d + 10, "toss"); });
  add("B", B.dropShovel[0] + 7, "shovelDrop"); add("B", B.pick[0] + 6, "pick");
  B.place.forEach(([p0], k) => add("B", p0 + B.placeHit - (k === 2 ? 3.5 : 0), "pipeThud", (SECTIONS[k][0] + SECTIONS[k][1]) / 2));
  add("B", B.valve[0] + 1, "valve");
  add("B", TURN, "flow"); add("B", FLOW_HIT, "gush"); add("B", B.sit[1] - 2, "sit");
  add("A", A.notice[0], "notice"); add("A", A.land, "bucketDrop");
  for (const f of [52, 87, 170, 228]) add("A", f, "turn", -0.5);
  for (const f of [74, 176, 264]) add("B", f, "turn", 0.5);
  add("B", 330, "finalSwell"); add("B", 334, "dripsStart");
  return ev.sort((a, b) => a.f - b.f);
}
