// Анимационные помощники: сглаживания, ключи, шум для ручной камеры.
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (t: number) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const smoother = (t: number) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const inOut = (t: number) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const outCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const inCubic = (t: number) => Math.pow(clamp01(t), 3);
export const outBack = (t: number) => { t = clamp01(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const lin = (t: number) => clamp01(t);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// ключи по времени: [[t, v], ...]; ease на каждом участке
export function keys(t: number, ks: [number, number][], ease: (x: number) => number = smooth): number {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], ease((t - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0])));
  return ks[ks.length - 1][1];
}
export function keysV(t: number, ks: [number, V3][], ease: (x: number) => number = smooth): V3 {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) return lerpV(ks[i - 1][1], ks[i][1], ease((t - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0])));
  return ks[ks.length - 1][1];
}
// гладкий шум (сумма синусов) — для ручной камеры, дыхания
export const wob = (t: number, seed: number) =>
  Math.sin(t * 1.31 + seed * 3.1) * 0.5 + Math.sin(t * 2.17 + seed * 7.3) * 0.3 + Math.sin(t * 3.73 + seed * 1.7) * 0.2;
export const shake = (t: number, seed: number, f = 1) =>
  Math.sin(t * 7.1 * f + seed) * 0.4 + Math.sin(t * 13.3 * f + seed * 2.1) * 0.3 + Math.sin(t * 23.7 * f + seed * 4.3) * 0.2 + Math.sin(t * 41.1 * f + seed * 1.3) * 0.1;
export const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
