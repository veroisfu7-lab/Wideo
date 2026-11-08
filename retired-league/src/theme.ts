// Style DNA ролика «THE RETIRED LEAGUE»: палитра, шрифты, анимационные помощники.
import { continueRender, delayRender, interpolate, spring, staticFile, Easing } from "remotion";

export const W = 1920, H = 1080, FPS = 30;

export const C = {
  paper: "#F4EEDC",
  indigo: "#2C1B4D",
  indigo2: "#3B2766",
  indigo3: "#1C1033",
  lime: "#99E622",
  limeDark: "#4E8A12",
  red: "#C83E3E",
  ochre: "#E6A122",
  blue: "#326B88",
  orange: "#EE7A22",
  ink: "#17121F",
  skin: "#F0C49C",
  skinShade: "#D99A72",
  hair: "#DCD8D0",
  chrome: "#C2CBD0",
  yellow: "#FFD23F",
  maroon: "#7A2335",
  wood: "#A86B32",
  woodDark: "#7E4A20",
};

// ---------------------------------------------------------------- шрифты (локальные woff2)
const FONTS: [string, string][] = [
  ["Bangers", "Bangers.woff2"],
  ["Luckiest Guy", "LuckiestGuy.woff2"],
  ["Anton", "Anton.woff2"],
];
if (typeof window !== "undefined" && typeof FontFace !== "undefined") {
  const h = delayRender("fonts", { timeoutInMilliseconds: 60000 });
  let done = false;
  const finish = () => { if (!done) { done = true; continueRender(h); } };
  Promise.all(
    FONTS.map(([family, file]) =>
      new FontFace(family, `url(${staticFile("fonts/" + file)})`).load().then((ff) => (document.fonts as any).add(ff)),
    ),
  ).then(finish, finish);
  setTimeout(finish, 15000);
}

// ---------------------------------------------------------------- анимация
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const lin = (f: number, a: number, b: number, v0: number, v1: number, ease?: (t: number) => number) =>
  interpolate(f, [a, b], [v0, v1], ease ? { ...CL, easing: ease } : CL);
export const ease = Easing.bezier(0.45, 0, 0.25, 1);
export const easeOut = Easing.bezier(0.2, 0.8, 0.3, 1);
export const easeIn = Easing.bezier(0.6, 0, 0.9, 0.4);
export const pop = (f: number, start: number, damping = 9, stiffness = 190) =>
  f < start ? 0 : spring({ frame: f - start, fps: FPS, config: { damping, stiffness, mass: 0.7 } });
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export type Pt = [number, number];
export const mixPt = (a: Pt, b: Pt, t: number): Pt => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
// детерминированная «дрожь» по кадру
export const jit = (f: number, seed: number, amp: number) => {
  const r = rng(seed * 7919 + Math.floor(f));
  return (r() * 2 - 1) * amp;
};

// ---------------------------------------------------------------- пути
export const ell = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0Z`;
export const rect = (x: number, y: number, w: number, h: number, r = 0) =>
  r <= 0
    ? `M${x},${y}h${w}v${h}h${-w}Z`
    : `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`;
export const poly = (pts: Pt[]) => "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L") + "Z";
export const line = (pts: Pt[]) => "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L");
// рваная звезда-взрыв
export const starBurst = (cx: number, cy: number, n: number, rIn: number, rOut: number, seed: number, sx = 1, sy = 1, jitter = 0.25) => {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 + (r() - 0.5) * 0.12;
    const rad = (i % 2 === 0 ? rOut : rIn) * (1 - jitter / 2 + r() * jitter);
    pts.push([cx + Math.cos(a) * rad * sx, cy + Math.sin(a) * rad * sy]);
  }
  return poly(pts);
};
