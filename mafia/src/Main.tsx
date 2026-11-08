// «Мафиозник на одну минуту»: мир (комната) + камера по раскадровке + вставки + HUD + субтитры + звук.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, getStaticFiles } from "remotion";
import { Fill, Svg, Defs, Grain, Vignette, ip, EO, EIO, rnd, noise1, useFonts, W, H } from "./lib";
import { K, Room, Couch, Table, Guy, GuyPose, Goon, Mom, Bill, Case, Timer, Sparkles, Puff } from "./art";
import TL from "./timeline.json";
import VO from "../tools/vo_durations.json";

const E = TL.ev;
const COND = "'Oswald', sans-serif", MONO = "'JetBrains Mono', monospace";
export const TOTAL = Math.round(TL.total * 30);

// Значение таймера по ключевым точкам
export const timerV = (t: number) => {
  const k = TL.timerKeys as number[][];
  if (t <= k[0][0]) return 60;
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return ip(t, [k[i - 1][0], k[i][0]], [k[i - 1][1], k[i][1]]);
  return 0;
};

// ------------------------------------------------------------------ состояние мира во времени
const world = (t: number) => {
  const suit = t >= E.SNAP + 0.08 && t < E.ZERO;
  // позиция и поза героя
  let gx = 540, gy = 1230, sit = 1, walk = 0, face: GuyPose["face"] = "neutral", lookX = 0, headTilt = 0, lean = 0;
  let armL: [number, number] = [14, 10], armR: [number, number] = [14, 10], pinch = false, snap = 0, pockets = 0;
  if (t < 6.5) {
    sit = 1; gy = 1330;
    armR = t < 3.6 ? [40, 70] : [ip(t, [3.6, 4.4], [40, 150]), ip(t, [3.6, 4.4], [70, 20])];
    face = t < E.FLASH ? "neutral" : t < 2.0 ? "shock" : t < 4.0 ? "panic" : t < E.SNAP + 0.5 ? "squint" : "serious";
    lookX = t < 2 ? 0 : -0.3; headTilt = t < 1.0 ? 8 : 0;
    snap = t > E.SNAP - 0.1 && t < E.SNAP + 0.4 ? 1 : 0;
  } else if (t < 8.0) {
    sit = 0; gy = 1180; face = "squint"; pinch = true; armR = [ip(t, [6.5, 6.9], [20, 40]), 120]; armL = [14, 10];
    lean = Math.sin(t * 4) * 2;
  } else if (t < 9.4) {
    sit = 0; gy = 1180; gx = ip(t, [8.0, 9.4], [540, 740], EIO); walk = t * 9; face = "squint"; lean = 3;
  } else if (t < E.DOOR) {
    sit = 0; gy = 1180; gx = 740; face = "serious"; armR = t < 11.0 ? [70, 60] : [14, 10]; lookX = 0.6;
  } else if (t < E.ZERO) {
    sit = 0; gy = 1180; gx = 600;
    face = t < 13.6 ? "shock" : t < 18.6 ? "serious" : t < 19.4 ? "panic" : t < 27.6 ? "serious" : t < 32.4 ? "neutral" : t < 36 ? "shock" : t < 43 ? "joy" : t < 49.1 ? "panic" : "shock";
    if (t > E.KISS - 0.2 && t < 15.2) armR = [60, 0];
    if (t >= 36 && t < 40.8) { armL = [150 + Math.sin(t * 10) * 15, 20]; armR = [150 + Math.cos(t * 10) * 15, 20]; }
    if (t >= 40.8 && t < 43) { const k = Math.sin(t * 14); armL = [20 + k * 15, 40]; armR = [20 - k * 15, 40]; pockets = ip(t, [40.8, 43], [0.3, 1]); }
    if (t >= 43) pockets = 1;
    if (t >= 49.1 && t < E.ZERO) { const ph = Math.floor((t - 49.1) / 1.2) % 3; lookX = ph === 0 ? 0 : ph === 1 ? -1 : 0; headTilt = ph === 2 ? 14 : 0; }
    if (t >= 19.4 && t < 27.6) headTilt = Math.sin(t * 1.3) * 3;
  } else {
    sit = 0; gy = 1180; gx = 600;
    face = t < E.MOM_DOOR + 0.2 ? "shock" : t < 57.2 ? "blink" : t < 58.8 ? "panic" : "neutral";
    if (t >= E.CANDY - 0.4) armR = [30, 60];
    lookX = t > E.MOM_DOOR ? -1 : 0;
  }
  const glasses = suit && t >= E.GLASSES + 0.6;
  const ring = suit && t >= E.RING;
  const pose: GuyPose = { suit, face, glasses, ring, armL, armR, sit, walk, lean, headTilt, lookX, pockets, snap, pinch };
  return { gx, gy, pose };
};

const World: React.FC<{ t: number }> = ({ t }) => {
  const w = world(t);
  const goonsIn = t >= E.DOOR + 0.15 && t < E.ZERO;
  const enter = ip(t, [E.DOOR + 0.15, E.DOOR + 0.9], [0, 1], EO);
  const kneel = t >= E.KISS && t < 15.0 ? ip(t, [E.KISS, E.KISS + 0.25], [0, 1]) : t >= 15.0 ? ip(t, [15.0, 15.3], [1, 0]) : 0;
  const gunUp = t >= 45.4 ? ip(t, [45.4, 45.8], [0, 1], EO) : 0;
  const doorOpen = t >= E.DOOR && t < E.DOOR + 1.2 ? 1 : t >= E.MOM_DOOR ? ip(t, [E.MOM_DOOR, E.MOM_DOOR + 0.3], [0, 1]) : 0;
  const knock = t >= E.KNOCK && t < E.KNOCK + 1.2 ? Math.sin((t - E.KNOCK) * 40) * 6 : 0;
  const police = t >= E.SIREN && t < E.ZERO ? 1 : 0;
  const tv = timerV(t);
  const timerOn = t >= E.TIMER_ON && t < E.ZERO + 0.1;
  const tPop = ip(t, [E.TIMER_ON, E.TIMER_ON + 0.25], [0, 1], EO);
  const caseOn = t >= E.CASE_DOWN && t < E.ZERO;
  const caseDrop = ip(t, [E.CASE_DOWN, E.CASE_DOWN + 0.2], [-200, 0]);
  const open = ip(t, [E.CASE_OPEN, E.CASE_OPEN + 0.4], [0, 1], EO);
  const talk1 = t >= 15.0 && t < 15.0 + VO.goon1 ? Math.abs(Math.sin(t * 18)) : 0;
  const talk2 = t >= 32.4 && t < 32.4 + VO.goon2 ? Math.abs(Math.sin(t * 18)) : 0;
  const talkG = t >= 45.4 && t < 45.4 + VO.goons ? Math.abs(Math.sin(t * 18)) : 0;
  const momTalk = t >= 56.0 && t < 56.0 + VO.mom ? Math.abs(Math.sin(t * 16)) : 0;
  const after = t >= E.ZERO;
  return (
    <g>
      <g transform={`translate(${knock * 0},0)`}><Room t={t} police={police} doorOpen={doorOpen} /></g>
      {t < 6.6 && <Couch x={540} y={1420} />}
      {goonsIn && <Goon x={ip(enter, [0, 1], [160, 230])} y={1180} s={0.95} t={t} kneel={kneel} gunUp={gunUp} folder={t >= 14.8 && t < 19.0} mouth={talk1 + talkG} />}
      {goonsIn && <Goon x={ip(enter, [0, 1], [160, 950])} y={1190} s={0.95} flip t={t} kneel={kneel} gunUp={gunUp} mouth={talk2 + talkG} tint="#2E2A3A" />}
      <Guy x={w.gx} y={w.gy} s={1} p={w.pose} t={t} />
      {t < 6.5 && <g><rect x={250} y={1300} width={580} height={110} rx={34} fill={K.couch} /><rect x={250} y={1300} width={580} height={22} rx={11} fill="#4C8F80" /></g>}
      {t >= E.MOM_DOOR && <Mom x={160} y={1220} s={0.9} t={t} talk={momTalk} />}
      {t >= E.CASE_DOWN && t < E.ZERO && <Table x={600} y={1640} />}
      {t >= E.CASE_DOWN && t < E.ZERO && <Case x={600} y={1630 + caseDrop} open={open} s={0.7} />}
      {/* денежный дождь (замедленный) */}
      {t >= E.RAIN && t < E.ZERO + 2 && Array.from({ length: 46 }).map((_, i) => {
        const st = E.RAIN + rnd(i) * 4.5;
        if (t < st) return null;
        const ph = (t - st) * 0.32;
        const y = Math.min(1700 + rnd(i * 5) * 140, -100 + ph * 1900);
        const landed = y >= 1700;
        const flyer = after ? 1 : 0;
        return <Bill key={i} x={rnd(i * 2) * 1080 + noise1(ph * 3, i) * 70 * (landed ? 0 : 1)} y={y} r={landed ? rnd(i) * 180 : noise1(ph * 4, i + 3) * 160} s={0.9} flyer={flyer} />;
      })}
      {/* таймер над головой */}
      {timerOn && <Timer x={w.gx} y={w.gy - 760 + (w.pose.sit ? 60 : 0)} s={0.95 * tPop} v={tv} alarm={t >= 46} t={t} />}
      {/* превращение */}
      {t >= E.SNAP && t < E.SNAP + 0.7 && <Sparkles x={w.gx} y={w.gy - 300} p={ip(t, [E.SNAP, E.SNAP + 0.7], [0, 1])} n={26} r={600} />}
      {t >= E.ZERO && t < E.ZERO + 0.8 && <Puff x={w.gx} y={w.gy} p={ip(t, [E.ZERO, E.ZERO + 0.8], [0, 1])} s={1.3} />}
      {t >= E.ZERO && t < E.ZERO + 0.8 && <Puff x={600} y={1180} p={ip(t, [E.ZERO + 0.05, E.ZERO + 0.85], [0, 1])} s={1.5} />}
    </g>
  );
};

// ------------------------------------------------------------------ камера: [начало, конец, cx, cy, zoom, zoomEnd?, тип вставки?]
type Shot = { a: number; b: number; cx?: number; cy?: number; z?: number; z2?: number; ins?: string; shake?: number };
const SHOTS: Shot[] = [
  { a: 0, b: 2.2, cx: 540, cy: 1000, z: 1.0, z2: 1.12 },
  { a: 2.2, b: 3.4, ins: "phone" },
  { a: 3.4, b: 4.4, cx: 540, cy: 800, z: 1.7 },
  { a: 4.4, b: 6.4, cx: 540, cy: 960, z: 1.1, shake: 1 },
  { a: 6.4, b: 8.0, cx: 540, cy: 780, z: 1.5, z2: 1.65 },
  { a: 8.0, b: 9.4, cx: 640, cy: 960, z: 1.05 },
  { a: 9.4, b: 11.8, ins: "glasses" },
  { a: 11.8, b: 12.6, cx: 740, cy: 700, z: 1.9 },
  { a: 12.6, b: 13.4, cx: 540, cy: 960, z: 1.0, shake: 2 },
  { a: 13.4, b: 15.0, cx: 560, cy: 1050, z: 1.25 },
  { a: 15.0, b: 18.6, cx: 380, cy: 860, z: 1.45, z2: 1.55 },
  { a: 18.6, b: 19.4, ins: "timer" },
  { a: 19.4, b: 23.5, cx: 600, cy: 700, z: 2.1, z2: 2.4 },
  { a: 23.5, b: 25.0, cx: 560, cy: 960, z: 1.05 },
  { a: 25.0, b: 27.6, cx: 600, cy: 700, z: 2.4, z2: 2.6 },
  { a: 27.6, b: 32.4, cx: 560, cy: 980, z: 1.0, z2: 1.08 },
  { a: 32.4, b: 34.2, cx: 900, cy: 820, z: 1.6 },
  { a: 34.2, b: 36.0, ins: "case" },
  { a: 36.0, b: 41.0, cx: 560, cy: 1000, z: 1.0, z2: 1.1 },
  { a: 41.0, b: 43.0, cx: 600, cy: 1000, z: 1.6 },
  { a: 43.0, b: 45.4, cx: 420, cy: 960, z: 1.1, shake: 0.6 },
  { a: 45.4, b: 49.1, cx: 560, cy: 940, z: 1.15, z2: 1.3 },
  { a: 49.1, b: 50.3, ins: "timer" },
  { a: 50.3, b: 51.5, cx: 200, cy: 900, z: 1.6, shake: 0.6 },
  { a: 51.5, b: 52.7, cx: 600, cy: 1100, z: 1.9 },
  { a: 52.7, b: 53.6, ins: "timer" },
  { a: 53.6, b: 55.2, cx: 600, cy: 700, z: 2.4, z2: 2.8 },
  { a: 55.2, b: 56.0, cx: 560, cy: 960, z: 1.0 },
  { a: 56.0, b: 58.8, cx: 420, cy: 960, z: 1.0 },
  { a: 58.8, b: 60.6, ins: "candy" },
  { a: 60.6, b: 66.0, cx: 480, cy: 960, z: 1.0, z2: 1.06 },
];

// ------------------------------------------------------------------ вставки
const Insert: React.FC<{ kind: string; t: number; lt: number; len: number }> = ({ kind, t, lt, len }) => {
  if (kind === "phone") {
    const glow = ip(lt, [0, 0.3], [0, 1]);
    return (
      <Fill style={{ background: "radial-gradient(circle at 50% 45%, #6B4A12 0%, #1A1206 70%)" }}>
        <Svg>
          <Defs />
          {Array.from({ length: 16 }).map((_, i) => <path key={i} d={`M540,860 L${540 + Math.cos(i / 16 * Math.PI * 2 + lt) * 1400},${860 + Math.sin(i / 16 * Math.PI * 2 + lt) * 1400} L${540 + Math.cos((i + 0.4) / 16 * Math.PI * 2 + lt) * 1400},${860 + Math.sin((i + 0.4) / 16 * Math.PI * 2 + lt) * 1400} Z`} fill="#FFD76A" opacity={0.12 * glow} />)}
          <g transform={`translate(540,880) rotate(${-6 + lt * 4}) scale(${1 + lt * 0.08})`}>
            <rect x={-230} y={-430} width={460} height={860} rx={60} fill="#111" />
            <rect x={-205} y={-400} width={410} height={800} rx={40} fill={glow > 0.5 ? "#FFD34D" : "#2B6CB0"} filter="url(#glow)" />
            <text x={0} y={-160} textAnchor="middle" fontFamily={COND} fontWeight={700} fontSize={54} fill="#3A2200">ВНИМАНИЕ!</text>
            <text x={0} y={-80} textAnchor="middle" fontFamily={COND} fontWeight={700} fontSize={44} fill="#3A2200">ВЫ НАЗНАЧЕНЫ</text>
            <text x={0} y={-20} textAnchor="middle" fontFamily={COND} fontWeight={700} fontSize={64} fill="#7A1E1E">БОССОМ МАФИИ</text>
            <text x={0} y={60} textAnchor="middle" fontFamily={MONO} fontWeight={800} fontSize={40} fill="#3A2200">срок: 60 сек</text>
            <rect x={-150} y={170} width={300} height={90} rx={45} fill="#2E7D32" /><text x={0} y={230} textAnchor="middle" fontFamily={COND} fontWeight={700} fontSize={44} fill="#fff">ПРИНЯТЬ</text>
            <g transform="translate(130,330)"><ellipse cx={0} cy={0} rx={90} ry={110} fill={K.skin} /><rect x={-60} y={60} width={120} height={300} fill={K.tee} /></g>
          </g>
          <Sparkles x={540} y={860} p={(lt * 0.8) % 1} n={20} r={520} />
        </Svg>
      </Fill>
    );
  }
  if (kind === "glasses") {
    const ringPart = lt < 1.0;
    if (ringPart) {
      const sh = ip(lt, [0.2, 0.6], [0, 1]);
      return (
        <Fill style={{ background: "linear-gradient(160deg,#1A1A1E,#3A2A10)" }}>
          <Svg>
            <Defs />
            <g transform={`translate(540,980) scale(${2.6 + lt * 0.3})`}>
              <rect x={-60} y={-260} width={120} height={200} rx={20} fill={K.suit} />
              <rect x={-64} y={-90} width={128} height={40} rx={10} fill={K.shirt} />
              <ellipse cx={0} cy={0} rx={70} ry={80} fill={K.skin} />
              {[-42, -14, 14, 42].map((fx) => <rect key={fx} x={fx - 13} y={40} width={26} height={70} rx={13} fill={K.skin} />)}
              <rect x={-30} y={50} width={36} height={24} rx={8} fill={K.gold} stroke="#B8860B" strokeWidth={4} />
              <rect x={-20} y={56} width={16} height={12} rx={2} fill="#B3261E" />
            </g>
            <Sparkles x={480} y={1180} p={sh} n={12} r={260} color="#FFF4C0" />
          </Svg>
          <div style={{ position: "absolute", left: 0, right: 0, top: 380, textAlign: "center", fontFamily: COND, fontWeight: 700, fontSize: 70, color: K.gold, textShadow: "0 0 30px rgba(255,201,60,.8), 0 6px 0 #000", opacity: ip(lt, [0.15, 0.3], [0, 1]) }}>ПЕРСТЕНЬ: ✔</div>
        </Fill>
      );
    }
    const g = ip(lt, [1.0, 2.2], [0, 1], EIO);
    const p: GuyPose = { suit: true, face: "serious", glasses: false, armL: [14, 10], armR: [14, 10] };
    return (
      <Fill style={{ background: K.wall }}>
        <Svg>
          <Defs />
          <g transform={`translate(540,${1660 + lt * 10}) scale(3.2)`}><Guy x={0} y={0} p={p} t={t} /></g>
          <g transform={`translate(540,${ip(g, [0, 1], [-300, 1660 - 370 * 3.2 - 100 * 3.2])}) scale(3.2)`}>
            <path d="M-74,-12 L-4,-12 L-10,20 Q-38,30 -66,20 Z M4,-12 L74,-12 L66,20 Q38,30 10,20 Z" fill="#0A0A0C" />
            <line x1={-4} y1={-6} x2={4} y2={-6} stroke="#0A0A0C" strokeWidth={6} /><path d="M-60,-6 L-40,-6" stroke="#fff" strokeWidth={4} opacity={0.5} />
            <path d="M-74,-10 L-110,-14 M74,-10 L110,-14" stroke="#0A0A0C" strokeWidth={6} />
          </g>
        </Svg>
        <div style={{ position: "absolute", left: 40, top: 230, fontFamily: MONO, fontWeight: 800, fontSize: 34, color: "#fff", background: "rgba(0,0,0,.55)", padding: "8px 16px", borderRadius: 12 }}>SLOW-MO ×0.25</div>
      </Fill>
    );
  }
  if (kind === "case") {
    const open = ip(t, [E.CASE_OPEN, E.CASE_OPEN + 0.4], [0, 1], EO);
    return (
      <Fill style={{ background: "radial-gradient(circle at 50% 55%, #3A2A10 0%, #0D0B08 75%)" }}>
        <Svg>
          <Defs />
          {open > 0.2 && Array.from({ length: 14 }).map((_, i) => <path key={i} d={`M540,1000 L${540 + Math.cos(-Math.PI / 2 + (i - 7) * 0.16) * 1600},${1000 + Math.sin(-Math.PI / 2 + (i - 7) * 0.16) * 1600} L${540 + Math.cos(-Math.PI / 2 + (i - 6.6) * 0.16) * 1600},${1000 + Math.sin(-Math.PI / 2 + (i - 6.6) * 0.16) * 1600} Z`} fill="#FFE07A" opacity={0.18 * open} />)}
          <g transform={`translate(540,1200) scale(${1.9 + lt * 0.1})`}><Case x={0} y={0} open={open} /></g>
          <Sparkles x={540} y={950} p={(lt * 0.9) % 1} n={18} r={480} />
        </Svg>
      </Fill>
    );
  }
  if (kind === "timer") {
    const v = timerV(t);
    const alarm = t >= 46;
    return (
      <Fill style={{ background: alarm ? (Math.floor(t * 8) % 2 ? "#2A0508" : "#12040A") : "#0B0B12" }}>
        <Svg><Defs /><Timer x={540} y={900} s={2.6 + lt * 0.2} v={v} alarm={alarm} t={t} /></Svg>
        {!alarm && <div style={{ position: "absolute", left: 0, right: 0, top: 1160, textAlign: "center", fontFamily: COND, fontWeight: 700, fontSize: 60, color: "#fff" }}>😰 ВРЕМЯ ИДЁТ!</div>}
      </Fill>
    );
  }
  if (kind === "candy") {
    const out = ip(lt, [0.1, 0.6], [0, 1], EO);
    return (
      <Fill style={{ background: K.wall }}>
        <Svg>
          <Defs />
          <g transform="translate(540,1000) scale(2.4)">
            <rect x={-200} y={60} width={400} height={300} rx={20} fill={K.pants} />
            <path d="M-140,70 Q0,40 140,70 L120,130 Q0,110 -120,130 Z" fill="#3A3E48" />
            <g transform={`translate(0,${120 - out * 150})`}>
              <rect x={-40} y={0} width={80} height={180} rx={30} fill={K.skin} />
              <ellipse cx={0} cy={-10} rx={70} ry={56} fill={K.skin} />
              <g transform={`translate(0,-40) rotate(${-10 + lt * 8})`}>
                <path d="M-70,-20 L-40,0 L-70,20 Z M70,-20 L40,0 L70,20 Z" fill="#E1262B" />
                <rect x={-42} y={-22} width={84} height={44} rx={20} fill="#E1262B" />
                <path d="M-30,-10 L30,-10 M-30,4 L30,4" stroke="#fff" strokeWidth={5} />
              </g>
            </g>
          </g>
        </Svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", fontFamily: COND, fontWeight: 700, fontSize: 64, color: "#3A2418", opacity: ip(lt, [0.6, 0.8], [0, 1]) }}>ВЕСЬ КАПИТАЛ: 1 КОНФЕТА</div>
      </Fill>
    );
  }
  return null;
};

// ------------------------------------------------------------------ HUD и комикс-надписи
const Burst: React.FC<{ t: number; at: number; dur?: number; text: string; x: number; y: number; color?: string; size?: number; rot?: number }> =
  ({ t, at, dur = 0.9, text, x, y, color = "#FFD000", size = 120, rot = -8 }) => {
  if (t < at || t > at + dur) return null;
  const s = ip(t, [at, at + 0.12, at + 0.2], [0.3, 1.25, 1], EO);
  const o = ip(t, [at + dur - 0.15, at + dur], [1, 0]);
  return <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`, opacity: o,
    fontFamily: COND, fontWeight: 700, fontSize: size, color, WebkitTextStroke: "6px #111", paintOrder: "stroke", textShadow: "8px 8px 0 #111", whiteSpace: "nowrap" }}>{text}</div>;
};

const Card: React.FC<{ t: number; a: number; b: number; x: number; y: number; w: number; children: React.ReactNode; border?: string }> = ({ t, a, b, x, y, w, children, border = "rgba(255,208,0,.8)" }) => {
  if (t < a || t > b) return null;
  const s = ip(t, [a, a + 0.12, a + 0.22], [0.5, 1.08, 1], EO);
  return <div style={{ position: "absolute", left: x, top: y, width: w, transform: `scale(${s})`, transformOrigin: "left top", opacity: ip(t, [b - 0.15, b], [1, 0]),
    background: "rgba(12,12,16,.72)", backdropFilter: "blur(12px)", border: `3px solid ${border}`, borderRadius: 22, padding: "18px 24px", fontFamily: MONO, color: "#fff", boxShadow: "0 12px 40px rgba(0,0,0,.4)" }}>{children}</div>;
};

const Hud: React.FC<{ t: number }> = ({ t }) => {
  const tv = Math.max(0, Math.ceil(timerV(t)));
  const money = Math.min(1_000_000, Math.round(ip(t, [36.0, 38.5], [0, 1_000_000], EO) / 1000) * 1000);
  return (
    <Fill style={{ pointerEvents: "none" }}>
      <Card t={t} a={11.8} b={13.6} x={60} y={230} w={760}>
        <div style={{ fontSize: 26, color: "#FFD000", fontWeight: 800 }}>СТАТУС:</div>
        <div style={{ fontSize: 34, fontWeight: 800 }}>ДОН КОРЛЕОНЕ НА МИНИМАЛКАХ</div>
        <div style={{ fontSize: 30, marginTop: 8 }}>АВТОРИТЕТ: <span style={{ color: "#3DFF8A", fontWeight: 800 }}>999+</span></div>
        <div style={{ fontSize: 30 }}>ОСТАЛОСЬ: <span style={{ color: "#FF2A4D", fontWeight: 800 }}>00:{String(tv).padStart(2, "0")}</span></div>
      </Card>
      <Card t={t} a={28.0} b={32.4} x={60} y={230} w={820} border="rgba(255,42,77,.85)">
        <div style={{ fontSize: 30, color: "#FF2A4D", fontWeight: 800 }}>ПРОБЛЕМЫ СИНДИКАТА:</div>
        {["▸ ПИЦЦЕРИЯ НЕ ПЛАТИТ", "▸ КОНКУРЕНТЫ С СОСЕДНЕЙ УЛИЦЫ", "▸ НАЛОГОВАЯ", "▸ ЭСПРЕССО ЕЩЁ НЕ ПРИНЕСЛИ"].map((s, i) =>
          t > 28.3 + i * 0.7 ? <div key={i} style={{ fontSize: 30, marginTop: 4 }}>{s}</div> : null)}
      </Card>
      {t >= 36.0 && t < 43.0 && <div style={{ position: "absolute", left: 90, right: 90, top: 250, textAlign: "center", padding: "18px 10px", borderRadius: 20,
        background: "#D7192A", fontFamily: COND, fontWeight: 700, fontSize: 80, color: "#fff", transform: `scale(${1 + 0.05 * Math.sin(t * 12)})`, boxShadow: "0 0 50px rgba(255,42,77,.7)" }}>
        ДОХОД: ${money.toLocaleString("en-US")}</div>}
      <Burst t={t} at={E.DOOR} text="БАМ!" x={260} y={700} size={170} />
      <Burst t={t} at={E.KNOCK} dur={1.0} text="ТУК-ТУК-ТУК!" x={360} y={560} size={90} color="#fff" rot={-6} />
      <Burst t={t} at={43.5} dur={1.8} text="ФБР, ОТКРОЙТЕ!" x={540} y={760} size={100} color="#4DA3FF" rot={4} />
      <Burst t={t} at={E.KISS + 0.25} dur={0.8} text="ЧМОК! ЧМОК!" x={540} y={900} size={110} color="#FF6FA5" rot={-5} />
      <Burst t={t} at={E.ZERO} dur={0.9} text="ПУФ!" x={540} y={640} size={200} color="#fff" />
      <Burst t={t} at={E.SNAP} dur={0.7} text="*ЩЁЛК*" x={720} y={520} size={110} />
      <Burst t={t} at={E.CASE_DOWN} dur={0.6} text="БУХ!" x={760} y={980} size={110} color="#fff" />
      {t >= E.ZERO + 0.1 && t < E.ZERO + 0.8 && <div style={{ position: "absolute", left: 0, right: 0, top: 860, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 54, color: "#111", background: "rgba(255,255,255,.85)", padding: 10 }}>⏹ ВРЕМЯ ВЫШЛО</div>}
      {t >= 62.4 && <div style={{ position: "absolute", left: 160, right: 160, top: 250, textAlign: "center", padding: "22px 10px", borderRadius: 60, background: "#E1262B",
        fontFamily: COND, fontWeight: 700, fontSize: 70, color: "#fff", transform: `scale(${ip(t, [62.4, 62.6], [0.4, 1], EO) * (1 + 0.04 * Math.sin(t * 8))})`, boxShadow: "0 10px 0 #8A1014" }}>🔔 ПОДПИШИСЬ</div>}
    </Fill>
  );
};

// ------------------------------------------------------------------ субтитры
const HOT = /мафи|босс|шестьдесят|секунд|понты|перстень|серьёзное|пиццери|предложение|эспрессо|синдикат|миллион|долларов|ФБР|три|тыкву|посуду|подпишись|мусор|Гениально|бой|семью|35/i;
const Captions: React.FC<{ t: number }> = ({ t }) => {
  const v = TL.vo.find((x) => t >= x.at && t < x.at + (VO as Record<string, number>)[x.id] + 0.15);
  if (!v) return null;
  const dur = (VO as Record<string, number>)[v.id];
  const words = v.text.split(" ");
  const chunks: string[][] = []; let cur: string[] = [];
  for (const w of words) { cur.push(w); if (cur.join(" ").length > 18 || /[.!?…,:]$/.test(w) && cur.join(" ").length > 8) { chunks.push(cur); cur = []; } }
  if (cur.length) chunks.push(cur);
  const tot = chunks.reduce((a, c) => a + c.join(" ").length + 4, 0);
  const ph = (t - v.at) / dur; let acc = 0, idx = chunks.length - 1, st = 0;
  for (let i = 0; i < chunks.length; i++) { const l = (chunks[i].join(" ").length + 4) / tot; if (ph < acc + l) { idx = i; st = acc; break; } acc += l; }
  const local = (ph - st) * dur;
  const pop = ip(local, [0, 0.08, 0.14], [0.7, 1.1, 1]);
  const col = v.who === "МАМА" ? "#F06A9A" : v.who === "ДОН" ? "#FFD000" : v.who.startsWith("ГРОМИЛ") ? "#FF8A3D" : v.who === "ЗА ДВЕРЬЮ" ? "#4DA3FF" : "#fff";
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1330, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {v.who && <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color: "#111", background: col, padding: "4px 14px", borderRadius: 10 }}>{v.who}</div>}
      <div style={{ transform: `scale(${pop})`, fontFamily: COND, fontWeight: 700, fontSize: 82, lineHeight: 1.05, textAlign: "center", color: "#fff",
        WebkitTextStroke: "10px #111", paintOrder: "stroke", textShadow: "0 8px 0 #111", textTransform: "uppercase" }}>
        {chunks[idx].map((w, k) => <span key={k} style={{ color: HOT.test(w) ? "#FFD000" : v.who ? col : "#fff" }}>{w}{k < chunks[idx].length - 1 ? " " : ""}</span>)}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ сборка
export const MafiaMain: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  const t = f / 30;
  const shot = SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
  const lt = t - shot.a, len = shot.b - shot.a;
  const hasMix = getStaticFiles().some((s) => s.name === "mix.wav");
  const flash = Math.max(ip(t, [E.SNAP, E.SNAP + 0.05, E.SNAP + 0.3], [0, 1, 0]), ip(t, [E.FLASH, E.FLASH + 0.1, E.FLASH + 0.5], [0, 0.6, 0]), ip(t, [E.ZERO, E.ZERO + 0.05, E.ZERO + 0.25], [0, 0.9, 0]));
  const cutPunch = ip(lt, [0, 0.12], [1.06, 1], EO);
  let content: React.ReactNode;
  if (shot.ins) content = <Insert kind={shot.ins} t={t} lt={lt} len={len} />;
  else {
    const z = ip(lt, [0, len], [shot.z!, shot.z2 ?? shot.z!]) * cutPunch;
    const sh = shot.shake ? { x: noise1(t * 30, 1) * 14 * shot.shake * ip(lt, [0, 0.5], [1, 0.2]), y: noise1(t * 27, 4) * 14 * shot.shake * ip(lt, [0, 0.5], [1, 0.2]) } : { x: 0, y: 0 };
    content = (
      <Svg>
        <Defs />
        <g transform={`translate(${W / 2 - shot.cx! * z + sh.x},${H / 2 - shot.cy! * z + sh.y}) scale(${z})`}><World t={t} /></g>
      </Svg>
    );
  }
  const slowmo = t >= 36 && t < 41;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {content}
      {slowmo && <Fill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,215,90,0) 50%, rgba(255,190,40,.25) 100%)" }} />}
      <Fill style={{ background: "#fff", opacity: flash }} />
      <Hud t={t} />
      <Captions t={t} />
      <Vignette strength={0.45} />
      <Grain opacity={0.06} />
      {hasMix && <Audio src={staticFile("mix.wav")} />}
    </AbsoluteFill>
  );
};
