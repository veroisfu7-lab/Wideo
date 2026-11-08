// Сборка ролика: шоты по таймлайну + постоянный HUD (REC-плашка), субтитры, зерно, виньетка, звук.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, getStaticFiles } from "remotion";
import { C, Fill, Grain, Vignette, MONO, ip, useFonts, glassStyle } from "./lib";
import { PLACED, Placed } from "./timeline";
import * as S1 from "./shots1";
import * as S2 from "./shots2";
import * as S3 from "./shots3";

const MAP: Record<string, React.FC<{ d: number }>> = {
  cold: S1.Cold, taboo: S1.Taboo, sergey: S1.Sergey, offer: S1.Offer, boil: S1.Boil, feet: S1.Feet,
  pecker: S2.Pecker, labaz: S2.Labaz, dusk: S2.Dusk, night: S2.Night, sound: S2.Sound, under: S2.Under,
  fire: S3.FireShot, radar: S3.Radar, shot: S3.Shot, dawn: S3.Dawn, track: S3.Track, end: S3.End,
};

// Разбивка текста на куски субтитров (≤ ~26 символов), время — пропорционально числу символов
const chunks = (p: Placed) => {
  const words = p.text.split(" ");
  const out: string[] = []; let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 26 && cur) { out.push(cur.trim()); cur = w; } else cur += " " + w;
    if (/[.:!?…]$/.test(w) && cur.trim().length > 12) { out.push(cur.trim()); cur = ""; }
  }
  if (cur.trim()) out.push(cur.trim());
  const total = out.reduce((a, s) => a + s.length + 6, 0);
  let acc = 0;
  return out.map((s) => { const st = acc / total; acc += s.length + 6; return { s, st, en: acc / total }; });
};

const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const p = PLACED.find((x) => f >= x.voFrom && f < x.voFrom + x.voFrames + 6);
  if (!p || p.id === "end") return null;
  const ph = (f - p.voFrom) / p.voFrames;
  const cs = chunks(p);
  const i = cs.findIndex((c) => ph >= c.st && ph < c.en);
  const c = cs[i === -1 ? cs.length - 1 : i];
  const local = (ph - c.st) * p.voFrames;
  const pop = ip(local, [0, 4], [0.9, 1]);
  const words = c.s.split(" ");
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1365, display: "flex", justifyContent: "center" }}>
      <div style={{ ...glassStyle(), background: "rgba(5,8,10,0.55)", padding: "16px 26px", borderRadius: 18, transform: `scale(${pop})`,
        fontFamily: MONO, fontWeight: 800, fontSize: 46, lineHeight: 1.22, textAlign: "center", color: C.white, maxWidth: 980 }}>
        {words.map((w, k) => {
          const hot = /\d|закон|табу|род|не медведь|лабаз|солонец|стук|выстрел|рассвет|ночи|кругами|медведь|мишень|зверем|кровь|тишины/i.test(w);
          return <span key={k} style={{ color: hot ? C.yellow : C.white }}>{w}{k < words.length - 1 ? " " : ""}</span>;
        })}
      </div>
    </div>
  );
};

const TopBar: React.FC = () => {
  const f = useCurrentFrame();
  const endFrom = PLACED[PLACED.length - 1].from + S3.CUT;
  if (f >= endFrom) return null;
  const dot = Math.floor(f / 15) % 2 === 0;
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 120, display: "flex", justifyContent: "center" }}>
      <div style={{ ...glassStyle(), borderRadius: 14, padding: "10px 18px", fontFamily: MONO, fontSize: 23, fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap", display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ color: C.red, opacity: dot ? 1 : 0.25 }}>●</span>
        <span style={{ color: C.red }}>REC</span>
        <span style={{ opacity: 0.85 }}>SURVIVE ARCHIVE // ТАЙНЫ СИБИРИ | ЭП. 12 • Ч. 1</span>
      </div>
    </div>
  );
};

export const LabazMain: React.FC = () => {
  useFonts();
  const hasMix = getStaticFiles().some((s) => s.name === "mix.wav");
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {PLACED.map((p) => {
        const Comp = MAP[p.id];
        return <Sequence key={p.id} from={p.from} durationInFrames={p.frames} name={p.id}><Comp d={p.frames} /></Sequence>;
      })}
      <Vignette strength={0.7} />
      <Grain opacity={0.09} />
      <TopBar />
      <Captions />
      {hasMix && <Audio src={staticFile("mix.wav")} />}
    </AbsoluteFill>
  );
};

export const Fallback: React.FC = () => <Fill />;
