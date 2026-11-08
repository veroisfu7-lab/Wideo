// Монтаж 15-секундного промо: сцены, переходы, бумажная фактура, выключение лампового ТВ, звук.
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { lin, easeIn } from "./theme";
import { WaveWipe } from "./fx";
import { Gates } from "./scenes/Gates";
import { Captain } from "./scenes/Captain";
import { Nana } from "./scenes/Nana";
import { Tempest } from "./scenes/Tempest";
import { Robo } from "./scenes/Robo";
import { Title } from "./scenes/Title";
import T from "./timeline.json";

const [W1, W2, W3] = T.wipes;

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const t0 = T.title.start, off = t0 + T.title.tvoff;
  // выключение ТВ: схлопывание по вертикали в линию, затем в белую точку
  const sy = lin(f, off, off + 5, 1, 0.006, easeIn);
  const sx = lin(f, off + 5, off + 9, 1, 0.004, easeIn);
  const bright = lin(f, off, off + 5, 0, 0.85);
  const dot = f >= off + 5 ? lin(f, off + 9, off + 12, 1, 0) : 0;
  const flash = lin(f, t0 - 4, t0, 0, 1) * lin(f, t0, t0 + 6, 1, 0);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${sx},${sy})`, filter: bright > 0 ? `brightness(${1 + bright * 2})` : undefined }}>
        <Sequence from={T.captain.start} durationInFrames={W1 - T.captain.start}><Captain /></Sequence>
        <Sequence from={0} durationInFrames={T.gates.irisEnd}><Gates /></Sequence>
        <Sequence from={W1} durationInFrames={W2 - W1}><Nana /></Sequence>
        <Sequence from={W2} durationInFrames={W3 - W2}><Tempest /></Sequence>
        <Sequence from={W3} durationInFrames={t0 - W3}><Robo /></Sequence>
        <Sequence from={t0}><Title /></Sequence>
        {T.wipes.map((w) => <WaveWipe key={w} f={f - w} />)}
        <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
        <Img src={staticFile("paper.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "multiply", opacity: 0.85 }} />
      </AbsoluteFill>
      {dot > 0 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 26, height: 26, borderRadius: 13, background: "#fff", opacity: dot, boxShadow: "0 0 30px 12px rgba(255,255,255,0.8)" }} />
        </AbsoluteFill>
      )}
      <Audio src={staticFile("audio.wav")} />
    </AbsoluteFill>
  );
};
