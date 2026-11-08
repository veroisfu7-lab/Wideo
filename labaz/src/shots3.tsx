// Шоты 13–18: нодья, фонарь и радар, выстрел, рассвет, след, клиффхэнгер
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, Fill, Svg, Defs, Fog, Pop, Label, Type, GlitchBars, ip, EO, EIO, rnd, noise1, shake, W, MONO, COND } from "./lib";
import { Ridge, Conifer, Trunk, Fire, FireDefs, MossClump, Hunter, CreatureEyes, TallFigure, PAL_NIGHT, PAL_FIRE, PAL_DUSK } from "./art";
import { SergeyBust } from "./shots1";

type P = { d: number };

// -------------------------------------------------------------- 12. НОДЬЯ НА ЗЕМЛЕ
export const IGNITE = 66;
export const STRIKES = [12, 22, 32, 44, 54, 62];
export const FireShot: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const lit = ip(f, [IGNITE, IGNITE + 40], [0.15, 1], EO);
  const on = f >= IGNITE;
  const zoom = ip(f, [IGNITE, IGNITE + 12], [1, 1.14], EO);
  const sh = shake(f, on ? 9 : 5, 3);
  const flash = ip(f, [IGNITE, IGNITE + 2, IGNITE + 10], [0, 0.85, 0]);
  const flick = 0.85 + 0.15 * noise1(f * 0.6, 1);
  const strike = STRIKES.find((s) => f >= s && f < s + 6);
  return (
    <Fill style={{ background: C.ink }}>
      <Fill style={{ transform: `translate(${sh.x}px,${sh.y}px) rotate(${sh.r}deg) scale(${zoom})`, transformOrigin: "55% 65%" }}>
        <Svg>
          <Defs /><FireDefs />
          <defs>
            <linearGradient id="trunkFire" x1="0" y1="300" x2="0" y2="1500" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#040506" /><stop offset="1" stopColor="#6a3010" />
            </linearGradient>
          </defs>
          {/* мечущиеся тени-исполины */}
          <g opacity={on ? 1 : 0.15}>
            {[80, 300, 900, 1040].map((x, i) => (
              <g key={i} opacity={lit * flick}>
                <Trunk x={x} w={90 + i * 10} top={-100} bottom={1500} color="url(#trunkFire)" seed={i + 40} />
              </g>
            ))}
            {[0, 1, 2].map((i) => <path key={i} d={`M720,1380 L${-200 + i * 500 + noise1(f * 0.15, i) * 160},-200 L${-60 + i * 500 + noise1(f * 0.15, i) * 160},-200 Z`} fill="#000" opacity={0.45 * lit} />)}
          </g>
          <ellipse cx={720} cy={1440} rx={600} ry={150} fill="#3a1806" opacity={lit * flick} />
          {/* нодья: два бревна */}
          <rect x={540} y={1360} width={420} height={60} rx={30} fill="#2a180c" />
          <rect x={560} y={1310} width={400} height={56} rx={28} fill="#3a2210" />
          <path d="M600,1320 q40,-20 80,0 q40,-30 90,0" stroke="#e8e0cc" strokeWidth={8} fill="none" opacity={on ? 0.2 : 0.9} />
          {on && <Fire x={760} y={1330} s={0.95 * lit} lit={lit} logs={false} seed={7} sparks={30} />}
          {strike !== undefined && Array.from({ length: 10 }).map((_, i) => {
            const t = (f - strike) / 6;
            const a = -0.4 - rnd(i + strike) * 2.2;
            return <circle key={i} cx={650 + Math.cos(a) * t * 160} cy={1290 + Math.sin(a) * t * 160 + t * t * 60} r={3} fill="#FFE6A0" opacity={1 - t} filter="url(#glow)" />;
          })}
          <Hunter x={400} y={1150} s={1.12} pal={on ? PAL_FIRE : PAL_NIGHT}
            pose={{ torso: 22, head: 6, legFront1: 86, legFront2: 92, legBack1: -8, legBack2: 100, armFront1: 74 + (strike !== undefined ? 6 : 0), armFront2: 26, armBack1: 62, armBack2: 30, rifle: "knees" }} />
        </Svg>
      </Fill>
      <Fill style={{ background: `rgba(255,190,110,${flash})` }} />
      <Pop at={IGNITE + 20} x={600} y={220} w={430} pad="18px 20px" border="rgba(255,42,77,0.7)" origin="right top">
        <svg width={390} height={200} viewBox="0 0 390 200">
          <circle cx={100} cy={100} r={80} stroke="rgba(255,255,255,0.15)" strokeWidth={14} fill="none" />
          <circle cx={100} cy={100} r={80} stroke={C.fire} strokeWidth={14} fill="none" strokeDasharray={`${ip(f, [IGNITE + 20, IGNITE + 50], [0, 0.25]) * 502} 502`} transform="rotate(-90,100,100)" strokeLinecap="round" />
          <text x={100} y={96} textAnchor="middle" fill={C.white} fontFamily={MONO} fontWeight={800} fontSize={46}>3</text>
          <text x={100} y={128} textAnchor="middle" fill="rgba(240,244,248,.7)" fontFamily={MONO} fontSize={20}>МЕТРА</text>
          <text x={200} y={70} fill="rgba(240,244,248,.7)" fontFamily={MONO} fontSize={18}>ЗОНА</text>
          <text x={200} y={94} fill="rgba(240,244,248,.7)" fontFamily={MONO} fontSize={18}>ОСВЕЩЕНИЯ</text>
        </svg>
        <Label size={20} color="rgba(240,244,248,.7)">ТАКТИЧЕСКИЙ СТАТУС:</Label>
        <Label size={25} weight={800} color={C.red} style={{ opacity: Math.floor(f / 7) % 2 ? 1 : 0.55 }}>ВЫСОКАЯ УЯЗВИМОСТЬ</Label>
      </Pop>
    </Fill>
  );
};

// -------------------------------------------------------------- 13. ЛУЧ ФОНАРЯ И РАДАР
export const Radar: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const beamOn = f >= 8;
  const ang = -72 + noise1(f * 0.09, 4) * 40 + Math.sin(f * 0.07) * 16; // градусы, -90 = вверх
  const ox = 520, oy = 1250;
  const a1 = ((ang - 15) * Math.PI) / 180, a2 = ((ang + 15) * Math.PI) / 180;
  const L = 1300;
  const beam = `M${ox},${oy} L${ox + Math.cos(a1) * L},${oy + Math.sin(a1) * L} L${ox + Math.cos(a2) * L},${oy + Math.sin(a2) * L} Z`;
  const sh = shake(f, 4, 8);
  const blips = [0, 1, 2].map((i) => (f * 0.03 + i * 2.1) % (Math.PI * 2));
  return (
    <Fill style={{ background: "#020304" }}>
      <Fill style={{ transform: `translate(${sh.x}px,${sh.y}px)` }}>
        <Svg>
          <Defs /><FireDefs />
          <defs>
            <clipPath id="beamClip"><path d={beam} /></clipPath>
            <radialGradient id="beamGrad" cx={ox} cy={oy} r={L} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#E0F7FF" stopOpacity="0.85" /><stop offset="0.45" stopColor="#E0F7FF" stopOpacity="0.35" /><stop offset="0.75" stopColor="#E0F7FF" stopOpacity="0.05" /><stop offset="1" stopColor="#E0F7FF" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* костёр позади, слева внизу */}
          <circle cx={120} cy={1700} r={600} fill="url(#fireGlow)" opacity={0.7} />
          {/* лес, выхватываемый лучом */}
          {beamOn && <g clipPath="url(#beamClip)">
            <rect x={0} y={0} width={W} height={1920} fill="url(#beamGrad)" />
            {Array.from({ length: 20 }).map((_, i) => {
              const x = rnd(i + 70) * 1080, w = 40 + rnd(i) * 70, near = rnd(i * 3);
              return <g key={i} opacity={0.35 + near * 0.5}><Trunk x={x} w={w} top={-100} bottom={900 + near * 300} color="#7a8a8c" seed={i + 70} bark="rgba(20,30,30,0.6)" /></g>;
            })}
            {Array.from({ length: 10 }).map((_, i) => {
              const x = rnd(i + 90) * 1080, y = 950 + rnd(i * 2) * 250;
              return <g key={"p" + i} transform={`translate(${x},${y})`} opacity={0.7}>
                {[-60, -30, 0, 30, 60].map((a) => <path key={a} d={`M0,0 Q${a * 1.2},-80 ${a * 2.4},-60`} stroke="#9ab0a0" strokeWidth={8} fill="none" />)}
              </g>;
            })}
            {/* дым */}
            {Array.from({ length: 6 }).map((_, i) => <ellipse key={i} cx={(i * 260 + f * 2.5) % 1400 - 160} cy={700 + rnd(i) * 500} rx={260} ry={90} fill="#E0F7FF" opacity={0.25} filter="url(#fogblur)" />)}
          </g>}
          {/* плечо и голова Сергея на переднем плане */}
          <g transform="translate(0,0)">
            <path d="M-100,1920 Q-60,1500 160,1400 Q360,1330 520,1300 L560,1360 Q420,1460 360,1920 Z" fill="#0b0907" />
            <ellipse cx={210} cy={1250} rx={150} ry={170} fill="#0d0b09" />
            <path d="M70,1200 Q80,1060 220,1050 Q350,1060 350,1190 Q220,1150 70,1200 Z" fill="#050506" />
            <path d="M350,1200 Q368,1290 330,1360" stroke="#FF8A2A" strokeWidth={6} fill="none" opacity={0.6} />
            {/* ствол с фонарём */}
            <g transform={`rotate(${ang + 90},${ox},${oy})`}>
              <rect x={ox - 9} y={oy - 40} width={18} height={420} rx={6} fill="#121416" />
              <rect x={ox - 20} y={oy - 30} width={40} height={90} rx={10} fill="#1d2023" />
              <ellipse cx={ox} cy={oy - 30} rx={20} ry={8} fill="#F0FBFF" filter="url(#glow)" opacity={beamOn ? 1 : 0} />
            </g>
          </g>
        </Svg>
      </Fill>
      <Pop at={30} x={610} y={230} w={420} pad="16px" origin="right top" border="rgba(61,255,138,0.4)">
        <svg width={386} height={386} viewBox="-193 -193 386 386">
          {[60, 120, 180].map((r) => <circle key={r} r={r} stroke="rgba(61,255,138,0.25)" strokeWidth={2} fill="none" />)}
          <line x1={-180} y1={0} x2={180} y2={0} stroke="rgba(61,255,138,0.15)" /><line x1={0} y1={-180} x2={0} y2={180} stroke="rgba(61,255,138,0.15)" />
          <path d={`M0,0 L${Math.cos(f * 0.12) * 180},${Math.sin(f * 0.12) * 180} A180,180 0 0,0 ${Math.cos(f * 0.12 - 0.6) * 180},${Math.sin(f * 0.12 - 0.6) * 180} Z`} fill="rgba(61,255,138,0.18)" />
          <circle r={130} stroke={C.red} strokeWidth={2} strokeDasharray="6 8" fill="none" opacity={ip(f, [60, 90], [0, 0.9])} />
          {blips.map((a, i) => <g key={i}>
            {[0.12, 0.24, 0.36].map((tr, k) => <circle key={k} cx={Math.cos(a - tr) * 130} cy={Math.sin(a - tr) * 130} r={6 - k * 1.5} fill={C.red} opacity={0.5 - k * 0.15} />)}
            <circle cx={Math.cos(a) * 130} cy={Math.sin(a) * 130} r={10} fill={C.red} filter="url(#glow)" />
          </g>)}
          <circle r={9} fill={C.green} filter="url(#glow)" />
          <text y={30} textAnchor="middle" fill={C.green} fontFamily={MONO} fontWeight={800} fontSize={20}>ВЫ</text>
          <text x={0} y={-150} textAnchor="middle" fill="rgba(240,244,248,.5)" fontFamily={MONO} fontSize={16}>15 М</text>
        </svg>
        <Label size={20} color={C.red} weight={800} style={{ opacity: f > 70 ? 1 : 0 }}>ОКРУЖЕНИЕ //</Label>
        <Label size={20} color={C.red} weight={800} style={{ opacity: f > 70 ? 1 : 0 }}>ДВИЖЕНИЕ ПО ПЕРИМЕТРУ</Label>
      </Pop>
    </Fill>
  );
};

// -------------------------------------------------------------- 14. ВЫСТРЕЛ В ЧАЩУ
export const SHOT_F = 44;
export const Shot: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const fl = f >= SHOT_F && f < SHOT_F + 2;
  const fig = ip(f, [SHOT_F, SHOT_F + 3, SHOT_F + 9], [1, 0.8, 0]);
  const rec = f >= SHOT_F ? Math.exp(-(f - SHOT_F) / 6) : 0;
  const sh = shake(f, 2 + rec * 40, 12);
  const push = ip(f, [0, SHOT_F], [1, 1.08]);
  const bolt = ip(f, [72, 80, 90, 98], [0, 1, 1, 0], EIO);
  const casT = (f - 82) / 30;
  const finger = ip(f, [20, SHOT_F], [0, 1]);
  return (
    <Fill style={{ background: "#030303" }}>
      <Fill style={{ transform: `translate(${sh.x}px,${sh.y}px) rotate(${sh.r}deg) scale(${push})` }}>
        <Svg>
          <Defs /><FireDefs />
          {/* в глубине: силуэт за кедром, виден только во вспышке */}
          <g opacity={fig}>
            <rect x={0} y={0} width={W} height={1920} fill="#2a2a24" opacity={0.6} />
            <TallFigure x={260} y={1150} s={1.05} color="#9a9e98" />
            <Trunk x={330} w={150} top={-100} bottom={1200} color="#141414" seed={3} />
          </g>
          <circle cx={900} cy={1700} r={700} fill="url(#fireGlow)" opacity={0.9} />
        </Svg>
        {/* лицо, освещённое костром */}
        <div style={{ position: "absolute", inset: 0, filter: "sepia(1) saturate(2.4) brightness(0.62) hue-rotate(-12deg) contrast(1.15)" }}>
          <svg width={W} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
            <Defs />
            <g transform="translate(-60,260) scale(1.25)"><SergeyBust f={f} vapor={false} pupil={0.8} /></g>
          </svg>
        </div>
        <Svg>
          <Defs />
          {/* желваки */}
          <path d="M560,1290 q30,-30 50,10" stroke="#3a1a08" strokeWidth={8} fill="none" opacity={0.6 + rec * 0.4} />
          {/* карабин: приклад у щеки, ствол влево вверх */}
          <g transform="translate(0,150) rotate(-10,900,1200)">
            <rect x={-200} y={1150} width={1120} height={26} rx={10} fill="#16181a" />
            <rect x={-200} y={1144} width={30} height={38} rx={6} fill="#0d0e0f" />
            <path d="M560,1140 L1120,1130 L1160,1260 L640,1230 Q600,1200 560,1180 Z" fill="#6a3c1a" />
            <rect x={560} y={1122} width={160} height={30} rx={8} fill="#202326" />
            {/* затвор */}
            <g transform={`translate(${-bolt * 90},0)`}>
              <rect x={640} y={1116} width={80} height={20} rx={6} fill="#33373b" />
              <path d={`M690,1130 l${10 - bolt * 20},${40 - bolt * 30}`} stroke="#33373b" strokeWidth={12} strokeLinecap="round" />
            </g>
            {/* палец на спуске */}
            <path d={`M700,1250 Q${690 - finger * 14},1200 ${660 - finger * 10},1186`} stroke="#8a4a24" strokeWidth={22} fill="none" strokeLinecap="round" />
            {/* дульное пламя */}
            {f >= SHOT_F && f < SHOT_F + 4 && <g filter="url(#bigglow)">
              <path d="M-200,1163 L-520,1060 L-430,1163 L-560,1250 Z" fill="#FFE6A0" />
              <path d="M-200,1163 L-380,1110 L-330,1163 L-400,1210 Z" fill="#FFFFFF" />
            </g>}
            {/* дым из ствола */}
            {f > SHOT_F && <ellipse cx={-200 - (f - SHOT_F) * 6} cy={1150 - (f - SHOT_F) * 3} rx={60 + (f - SHOT_F) * 4} ry={30 + (f - SHOT_F) * 2} fill="#bfb8a8" opacity={ip(f, [SHOT_F, SHOT_F + 40], [0.5, 0])} filter="url(#blur18)" />}
          </g>
          {/* гильза */}
          {casT > 0 && casT < 1 && <g transform={`translate(${720 + casT * 260},${1000 - Math.sin(casT * Math.PI) * 300 + casT * 380}) rotate(${casT * 900})`}>
            <rect x={-8} y={-26} width={16} height={52} rx={4} fill="#d9a441" />
            <rect x={-8} y={-26} width={16} height={10} rx={3} fill="#8a6420" />
          </g>}
          {casT > 0 && casT < 1 && <ellipse cx={720 + casT * 200} cy={1000 - casT * 120} rx={30} ry={14} fill="#ddd" opacity={0.25 * (1 - casT)} filter="url(#blur8)" />}
        </Svg>
      </Fill>
      {fl && <Fill style={{ background: "#fff" }} />}
      <Pop at={SHOT_F + 1} x={60} y={230} w={680} pad="16px 22px" border="rgba(255,42,77,0.8)" glitch>
        <Label size={30} weight={800} color={C.red}>ВЫСТРЕЛ: 7.62 ММ</Label>
        <Label size={22} color="rgba(240,244,248,.7)">РЕАКЦИЯ ЦЕЛИ:</Label>
        <Label size={26} weight={800}>ОТСТУПЛЕНИЕ В ГЛУБИНУ</Label>
      </Pop>
      <GlitchBars on={f >= SHOT_F && f < SHOT_F + 8} intensity={1.5} />
    </Fill>
  );
};

// -------------------------------------------------------------- 15. РАССВЕТНАЯ МГЛА
export const Dawn: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const pull = ip(f, [0, d], [1.22, 1.0], EIO);
  const blue = ip(f, [50, 70], [0, 1]);
  const bpm = Math.round(ip(f, [0, 60], [96, 82], EO));
  return (
    <Fill style={{ background: "linear-gradient(180deg,#1c2142 0%,#4a5478 35%,#a9adbd 55%,#6a7280 70%,#2a303a 100%)" }}>
      <Fill style={{ transform: `scale(${pull})`, transformOrigin: "50% 66%" }}>
        <Svg>
          <Defs /><FireDefs />
          <Ridge y={900} amp={80} color="#6a7390" seed={1.5} opacity={0.8} />
          <Fog y={950} color="#e6e8f0" opacity={0.45} seed={3} />
          <Ridge y={1000} amp={60} color="#4b5370" seed={3.3} x0={400} />
          {Array.from({ length: 12 }).map((_, i) => <Conifer key={i} x={i * 100 - 40} y={1180} h={360 + rnd(i * 5) * 280} color="#262c40" seed={i + 80} />)}
          <path d="M-100,1170 Q540,1140 1180,1180 L1180,1920 L-100,1920 Z" fill="#20252e" />
          {/* угли */}
          <ellipse cx={680} cy={1330} rx={110} ry={26} fill="#2a2420" />
          {Array.from({ length: 10 }).map((_, i) => <circle key={i} cx={610 + rnd(i) * 140} cy={1320 + rnd(i * 2) * 20} r={6 + rnd(i) * 6} fill="#ff6b00" opacity={0.3 + 0.4 * (0.5 + 0.5 * Math.sin(f * 0.1 + i))} filter="url(#glow)" />)}
          {Array.from({ length: 3 }).map((_, i) => {
            const ph = ((f + i * 40) % 120) / 120;
            return <ellipse key={i} cx={680 + noise1(ph * 3, i) * 40} cy={1300 - ph * 500} rx={30 + ph * 60} ry={40 + ph * 80} fill="#b8bcc8" opacity={0.3 * (1 - ph)} filter="url(#blur18)" />;
          })}
          {/* Сергей на бревне */}
          <rect x={260} y={1280} width={360} height={56} rx={28} fill="#2e2a26" />
          <Hunter x={440} y={1262} s={0.72} pal={PAL_DUSK} pose={{ torso: 30, head: 26, legFront1: 80, legFront2: 86, legBack1: 74, legBack2: 82, armFront1: 40, armFront2: 30, armBack1: 34, armBack2: 30, rifle: "knees" }} />
          {/* густой туман у земли */}
          <Fog y={1350} h={260} color="#eef0f6" opacity={0.6} seed={11} speed={0.3} n={8} />
          <Fog y={1450} h={200} color="#eef0f6" opacity={0.55} seed={13} speed={0.5} n={8} />
        </Svg>
      </Fill>
      <Pop at={10} x={600} y={220} w={430} pad="12px 18px" border={blue > 0.5 ? "rgba(0,240,255,0.5)" : "rgba(255,42,77,0.6)"} origin="right top">
        <Label size={22} color="rgba(240,244,248,.7)">ВРЕМЯ:</Label>
        <Label size={44} weight={800} color={blue > 0.5 ? C.cyan : C.red}>04:45</Label>
      </Pop>
      <Pop at={56} x={50} y={410} w={980} pad="14px 22px" border="rgba(0,240,255,0.5)">
        <Label size={23} color={C.cyan}>СОЛНЕЧНЫЙ ДИСК: −2° ЗА ГОРИЗОНТОМ // РАССВЕТ</Label>
      </Pop>
      <Pop at={30} x={50} y={540} w={430} pad="12px 18px" border="rgba(61,255,138,0.45)">
        <Label size={26} weight={800} color={C.green}>ПУЛЬС: {bpm} УД/МИН</Label>
      </Pop>
    </Fill>
  );
};

// -------------------------------------------------------------- 16. СЛЕД
export const Track: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const scan = ip(f, [8, 70], [0, 1]);
  const scanY = 600 + scan * 760;
  const push = ip(f, [0, d], [1.0, 1.1]);
  const cx = 540, cy = 980;
  const print = (k: number) => `M${cx},${cy + 170 * k} C${cx - 80 * k},${cy + 160 * k} ${cx - 90 * k},${cy - 40 * k} ${cx - 60 * k},${cy - 130 * k} C${cx - 30 * k},${cy - 190 * k} ${cx + 30 * k},${cy - 190 * k} ${cx + 60 * k},${cy - 130 * k} C${cx + 90 * k},${cy - 40 * k} ${cx + 80 * k},${cy + 160 * k} ${cx},${cy + 170 * k} Z`;
  const toes = [[-74, -236, -16], [-26, -270, -5], [26, -270, 5], [74, -236, 16]];
  return (
    <Fill style={{ background: "#141a12" }}>
      <Fill style={{ transform: `scale(${push})`, transformOrigin: "50% 52%" }}>
        <Svg>
          <Defs />
          {/* мох вокруг */}
          {Array.from({ length: 60 }).map((_, i) => <MossClump key={i} x={rnd(i) * 1180 - 50} y={rnd(i * 3) * 1950} r={50 + rnd(i * 5) * 50} color={i % 2 ? "#3c5230" : "#4a6238"} hi="#7d9a5a" seed={i} />)}
          {/* разорванный мох и глина */}
          <path d="M260,560 Q520,480 800,600 Q900,800 860,1100 Q820,1380 560,1420 Q300,1400 240,1160 Q180,860 260,560 Z" fill="#17110c" />
          <path d="M260,560 Q520,480 800,600" stroke="#5c7240" strokeWidth={26} fill="none" strokeLinecap="round" />
          <path d="M240,1160 Q300,1400 560,1420" stroke="#5c7240" strokeWidth={22} fill="none" strokeLinecap="round" />
          {Array.from({ length: 10 }).map((_, i) => <path key={i} d={`M${300 + rnd(i) * 500},${600 + rnd(i * 2) * 800} q${(rnd(i * 3) - 0.5) * 60},20 ${(rnd(i * 4) - 0.5) * 80},50`} stroke="#4a5e34" strokeWidth={10} strokeLinecap="round" />)}
          {Array.from({ length: 40 }).map((_, i) => <circle key={"w" + i} cx={280 + rnd(i + 5) * 560} cy={600 + rnd(i + 6) * 800} r={2 + rnd(i) * 3} fill="#c8d8e0" opacity={0.25} />)}
          {/* отпечаток */}
          <path d={print(1.08)} fill="#0b0805" />
          <path d={print(1)} fill="#050302" />
          <path d={print(1)} stroke="#3a2a1c" strokeWidth={4} fill="none" />
          {toes.map(([dx, dy, a], i) => (
            <g key={i} transform={`translate(${cx + dx},${cy + dy}) rotate(${a})`}>
              <ellipse cx={0} cy={0} rx={22} ry={66} fill="#050302" />
              <path d="M0,-60 L0,-230" stroke="#050302" strokeWidth={14} strokeLinecap="round" />
              <path d="M-6,-70 L-6,-226" stroke="#4a3624" strokeWidth={3} />
            </g>
          ))}
          {/* скан */}
          {f > 8 && <g opacity={ip(f, [8, 16], [0, 1])}>
            {[1.25, 1.5, 1.8, 2.15].map((k, i) => <path key={i} d={print(k)} stroke={C.cyan} strokeWidth={2} fill="none" opacity={0.65 - i * 0.12} strokeDasharray="2200" strokeDashoffset={2200 * (1 - ip(f, [12 + i * 8, 50 + i * 8], [0, 1]))} filter="url(#glow)" />)}
            {Array.from({ length: 13 }).map((_, i) => <line key={"g" + i} x1={140 + i * 66} y1={560} x2={140 + i * 66} y2={1440} stroke={C.cyan} strokeWidth={1} opacity={0.18} />)}
            {Array.from({ length: 14 }).map((_, i) => <line key={"h" + i} x1={140} y1={560 + i * 66} x2={940} y2={560 + i * 66} stroke={C.cyan} strokeWidth={1} opacity={0.18} />)}
            {scan < 1 && <rect x={120} y={scanY - 3} width={840} height={6} fill={C.cyan} filter="url(#bigglow)" />}
          </g>}
        </Svg>
      </Fill>
      <Pop at={14} x={50} y={220} w={980} pad="16px 22px" border="rgba(0,240,255,0.5)">
        <Label size={24} color={C.cyan}>СКАНИРОВАНИЕ ОТПЕЧАТКА{".".repeat(1 + Math.floor(f / 8) % 3)}</Label>
        <div style={{ fontFamily: MONO, fontSize: 24, lineHeight: 1.5, color: C.white, marginTop: 6 }}>
          ▸ СРАВНЕНИЕ С БАЗОЙ:{" "}
          {["МЕДВЕДЬ", "ВОЛК", "РОСОМАХА"].map((n, i) => f > 30 + i * 12 ? <span key={n}>{i ? " // " : ""}{n} (<span style={{ color: C.red, fontWeight: 800 }}>НЕТ</span>)</span> : null)}
        </div>
        {f > 72 && <Type at={72} cps={50} text={"▸ АНОМАЛИЯ: ГЛУБИНА ВДАВЛИВАНИЯ > 8 СМ (МАССА > 250 КГ)"} style={{ fontFamily: MONO, fontSize: 24, lineHeight: 1.5, color: C.yellow }} />}
      </Pop>
      {f > 112 && <div style={{ position: "absolute", left: 90, right: 90, top: 1190, textAlign: "center", padding: "16px 20px", borderRadius: 16,
        background: "rgba(255,42,77,0.88)", fontFamily: MONO, fontWeight: 800, fontSize: 38, color: C.white,
        boxShadow: "0 0 50px rgba(255,42,77,0.7)", opacity: Math.floor(f / 6) % 2 ? 1 : 0.55 }}>СЛЕДЫ НЕ ПРИНАДЛЕЖАТ ЗВЕРЮ?</div>}
    </Fill>
  );
};

// -------------------------------------------------------------- 17. КЛИФФХЭНГЕР
export const CUT = 62;
export const TITLES = [CUT + 6, CUT + 34, CUT + 64];
export const End: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  if (f < CUT) {
    const s = 3.4;
    const pupil = ip(f, [0, 30], [1.4, 0.55], EO);
    const tr = shake(f, 3, 21);
    return (
      <Fill style={{ background: "#000" }}>
        <div style={{ position: "absolute", inset: 0, filter: "saturate(0.45) brightness(0.8) hue-rotate(185deg) sepia(0.15)", transform: `translate(${tr.x}px,${tr.y}px) scale(${ip(f, [0, CUT], [1, 1.12])})` }}>
          <svg width={W} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute" }}>
            <Defs />
            <g transform={`translate(${540 - 552 * s},${880 - 668 * s}) scale(${s})`}><SergeyBust f={f} pupil={pupil} vapor={false} /></g>
          </svg>
        </div>
        <Fill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.9) 100%)" }} />
      </Fill>
    );
  }
  const slam = (at: number) => ({ o: ip(f, [at, at + 2], [0, 1]), s: ip(f, [at, at + 7], [1.5, 1], EO) });
  const lines: [string, number, string, number][] = [
    ["ЧАСТЬ 2: АНАТОМИЯ НЕИЗВЕСТНОГО", 46, C.yellow, TITLES[0]],
    ["КТО КРУЖИЛ ВОКРУГ ЛАБАЗА?", 76, C.white, TITLES[1]],
    ["РАЗБОР СЛЕДОВ — В СЛЕДУЮЩЕЙ СЕРИИ…", 38, "rgba(240,244,248,0.85)", TITLES[2]],
  ];
  const eyesO = f > d - 60 ? ip(f, [d - 60, d - 50, d - 12, d - 4], [0, 0.85, 0.85, 0]) : 0;
  return (
    <Fill style={{ background: "#000" }}>
      <Svg><Defs /><CreatureEyes x={540} y={1380} s={0.7} o={eyesO} blink={f > d - 30 && f < d - 26 ? 0.1 : 1} /></Svg>
      <div style={{ position: "absolute", left: 50, right: 50, top: 640, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        {lines.map(([t, size, col, at], i) => {
          const sl = slam(at);
          return f >= at ? <div key={i} style={{ fontFamily: i === 1 ? COND : MONO, fontWeight: 700, fontSize: size, color: col, textAlign: "center", lineHeight: 1.1,
            opacity: sl.o, transform: `scale(${sl.s})`, letterSpacing: i === 1 ? 2 : 1,
            textShadow: `0 0 24px rgba(255,255,255,0.45)${f - at < 5 ? ", 5px 0 rgba(255,42,77,.9), -5px 0 rgba(0,240,255,.9)" : ""}` }}>{t}</div> : null;
        })}
      </div>
      <GlitchBars on={TITLES.some((t) => f >= t && f < t + 3) || (f >= CUT && f < CUT + 3)} intensity={0.8} />
    </Fill>
  );
};
