// Хелперы анимации: ключи по кадрам, IK из двух звеньев, геометрия сцены.
import { Easing } from "remotion";

export type V2 = [number, number];
export type EaseFn = (t: number) => number;

export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const inOut: EaseFn = Easing.inOut(Easing.cubic);
export const outCubic: EaseFn = Easing.out(Easing.cubic);
export const smooth: EaseFn = (t) => t * t * (3 - 2 * t);
export const outExpo: EaseFn = Easing.bezier(0.16, 1, 0.3, 1);

// Ключи [кадр, значение]: между ключами — easing, до/после — держим крайние значения.
export const keys = (f: number, ks: [number, number][], ease: EaseFn = inOut): number => {
  if (f <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (f <= ks[i][0]) {
      const [f0, v0] = ks[i - 1], [f1, v1] = ks[i];
      return lerp(v0, v1, ease(clamp01((f - f0) / Math.max(1e-6, f1 - f0))));
    }
  }
  return ks[ks.length - 1][1];
};
export const keys2 = (f: number, ks: [number, number, number][], ease: EaseFn = inOut): V2 => [
  keys(f, ks.map((k) => [k[0], k[1]] as [number, number]), ease),
  keys(f, ks.map((k) => [k[0], k[2]] as [number, number]), ease),
];
export const seg = (f: number, a: number, b: number, ease: EaseFn = inOut) => ease(clamp01((f - a) / Math.max(1e-6, b - a)));

// IK двух звеньев в плоскости XY. bend = +1 — сустав вперёд по +x (колено), −1 — назад (локоть).
export const ik = (a: V2, t: V2, l1: number, l2: number, bend: 1 | -1): V2 => {
  const dx = t[0] - a[0], dy = t[1] - a[1];
  const d = Math.max(Math.abs(l1 - l2) + 1e-3, Math.min(l1 + l2 - 1e-4, Math.hypot(dx, dy)));
  const th = Math.atan2(dy, dx);
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  return [a[0] + l1 * Math.cos(th + bend * A), a[1] + l1 * Math.sin(th + bend * A)];
};
// Конечная точка, достижимая из a (если цель дальше длины цепи — подтягиваем к краю).
export const reach = (a: V2, t: V2, len: number): V2 => {
  const dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy);
  return d <= len ? t : [a[0] + (dx / d) * len, a[1] + (dy / d) * len];
};

// ---------------------------------------------------------------- размеры персонажа (метры; голова D = 0.30)
export const D = 0.3;
export const LIMB_R = 0.063;           // 0.42·D
export const ARM_R = 0.058;
export const TORSO_R = 0.09;
export const THIGH = 0.39, SHIN = 0.39;
export const UPPER = 0.29, FORE = 0.29;
export const TORSO = 0.56;             // таз → основание шеи
export const SHOULDER = 0.5;           // таз → плечо
export const HEAD_R = 0.15;
export const HEAD_UP = TORSO + TORSO_R + 0.005 + HEAD_R; // таз → центр головы (тёмный зазор дают обводки)
export const OUTLINE = 0.03;           // 0.10·D
export const LEG_MAX = (THIGH + SHIN) * 0.985;

// ---------------------------------------------------------------- ступени
export const STEP_RUN = 0.4, STEP_RISE = 0.26, STEP_W = 0.38, STEP_FIRST_TOP = 0.14, STEP_FIRST_X = 0.3;
export const blockTop = (i: number) => STEP_FIRST_TOP + STEP_RISE * (i - 1);   // i с 1
export const blockX = (i: number) => STEP_FIRST_X + STEP_RUN * (i - 1);
export const WHITE_Z = 0.2, GREY_Z = -0.35;
