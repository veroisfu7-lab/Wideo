// Тайминг ролика (60 fps, 90 с = 5400 кадров) — по сценарию «Некробиос».
export const FPS = 60;
export type ShotId = "s1a" | "s1b" | "s1c" | "s2a" | "s2b" | "s3a" | "s3b" | "s4a" | "s4b" | "s5a" | "s5b" | "s6a" | "s6b" | "end";
export const SHOTS: [ShotId, number, number][] = [
  ["s1a", 0, 6], ["s1b", 6, 11], ["s1c", 11, 16],
  ["s2a", 16, 24], ["s2b", 24, 33],
  ["s3a", 33, 40], ["s3b", 40, 48],
  ["s4a", 48, 55], ["s4b", 55, 66],
  ["s5a", 66, 73], ["s5b", 73, 81],
  ["s6a", 81, 85.2], ["s6b", 85.2, 87.8], ["end", 87.8, 90],
];
export const TOTAL = 5400;
export function shotAt(f: number): { id: ShotId; t: number; u: number; dur: number; t0: number } {
  const t = f / FPS;
  for (const [id, a, b] of SHOTS) if (t < b - 1e-9) return { id, t, u: t - a, dur: b - a, t0: a };
  const l = SHOTS[SHOTS.length - 1]; return { id: l[0], t, u: t - l[1], dur: l[2] - l[1], t0: l[1] };
}
// ключевые моменты (для звука и HUD)
export const EV = {
  plate: 0.6, polishStart: 6.0, ragToss: 11.35, ragLand: 11.85, freeze: 11.9, desyncHud: 12.2, headBack: 12.6, dblHead: 14.2,
  phoneUp: 16.3, phoneOn: 17.6, track: 18.2, trackLabel: 19.0,
  focusPull: 25.0, redFrame: 25.6, silhouette: 26.6, errorWin: 28.6,
  dashTable: 33.2, toolsSweep: 33.7, folderSlap: 34.6, ties: 35.6, coverOpen: 37.6,
  diagram: 40.3, finger: 44.2,
  dblArms: 48.6, dblTilt: 50.3, step1: 51.4, step2: 52.6, step3: 53.7,
  metal: 55.6, eyes: 57.0, grin: 58.6, palm: 62.4, critical: 63.2,
  jumpBack: 66.05, grab: 67.4, scream: 67.9, swingUp: 70.4, impact: 72.95,
  liquid: 73.0, claw: 75.0, grabWrist: 75.8, pull: 76.6,
  calm: 81.0, sleeves: 81.8, hair: 83.1, turn: 85.3, glint: 86.25, whisper: 86.42, cut: 87.8, title1: 88.0, title2: 88.7,
};
