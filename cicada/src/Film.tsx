// «Цикада 3301: Ключ из пепла» — монтаж: план = шейдер + (опционально) HTML-слой. Тайминги — timeline.json.
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, continueRender, delayRender, staticFile } from "remotion";
import T from "./timeline.json";
import { Shader, Uniforms } from "./Shader";
import { SHOTS } from "./shots";
import { Subtitles } from "./overlays";

const FPS = T.fps;

// шрифты из public/fonts через CSS @font-face; ждём их загрузки, но не дольше 6 с (иначе рендер не должен зависать)
if (typeof document !== "undefined" && !document.getElementById("cicada-fonts")) {
  const CYR = "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116";
  const LAT = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
  const face = (fam: string, file: string, w: string, r: string) =>
    `@font-face{font-family:"${fam}";src:url("${staticFile("fonts/" + file)}") format("woff2");font-weight:${w};unicode-range:${r};font-display:block}`;
  const st = document.createElement("style");
  st.id = "cicada-fonts";
  st.textContent = [face("Corm", "corm-cyr.woff2", "300 700", CYR), face("Corm", "corm-lat.woff2", "300 700", LAT),
    face("Osw", "osw-cyr.woff2", "200 700", CYR), face("Osw", "osw-lat.woff2", "200 700", LAT)].join("\n");
  document.head.appendChild(st);
  const h = delayRender("fonts", { timeoutInMilliseconds: 60000 });
  const loads = ["300 40px Osw", "500 40px Osw", "600 40px Corm"].map((f) => document.fonts.load(f, "Аа Яя 0123"));
  Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 6000))]).then(() => continueRender(h), () => continueRender(h));
}

export type Shot = { frag: string; u?: (t: number, len: number) => Uniforms; overlay?: React.FC<{ t: number; len: number }>; scale?: number };

const ShotView: React.FC<{ s: Shot; len: number }> = ({ s, len }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const O = s.overlay;
  return (
    <AbsoluteFill>
      <Shader frag={s.frag} u={s.u ? s.u(t, len) : {}} scale={s.scale ?? 1} />
      {O ? <O t={t} len={len} /> : null}
    </AbsoluteFill>
  );
};

export const Film: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {Object.entries(T.shots).map(([name, [a, b]]) => {
      const s = SHOTS[name];
      if (!s) return null;
      const from = Math.round(a * FPS), to = Math.round(b * FPS);
      return (
        <Sequence key={name} from={from} durationInFrames={to - from} name={name}>
          <ShotView s={s} len={b - a} />
        </Sequence>
      );
    })}
    <Subtitles />
  </AbsoluteFill>
);
