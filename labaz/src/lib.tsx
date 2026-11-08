// Общие примитивы: палитра, анимация, HUD-карточки, зерно, виньетка, туман, глитч.
import React from "react";
import { interpolate, Easing, spring, staticFile, useCurrentFrame, useVideoConfig, continueRender, delayRender } from "remotion";
import FONTS from "./fonts.json";

// Шрифты лежат локально (public/fonts) — браузер рендера не ходит в сеть
if (typeof document !== "undefined" && !document.getElementById("labaz-fonts")) {
  const st = document.createElement("style"); st.id = "labaz-fonts";
  st.innerHTML = (FONTS as string[][]).map(([fam, wt, fn, ur]) =>
    `@font-face{font-family:'${fam}';font-weight:${wt};font-style:normal;font-display:block;src:url(${staticFile("fonts/" + fn)}) format('woff2');unicode-range:${ur};}`).join("\n");
  document.head.appendChild(st);
}
export const MONO = "'JetBrains Mono', monospace";
export const HAND = "'Caveat', cursive";
export const COND = "'Oswald', sans-serif";

export const W = 1080, H = 1920;
export const C = {
  olive: "#1B261D", pine: "#0B131A", ink: "#05080A",
  yellow: "#FFD000", cyan: "#00F0FF", red: "#FF2A4D", white: "#F0F4F8",
  fire: "#FF6B00", ice: "#E0F7FF", violet: "#B44DFF", green: "#3DFF8A",
};

// ---------- математика / анимация
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ip = (f: number, a: number[], b: number[], ease?: (t: number) => number) =>
  interpolate(f, a, b, { ...clamp, easing: ease });
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const noise1 = (t: number, s = 0) => // гладкий 1D-шум из синусов
  Math.sin(t * 1.3 + s) * 0.5 + Math.sin(t * 2.7 + s * 1.7) * 0.3 + Math.sin(t * 5.1 + s * 3.1) * 0.2;
export const useSpring = (start: number, damping = 11, stiffness = 170) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return spring({ frame: f - start, fps, config: { damping, stiffness, mass: 0.9 } });
};
export const sec = (s: number) => Math.round(s * 30);

// ---------- кадр
export const Fill: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>{children}</div>
);
export const Svg: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties; vb?: string }> = ({ children, style, vb }) => (
  <svg width={W} height={H} viewBox={vb ?? `0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, ...style }}>{children}</svg>
);

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  const f = useCurrentFrame();
  const x = Math.floor(rnd(f) * 512), y = Math.floor(rnd(f + 99) * 512);
  return <Fill style={{ backgroundImage: `url(${staticFile("grain.png")})`, backgroundPosition: `${x}px ${y}px`,
    opacity, mixBlendMode: "overlay", pointerEvents: "none" }} />;
};
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.85 }) => (
  <Fill style={{ background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: "none" }} />
);

// Полосатый процедурный туман: несколько размытых эллипсов, дрейфующих по X
export const Fog: React.FC<{ y: number; h?: number; color?: string; opacity?: number; speed?: number; seed?: number; n?: number }> =
  ({ y, h = 220, color = "#9fb3b8", opacity = 0.35, speed = 0.6, seed = 1, n = 6 }) => {
  const f = useCurrentFrame();
  return (
    <g style={{ mixBlendMode: "screen" }}>
      {Array.from({ length: n }).map((_, i) => {
        const r = rnd(seed * 31 + i);
        const w = 500 + r * 700;
        const x = ((r * 1600 + f * speed * (0.6 + r)) % (W + w * 2)) - w;
        const yy = y + (rnd(seed * 7 + i) - 0.5) * h;
        return <ellipse key={i} cx={x} cy={yy} rx={w / 2} ry={h * (0.25 + r * 0.25)} fill={color}
          opacity={opacity * (0.5 + 0.5 * rnd(i + seed))} filter="url(#fogblur)" />;
      })}
    </g>
  );
};
export const Defs: React.FC = () => (
  <defs>
    <filter id="fogblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40" /></filter>
    <filter id="blur8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
    <filter id="blur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
    <filter id="blur18" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="bigglow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="22" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>
);

// ---------- HUD
export const glassStyle = (border = "rgba(255,255,255,0.15)"): React.CSSProperties => ({
  background: "rgba(8,14,18,0.48)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
  border: `1px solid ${border}`, borderRadius: 20, color: C.white, fontFamily: MONO,
  boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
});

// Пружинное появление карточки (overshoot) + опциональное исчезновение
export const Pop: React.FC<{ at: number; out?: number; x: number; y: number; w?: number; children: React.ReactNode;
  origin?: string; border?: string; pad?: string; style?: React.CSSProperties; glitch?: boolean }> =
  ({ at, out, x, y, w, children, origin = "left top", border, pad = "22px 28px", style, glitch }) => {
  const f = useCurrentFrame();
  const s = useSpring(at, 10, 190);
  const o = out !== undefined ? ip(f, [out, out + 6], [1, 0]) : 1;
  if (f < at) return null;
  const g = glitch && f - at < 10 ? (rnd(f) - 0.5) * 30 : 0;
  return (
    <div style={{ position: "absolute", left: x + g, top: y, width: w, transformOrigin: origin,
      transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.6) * o, padding: pad, ...glassStyle(border), ...style,
      textShadow: glitch && f - at < 12 ? `${3 + rnd(f) * 4}px 0 rgba(255,42,77,.9), -${3 + rnd(f + 1) * 4}px 0 rgba(0,240,255,.8)` : undefined }}>
      {children}
    </div>
  );
};

// Печать текста по символам
export const Type: React.FC<{ text: string; at: number; cps?: number; style?: React.CSSProperties; caret?: boolean }> =
  ({ text, at, cps = 40, style, caret }) => {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.floor(((f - at) / 30) * cps));
  const shown = text.slice(0, n);
  const typing = n < text.length && n > 0;
  return <div style={{ whiteSpace: "pre-wrap", ...style }}>{shown}{(caret || typing) && f >= at && Math.floor(f / 8) % 2 === 0 ? "▌" : ""}</div>;
};

export const Label: React.FC<{ children: React.ReactNode; color?: string; size?: number; weight?: number; style?: React.CSSProperties }> =
  ({ children, color = C.white, size = 30, weight = 700, style }) => (
  <div style={{ fontFamily: MONO, fontSize: size, fontWeight: weight, color, letterSpacing: 1, lineHeight: 1.35, ...style }}>{children}</div>
);

// Индикатор-полоска из сегментов
export const LedBar: React.FC<{ value: number; n?: number; color?: string; w?: number; h?: number; gap?: number }> =
  ({ value, n = 10, color = C.cyan, w = 22, h = 34, gap = 6 }) => (
  <div style={{ display: "flex", gap }}>
    {Array.from({ length: n }).map((_, i) => {
      const on = i < Math.round(value * n);
      return <div key={i} style={{ width: w, height: h, borderRadius: 4, background: on ? color : "rgba(255,255,255,0.1)",
        boxShadow: on ? `0 0 12px ${color}` : "none" }} />;
    })}
  </div>
);

// Хроматический глитч всего кадра: смещённые цветные копии + полосы
export const GlitchBars: React.FC<{ on: boolean; seed?: number; intensity?: number }> = ({ on, seed = 0, intensity = 1 }) => {
  const f = useCurrentFrame();
  if (!on) return null;
  return (
    <Fill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 7 }).map((_, i) => {
        const r = rnd(f * 13 + i + seed);
        return <div key={i} style={{ position: "absolute", left: 0, right: 0, top: r * H, height: 8 + rnd(f + i * 7) * 70 * intensity,
          background: i % 2 ? "rgba(255,42,77,0.35)" : "rgba(0,240,255,0.28)", transform: `translateX(${(rnd(f + i) - 0.5) * 120 * intensity}px)`,
          mixBlendMode: "screen" }} />;
      })}
      <Fill style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, rgba(0,0,0,0) 2px 5px)" }} />
    </Fill>
  );
};

// RGB-сдвиг слоя: рендерит детей трижды
export const RGBSplit: React.FC<{ amount: number; children: React.ReactNode }> = ({ amount, children }) => {
  if (amount < 0.5) return <>{children}</>;
  return (
    <Fill>
      <Fill style={{ transform: `translateX(${-amount}px)`, filter: "url(#none)", opacity: 0.9 }}>{children}</Fill>
      <Fill style={{ transform: `translateX(${amount}px)`, mixBlendMode: "screen", opacity: 0.6, filter: "hue-rotate(160deg)" }}>{children}</Fill>
    </Fill>
  );
};

// Угловые засечки рамки захвата
export const Corners: React.FC<{ x: number; y: number; w: number; h: number; color?: string; len?: number; sw?: number }> =
  ({ x, y, w, h, color = C.cyan, len = 34, sw = 4 }) => (
  <g stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" filter="url(#glow)">
    <path d={`M${x},${y + len} V${y} H${x + len}`} /><path d={`M${x + w - len},${y} H${x + w} V${y + len}`} />
    <path d={`M${x + w},${y + h - len} V${y + h} H${x + w - len}`} /><path d={`M${x + len},${y + h} H${x} V${y + h - len}`} />
  </g>
);

// Тряска камеры (shaky cam)
export const shake = (f: number, amp: number, seed = 0) => ({
  x: noise1(f * 0.35, seed) * amp, y: noise1(f * 0.31, seed + 5) * amp, r: noise1(f * 0.2, seed + 9) * amp * 0.03,
});

// Дождаться загрузки шрифтов перед первым кадром
let fontsReady = false;
export const useFonts = () => {
  const [h] = React.useState(() => (fontsReady ? null : delayRender("fonts")));
  React.useEffect(() => {
    if (h === null) return;
    const fams = ["400 30px 'JetBrains Mono'", "700 30px 'JetBrains Mono'", "800 30px 'JetBrains Mono'", "600 30px 'Caveat'", "500 30px 'Oswald'", "700 30px 'Oswald'"];
    Promise.all(fams.flatMap((f) => [document.fonts.load(f, "АБВ abc"), document.fonts.load(f, "abc")])).then(() => { fontsReady = true; continueRender(h); });
  }, [h]);
};
