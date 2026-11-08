// «Цикада 3301: Ключ из пепла» — монтаж: план = шейдер + (опционально) HTML-слой. Тайминги — timeline.json.
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import T from "./timeline.json";
import { Shader, Uniforms } from "./Shader";
import { SHOTS } from "./shots";
import { Subtitles } from "./overlays";

const FPS = T.fps;

// Шрифты (Oswald, Cormorant Garamond) ставятся в систему: tools/install_fonts.sh — без загрузки в странице (она вешала рендер).

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
