// Композиция: WebGL-кадр (движок) + HUD поверх (React). Кадры детерминированы: состояние — функция номера кадра.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import { Engine, Hud } from "./engine/engine";
import { direct } from "./film/director";
import { HUD } from "./hud/HUD";
import { fontsReady } from "./fonts";

const IP = getInputProps() as { sc?: number; offset?: number; list?: number[] };
let enginePromise: Promise<Engine> | null = null;
const getEngine = (c: HTMLCanvasElement, w: number, h: number) => {
  if (!enginePromise) enginePromise = (async () => { const E = new Engine(c, w, h, IP.sc ?? 0.7); await E.init(); return E; })();
  return enginePromise;
};

export const Film: React.FC = () => {
  const f0 = useCurrentFrame();
  const frame = IP.list ? IP.list[Math.min(f0, IP.list.length - 1)] : f0 + (IP.offset ?? 0);
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<(Hud & { frame: number }) | null>(null);
  const handle = useMemo(() => delayRender("frame " + frame, { timeoutInMilliseconds: 600000 }), [frame]);
  useLayoutEffect(() => {
    let dead = false;
    Promise.all([getEngine(ref.current!, width, height), fontsReady()]).then(([E]) => {
      if (dead) return;
      E.reset();
      const h = direct(E, frame);
      E.render();
      setHud({ ...h, frame });
    }).catch((e) => { console.error(e); });
    return () => { dead = true; };
  }, [frame]);
  useEffect(() => { if (hud && hud.frame === frame) continueRender(handle); }, [hud, frame]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={width} height={height} style={{ width, height, position: "absolute" }} />
      {hud && hud.frame === frame ? <HUD hud={hud} frame={frame} /> : null}
    </AbsoluteFill>
  );
};
