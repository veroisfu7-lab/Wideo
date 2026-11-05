// «Капсула» — постановка без React: декорации, тайминги (реальные кадры, 30 fps, 900 кадров), позы героя, миска, люк,
// рука-манипулятор, черты дней, камера и события для звука. Всё — чистые функции от кадра.
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
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const lerp2 = (a: V2, b: V2, t: number): V2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const bump = (f: number, a: number, b: number) => Math.sin(Math.PI * seg(f, a, b, (t) => t));
const LEG_MAX = (0.39 + 0.39) * 0.985;

// ------------------------------------------------------------------ комната (метры). Камера смотрит в разрез спереди.
export const ROOM = { x0: -1.5, x1: 1.5, zBack: -1.2, zFront: 0.6, h: 2.4, wall: 0.18 };
export const COT = { x0: -1.48, x1: -0.25, z0: -1.2, z1: -0.55, top: 0.34 };
export const DOOR = { x0: -0.15, x1: 0.55, h: 1.95 };
export const HATCH = { x0: 0.75, x1: 1.2, y0: 0.03, y1: 0.43, cx: 0.975 };
export const LAMP = { x: 1.34, y: 0.3 };                                    // янтарная лампа справа от люка (единственный акцент)
export const LIGHT = { x0: -0.95, x1: 0.95, y: 2.18 };                       // свет, который никогда не гаснет
export const MARK = { y0: 1.17, y1: 1.43, x: (k: number) => (k === 4 ? 0.91 : 0.8 + 0.06 * k - (k > 4 ? 0.0 : 0)) };
export const ZH = -0.75;                                                     // плоскость героя
export const BOWL_SPOT: [number, number, number] = [HATCH.cx, 0.0, -0.98];   // миска перед люком
export const BOWL_IN = -1.5;                                                 // миска внутри люка (z)
export const TURN = T.turn;                                                  // 700: щелчок реле — «это автомат»

// ------------------------------------------------------------------ тайминги (реальные кадры)
export const E = {
  sitUp: [16, 34], standUp: [38, 58],
  walkR: [62, 140], touch: [142, 170], turnL: [170, 173], walkL: [174, 214],
  knock: [216, 252], knockHits: [228, 238, 248], listen: [256, 290],
  // день 1: лампа → шипение → миска
  lamp1: [292, 336], flap1: [296, 304, 322, 330], bowl1: [304, 318],
  turnR: [298, 301], kneel1: [304, 320], grab1: [322, 330], eat1: [338, 370], put1: [370, 378], stand1: [380, 396],
  scratch1: [398, 420],
  // дни 2–6: растворения, по 36 кадров
  days: [420, 456, 492, 528, 564, 600], xf: 8,
  // день 7 и поворот
  lamp7: 672, flap7: [676, 686], arm7: [686, 700], listen7: [684, 698],
  armLook: [700, 712], armBack: [712, 732], grab7: [714, 726], slot7: [726, 742], flapClose: [732, 752],
  jam: 750, grind: [752, 800], lastShove: 790, powerDown: [800, 816], sitBack: [764, 786],
};
// индекс тайм-лапса (−1 — основной герой день 1, 0..4 — дни 2..6, 5 — день 7 и дальше)
export const dayIndex = (f: number) => { const d = E.days; if (f < d[0]) return -1; for (let k = 1; k < d.length; k++) if (f < d[k]) return k - 1; return 5; };
export const marksAt = (f: number) => {             // сколько черт на стене и как дорисована последняя
  if (f < E.scratch1[0] + 6) return { n: 0, last: 0 };
  if (f < E.days[0]) return { n: 1, last: seg(f, E.scratch1[0] + 6, E.scratch1[1] - 4) };
  const k = dayIndex(f);                             // день k+2 → черт k+2
  const d0 = E.days[Math.min(k, 5)];
  if (k >= 5) return { n: 6, last: 1 };
  return { n: k + 2, last: seg(f, d0 + 12, d0 + 18, (t) => t) };
};

// ------------------------------------------------------------------ шаги (как в «Ведре»: стопа в кадр звука, таз из длины ног)
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
const INIT: Record<Foot, number> = { N: -0.18, F: -0.42 };
const WK = new Walker(INIT.N, INIT.F).walk(E.walkR[0], E.walkR[1], 1.1, 3).walk(E.walkL[0], E.walkL[1], 0.55, 1);
export const STEPS = WK.steps;
const footAt = (foot: Foot, f: number) => {
  let x = INIT[foot], lift = 0;
  for (const s of STEPS) {
    if (s.foot !== foot) continue;
    if (f >= s.f1) { x = s.x1; continue; }
    if (f > s.f0) { const t = (f - s.f0) / (s.f1 - s.f0); x = lerp(s.x0, s.x1, 0.35 * inOut(t) + 0.65 * t); lift = 0.07 * Math.sin(Math.PI * t); }
    break;
  }
  return { x, lift };
};
const pelvisFrom = (fN: V2, fF: V2, dx: number): V2 => {
  const x = (fN[0] + fF[0]) / 2 + dx;
  let y = Infinity;
  for (const p of [fN, fF]) y = Math.min(y, p[1] + Math.sqrt(Math.max(0, LEG_MAX * LEG_MAX - (x - p[0]) ** 2)) - 0.004);
  return [x, Math.min(y, 0.76)];
};
export const facing = (f: number) => keys(f, [[E.turnL[0], 1], [E.turnL[1], -1], [E.turnR[0], -1], [E.turnR[1], 1]], (t) => t);
const pelvisWalk = (f: number): V2 => {
  let pel: V2 = [0, 0];
  for (let k = -2; k <= 2; k++) { const g = f + k; const a = footAt("N", g), b = footAt("F", g); const p = pelvisFrom([a.x, a.lift], [b.x, b.lift], facing(g) * 0.03); pel = [pel[0] + p[0] / 5, pel[1] + p[1] / 5]; }
  return pel;
};
const shoulderOf = (pel: V2, lean: number, s: number): V2 => [pel[0] + s * Math.sin(lean) * 0.5, pel[1] + Math.cos(lean) * 0.5];
const restHands = (sh: V2, s: number, swing = 0): [V2, V2] => [[sh[0] + s * 0.05 - swing * 0.3, sh[1] - 0.56], [sh[0] - s * 0.02 + swing * 0.5, sh[1] - 0.54]];

const mixPose = (a: Pose, b: Pose, t: number): Pose => t <= 0 ? a : t >= 1 ? b : ({
  pelvis: lerp2(a.pelvis, b.pelvis, t), lean: lerp(a.lean, b.lean, t), footN: lerp2(a.footN, b.footN, t), footF: lerp2(a.footF, b.footF, t),
  handN: lerp2(a.handN, b.handN, t), handF: lerp2(a.handF, b.handF, t), headOff: lerp2(a.headOff ?? [0, 0], b.headOff ?? [0, 0], t),
});

// ------------------------------------------------------------------ готовые позы
// лежит на спине на лежаке, колени согнуты, голова у стены слева (смотрит «вправо» = s +1)
const LIE: Pose = { pelvis: [-0.55, COT.top + 0.09], lean: -Math.PI / 2, footN: [-0.17, COT.top + 0.06], footF: [-0.21, COT.top + 0.06],
  handN: [-0.62, COT.top + 0.1], handF: [-0.7, COT.top + 0.1], headOff: [0, 0.02] };
// сидит на краю лежака, ступни на полу
const SITCOT = (x = -0.45, lean = 0.05, head: V2 = [0, 0]): Pose => {
  const pel: V2 = [x, COT.top + 0.09], sh = shoulderOf(pel, lean, 1);
  return { pelvis: pel, lean, footN: [x + 0.42, 0], footF: [x + 0.36, 0], handN: [x + 0.28, COT.top + 0.14], handF: [x + 0.22, COT.top + 0.12], headOff: head };
};
// на коленях лицом вправо: таз x, наклон, руки
const KNEEL = (x: number, lean: number, hN?: V2, hF?: V2, head: V2 = [0, 0], low = 0): Pose => {
  const pel: V2 = [x, 0.47 - low], sh = shoulderOf(pel, lean, 1);
  const [rn, rf] = restHands(sh, 1);
  return { pelvis: pel, lean, footN: [x - 0.36, 0.04], footF: [x - 0.42, 0.04], handN: hN ?? [rn[0] + 0.12, Math.max(0.05, rn[1])], handF: hF ?? [rf[0] + 0.1, Math.max(0.05, rf[1])], headOff: head };
};
const STAND = (x: number, s: number, lean = 0.03): Pose => {
  const pel: V2 = [x, 0.757], sh = shoulderOf(pel, lean, s), [hN, hF] = restHands(sh, s);
  return { pelvis: pel, lean, footN: [x + s * 0.12, 0], footF: [x - s * 0.12, 0], handN: hN, handF: hF };
};

// ------------------------------------------------------------------ герой дня 1 (кадры 0–428)
export const BOWL_HAND_Z = ZH + 0.2;
export type Hero = { pose: Pose; s: number; thin: number; op: number; bowl?: { p: [number, number, number]; tilt: number } };
function heroDay1(f: number): Hero {
  const s = facing(f);
  const nA = footAt("N", f), fA = footAt("F", f);
  const fN: V2 = [nA.x, nA.lift], fF: V2 = [fA.x, fA.lift];
  const pel = pelvisWalk(f);
  let lean = 0.03;
  const startle = bump(f, E.flap1[0], E.flap1[0] + 8);   // вздрогнул от шипения
  lean -= 0.12 * startle;
  let sh = shoulderOf(pel, lean, s);
  const swing = (fF[0] - fN[0]) * 0.45;
  let [hN, hF] = restHands(sh, s, swing);
  let head: V2 = [0, 0];
  // ладонь по правой стене: прижал и провёл вниз — ни одной неровности
  const tw = seg(f, E.touch[0], E.touch[0] + 8) * (1 - seg(f, E.touch[1] - 6, E.touch[1]));
  const slide = seg(f, E.touch[0] + 8, E.touch[1] - 6);
  hN = lerp2(hN, [ROOM.x1 - 0.03, 1.22 - 0.24 * slide], tw);
  // стук в дверь: рука вперёд-вверх (лицом влево), три удара
  const kw = seg(f, E.knock[0], E.knock[0] + 8) * (1 - seg(f, E.knock[1] - 4, E.knock[1] + 6));
  let tap = 0; for (const h of E.knockHits) tap = Math.max(tap, (1 - seg(f, h - 4, h, (t) => t)) * seg(f, h - 8, h - 5) );
  hN = lerp2(hN, [pel[0] - 0.36 + 0.07 * tap, 1.36 + 0.02 * tap], kw);
  // слушает: голова чуть наклонена к двери
  const lw = seg(f, E.listen[0], E.listen[0] + 10) * (1 - seg(f, E.flap1[0], E.flap1[0] + 5));
  head = [-0.03 * lw, -0.02 * lw];
  let pose: Pose = { pelvis: pel, lean: lean + 0.06 * lw, footN: fN, footF: fF, handN: hN, handF: hF, headOff: head };
  // царапает черту над люком
  const scW = seg(f, E.scratch1[0], E.scratch1[0] + 6) * (1 - seg(f, E.scratch1[1] - 4, E.scratch1[1] + 4));
  const scU = seg(f, E.scratch1[0] + 6, E.scratch1[1] - 4);
  if (scW > 0) pose = { ...pose, handN: lerp2(pose.handN, [MARK.x(0) + 0.01, lerp(MARK.y1, MARK.y0, scU)], scW), headOff: [0, 0.03 * scW] };
  // лежит → садится → встаёт
  if (f < E.standUp[1]) {
    const sit = SITCOT(-0.45, 0.05);
    const lieToSit = mixPose(LIE, sit, seg(f, E.sitUp[0], E.sitUp[1]));
    const st = STAND(-0.3, 1);
    st.footN = fN; st.footF = fF;
    const u = seg(f, E.standUp[0], E.standUp[1]);
    pose = mixPose(lieToSit, st, u);
    pose.lean += 0.42 * Math.sin(Math.PI * u);   // наклон вперёд при подъёме
  }
  // на колени к миске, ест, ставит, встаёт
  let bowl: Hero["bowl"];
  const kn = seg(f, E.kneel1[0], E.kneel1[1]) * (1 - seg(f, E.stand1[0], E.stand1[1]));
  if (kn > 0) {
    const grab = seg(f, E.grab1[0], E.grab1[1]);
    const lift = seg(f, E.grab1[1], E.eat1[0]) * (1 - seg(f, E.put1[0], E.put1[1]));
    const lean0 = lerp(0.35, 1.0, grab * (1 - lift)) ;
    const leanE = lean0 - 0.1 * lift + 0.05 * Math.sin((f - E.eat1[0]) * 0.8) * seg(f, E.eat1[0], E.eat1[0] + 4) * (1 - seg(f, E.eat1[1] - 4, E.eat1[1]));
    const pelK: V2 = [0.55, 0.47];
    const shK = shoulderOf(pelK, leanE, 1);
    const rim: V2 = [BOWL_SPOT[0] - 0.09, 0.08], mouth: V2 = [shK[0] + 0.24, shK[1] + 0.05];
    const bowlC = lerp2(rim, mouth, lift);
    const k = KNEEL(0.55, leanE, [bowlC[0] + 0.02, bowlC[1] - 0.02], [bowlC[0] - 0.08, bowlC[1] - 0.04], [0.02 * lift, -0.02]);
    pose = mixPose(pose, k, kn);
    const held = f >= E.grab1[1] && f < E.put1[1];
    if (held) bowl = { p: [bowlC[0] + 0.09, bowlC[1] - 0.07, lerp(BOWL_SPOT[2], BOWL_HAND_Z, Math.min(lift * 3, 1))], tilt: 0.5 * lift };
  }
  return { pose, s, thin: 1, op: 1, bowl };
}

// ------------------------------------------------------------------ дни 2–6: застывшие «картины» (растворяются одна в другую)
const thinOf = (k: number) => [0.95, 0.9, 0.86, 0.82, 0.8, 0.76][Math.max(0, Math.min(5, k))];
function tableau(k: number, f: number): Hero {
  const t = f - E.days[k];
  switch (k) {
    case 0: { // день 2: сидит на лежаке, обхватив колени
      const pel: V2 = [-0.95, COT.top + 0.09], lean = 0.25 + 0.03 * Math.sin(t * 0.18);
      return { pose: { pelvis: pel, lean, footN: [-0.56, COT.top + 0.05], footF: [-0.6, COT.top + 0.05], handN: [-0.62, COT.top + 0.42], handF: [-0.66, COT.top + 0.38], headOff: [0.02, -0.03] }, s: 1, thin: thinOf(0), op: 1 };
    }
    case 1: { // день 3: отжимается до отказа
      const u = 0.5 - 0.5 * Math.cos(t * (2 * Math.PI / 17));
      const handX = 0.42, sh: V2 = [handX - 0.03, lerp(0.56, 0.3, u)];
      const foot: V2 = [-0.95, 0.04];
      const ang = Math.atan2(sh[0] - foot[0], sh[1] - foot[1]);
      const pel: V2 = [sh[0] - Math.sin(ang) * 0.5, sh[1] - Math.cos(ang) * 0.5];
      return { pose: { pelvis: pel, lean: ang, footN: foot, footF: [foot[0] - 0.03, 0.04], handN: [handX, 0.03], handF: [handX - 0.04, 0.03], headOff: [0.0, 0.0] }, s: 1, thin: thinOf(1), op: 1 };
    }
    case 2: { // день 4: сидит на полу у двери, голова вниз, руки дрожат
      const pel: V2 = [0.0, 0.11], lean = 0.32;
      const j = 0.008 * Math.sin(t * 2.7) + 0.006 * Math.sin(t * 4.1 + 1);
      return { pose: { pelvis: pel, lean, footN: [0.5, 0], footF: [0.46, 0], handN: [0.33 + j, 0.44 + j], handF: [0.3 - j, 0.42], headOff: [0.04, -0.08] }, s: 1, thin: thinOf(2), op: 1 };
    }
    case 3: { // день 5: стоит у двери, ладонь и лоб к двери — ждёт, что откроют
      const p = STAND(0.62, -1, 0.16), sh = shoulderOf(p.pelvis, 0.16, -1);
      return { pose: { ...p, handN: [sh[0] - 0.3, sh[1] + 0.12], headOff: [-0.03, -0.05] }, s: -1, thin: thinOf(3), op: 1 };
    }
    case 4: { // день 6: на коленях у люка, медленно ест
      const lean = 0.25 + 0.04 * Math.sin(t * 0.25);
      const shK = shoulderOf([0.55, 0.47], lean, 1), mouth: V2 = [shK[0] + 0.24, shK[1] + 0.03];
      const pose = KNEEL(0.55, lean, [mouth[0] + 0.02, mouth[1] - 0.02], [mouth[0] - 0.08, mouth[1] - 0.04], [0.02, -0.03]);
      return { pose, s: 1, thin: thinOf(4), op: 1, bowl: { p: [mouth[0] + 0.11, mouth[1] - 0.09, BOWL_HAND_Z], tilt: 0.45 } };
    }
  }
  return heroDay7(f);
}

// ------------------------------------------------------------------ день 7 → поворот → заклинил люк
export const whiteAt = (f: number) => seg(f, TURN, TURN + 6, (t) => t);
function heroDay7(f: number): Hero {
  // ждёт на коленях, сидя на пятках, голова опущена
  let pose = KNEEL(0.5, 0.12, undefined, undefined, [0.01, -0.07], 0.08);
  // поднял голову на шипение, наклонился к люку слушать
  const up = seg(f, E.flap7[0] + 2, E.flap7[0] + 10);
  pose = mixPose(pose, KNEEL(0.5, 0.2, undefined, undefined, [0.03, 0.0], 0.04), up);
  const lw = seg(f, E.listen7[0], E.listen7[1]);
  const LISTEN = KNEEL(0.42, 1.18, [0.86, 0.03], [0.8, 0.03], [0.02, -0.11], 0.0);
  pose = mixPose(pose, LISTEN, lw);
  // щелчок реле: замер, потом выпрямился (уже белый)
  const rise = seg(f, TURN + 4, TURN + 14);
  pose = mixPose(pose, KNEEL(0.5, 0.55, [0.86, 0.12], [0.8, 0.1], [0.04, 0.0], 0.0), rise);
  // берёт миску и ставит её ребром в проём
  let bowl: Hero["bowl"];
  const g = seg(f, E.grab7[0], E.grab7[1]);
  const sl = seg(f, E.slot7[0], E.slot7[1]);
  const rim: V2 = [BOWL_SPOT[0] - 0.1, 0.08], slot: V2 = [HATCH.cx - 0.12, 0.17];
  const hc = lerp2(rim, slot, sl);
  if (g > 0) pose = mixPose(pose, KNEEL(0.55, lerp(0.95, 1.0, sl), [hc[0] + 0.02, hc[1]], [hc[0] - 0.07, hc[1] - 0.02], [0.03, -0.04], 0.0), g);
  if (f >= E.grab7[1] && f < E.slot7[1]) bowl = { p: [hc[0] + 0.1, hc[1] - 0.05, lerp(BOWL_HAND_Z - 0.1, -1.12, sl)], tilt: (Math.PI / 2) * sl };
  // руки назад, сел на пятки, смотрит в щель
  const back = seg(f, E.jam + 2, E.jam + 14);
  pose = mixPose(pose, KNEEL(0.5, 0.62, [0.74, 0.2], [0.68, 0.16], [0.04, -0.05], 0.0), back);
  const sitb = seg(f, E.sitBack[0], E.sitBack[1]);
  pose = mixPose(pose, KNEEL(0.45, 0.42, undefined, undefined, [0.04, -0.06], 0.07), sitb);
  return { pose, s: 1, thin: thinOf(5), op: 1, bowl };
}

// какие герои видны в кадре: один, или два во время растворения
export function heroes(f: number): Hero[] {
  const X = E.xf, d = E.days;
  const at = (k: number, g: number): Hero => (k < 0 ? heroDay1(g) : k >= 5 ? heroDay7(g) : tableau(k, g));
  for (let k = 0; k < d.length; k++) {
    if (f >= d[k] && f < d[k] + X) {
      const u = smooth((f - d[k]) / X);
      const a = at(k - 1, f), b = at(k, f);
      return [{ ...a, op: 1 - u }, { ...b, op: u }];
    }
  }
  return [at(dayIndex(f), f)];
}

// ------------------------------------------------------------------ серый → тусклее с днями → белый на повороте
export const heroGrey = (f: number) => seg(f, E.days[0], E.days[5], (t) => t);   // 0 → 1: #B2B0B4 → #9A979B

// ------------------------------------------------------------------ люк, миска, рука, лампа
// створка: 0 — закрыта, 1 — открыта; после заклинивания застревает на высоте миски ребром
export const BOWL_R = 0.13;
export const JAM_OPEN = (2 * BOWL_R + 0.005) / (HATCH.y1 - HATCH.y0);
export const flapOpen = (f: number) => {
  const swaps = E.days.slice(0, 5).map((d) => d + 10);
  let o = 0;
  o = Math.max(o, seg(f, E.flap1[0], E.flap1[1]) * (1 - seg(f, E.flap1[2], E.flap1[3])));
  for (const s of swaps) o = Math.max(o, seg(f, s, s + 4) * (1 - seg(f, s + 14, s + 18)));
  if (f >= E.flap7[0]) {
    o = seg(f, E.flap7[0], E.flap7[1]);
    if (f >= E.flapClose[0]) o = lerp(1, JAM_OPEN, seg(f, E.flapClose[0], E.jam, (t) => t * t));   // садится на миску ровно в кадр удара
    if (f >= E.jam) { // дрожит, пытаясь дожать
      const g = seg(f, E.grind[0], E.grind[1], (t) => t) < 1 ? 1 : 0;
      o = JAM_OPEN - 0.012 * g * Math.abs(Math.sin((f - E.jam) * 1.9)) - 0.03 * bump(f, E.lastShove, E.lastShove + 4);
      o = Math.max(o, JAM_OPEN - 0.035);
    }
  }
  return clamp01(o);
};
// миска на полу/в люке: z и полна ли (кашу видно)
export function bowlFloor(f: number): { z: number; full: boolean; on: boolean; upright?: boolean } {
  if (f < E.bowl1[0]) return { z: BOWL_IN, full: true, on: false };
  if (f < E.days[0]) {
    if (f < E.grab1[1]) return { z: lerp(BOWL_IN, BOWL_SPOT[2], seg(f, E.bowl1[0], E.bowl1[1], outCubic)), full: true, on: true };
    if (f < E.put1[1]) return { z: BOWL_SPOT[2], full: false, on: false };
    return { z: BOWL_SPOT[2], full: false, on: true };
  }
  const k = dayIndex(f);
  if (k <= 3) return { z: BOWL_SPOT[2], full: f >= E.days[k] + 14, on: true };
  if (k === 4) return { z: BOWL_SPOT[2], full: true, on: false };   // день 6: миска в руках
  // день 7: старой нет; рука выталкивает новую
  if (f < E.arm7[0]) return { z: BOWL_IN, full: true, on: false };
  if (f < E.grab7[1]) return { z: lerp(-1.38, BOWL_SPOT[2] + 0.02, seg(f, E.arm7[0], E.arm7[1], (t) => 0.5 * t + 0.5 * inOut(t))), full: true, on: true };
  if (f < E.slot7[1]) return { z: BOWL_SPOT[2], full: true, on: false };
  return { z: -1.12, full: true, on: true, upright: true };
}
// голова манипулятора (z) и поворот «взгляда»
export const armState = (f: number) => {
  const out = seg(f, E.arm7[0] - 4, E.arm7[1], (t) => 0.5 * t + 0.5 * inOut(t));
  const back = seg(f, E.armBack[0], E.armBack[1]);
  const z = lerp(lerp(-1.75, BOWL_SPOT[2] - 0.06, out), -1.75, back);
  const look = bump(f, E.armLook[0], E.armLook[1]);
  return { z, look, on: f >= E.arm7[0] - 4 && f < E.armBack[1] + 2 };
};
// янтарная лампа: 0..1
export const lampAt = (f: number) => {
  let v = seg(f, E.lamp1[0], E.lamp1[0] + 2, (t) => t) * (1 - seg(f, E.lamp1[1] - 3, E.lamp1[1], (t) => t));
  for (const d of E.days.slice(0, 5)) v = Math.max(v, seg(f, d + 8, d + 9, (t) => t) * (1 - seg(f, d + 24, d + 26, (t) => t)));
  if (f >= E.lamp7) {
    v = seg(f, E.lamp7, E.lamp7 + 2, (t) => t);
    if (f >= E.jam && f < E.grind[1]) v = Math.floor((f - E.jam) / 3) % 2 === 0 ? 1 : 0.12;   // тревога: мигает 3/3
  }
  return v;
};
// свечение изнутри люка после заклинивания (диод манипулятора)
export const innerGlow = (f: number) => (f < E.jam ? (armState(f).on ? 0.6 : 0) : 0.35 + 0.25 * Math.sin((f - E.jam) * 0.21));

// ------------------------------------------------------------------ камера
export const camState = (f: number) => {
  const u = seg(f, TURN + 2, 878);
  const d = lerp(lerp(13.6, 13.1, seg(f, 0, TURN, (t) => t)), 12.1, u);
  const tx = lerp(0.0, 0.42, u), ty = lerp(1.25, 1.02, u);
  return { tx, ty, d };
};

// ------------------------------------------------------------------ события для звука (реальные кадры)
export function events() {
  const ev: { f: number; kind: string; x?: number }[] = [];
  const add = (f: number, kind: string, x?: number) => ev.push({ f: Math.round(f), kind, x });
  add(E.sitUp[0], "cotCreak", -0.8); add(E.sitUp[0] + 2, "cloth", -0.6); add(E.standUp[0] + 4, "cloth", -0.4); add(E.standUp[1] - 2, "cotCreak", -0.5);
  for (const s of STEPS) add(s.f1, "step", s.x1);
  add(E.touch[0] + 8, "palm", 1.48); add(E.touch[0] + 9, "slide", 1.48);
  add(E.turnL[0], "cloth", 1.1);
  for (const h of E.knockHits) add(h, "knock", 0.2);
  add(E.flap1[0], "hiss", HATCH.cx); add(E.flap1[0] + 8, "flapUp", HATCH.cx); add(E.bowl1[0], "bowlSlide", HATCH.cx); add(E.flap1[3], "flapDown", HATCH.cx);
  add(E.lamp1[0], "lampOn", LAMP.x);
  add(E.turnR[0], "cloth", 0.55); add(E.kneel1[1] - 2, "kneel", 0.55);
  add(E.grab1[1] - 2, "bowlGrab", HATCH.cx);
  for (let k = 0; k < 4; k++) add(E.eat1[0] + 2 + k * 8, "eat", 0.8);
  add(E.put1[1], "bowlPut", HATCH.cx); add(E.stand1[0] + 2, "cloth", 0.55);
  add(E.scratch1[0] + 6, "scratch", MARK.x(0));
  E.days.slice(0, 5).forEach((d, k) => {
    add(d, "timeWhoosh"); add(d + 8, "lampOn", LAMP.x); add(d + 10, "hiss", HATCH.cx); add(d + 14, "bowlSwap", HATCH.cx); add(d + 18, "flapDown", HATCH.cx);
    add(d + 12, "scratchShort", MARK.x(k + 1));
    if (k === 1) for (let r = 0; r < 2; r++) add(d + 8 + r * 17, "pushup", 0.0);
    if (k === 4) add(d + 20, "eat", 0.8);
  });
  add(E.days[5], "timeWhoosh");
  add(E.lamp7, "lampOn", LAMP.x); add(E.flap7[0], "hiss", HATCH.cx); add(E.flap7[0] + 8, "flapUp", HATCH.cx);
  add(E.flap7[0] + 4, "cloth", 0.5);
  add(E.arm7[0] - 4, "servo", HATCH.cx); add(E.arm7[1] - 2, "bowlSlide", HATCH.cx);
  add(E.listen7[0], "cloth", 0.5);
  add(TURN, "relay", HATCH.cx); add(TURN, "boom");
  add(E.armLook[0] + 2, "servoShort", HATCH.cx); add(E.armBack[0], "servo", HATCH.cx);
  add(TURN + 6, "cloth", 0.5);
  add(E.grab7[1] - 2, "bowlGrab", HATCH.cx); add(E.slot7[1] - 2, "bowlSlot", HATCH.cx);
  add(E.flapClose[0], "hissClose", HATCH.cx);
  add(E.jam, "jamClank", HATCH.cx); add(E.grind[0], "grind", HATCH.cx); add(E.grind[0], "alarm", LAMP.x);
  add(E.lastShove, "jamClank2", HATCH.cx); add(E.powerDown[0], "powerDown", HATCH.cx);
  add(E.jam + 4, "cloth", 0.5); add(E.sitBack[1] - 3, "kneel", 0.45);
  return ev.sort((a, b) => a.f - b.f);
}
