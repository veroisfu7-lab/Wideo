// Таймлайн ролика: шоты, длительности (сек), сдвиг голоса и текст субтитров.
// Длительности подобраны под реальные длины дорожек голоса (tools/vo_durations.json).
import VO from "../tools/vo_durations.json";
import SHOTS_JSON from "./shots.json";

export const FPS = 30;

export type ShotDef = { id: string; dur: number; voAt: number; text: string };

export const SHOTS: ShotDef[] = SHOTS_JSON as ShotDef[];

export type Placed = ShotDef & { from: number; frames: number; voFrom: number; voFrames: number };

export const PLACED: Placed[] = (() => {
  let acc = 0;
  return SHOTS.map((s) => {
    const frames = Math.round(s.dur * FPS);
    const p = { ...s, from: acc, frames, voFrom: acc + Math.round(s.voAt * FPS), voFrames: Math.round((VO as Record<string, number>)[s.id] * FPS) };
    acc += frames;
    return p;
  });
})();

export const TOTAL = PLACED[PLACED.length - 1].from + PLACED[PLACED.length - 1].frames;
