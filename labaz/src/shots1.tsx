// Шоты 1–6: холодный старт, табу, Сергей, обряд, отвар, обвязка
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, Fill, Svg, Defs, Fog, Pop, Type, Label, LedBar, GlitchBars, Corners, ip, EO, EIO, rnd, noise1, H, W, MONO, HAND, COND } from "./lib";
import { Ridge, Conifer, Trunk, Bough, Lichen, Fire, FireDefs, MossClump, Hunter, Deer, CreatureEyes, PAL_DAY } from "./art";

type P = { d: number };

// -------------------------------------------------------------- 0. ХОЛОДНЫЙ СТАРТ: костёр и глаза
export const Cold: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const push = ip(f, [0, d], [1.0, 1.09]);
  const eyesX = 540 - ip(f, [70, 76], [0, 150], EIO);
  const eyesO = f < 22 ? 0 : f < 70 ? ip(f, [22, 25], [0, 1]) : ip(f, [70, 77], [1, 0]);
  const blink = f > 46 && f < 50 ? 0.15 : 1;
  const flick = 0.85 + 0.15 * noise1(f * 0.5, 2);
  const trunks = [[-30, 150], [170, 120], [395, 95], [690, 105], [915, 140], [1110, 160]];
  const rew = f > d - 16;
  return (
    <Fill style={{ background: C.ink }}>
      <Fill style={{ transform: `scale(${push})`, transformOrigin: "50% 62%" }}>
        <Svg>
          <Defs /><FireDefs />
          <defs>
            <linearGradient id="trunkLit" x1="0" y1="900" x2="0" y2="1760" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#040506" /><stop offset="0.55" stopColor="#120a05" /><stop offset="1" stopColor="#5a2a0c" />
            </linearGradient>
            <radialGradient id="groundLit" cx="540" cy="1600" r="640" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#6a3410" /><stop offset="0.5" stopColor="#1e0f06" /><stop offset="1" stopColor="#05080A" />
            </radialGradient>
          </defs>
          <rect x={0} y={1480} width={W} height={440} fill="url(#groundLit)" opacity={flick} />
          {trunks.map(([x, w], i) => <g key={i} opacity={flick}><Trunk x={x} w={w} top={-50} bottom={1560 + i % 2 * 30} color="url(#trunkLit)" seed={i + 3} bark="rgba(0,0,0,0.5)" /></g>)}
          <CreatureEyes x={eyesX} y={960} s={0.8} o={eyesO} blink={blink} />
          <Fire x={540} y={1600} s={0.82} seed={4} />
        </Svg>
      </Fill>
      <Pop at={84} x={90} y={560} w={900} border="rgba(255,42,77,0.9)" glitch origin="center center"
        style={{ background: "rgba(5,8,10,0.72)", textAlign: "center", boxShadow: "0 0 50px rgba(255,42,77,0.35)" }}>
        <Label color={C.red} size={34} style={{ letterSpacing: 3 }}>⚠ ВНИМАНИЕ: АНОМАЛЬНАЯ АКТИВНОСТЬ</Label>
        <Label size={40} weight={800} style={{ marginTop: 10 }}>ОНИ НЕ ДОЛЖНЫ БЫЛИ ПРИЙТИ</Label>
      </Pop>
      <Pop at={10} x={700} y={215} pad="10px 18px" border="rgba(61,255,138,0.4)">
        <Label size={26} color={C.green}>НОЧЬ • 01:16:42</Label>
      </Pop>
      <GlitchBars on={(f > 82 && f < 90) || rew} intensity={rew ? 1.6 : 1} />
      {rew && (
        <Fill style={{ background: `rgba(224,247,255,${ip(f, [d - 16, d - 10, d], [0, 0.25, 0.9])})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: COND, fontWeight: 700, fontSize: 96, color: C.ink, letterSpacing: 4, transform: `translateX(${(rnd(f) - 0.5) * 40}px)`,
            textShadow: "6px 0 rgba(255,42,77,.8), -6px 0 rgba(0,240,255,.8)" }}>◀◀ 18 ЧАСОВ НАЗАД</div>
        </Fill>
      )}
    </Fill>
  );
};

// -------------------------------------------------------------- 1. ТАБУ: марал с телёнком
export const Taboo: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const track = ip(f, [0, d], [0, 1]);
  const xb = -track * 40, xm = -track * 110, xf = -track * 260;
  const deerX = 600 + xm, deerY = 1290;
  const graze = 0.5 + 0.5 * Math.sin(f * 0.05);
  const lockR = ip(f, [36, 56], [460, 210], EO);
  const red = f >= 92;
  const flash = f >= 92 && f < 100 && Math.floor(f / 2) % 2 === 0;
  const cross = ip(f, [96, 106], [0, 1], EO);
  const tc = { x: deerX - 70, y: deerY - 250 };
  return (
    <Fill style={{ background: "linear-gradient(180deg,#1f2f33 0%,#5f7a72 42%,#b7b49a 56%,#2a3a2c 70%)" }}>
      <Svg>
        <Defs />
        {/* лучи */}
        <g opacity={0.18} style={{ mixBlendMode: "screen" }}>
          {[0, 1, 2, 3].map((i) => <path key={i} d={`M${-200 + i * 260 + xb * 2},-100 L${80 + i * 260 + xb * 2},-100 L${700 + i * 300 + xb},1500 L${420 + i * 300 + xb},1500 Z`} fill="#fff8d8" filter="url(#blur18)" />)}
        </g>
        <g transform={`translate(${xb},0)`}>
          <Ridge y={820} amp={110} color="#3e5a5a" seed={1} opacity={0.75} />
          <Fog y={860} color="#cfe0da" opacity={0.45} seed={2} speed={0.4} />
          <Ridge y={930} amp={90} color="#2c4646" seed={2.4} x0={300} />
          <Fog y={980} color="#cfe0da" opacity={0.4} seed={5} speed={0.5} />
          <Ridge y={1040} amp={70} color="#1d3233" seed={4.2} x0={600} period={300} />
        </g>
        <g transform={`translate(${xm},0)`}>
          {[80, 200, 940, 1080, 1180].map((x, i) => <Conifer key={i} x={x} y={1200 + i * 6} h={420 + rnd(i) * 160} color="#13221f" seed={i} />)}
          <path d="M-200,1320 Q300,1180 700,1250 Q1050,1300 1400,1240 L1400,1920 L-200,1920 Z" fill="#26341f" />
          <path d="M-200,1320 Q300,1180 700,1250 Q1050,1300 1400,1240" stroke="#7c8a4a" strokeWidth={6} fill="none" opacity={0.6} />
          {Array.from({ length: 26 }).map((_, i) => <MossClump key={i} x={rnd(i) * 1300 - 100} y={1300 + rnd(i * 3) * 600} r={30 + rnd(i * 5) * 40} color="#2f4126" hi="#4c5f30" seed={i} />)}
          <Deer x={600} y={deerY} s={0.9} color="#4f3b2a" rim="#ffd9a0" graze={graze} step={Math.sin(f * 0.04)} />
          <Deer x={810} y={deerY + 20} s={0.8} color="#5a4430" rim="#ffe0b0" graze={0.3 + 0.3 * Math.sin(f * 0.07 + 1)} calf />
        </g>
        {/* рамка захвата */}
        {f >= 36 && (
          <g>
            <circle cx={tc.x} cy={tc.y} r={lockR} stroke={red ? C.red : C.cyan} strokeWidth={3} fill="none" opacity={flash ? 0.3 : 0.9} filter="url(#glow)" strokeDasharray="14 10" />
            <Corners x={tc.x - lockR} y={tc.y - lockR} w={lockR * 2} h={lockR * 2} color={red ? C.red : C.cyan} len={40} />
            {red && <g stroke={C.red} strokeWidth={10} strokeLinecap="round" filter="url(#bigglow)">
              <line x1={tc.x - 150} y1={tc.y - 150} x2={tc.x - 150 + 300 * cross} y2={tc.y - 150 + 300 * cross} />
              <line x1={tc.x + 150} y1={tc.y - 150} x2={tc.x + 150 - 300 * cross} y2={tc.y - 150 + 300 * cross} />
            </g>}
          </g>
        )}
        {/* передний план: размытые лапы, лишайник, роса */}
        <g transform={`translate(${xf},0)`} filter="url(#blur8)">
          <Bough x={-60} y={330} len={720} angle={14} color="#060b08" seed={3} needle={70} sw={16} />
          <Bough x={1500} y={240} len={760} angle={168} color="#060b08" seed={5} needle={80} sw={18} />
          <Bough x={-80} y={1720} len={560} angle={-22} color="#050806" seed={8} needle={80} sw={18} />
        </g>
        <g transform={`translate(${xf},0)`}>
          <Lichen x={220} y={360} len={200} seed={1} /><Lichen x={1180} y={300} len={260} seed={4} /><Lichen x={760} y={250} len={160} seed={7} />
          {Array.from({ length: 6 }).map((_, i) => {
            const ph = ((f + i * 23) % 70) / 70;
            return <ellipse key={i} cx={260 + i * 190} cy={380 + ph * 900} rx={4} ry={9} fill="#e8fbff" opacity={(1 - ph) * 0.6} filter="url(#blur3)" />;
          })}
        </g>
      </Svg>
      <Pop at={104} x={tc.x + 40 > 600 ? 560 : 520} y={tc.y - 560} w={500} border="rgba(255,42,77,0.7)">
        <Label color={C.red} size={34} weight={800}>[ СТАТУС: ТАБУ ]</Label>
        <Label size={27} style={{ marginTop: 8 }}>▸ САМКА С ТЕЛЁНКОМ</Label>
        <Label size={27} color={C.yellow}>▸ ПРЕКРАЩЕНИЕ РОДА{"\n"}  = СМЕРТНЫЙ ГРЕХ</Label>
      </Pop>
      {f < 50 && <div style={{ position: "absolute", left: 60, top: 220, fontFamily: MONO, fontSize: 26, color: C.ice, opacity: ip(f, [0, 6, 40, 50], [0, 1, 1, 0]), letterSpacing: 2 }}>[ 18 ЧАСОВ ДО… ] 06:52</div>}
    </Fill>
  );
};

// -------------------------------------------------------------- 2. СЕРГЕЙ: поясной план
export const SergeyBust: React.FC<{ f: number; pupil?: number; vapor?: boolean }> = ({ f, pupil = 1, vapor = true }) => {
  const breathPh = (f % 84) / 84;
  const chest = Math.sin(breathPh * Math.PI * 2) * 4;
  const stub = Array.from({ length: 140 }).map((_, i) => {
    const a = rnd(i) * Math.PI, rr = 0.55 + rnd(i * 3) * 0.45;
    return <circle key={i} cx={548 + Math.cos(a) * 120 * rr} cy={760 + Math.sin(a) * 105 * rr} r={1.6} fill="#3a2a22" opacity={0.55} />;
  });
  return (
    <g>
      {/* карабин за плечом */}
      <g transform="translate(300,1020) rotate(-16)">
        <rect x={-10} y={-620} width={20} height={560} rx={6} fill="#22262a" />
        <rect x={-16} y={-120} width={32} height={180} rx={8} fill="#a97848" />
        <path d="M-16,-90 l32,8 M-16,-40 l32,-6 M-16,10 l32,10" stroke="#5a3a1c" strokeWidth={3} opacity={0.6} />
      </g>
      {/* корпус */}
      <path d={`M120,1920 Q140,1300 230,1130 Q330,${1000 - chest} 470,${985 - chest} L640,${985 - chest} Q790,${1000 - chest} 880,1140 Q960,1320 980,1920 Z`} fill="#6b6a45" />
      <path d="M230,1130 Q300,1400 260,1920 L120,1920 Q140,1300 230,1130 Z" fill="#4f4e33" />
      <path d="M760,1200 q40,90 20,200 M840,1300 q20,80 -10,170 M330,1250 q-20,100 10,220" stroke="#4a4930" strokeWidth={8} fill="none" strokeLinecap="round" />
      <path d={`M440,${990 - chest} L540,1110 L660,${990 - chest} L620,960 L540,1040 L470,960 Z`} fill="#5c5b3a" />
      {/* ремень брезентовый */}
      <path d={`M330,${1040 - chest} L860,1700`} stroke="#8a7650" strokeWidth={52} />
      <path d={`M330,${1040 - chest} L860,1700`} stroke="#5d4f33" strokeWidth={44} strokeDasharray="10 14" opacity={0.6} fill="none" />
      <rect x={560} y={1340} width={70} height={46} rx={6} fill="#5a5c60" transform="rotate(51,595,1363)" />
      {/* шея и голова */}
      <path d="M470,980 L480,860 L620,860 L640,980 Z" fill="#a8785c" />
      <path d="M430,640 Q420,520 540,505 Q670,505 672,640 L668,760 Q650,870 560,890 Q470,885 448,800 Z" fill="#c39274" />
      <path d="M448,800 Q470,885 560,890 Q650,870 668,760 L660,720 Q620,820 545,830 Q470,820 452,740 Z" fill="#9b6c54" />
      {stub}
      <ellipse cx={428} cy={700} rx={22} ry={40} fill="#ad7b60" />
      {/* глаза с прищуром */}
      {[495, 610].map((x, i) => (
        <g key={i}>
          <path d={`M${x - 36},668 Q${x},650 ${x + 36},670 Q${x},684 ${x - 36},668 Z`} fill="#f2ebe2" />
          <circle cx={x + 4} cy={668} r={11} fill="#8fb4c4" /><circle cx={x + 4} cy={668} r={5 * pupil} fill="#101315" />
          <circle cx={x + 7} cy={665} r={2.5} fill="#fff" />
          <path d={`M${x - 40},664 Q${x},640 ${x + 40},664`} stroke="#5c3d2f" strokeWidth={6} fill="none" />
          <path d={`M${x - 42},634 Q${x},${618 + i * 4} ${x + 40},632`} stroke="#5a4232" strokeWidth={10} fill="none" strokeLinecap="round" />
        </g>
      ))}
      <path d="M560,680 L590,770 L548,780" stroke="#9b6c54" strokeWidth={8} fill="none" strokeLinejoin="round" />
      <path d="M512,818 Q552,826 596,814" stroke="#6b4234" strokeWidth={6} fill="none" strokeLinecap="round" />
      {/* вязаная шапка */}
      <path d="M418,640 Q400,450 548,440 Q700,446 684,640 Q548,600 418,640 Z" fill="#202327" />
      <path d="M414,640 Q548,592 688,640 L686,600 Q548,556 416,600 Z" fill="#2b2f34" />
      {Array.from({ length: 14 }).map((_, i) => <line key={i} x1={440 + i * 17} y1={600 - Math.sin((i / 13) * Math.PI) * 30} x2={442 + i * 17} y2={470 + Math.abs(i - 6.5) * 6} stroke="#15181b" strokeWidth={3} />)}
      {/* пар изо рта */}
      {vapor && [0, 1].map((k) => {
        const ph = ((f + k * 42) % 84) / 84;
        const o = ph < 0.55 ? ip(ph, [0.05, 0.15, 0.55], [0, 0.42, 0]) : 0;
        return <ellipse key={k} cx={600 + ph * 220} cy={820 - ph * 90} rx={30 + ph * 120} ry={18 + ph * 50} fill="#eef6f8" opacity={o} filter="url(#blur18)" />;
      })}
    </g>
  );
};

export const Sergey: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const branchRot = ip(f, [24, 70], [0, 26], EIO);
  const handX = ip(f, [16, 40], [260, 0], EO);
  const sub = f >= d - 12 && f < d - 9;
  return (
    <Fill style={{ background: "linear-gradient(180deg,#8fa59c 0%,#c9cfb4 38%,#62786a 70%,#2c3a30 100%)" }}>
      <Svg>
        <Defs />
        <g filter="url(#blur18)" opacity={0.85}>
          {[60, 230, 420, 860, 1010].map((x, i) => <Conifer key={i} x={x} y={1500} h={900 + rnd(i) * 300} color="#3e5448" seed={i + 2} />)}
          {Array.from({ length: 10 }).map((_, i) => <circle key={i} cx={rnd(i + 9) * 1080} cy={200 + rnd(i * 4) * 700} r={30 + rnd(i) * 60} fill="#fff7d6" opacity={0.25} />)}
        </g>
        <g transform={`translate(0,${ip(f, [0, d], [12, -12])}) scale(1.02)`}>
          <SergeyBust f={f} />
        </g>
        {/* лиственница на переднем плане, рука отводит ветку */}
        <g transform={`translate(0,300) rotate(${branchRot},1200,380)`}>
          <path d="M1200,380 Q800,420 380,330" stroke="#3a2a1c" strokeWidth={14} fill="none" strokeLinecap="round" />
          {Array.from({ length: 22 }).map((_, i) => {
            const t = i / 21, x = 1200 - t * 820, y = 380 + Math.sin(t * 3) * 30 - t * 40;
            return <g key={i} transform={`translate(${x},${y})`}>
              {Array.from({ length: 9 }).map((__, k) => {
                const a = (k / 9) * Math.PI * 2 + rnd(i);
                return <line key={k} x1={0} y1={0} x2={Math.cos(a) * 34} y2={Math.sin(a) * 34} stroke={k % 2 ? "#e0b13a" : "#c99a2a"} strokeWidth={4} strokeLinecap="round" />;
              })}
            </g>;
          })}
          <g transform={`translate(${780 + handX},360)`}>
            <path d="M0,-10 L320,-40 L340,80 L20,70 Z" fill="#5c5b3a" />
            <ellipse cx={-10} cy={30} rx={58} ry={46} fill="#c39274" />
            <path d="M-50,8 q-30,8 -30,30 M-52,40 q-28,6 -28,24" stroke="#a37458" strokeWidth={14} strokeLinecap="round" fill="none" />
          </g>
        </g>
        {/* выноска к карабину */}
        {f >= 70 && <g stroke={C.white} strokeWidth={2} fill="none" opacity={0.9}>
          <circle cx={230} cy={560} r={10} fill={C.white} />
          <path d={`M230,560 L${230 + ip(f, [70, 82], [0, 1]) * -10},${560 - ip(f, [70, 82], [0, 1]) * 150} L${220 + ip(f, [78, 90], [0, 1]) * 40},410`} />
        </g>}
      </Svg>
      <Pop at={86} x={60} y={250} w={720} pad="18px 24px">
        <Label size={26} color="rgba(240,244,248,.65)">ОБЪЕКТ:</Label>
        <Label size={32} weight={800}>СЕРГЕЙ</Label>
        <Label size={24} color="rgba(240,244,248,.8)">(ОХОТНИК-ПРОМЫСЛОВИК)</Label>
        <Label size={28} color={C.yellow} style={{ marginTop: 6 }}>ОПЫТ В ТАЙГЕ: &gt; 25 ЛЕТ</Label>
      </Pop>
      {sub && <Fill style={{ background: C.ink }}><Svg><Defs /><CreatureEyes x={540} y={900} s={1.4} /></Svg></Fill>}
      <GlitchBars on={f >= d - 13 && f < d - 7} intensity={1.4} />
    </Fill>
  );
};

// -------------------------------------------------------------- 3. ДАНЬ ХОЗЯИНУ ТАЙГИ
export const Offer: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const walk = ip(f, [0, 34], [1, 0], EO);
  const hatOff = f >= 30;
  const bow = ip(f, [44, 70, 104, 126], [0, 42, 42, 0], EIO);
  const reach = ip(f, [130, 156], [0, 1], EIO);
  const tob = f >= 152 && f < 210;
  return (
    <Fill style={{ background: "linear-gradient(180deg,#0f1a17 0%,#24362c 45%,#152218 100%)" }}>
      <Svg>
        <Defs />
        <g opacity={0.7}>{[60, 200, 880, 1020].map((x, i) => <Trunk key={i} x={x} w={60 + i * 10} top={-20} bottom={1480} color="#0f1915" seed={i} />)}</g>
        <Fog y={1300} color="#93aca0" opacity={0.25} seed={9} />
        <g opacity={0.14}>{[0, 1].map((i) => <path key={i} d={`M${200 + i * 400},-50 L${380 + i * 400},-50 L${720 + i * 200},1600 L${520 + i * 200},1600 Z`} fill="#fff6d0" filter="url(#blur18)" />)}</g>
        {/* исполинский кедр */}
        <path d="M360,-40 L720,-40 L760,1380 Q860,1440 980,1500 L100,1500 Q220,1440 320,1380 Z" fill="#3a2c22" />
        <path d="M360,-40 L470,-40 L450,1400 L320,1380 Z" fill="#2a2019" />
        {Array.from({ length: 16 }).map((_, i) => {
          const x = 380 + rnd(i) * 320;
          return <path key={i} d={`M${x},${rnd(i * 2) * 400} Q${x + (rnd(i * 3) - 0.5) * 40},${600} ${x + (rnd(i * 5) - 0.5) * 20},${1000 + rnd(i * 7) * 400}`} stroke="#1a130e" strokeWidth={4 + rnd(i) * 6} fill="none" />;
        })}
        {Array.from({ length: 14 }).map((_, i) => <ellipse key={i} cx={380 + rnd(i + 40) * 330} cy={300 + rnd(i + 41) * 1100} rx={30 + rnd(i) * 50} ry={18 + rnd(i) * 30} fill="#2f5a2c" opacity={0.35} filter="url(#blur8)" />)}
        <path d="M100,1500 Q220,1440 320,1380 Q300,1450 380,1470 Z M980,1500 Q860,1440 760,1380 Q780,1455 690,1470 Z" fill="#2e3f24" />
        <path d="M600,1460 Q680,1440 760,1480 L740,1500 L590,1500 Z" fill="#41622f" />
        <rect x={0} y={1495} width={W} height={430} fill="#17220f" />
        {Array.from({ length: 14 }).map((_, i) => <MossClump key={i} x={rnd(i + 3) * 1080} y={1520 + rnd(i * 4) * 300} r={30 + rnd(i) * 40} color="#22331a" hi="#33502a" seed={i} />)}
        {/* табак */}
        {f >= 152 && Array.from({ length: 30 }).map((_, i) => {
          const st = 152 + rnd(i) * 50;
          const ph = ip(f, [st, st + 18], [0, 1]);
          if (f < st) return null;
          return <rect key={i} x={680 + (rnd(i * 3) - 0.5) * 40 + ph * (rnd(i * 7) - 0.5) * 50} y={1290 + ph * 175} width={7} height={4} fill="#8a5a24" transform={`rotate(${rnd(i) * 180},${700},${1300 + ph * 170})`} opacity={tob || ph >= 1 ? 1 : 0} />;
        })}
        <Hunter x={860 + walk * 260} y={1210} s={0.95} flip pal={PAL_DAY}
          pose={{ torso: bow + reach * 18, head: bow * 0.2, hatInHand: hatOff, armBack1: hatOff ? 20 : 8, armBack2: hatOff ? 40 : 10,
            armFront1: -6 + reach * 70, armFront2: 12 + reach * 10, legFront1: 6 + walk * 10 * Math.sin(f * 0.4), legBack1: -4 - walk * 10 * Math.sin(f * 0.4), legBack2: 4 + reach * 10, legFront2: 4 + reach * 30 }} />
      </Svg>
      <Pop at={14} x={50} y={230} w={760} pad="20px 26px" border="rgba(255,208,0,0.35)">
        <Label size={24} color={C.yellow}>[ ЭТНОГРАФИЧЕСКИЙ РЕЕСТР // СИБИРЬ ]</Label>
        <Type at={24} cps={45} text={"▸ РИТУАЛ: ЗАДАБРИВАНИЕ ХОЗЯИНА ТАЙГИ\n▸ АДРЕСАТ: СЕДОЙ СТАРИК (ДУХ ЛЕСА)\n▸ ПОДНОШЕНИЕ: ТАБАК / СПИЧКИ"}
          style={{ fontFamily: MONO, fontSize: 25, lineHeight: 1.5, color: C.white, marginTop: 8 }} />
      </Pop>
      {f >= 120 && <div style={{ position: "absolute", left: 60, right: 60, top: 1000, fontFamily: HAND, fontWeight: 600, fontSize: 66, lineHeight: 1.1, color: "rgba(240,244,248,0.92)",
        textShadow: "0 3px 20px rgba(0,0,0,0.9)", textAlign: "center", opacity: ip(f, [120, 140, d - 8, d], [0, 1, 1, 0]),
        clipPath: `inset(0 ${100 - ip(f, [120, 200], [0, 100])}% 0 0)` }}>
        «Ты на земле вырос, и я на земле вырос…{"\n"}Помоги мне в моём деле.»
      </div>}
    </Fill>
  );
};

// -------------------------------------------------------------- 4. ВЫВАРИВАНИЕ ПОРТЯНОК
export const Boil: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const smell = ip(f, [90, 190], [1, 0], EIO);
  const cx = 540, cy = 980;
  return (
    <Fill style={{ background: "radial-gradient(ellipse at 50% 80%, #3a1a08 0%, #120a06 45%, #05080A 100%)" }}>
      <Svg>
        <Defs /><FireDefs />
        <circle cx={540} cy={1700} r={700} fill="url(#fireGlow)" opacity={0.9} />
        {/* угли */}
        {Array.from({ length: 22 }).map((_, i) => <ellipse key={i} cx={rnd(i) * 1080} cy={1640 + rnd(i * 2) * 200} rx={40 + rnd(i * 3) * 60} ry={20 + rnd(i) * 26}
          fill={i % 3 ? "#2a1208" : "#ff6b00"} opacity={i % 3 ? 1 : 0.5 + 0.4 * noise1(t * 3, i)} filter="url(#blur8)" />)}
        {/* котелок */}
        <path d={`M${cx - 430},${cy} Q${cx - 440},${cy + 520} ${cx},${cy + 560} Q${cx + 440},${cy + 520} ${cx + 430},${cy} Z`} fill="#121314" />
        <path d={`M${cx + 250},${cy + 60} Q${cx + 330},${cy + 300} ${cx + 230},${cy + 480}`} stroke="#3a3c3e" strokeWidth={18} fill="none" opacity={0.6} strokeLinecap="round" />
        <path d={`M${cx - 430},${cy + 300} Q${cx},${cy + 620} ${cx + 430},${cy + 300}`} stroke="#ff7a1a" strokeWidth={10} fill="none" opacity={0.35} filter="url(#blur8)" />
        <ellipse cx={cx} cy={cy} rx={440} ry={150} fill="#1e1f20" />
        <defs><radialGradient id="brew" cx="50%" cy="45%"><stop offset="0" stopColor="#c8741a" /><stop offset="0.6" stopColor="#6a3208" /><stop offset="1" stopColor="#2a1204" /></radialGradient>
          <clipPath id="liquid"><ellipse cx={cx} cy={cy + 6} rx={405} ry={130} /></clipPath></defs>
        <ellipse cx={cx} cy={cy + 6} rx={405} ry={130} fill="url(#brew)" />
        <g clipPath="url(#liquid)">
          {/* ткань */}
          {[0, 1, 2].map((i) => {
            const a = t * 0.5 + i * 2.1;
            const x = cx + Math.cos(a) * 200, y = cy + Math.sin(a) * 60;
            return <path key={i} d={`M${x - 150},${y} q50,${-30 + noise1(t, i) * 20} 100,0 t100,0 t100,0`} stroke="#8d8a80" strokeWidth={34} fill="none" strokeLinecap="round" opacity={0.9} />;
          })}
          {/* лапник */}
          {[0, 1, 2, 3].map((i) => {
            const a = -t * 0.4 + i * 1.6;
            return <Bough key={i} x={cx + Math.cos(a) * 240} y={cy + Math.sin(a) * 70} len={220} angle={(a * 57) % 360} color="#2f5a2a" seed={i + 2} needle={30} sw={8} />;
          })}
          {/* пузыри */}
          {Array.from({ length: 18 }).map((_, i) => {
            const life = 24 + rnd(i) * 20, ph = ((f + rnd(i * 4) * life) % life) / life;
            const bx = cx + (rnd(i * 2) - 0.5) * 700, by = cy + (rnd(i * 3) - 0.5) * 200;
            return ph < 0.8 ? <circle key={i} cx={bx} cy={by} r={4 + ph * 22} fill="#e09a40" opacity={0.5} stroke="#ffd690" strokeWidth={2} />
              : <circle key={i} cx={bx} cy={by} r={26 + (ph - 0.8) * 120} fill="none" stroke="#ffd690" strokeWidth={2} opacity={(1 - ph) * 3} />;
          })}
        </g>
        <ellipse cx={cx} cy={cy} rx={440} ry={150} fill="none" stroke="#3c3e40" strokeWidth={14} />
        {/* пар */}
        {Array.from({ length: 9 }).map((_, i) => {
          const life = 90, ph = ((f + i * 10) % life) / life;
          return <ellipse key={i} cx={cx + (rnd(i) - 0.5) * 600 + noise1(ph * 4, i) * 80} cy={cy - 40 - ph * 900} rx={120 + ph * 160} ry={70 + ph * 110} fill="#f0f0ea" opacity={ip(ph, [0, 0.2, 1], [0, 0.22, 0])} filter="url(#fogblur)" />;
        })}
        {/* размытый передний план */}
        <Bough x={-60} y={1850} len={500} angle={-18} color="#0e1a0c" seed={11} needle={70} sw={16} />
        {/* инфографика */}
        <g stroke={C.cyan} strokeWidth={3} fill="none" filter="url(#glow)">
          <path d={`M${cx - 300},${cy - 40} L${cx - 380},${cy - 420} L${cx - 470},${cy - 420}`} strokeDasharray="12 10" strokeDashoffset={-f * 2} opacity={ip(f, [20, 30], [0, 1])} />
          <circle cx={cx - 300} cy={cy - 40} r={9} fill={C.cyan} opacity={ip(f, [20, 30], [0, 1])} />
          <path d={`M${cx + 150},${cy + 10} L${cx + 260},${cy - 300}`} opacity={ip(f, [44, 54], [0, 1])} />
          <path d={`M${cx + 240},${cy - 270} L${cx + 260},${cy - 300} L${cx + 275},${cy - 266}`} opacity={ip(f, [44, 54], [0, 1])} />
        </g>
      </Svg>
      <Pop at={26} x={50} y={420} w={560} pad="16px 22px" border="rgba(0,240,255,0.45)">
        <Label size={22} color={C.cyan}>ОТВАР:</Label>
        <Label size={27}>ПИХТОВЫЙ ЛАПНИК + СМОЛА</Label>
      </Pop>
      <Pop at={52} x={560} y={560} w={470} pad="16px 22px" border="rgba(0,240,255,0.45)">
        <Label size={27}>ПРИКОПОТКИ</Label>
        <Label size={21} color="rgba(240,244,248,.7)">(СПЕЦИАЛЬНЫЙ МАТЕРИАЛ)</Label>
      </Pop>
      <Pop at={80} x={140} y={1130} w={800} pad="20px 26px">
        <Label size={24} color="rgba(240,244,248,.75)">ЗАПАХ ПОТА / КОЖИ</Label>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 10 }}>
          <LedBar value={smell} n={12} color={smell > 0.5 ? C.red : smell > 0.15 ? C.yellow : C.cyan} w={34} h={30} />
          <Label size={32} weight={800}>{Math.round(smell * 100)}%</Label>
        </div>
        <Label size={24} color={C.green} style={{ marginTop: 10, opacity: f > 192 ? (Math.floor(f / 6) % 2 ? 1 : 0.6) : 0 }}>● ХИМИЧЕСКИЙ КАМУФЛЯЖ АКТИВЕН</Label>
      </Pop>
    </Fill>
  );
};

// -------------------------------------------------------------- 5. ОБВЯЗКА И БЕСШУМНЫЙ ШАГ
export const Feet: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const A = f < 78;
  if (A) {
    const draw = ip(f, [6, 66], [0, 1]);
    const tug = f > 66 ? Math.sin((f - 66) * 0.9) * 4 * ip(f, [66, 78], [1, 0]) : 0;
    const crosses = [[300, 760, 520, 1060], [520, 760, 300, 1060], [560, 940, 800, 1160], [800, 940, 560, 1160], [420, 1080, 640, 1200], [640, 1080, 420, 1200]];
    return (
      <Fill style={{ background: "linear-gradient(180deg,#24301f 0%,#1b261d 60%,#0e140e 100%)" }}>
        <Svg>
          <Defs />
          <g filter="url(#blur18)" opacity={0.7}>{[100, 400, 900].map((x, i) => <Conifer key={i} x={x} y={900} h={800} color="#2c3d2c" seed={i} />)}</g>
          {/* бревно */}
          <rect x={-40} y={560} width={1200} height={160} rx={70} fill="#4a3a2a" />
          <path d="M-40,600 L1160,610 M-40,660 L1160,650" stroke="#2e241a" strokeWidth={6} />
          <ellipse cx={1140} cy={640} rx={40} ry={80} fill="#8a6a44" />
          {/* голень и ичиг */}
          <g transform={`translate(${tug},0)`}>
            <path d="M330,300 L560,300 L580,900 L860,980 Q960,1010 950,1120 L940,1200 L300,1200 Q280,1000 320,860 Z" fill="#3e3d2e" />
            <path d="M290,760 L600,740 L620,900 L880,970 Q980,1010 960,1130 L950,1210 L280,1220 Z" fill="#6e5236" />
            {/* портянка (мокрая, серая) */}
            <path d="M286,780 Q450,740 610,760 L630,920 Q800,950 900,1000 Q980,1050 958,1160 L950,1215 L282,1222 Z" fill="#8c8a80" opacity={0.92} />
            <path d="M300,850 Q450,820 610,840 M300,950 Q500,920 640,960 Q760,980 900,1060" stroke="#6f6d64" strokeWidth={6} fill="none" />
            {crosses.map(([x1, y1, x2, y2], i) => {
              const seg = ip(draw, [i / 6, (i + 1) / 6], [0, 1]);
              return <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * seg} y2={y1 + (y2 - y1) * seg} stroke="#c9a66a" strokeWidth={9} strokeLinecap="round" />;
            })}
          </g>
          <rect x={0} y={1230} width={W} height={700} fill="#1a2414" />
          {Array.from({ length: 16 }).map((_, i) => <MossClump key={i} x={rnd(i) * 1080} y={1260 + rnd(i * 3) * 400} r={40 + rnd(i) * 50} color="#4a5a40" hi="#8a9a78" seed={i} />)}
        </Svg>
        <Pop at={20} x={60} y={250} w={620} pad="14px 22px">
          <Label size={24} color={C.yellow}>ОБВЯЗКА: ПЕНЬКОВАЯ БЕЧЁВКА</Label>
          <Label size={22} color="rgba(240,244,248,.75)">КРЕСТ-НАКРЕСТ // ПОВЕРХ ИЧИГОВ</Label>
        </Pop>
      </Fill>
    );
  }
  const g = f - 78;
  const land = 40;
  const fy = ip(g, [0, land], [-500, 1150], EIO);
  const fs = ip(g, [0, land], [0.8, 1.2]);
  const sq = g < land ? 1 : ip(g, [land, land + 6, land + 30], [1, 0.55, 1], EO);
  const ring = ip(g, [land, land + 40], [0, 1]);
  return (
    <Fill style={{ background: "linear-gradient(180deg,#0f1a14 0%,#1d2a1c 40%,#31402a 100%)" }}>
      <Svg>
        <Defs />
        <g filter="url(#blur18)" opacity={0.8}>{[80, 300, 760, 1000].map((x, i) => <Trunk key={i} x={x} w={90} top={-40} bottom={1000} color="#1a2418" seed={i} />)}</g>
        <path d="M-50,1000 Q540,960 1130,1000 L1130,1920 L-50,1920 Z" fill="#2c3c25" />
        {Array.from({ length: 30 }).map((_, i) => {
          const x = rnd(i) * 1100, y = 1020 + rnd(i * 3) * 900, r = 40 + (y - 1000) * 0.12 + rnd(i) * 30;
          const near = Math.abs(x - 540) < 260 && Math.abs(y - 1300) < 200;
          return <MossClump key={i} x={x} y={y} r={r} color="#6b7a5c" hi="#b8c4a0" seed={i} squash={near ? sq : 1} />;
        })}
        <ellipse cx={540} cy={1300} rx={260 * sq + 40} ry={70 * sq} fill="#9eb08a" opacity={0.6} />
        {ring > 0 && ring < 1 && <ellipse cx={540} cy={1300} rx={120 + ring * 420} ry={30 + ring * 110} fill="none" stroke={C.cyan} strokeWidth={6 * (1 - ring) + 1} opacity={1 - ring} filter="url(#glow)" />}
        {/* ступня в прикопотке, движется к камере */}
        <g transform={`translate(540,${fy}) scale(${fs})`}>
          <path d="M-140,-760 L120,-760 L150,-120 Q170,-30 120,0 L-140,0 Q-180,-60 -160,-200 Z" fill="#3e3d2e" />
          <path d="M-170,-260 L150,-260 Q200,-140 160,-20 Q60,30 -60,20 Q-190,0 -190,-120 Z" fill="#8c8a80" />
          <path d="M-170,-220 L150,-80 M150,-220 L-170,-80 M-180,-150 L160,-150" stroke="#c9a66a" strokeWidth={10} strokeLinecap="round" />
        </g>
      </Svg>
      <Pop at={78 + land + 2} x={90} y={420} w={900} pad="18px 26px" border="rgba(0,240,255,0.45)">
        <Label size={28}>АКУСТИЧЕСКИЙ СЛЕД: <span style={{ color: C.cyan }}>&lt; 5 dB</span> (ШЕЛЕСТ)</Label>
        <Label size={28}>ОБОНЯТЕЛЬНЫЙ МАРКЕР: <span style={{ color: C.green }}>СВЕЖАЯ ХВОЯ</span></Label>
      </Pop>
    </Fill>
  );
};
