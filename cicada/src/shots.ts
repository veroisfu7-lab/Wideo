// Карта планов: имя из timeline.json → шейдер + uniforms по локальному времени t (с) + HTML-слой.
import T from "./timeline.json";
import type { Shot } from "./Film";
import { RAIN, ROOM, DESK, SCREEN } from "./shots/s1";
import { MONITOR, PALM, EYE } from "./shots/s2";
import { ALLEY } from "./shots/s3";
import { ARCH, UVWALL, APO, MEDAL } from "./shots/s4";
import { ZIPPO, MEET, OPEN } from "./shots/s5";
import { SERVERS, END } from "./shots/s6";
import { ScreenText, PalmText, EyeText, BigScreenText, EndTitles } from "./overlays";

const sat = (x: number) => Math.max(0, Math.min(1, x));
const ss = (a: number, b: number, x: number) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const E = T.events;
const loc = (shot: keyof typeof T.shots, ev: number) => ev - T.shots[shot][0];

export const SHOTS: Record<string, Shot> = {
  rain: { frag: RAIN, u: (t, len) => ({ uPush: ss(0, len, t) }) },
  room: { frag: ROOM, u: (t) => ({ uLamp: 1, uWings: 0, uFlick: Math.exp(-Math.max(0, t - loc("room", E.zippoFlick)) * 1.2) * (t > loc("room", E.zippoFlick) ? 1 : 0), uZoom: 1.0 + 0.03 * t, uWall: 2.2, uHX: 0 }) },
  desk: { frag: DESK, u: (t, len) => {
    const b = t - loc("desk", E.buzz);
    const buzz = b > 0 ? (Math.sin(b * Math.PI / 0.9) > 0 ? 1 : 0) * (b < 2.6 ? 1 : 0) : 0;
    return { uBuzz: buzz, uPulse: ss(0.0, 0.4, b), uLift: ss(len - 0.9, len, t) };
  } },
  screen: { frag: SCREEN, overlay: ScreenText, u: (t) => ({ uOn: ss(0.1, 0.9, t - loc("screen", E.screenOn) + 0.4), uHand: Math.sin(t * 0.8) * 0.5 }) },
  wings: { frag: ROOM, u: (t, len) => ({ uLamp: 0.6, uWings: ss(0.15, 0.9, t), uFlick: 0, uZoom: 0.92 - 0.04 * t, uWall: 3.2, uHX: 1 }) },

  monitor: { frag: MONITOR, u: (t) => { const lt = loc("monitor", E.lampOff); return { uLamp: t < lt ? 1 : 0, uBuild: ss(lt + 0.2, lt + 4.5, t) * 0.92 + 0.08 }; } },
  palm: { frag: PALM, overlay: PalmText, u: (t) => ({ uHeat: ss(loc("palm", E.palmHeat), loc("palm", E.palmHeat) + 1.2, t) }) },
  eye: { frag: EYE, overlay: EyeText, u: (t) => ({ uPupil: ss(loc("eye", E.pupil), loc("eye", E.pupil) + 0.8, t) * 0.9 + 0.05, uGlow: 0.6 + 0.4 * ss(0.5, 2.0, t) }) },

  alleyFront: { frag: ALLEY, u: (t) => {
    const cz = 8 - 1.35 * t;
    return { uMode: 0, uPitch: 0.2, uCam: [0.05 * Math.sin(t * 1.9), 0.38 + 0.015 * Math.sin(t * 5.9), cz], uMaxZ: cz + 2.5, uWalk: t * 2 * Math.PI * 0.95,
      uLamp: [1, 1, 1], uSpark: [-1, -1, -1], uPeople: t };
  } },
  alleyBack: { frag: ALLEY, u: (t) => {
    const cz = 10 + 1.35 * t;
    const die = E.lampDie.map((e) => loc("alleyBack", e));
    const on = die.map((d) => (t < d ? 1 : t < d + 0.12 ? (Math.floor(t * 40) % 2) : 0));
    return { uMode: 1, uPitch: 0.06, uCam: [0.05 * Math.sin(t * 1.9), 1.0 + 0.02 * Math.sin(t * 5.9), cz], uMaxZ: cz + 3.8, uWalk: t * 2 * Math.PI * 0.95 + 1.0,
      uLamp: on, uSpark: die.map((d) => t - d), uPeople: t };
  } },

  arch: { frag: ARCH, u: (t, len) => ({ uStep: ss(0, 2.5, t) }) },
  uv: { frag: UVWALL, u: (t) => {
    const on = loc("uv", E.uvOn);
    const k = ss(on, on + 2.8, t);
    return { uUV: t < on ? 0 : Math.min(1, (t - on) * 6) * (0.9 + 0.1 * Math.sin(t * 40)), uBeam: [-0.18 + 0.2 * k + 0.0 * Math.sin(t), -0.12 + 0.12 * k] };
  } },
  apo: { frag: APO, u: (t, len) => ({ uTilt: ss(0.9, len - 0.3, t), uOut: ss(0.0, 1.6, t), uBreath: t / 2.2 }) },
  medal: { frag: MEDAL, u: (t, len) => ({ uTurn: ss(0, len, t) }) },

  zippo: { frag: ZIPPO, u: (t) => {
    const s = loc("zippo", E.zippoSeam), sp = loc("zippo", E.zippoSplit);
    return { uSeam: ss(s, s + 0.4, t), uSplit: ss(sp, sp + 0.7, t), uMat: ss(sp + 0.5, sp + 1.6, t) };
  } },
  meet: { frag: MEET, u: (t) => {
    const j = loc("meet", E.join);
    return { uStep: ss(0.4, 1.6, t), uReach: ss(1.0, j, t), uFlash: t < j ? 0 : Math.min(1, (t - j) * 8) * (0.55 + 0.45 * Math.exp(-(t - j) * 3)) };
  } },
  open: { frag: OPEN, u: (t) => {
    const o = loc("open", E.wallOpen);
    return { uFlash: Math.exp(-Math.max(0, t) * 2.2), uOpen: ss(o, o + 2.6, t) };
  } },
  servers: { frag: SERVERS, u: (t) => ({ uMode: 0, uScreen: 0, uHood: 0, uDown: 0, uHum: ss(0, 1.2, t) }) },
  bigscreen: { frag: SERVERS, overlay: BigScreenText, u: (t) => ({ uMode: 1, uScreen: ss(loc("bigscreen", E.screenLine) - 0.2, loc("bigscreen", E.screenLine) + 0.3, t), uHood: 0, uDown: 0, uHum: 1 }) },
  descend: { frag: SERVERS, u: (t) => ({ uMode: 0, uScreen: 0, uHood: ss(loc("descend", E.hood) - 0.25, loc("descend", E.hood) + 0.35, t), uDown: ss(loc("descend", E.stepDown[0]) - 0.1, loc("descend", E.stepDown[1]) + 0.8, t) * 0.55, uHum: 1 }) },
  end: { frag: END, overlay: EndTitles, u: (t) => ({ uOn: ss(loc("end", E.title), loc("end", E.title) + 1.2, t) }) },
};
