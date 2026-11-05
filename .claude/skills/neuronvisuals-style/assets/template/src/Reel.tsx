// Общая обвязка ролика серии: 3D-сцена + подпись-машинка сверху + затемнение в чёрное.
// Звук сводится отдельно (tools/mix.sh). Параметры подписи — STYLE_RULES §8 (720p ×1.5).
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/google-fonts/Tektur";
import { clamp01, smooth } from "./anim";

const { fontFamily } = loadFont("normal", { weights: ["400"], subsets: ["latin", "cyrillic"] });

// заглавная ≈25 px, шаг знака ≈24 px, строки на 17.5 % и 19.8 % H
const CAP = { size: 34, spacing: "0.13em", color: "#F4F3F5", y1: 322, y2: 366 };

export type ReelTimeline = {
  fadeStart: number; fadeLen: number;
  text: { line1: string; line2: string; line2Start: number; charsPerFrame: number; charFade: number; dimTo: number; dimLen: number };
};

const Line: React.FC<{ text: string; y: number; start: number | null; dim: number; t: ReelTimeline["text"] }> = ({ text, y, start, dim, t }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: y, width: "100%", textAlign: "center", fontFamily, fontWeight: 400, fontSize: CAP.size,
      letterSpacing: CAP.spacing, color: CAP.color, whiteSpace: "pre", textShadow: "0 0 6px rgba(255,255,255,0.22), 0 0 3px #000, 0 0 10px rgba(0,0,0,0.9)" }}>
      {Array.from(text).map((ch, i) => {
        // машинка: символ i появляется на кадре start + i/1.45, проявляется от 40 % за 3 кадра
        let a = 1;
        if (start !== null) {
          const t0 = start + i / t.charsPerFrame;
          a = f < t0 ? 0 : 0.4 + 0.6 * clamp01((f - t0) / t.charFade);
        }
        return <span key={i} style={{ opacity: a * dim }}>{ch}</span>;
      })}
    </div>
  );
};

export const Reel: React.FC<{ T: ReelTimeline; children: React.ReactNode }> = ({ T, children }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const dim1 = 1 - (1 - T.text.dimTo) * clamp01((f - T.text.line2Start) / T.text.dimLen);
  const fade = smooth(clamp01((f - T.fadeStart + 1) / T.fadeLen));
  return (
    <AbsoluteFill style={{ backgroundColor: "#010002" }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, stencil: true, toneMapping: THREE.NoToneMapping }}>
        {children}
      </ThreeCanvas>
      <Line text={T.text.line1} y={CAP.y1} start={null} dim={dim1} t={T.text} />
      <Line text={T.text.line2} y={CAP.y2} start={T.text.line2Start} dim={1} t={T.text} />
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: fade }} />
    </AbsoluteFill>
  );
};
