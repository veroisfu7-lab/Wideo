// Шоты 7–12: шаг под дятла, лабаз, сумерки, ночь, железный стук, под лабазом
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, Fill, Svg, Defs, Fog, Pop, Label, LedBar, GlitchBars, Corners, ip, EO, EIO, rnd, noise1, shake, W, MONO } from "./lib";
import { Ridge, Conifer, Trunk, Bough, Lichen, FireDefs, MossClump, Hunter, Deer, Woodpecker, Stars, PAL_DAY, PAL_DUSK, PAL_NIGHT } from "./art";
import { SergeyBust } from "./shots1";

type P = { d: number };

// Удары дятла: серии по 4 удара каждые 15 кадров, пауза. Используется и в звуке (tools/mix.py).
export const PECKS = [20, 30, 40, 50, 95, 105, 115, 125, 170, 180, 190, 200];
const peckAmt = (f: number) => PECKS.reduce((a, p) => Math.max(a, f >= p && f < p + 8 ? 1 - (f - p) / 8 : 0), 0);

// -------------------------------------------------------------- 6. ШАГ ПОД ДЯТЛА
export const Pecker: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  // шаг двигается только во время серий ударов
  let walkPh = 0;
  for (let k = 0; k <= f; k++) if (PECKS.some((p) => k >= p - 2 && k < p + 10)) walkPh += 1;
  const phase = walkPh * 0.16;
  const camX = -walkPh * 3.2;
  const tilt = ip(f, [60, 120], [0, 90], EIO);
  const hx = 380 + walkPh * 1.2;
  const pk = peckAmt(f);
  return (
    <Fill style={{ background: "linear-gradient(180deg,#5d6f63 0%,#93a088 35%,#3c4a3a 70%,#1b261d 100%)" }}>
      <Svg>
        <Defs />
        <g transform={`translate(0,${tilt})`}>
          <g transform={`translate(${camX * 0.3},0)`}>
            <Ridge y={760} amp={60} color="#55695e" seed={3} opacity={0.6} />
            <Fog y={800} color="#d5e0d0" opacity={0.3} seed={4} />
            {Array.from({ length: 9 }).map((_, i) => <Conifer key={i} x={i * 150 - 40} y={1050} h={500 + rnd(i) * 300} color="#2e4034" seed={i + 4} opacity={0.8} />)}
          </g>
          <g transform={`translate(${camX},0)`}>
            {/* сухая лиственница с дятлом */}
            <Trunk x={860} w={70} top={-200} bottom={1240} color="#5a4a3c" seed={8} bark="rgba(30,20,10,0.5)" />
            <path d="M860,200 l120,-60 M850,420 l-110,-50 M866,640 l90,-30" stroke="#5a4a3c" strokeWidth={14} strokeLinecap="round" />
            <Woodpecker x={810} y={380 - tilt * 0} s={0.9} peck={pk} />
            {PECKS.filter((p) => f >= p && f < p + 22).map((p) => {
              const r = (f - p) / 22;
              return <circle key={p} cx={760} cy={330} r={20 + r * 170} stroke={C.green} strokeWidth={5 * (1 - r) + 1} fill="none" opacity={1 - r} filter="url(#glow)" />;
            })}
            {PECKS.filter((p) => f >= p && f < p + 14).map((p) => (
              <text key={"t" + p} x={600 - (p % 30) * 2} y={300 - (f - p) * 3} fill={C.green} fontFamily={MONO} fontWeight={800} fontSize={40} opacity={1 - (f - p) / 14}>ТУК</text>
            ))}
            {/* бурелом */}
            <rect x={-100} y={1150} width={900} height={60} rx={30} fill="#3b2f24" transform="rotate(-8,300,1180)" />
            <rect x={500} y={1220} width={800} height={50} rx={25} fill="#2e251c" transform="rotate(10,900,1240)" />
            <path d="M-100,1260 Q540,1200 1300,1270 L1300,1920 L-100,1920 Z" fill="#1d2a1a" />
            {Array.from({ length: 22 }).map((_, i) => <MossClump key={i} x={rnd(i + 7) * 1400 - 100} y={1270 + rnd(i * 3) * 600} r={30 + rnd(i) * 40} color="#2a3a22" hi="#3e5530" seed={i} />)}
          </g>
          <Hunter x={hx} y={1050} s={0.78} pal={PAL_DAY}
            pose={{ torso: 26, head: -14, rifle: "hand", legFront1: 30 + 28 * Math.sin(phase), legFront2: 50 - 20 * Math.sin(phase), legBack1: 4 - 28 * Math.sin(phase), legBack2: 50 + 20 * Math.sin(phase),
              armFront1: 10 + 8 * Math.sin(phase), armFront2: 20, armBack1: 30 - 10 * Math.sin(phase), armBack2: 40 }} />
          <g transform={`translate(${camX * 2.2},0)`} filter="url(#blur8)">
            <Bough x={-40} y={1780} len={600} angle={-14} color="#0a120a" seed={4} needle={80} sw={20} />
            <Bough x={1400} y={1700} len={640} angle={192} color="#0a120a" seed={7} needle={80} sw={20} />
          </g>
        </g>
      </Svg>
      <Pop at={30} x={50} y={560} w={600} border="rgba(61,255,138,0.5)" pad="16px 22px">
        <Label size={22} color={C.green}>МАСКИРОВКА ШАГА:</Label>
        <Label size={24}>СИНХРОНИЗАЦИЯ С ФОНОМ ЛЕСА</Label>
        <Label size={26} color={C.green} weight={800} style={{ marginTop: 6 }}>● СТАТУС: ЗВЕРЬ НЕ СЛЫШИТ</Label>
      </Pop>
      {/* эквалайзер */}
      <Pop at={10} x={60} y={1490} w={960} pad="14px 22px">
        {[["ДЯТЕЛ", C.green, pk], ["ШАГ", C.yellow, PECKS.some((p) => f >= p - 2 && f < p + 10) ? 0.3 : 0.05]].map(([lab, col, v], r) => (
          <div key={r} style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 52, marginTop: r ? 8 : 0 }}>
            <div style={{ width: 110, fontFamily: MONO, fontSize: 22, color: col as string, fontWeight: 700 }}>{lab as string}</div>
            {Array.from({ length: 34 }).map((_, i) => {
              const h = Math.max(0.06, (v as number) * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.7 + f * 0.9))) * (r === 0 ? 1 : 0.8) + rnd(i + f) * 0.06);
              return <div key={i} style={{ width: 18, height: 50 * h, borderRadius: 3, background: col as string, opacity: 0.85, boxShadow: `0 0 8px ${col}` }} />;
            })}
          </div>
        ))}
      </Pop>
    </Fill>
  );
};

// -------------------------------------------------------------- 7. ЛАБАЗ НА СОЛОНЦЕ
export const Labaz: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const tilt = ip(f, [0, 100], [-240, 40], EIO);
  const climb = ip(f, [20, 110], [0, 1], EIO);
  const sit = f > 116;
  const hipY = sit ? 812 : 1440 - climb * 650;
  const lim = Math.sin(climb * 18);
  return (
    <Fill style={{ background: "linear-gradient(180deg,#22313a 0%,#7c8a80 40%,#c3a978 58%,#3a4636 75%)" }}>
      <Svg>
        <Defs />
        <g transform={`translate(0,${tilt})`}>
          <Ridge y={1180} amp={50} color="#4a5c56" seed={7} opacity={0.6} />
          <Fog y={1230} color="#e8dcc0" opacity={0.3} seed={7} />
          {Array.from({ length: 8 }).map((_, i) => <Conifer key={i} x={i * 160 - 30} y={1400} h={420 + rnd(i) * 220} color="#24352c" seed={i + 9} />)}
          <path d="M-60,1380 Q540,1350 1140,1390 L1140,2400 L-60,2400 Z" fill="#26341f" />
          {/* солонец вдали */}
          <ellipse cx={330} cy={1460} rx={230} ry={46} fill="#2a1f17" />
          {Array.from({ length: 10 }).map((_, i) => <path key={i} d={`M${200 + rnd(i) * 260},${1440 + rnd(i * 2) * 40} q20,-6 40,0`} stroke="#d8d6c8" strokeWidth={4} opacity={0.6} fill="none" />)}
          {Array.from({ length: 8 }).map((_, i) => <path key={"h" + i} d={`M${220 + rnd(i * 5) * 220},${1450 + rnd(i * 6) * 30} l6,10 l6,-10`} stroke="#0e0a07" strokeWidth={3} fill="none" />)}
          {/* три кедра и настил */}
          {[[560, 110], [760, 120], [960, 100]].map(([x, w], i) => <Trunk key={i} x={x} w={w} top={-300} bottom={1660 + i * 10} color="#3a2c22" seed={i + 20} />)}
          {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={612} y={1560 - i * 95} width={70} height={14} rx={5} fill="#5a4630" />)}
          <g>
            {Array.from({ length: 7 }).map((_, i) => <rect key={i} x={500} y={885 - i * 3} width={520} height={22} rx={11} fill={i % 2 ? "#5d4a34" : "#4d3c2a"} transform={`rotate(${(rnd(i) - 0.5) * 2},760,890)`} />)}
            <rect x={490} y={900} width={540} height={20} rx={10} fill="#3d2e20" />
            {[0, 1, 2, 3].map((i) => <Bough key={i} x={500 + i * 140} y={870} len={200} angle={-160 + i * 30} color="#2a3d2a" seed={i + 30} needle={40} sw={10} />)}
          </g>
          <path d="M-60,1640 Q540,1600 1140,1650 L1140,2400 L-60,2400 Z" fill="#1c2716" />
          {Array.from({ length: 16 }).map((_, i) => <MossClump key={i} x={rnd(i + 2) * 1100} y={1660 + rnd(i * 3) * 300} r={34 + rnd(i) * 40} color="#2a3a20" hi="#3d552c" seed={i} />)}
          <Hunter x={sit ? 760 : 610} y={hipY} s={0.62} pal={PAL_DAY} flip={!sit}
            pose={sit ? { torso: 6, legFront1: 80, legFront2: 90, legBack1: 74, legBack2: 86, armFront1: 30, armFront2: 30, rifle: "knees" }
              : { torso: 4, armFront1: 150 + 20 * lim, armFront2: 10, armBack1: 150 - 20 * lim, armBack2: 10, legFront1: 30 + 30 * lim, legFront2: 40, legBack1: 30 - 30 * lim, legBack2: 40 }} />
          {/* размеры */}
          {f > 120 && <g opacity={ip(f, [120, 130], [0, 1])}>
            <g stroke={C.yellow} strokeWidth={4} filter="url(#glow)">
              <line x1={1050} y1={900} x2={1050} y2={900 + ip(f, [120, 140], [0, 760])} />
              <line x1={1030} y1={900} x2={1070} y2={900} /><line x1={1030} y1={1660} x2={1070} y2={1660} opacity={f > 140 ? 1 : 0} />
            </g>
            <g stroke={C.cyan} strokeWidth={4} strokeDasharray="14 12" filter="url(#glow)" fill="none">
              <path d={`M560,900 L${560 - ip(f, [134, 156], [0, 1]) * 230},${900 + ip(f, [134, 156], [0, 1]) * 560}`} />
            </g>
            {f > 156 && <circle cx={330} cy={1460} r={18 + 6 * Math.sin(f * 0.3)} stroke={C.cyan} strokeWidth={4} fill="none" filter="url(#glow)" />}
          </g>}
        </g>
      </Svg>
      <Pop at={132} x={600} y={560} w={420} pad="12px 18px" border="rgba(255,208,0,0.6)">
        <Label size={26} color={C.yellow}>ВЫСОТА: 4.2 М</Label>
      </Pop>
      <Pop at={150} x={60} y={1080} w={560} pad="12px 18px" border="rgba(0,240,255,0.6)">
        <Label size={22} color="rgba(240,244,248,.7)">ДИСТАНЦИЯ ДО ЦЕЛИ:</Label>
        <Label size={30} color={C.cyan} weight={800}>20 МЕТРОВ</Label>
      </Pop>
      <Pop at={60} x={60} y={230} w={820} pad="16px 22px">
        <Label size={22} color="rgba(240,244,248,.7)">ТОЧКА ЗАСАДЫ:</Label>
        <Label size={30} weight={800}>СОЛОНЕЦ</Label>
        <Label size={22} color="rgba(240,244,248,.8)">(МЕСТО КОРМЛЕНИЯ МАРАЛА)</Label>
      </Pop>
    </Fill>
  );
};

// -------------------------------------------------------------- 8. СУМЕРКИ: «ДРАКОН» И «ПАЛЕЦ»
export const Dusk: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const dk = ip(f, [0, d], [0, 1]);
  const pan = ip(f, [0, d], [50, -50]);
  const illus = f > 130 && f < 200 ? Math.sin(ip(f, [130, 200], [0, Math.PI])) : 0;
  const wob = illus * Math.sin(f * 0.6) * 4;
  const mix = (a: number[], b: number[]) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * dk)).join(",")})`;
  return (
    <Fill style={{ background: `linear-gradient(180deg, ${mix([90, 108, 128], [14, 22, 36])} 0%, ${mix([198, 150, 112], [44, 52, 72])} 45%, ${mix([60, 70, 60], [12, 16, 18])} 62%)` }}>
      <Svg>
        <Defs />
        <g transform={`translate(${pan},0)`}>
          <Ridge y={830} amp={40} color={mix([70, 86, 86], [20, 28, 38])} seed={2} />
          {Array.from({ length: 12 }).map((_, i) => <Conifer key={i} x={i * 110 - 80} y={1000} h={380 + rnd(i) * 300} color={mix([30, 44, 38], [8, 12, 14])} seed={i + 40} />)}
          <path d="M-100,980 Q540,940 1180,990 L1180,1920 L-100,1920 Z" fill={mix([52, 62, 42], [14, 18, 16])} />
          <ellipse cx={560} cy={1180} rx={300} ry={70} fill={mix([50, 38, 30], [14, 12, 12])} />
          {/* длинные тени */}
          <path d={`M300,1180 L${-300 - dk * 200},1500 L${-150 - dk * 200},1560 L360,1200 Z`} fill="#000" opacity={0.25 + dk * 0.2} />
          {/* «ДРАКОН»: выворотень */}
          <g transform={`translate(260,1150) rotate(${wob})`} opacity={1 - illus * 0.7}>
            <ellipse cx={-40} cy={0} rx={130} ry={60} fill={mix([62, 56, 48], [30, 30, 33])} />
            {Array.from({ length: 9 }).map((_, i) => <path key={i} d={`M-40,0 l${Math.cos(i * 0.7) * 160},${-Math.abs(Math.sin(i * 0.7)) * 90}`} stroke={mix([62, 56, 48], [30, 30, 33])} strokeWidth={10 - i * 0.6} strokeLinecap="round" />)}
            <path d="M0,-10 Q60,-160 20,-300 Q10,-340 60,-360 L130,-350 Q150,-330 110,-320 L60,-318 Q70,-200 40,-10 Z" fill={mix([74, 66, 56], [34, 34, 37])} />
            <path d="M60,-360 l-30,-60 M80,-362 l10,-70 M100,-355 l40,-40" stroke={mix([74, 66, 56], [34, 34, 37])} strokeWidth={8} strokeLinecap="round" />
          </g>
          <g opacity={illus * 0.9}><Deer x={300} y={1180} s={0.95} color={mix([70, 56, 44], [30, 28, 30])} graze={0.05} /></g>
          {/* «ПАЛЕЦ»: расколотый пень */}
          <path d="M800,1170 L790,900 Q800,780 860,720 Q900,700 880,760 Q840,820 850,900 L860,1170 Z" fill={mix([40, 34, 30], [14, 14, 16])} />
          <path d="M860,720 Q910,690 900,740" stroke={mix([140, 120, 100], [40, 40, 44])} strokeWidth={4} fill="none" />
        </g>
        {/* метки видоискателя */}
        {f > 36 && <g transform={`translate(${pan},0)`}><Corners x={140} y={760} w={290} h={440} color={C.yellow} len={30} sw={3} /></g>}
        {f > 66 && <g transform={`translate(${pan},0)`}><Corners x={740} y={660} w={190} h={540} color={C.yellow} len={30} sw={3} /></g>}
        {/* настил лабаза и ствол карабина на переднем плане */}
        <g>
          {Array.from({ length: 4 }).map((_, i) => <rect key={i} x={-60} y={1600 + i * 70} width={1200} height={62} rx={30} fill={mix([80, 62, 44], [22, 18, 14])} />)}
          <Bough x={-60} y={1580} len={520} angle={-8} color={mix([30, 46, 32], [8, 12, 10])} seed={50} needle={70} sw={18} />
          <Bough x={1160} y={1560} len={560} angle={186} color={mix([30, 46, 32], [8, 12, 10])} seed={51} needle={70} sw={18} />
          <path d="M1080,1500 L760,1340 L768,1326 L1090,1480 Z" fill="#141618" />
        </g>
      </Svg>
      <Pop at={40} x={70} y={600} w={420} pad="10px 16px" border="rgba(255,208,0,0.55)">
        <Label size={21} color={C.yellow}>ОРИЕНТИР №1:</Label>
        <Label size={26} weight={800}>«ДРАКОН»</Label><Label size={20} color="rgba(240,244,248,.75)">(СУХОСТОЙ)</Label>
      </Pop>
      <Pop at={70} x={600} y={480} w={420} pad="10px 16px" border="rgba(255,208,0,0.55)">
        <Label size={21} color={C.yellow}>ОРИЕНТИР №2:</Label>
        <Label size={26} weight={800}>«ПАЛЕЦ»</Label><Label size={20} color="rgba(240,244,248,.75)">(РАСКОЛОТЫЙ ПЕНЬ)</Label>
      </Pop>
      <Pop at={150} x={50} y={230} w={980} pad="16px 22px" border="rgba(255,208,0,0.9)" style={{ background: "rgba(60,48,0,0.55)" }} glitch>
        <Label size={24} color={C.yellow}>⚠ ПСИХОФИЗИОЛОГИЯ: ОПТИЧЕСКИЙ ОБМАН В СУМЕРКАХ</Label>
        <Label size={28} weight={800}>ПРАВИЛО: НЕ СТРЕЛЯТЬ В НЕПОДВИЖНЫЙ ПЕНЬ</Label>
      </Pop>
    </Fill>
  );
};

// -------------------------------------------------------------- 9. АБСОЛЮТНАЯ НОЧЬ: лицо в полосе лунного света
export const HEART = (f: number) => (f % 16 === 2);
export const Night: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const beat = Math.exp(-((f - 2) % 16) / 3);
  const bpm = Math.round(ip(f, [0, d], [110, 124]));
  const s = 2.6;
  const face = (
    <svg width={W} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
      <Defs />
      <g transform={`translate(${540 - 552 * s},${900 - 668 * s}) scale(${s})`}>
        <SergeyBust f={f} pupil={2.05} vapor={false} />
        <path d="M672,600 q-14,40 -8,90" stroke="#7a9cc0" strokeWidth={3 + beat * 4} fill="none" opacity={0.8} />
      </g>
    </svg>
  );
  // ЭКГ
  let ecg = "M0,60";
  for (let x = 0; x <= 440; x += 4) {
    const k = (x + f * 8) % 128;
    const y = k > 60 && k < 64 ? 10 : k >= 64 && k < 68 ? 104 : k >= 68 && k < 72 ? 40 : 60 + Math.sin(x * 0.2) * 2;
    ecg += ` L${x},${y}`;
  }
  return (
    <Fill style={{ background: "#000" }}>
      <Fill style={{ filter: "brightness(0.1) saturate(0.3)" }}>{face}</Fill>
      <Fill style={{ filter: "brightness(0.95) saturate(0.15) sepia(0.2) hue-rotate(170deg)", clipPath: "polygon(0% 39%, 100% 33%, 100% 41%, 0% 49%)" }}>{face}</Fill>
      <Fill style={{ background: "linear-gradient(170deg, rgba(0,0,0,0) 30%, rgba(224,247,255,0.06) 40%, rgba(0,0,0,0) 50%)" }} />
      <Pop at={6} x={640} y={230} w={390} pad="12px 18px" border="rgba(61,255,138,0.45)">
        <Label size={22} color="rgba(61,255,138,.7)">ВРЕМЯ:</Label>
        <Label size={46} weight={800} color={C.green} style={{ textShadow: "0 0 18px rgba(61,255,138,.7)" }}>{f < 96 ? "01:15" : "01:16"}</Label>
      </Pop>
      <Pop at={14} x={50} y={1090} w={560} pad="12px 18px" border="rgba(255,42,77,0.5)">
        <svg width={440} height={120}><path d={ecg} stroke={C.red} strokeWidth={4} fill="none" filter="url(#glow)" /></svg>
        <Label size={30} weight={800} color={C.red}>ПУЛЬС: {bpm} УД/МИН</Label>
      </Pop>
    </Fill>
  );
};

// -------------------------------------------------------------- 10. АКУСТИЧЕСКАЯ АНОМАЛИЯ
export const KHANG = [40, 84, 128, 172, 216];
export const Sound: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const hit = KHANG.reduce((a, k) => Math.max(a, f >= k ? Math.exp(-(f - k) / 7) : 0), 0);
  const flick = f > 46 ? (rnd(Math.floor(f / 3)) > 0.2 ? 1 : 0.35) : 0;
  return (
    <Fill style={{ background: "linear-gradient(180deg,#0a1220 0%,#16243a 45%,#0a0f16 70%)" }}>
      <Svg>
        <Defs /><FireDefs />
        <Stars n={90} h={1000} />
        <circle cx={820} cy={330} r={260} fill="url(#moonGlow)" opacity={0.5} />
        <Ridge y={1000} amp={60} color="#0b1220" seed={5} />
        {Array.from({ length: 14 }).map((_, i) => <Conifer key={i} x={i * 85 - 40} y={1180} h={400 + rnd(i * 3) * 380} color="#04070b" seed={i + 60} />)}
        {/* лабаз силуэтом */}
        {[180, 320, 450].map((x, i) => <Trunk key={i} x={x} w={56} top={-100} bottom={1500} color="#020305" seed={i} />)}
        <rect x={130} y={830} width={380} height={26} fill="#020305" />
        <Hunter x={300} y={790} s={0.42} pal={PAL_NIGHT} pose={{ torso: 4, legFront1: 80, legFront2: 90, legBack1: 74, legBack2: 86, armFront1: 30, armFront2: 30, rifle: "knees" }} />
        <path d="M-50,1480 Q540,1440 1130,1490 L1130,1920 L-50,1920 Z" fill="#020305" />
        {/* источник: кольца из чащи */}
        {KHANG.filter((k) => f >= k && f < k + 40).map((k) => {
          const r = (f - k) / 40;
          return <circle key={k} cx={900} cy={1080} r={30 + r * 520} stroke={C.violet} strokeWidth={8 * (1 - r) + 1} fill="none" opacity={(1 - r) * 0.9} filter="url(#glow)" />;
        })}
        <circle cx={900} cy={1080} r={10 + hit * 14} fill={C.violet} opacity={0.4 + hit * 0.6} filter="url(#bigglow)" />
      </Svg>
      <div style={{ opacity: flick }}>
        <Pop at={46} x={60} y={250} w={960} border="rgba(180,77,255,0.8)" pad="18px 24px" style={{ background: "rgba(20,6,30,0.6)" }} glitch>
          <Label size={27} color={C.violet} weight={800}>[ ВНИМАНИЕ: АКУСТИЧЕСКАЯ АНОМАЛИЯ ]</Label>
          <Label size={25}>ЧАСТОТА: 420 Hz // РЕЗОНАНС МЕТАЛЛА</Label>
          <Label size={25}>ИСТОЧНИК: СЕКТОР СЕВЕРО-ВОСТОК (НЕИЗВЕСТНО)</Label>
          <Label size={25} color={C.yellow}>ДИСТАНЦИЯ: ≈ 150 М</Label>
        </Pop>
      </div>
      <Pop at={20} x={60} y={1500} w={960} pad="12px 18px" border="rgba(180,77,255,0.5)">
        <div style={{ display: "flex", alignItems: "center", gap: 4, height: 110 }}>
          {Array.from({ length: 46 }).map((_, i) => {
            const shape = Math.exp(-Math.pow((i - 23) / 7, 2)) + 0.6 * Math.exp(-Math.pow((i - 12) / 3, 2));
            const h = 0.06 + rnd(i + f * 3) * 0.08 + hit * shape * (0.7 + 0.3 * rnd(i + f));
            return <div key={i} style={{ width: 15, height: 106 * Math.min(1, h), borderRadius: 3, background: `linear-gradient(0deg, ${C.violet}, #ff7bff)`, boxShadow: `0 0 10px ${C.violet}` }} />;
          })}
        </div>
        <Label size={20} color="rgba(240,244,248,.6)">СПЕКТРОГРАММА // КХАНГ… КХАНГ… КХАНГ…</Label>
      </Pop>
      <GlitchBars on={KHANG.some((k) => f >= k && f < k + 3)} intensity={0.6} />
    </Fill>
  );
};

// -------------------------------------------------------------- 11. НЕЧТО ПОД ЛАБАЗОМ (вид сверху сквозь доски)
export const CRACK = 72;
export const Under: React.FC<P> = ({ d }) => {
  const f = useCurrentFrame();
  const jerk = ip(f, [0, 8], [-500, 0], EO);
  const sh = f >= CRACK && f < CRACK + 14 ? shake(f, 22 * (1 - (f - CRACK) / 14)) : { x: 0, y: 0, r: 0 };
  const stir = ip(f, [24, 50], [0, 1]);
  const shadowX = ip(f, [90, 180], [-300, 1300], EIO);
  const planks = [0, 1, 2, 3, 4, 5];
  return (
    <Fill style={{ background: "#020304" }}>
      <Fill style={{ transform: `translate(${sh.x},${jerk + sh.y}) rotate(${sh.r}deg)` }}>
        <Svg>
          <Defs />
          {/* земля в 4 м внизу */}
          <rect x={-100} y={-600} width={1300} height={3000} fill="#0d1714" />
          {Array.from({ length: 26 }).map((_, i) => {
            const bx = rnd(i) * 1100, by = rnd(i * 3) * 1900;
            const near = Math.hypot(bx - 540, by - 1000) < 450;
            const dx = near ? noise1(f * 0.25, i) * 30 * stir : 0;
            return <g key={i} transform={`translate(${bx + dx},${by}) rotate(${near ? noise1(f * 0.2, i + 3) * 10 * stir : 0})`}>
              <ellipse cx={0} cy={0} rx={110 + rnd(i) * 80} ry={80 + rnd(i * 2) * 60} fill="#1c2c26" />
              <ellipse cx={-10} cy={-14} rx={80 + rnd(i) * 50} ry={50 + rnd(i * 2) * 30} fill="#2a3f38" />
              <path d={`M${-90},-30 Q0,${-90} 100,-20`} stroke="#9fc0d0" strokeWidth={4} fill="none" opacity={0.55} />
            </g>;
          })}
          {/* текучая тень */}
          {f > 90 && <ellipse cx={shadowX} cy={1020} rx={340} ry={170} fill="#000" opacity={0.97} filter="url(#blur18)" transform={`rotate(-12,${shadowX},1020)`} />}
          {/* сломанная ветка */}
          {f >= CRACK && <g opacity={ip(f, [CRACK, CRACK + 3], [0, 1])}>
            <path d="M420,1060 L560,1000 M560,1000 L600,1050" stroke="#b9a988" strokeWidth={10} strokeLinecap="round" />
          </g>}
          {/* доски настила с просветами */}
          {planks.map((i) => {
            const x = -40 + i * 220;
            return <g key={i}>
              <rect x={x} y={-600} width={130} height={3000} fill="#1a130d" />
              <path d={`M${x + 30},-600 L${x + 34},2400 M${x + 90},-600 L${x + 86},2400`} stroke="#0d0906" strokeWidth={3} />
              <rect x={x + 126} y={-600} width={4} height={3000} fill="#7a8a9a" opacity={0.15} />
            </g>;
          })}
          {/* маркер */}
          {f > 92 && <g>
            <circle cx={575} cy={1010} r={60 + 30 * Math.abs(Math.sin(f * 0.18))} stroke={C.red} strokeWidth={5} fill="none" filter="url(#glow)" />
            <circle cx={575} cy={1010} r={10} fill={C.red} filter="url(#glow)" />
          </g>}
          {/* колени/ичиги Сергея */}
          <path d="M180,1980 Q200,1700 300,1640 Q360,1700 380,1980 Z" fill="#0c0d0b" />
          <path d="M700,1980 Q720,1700 820,1650 Q880,1700 900,1980 Z" fill="#0c0d0b" />
        </Svg>
        {/* дыра в досках — фрагмент земли виден в щели: подсветка лунного блика */}
      </Fill>
      <Fill style={{ background: "radial-gradient(ellipse 60% 40% at 50% 52%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)" }} />
      <Pop at={96} x={140} y={480} w={800} border="rgba(255,42,77,0.9)" pad="18px 24px" style={{ background: "rgba(40,4,10,0.6)" }} glitch>
        <Label size={26} color="rgba(240,244,248,.8)">ОБЪЕКТ: ПОД ЛАБАЗОМ</Label>
        <Label size={32} weight={800} color={C.red}>ДИСТАНЦИЯ: 4 МЕТРА</Label>
        <Label size={34} weight={800} color={C.white} style={{ marginTop: 6 }}>ВЕРДИКТ: ЭТО НЕ ОЛЕНЬ</Label>
      </Pop>
      <GlitchBars on={f >= CRACK && f < CRACK + 5} intensity={1.2} />
    </Fill>
  );
};
