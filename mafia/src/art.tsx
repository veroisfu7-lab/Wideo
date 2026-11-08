// Графика ролика «Мафиозник на одну минуту»: комната, герой (дом/костюм), громилы, мама, реквизит.
import React from "react";
import { rnd, noise1 } from "./lib";

export const K = {
  wall: "#E9C99A", wallDark: "#D8B27E", floor: "#8A5A3A", floorDark: "#6E4529", rug: "#B33A3A",
  couch: "#3E7C6E", couchDark: "#2C5D52", skin: "#F1C39B", skinShade: "#D9A07A", hair: "#3A2418",
  tee: "#9FB3C8", teeDark: "#7E93A8", pants: "#4A4F5C", suit: "#16171B", suitStripe: "#3A3C44",
  shirt: "#F4F4F0", red: "#E1262B", gold: "#FFC93C", neon: "#FFD000", cyan: "#00F0FF", ink: "#0D0E12",
};

// ------------------------------------------------------------------ КОМНАТА (мир 1080×1920)
export const Room: React.FC<{ t: number; police: number; doorOpen: number; doorBroken?: boolean }> = ({ t, police, doorOpen, doorBroken }) => {
  const pr = police > 0 ? (Math.floor(t * 5) % 2 === 0 ? "#FF2A4D" : "#2A6BFF") : null;
  const tick = Math.floor(t) % 2;
  return (
    <g>
      {/* стены с узором */}
      <rect x={-400} y={-200} width={1900} height={1580} fill={K.wall} />
      {Array.from({ length: 14 }).map((_, i) => Array.from({ length: 10 }).map((__, j) => (
        <path key={i + "-" + j} d={`M${-360 + i * 130 + (j % 2) * 65},${-150 + j * 140} l18,30 l-18,30 l-18,-30 Z`} fill={K.wallDark} opacity={0.55} />
      )))}
      <rect x={-400} y={1240} width={1900} height={30} fill="#C79A63" />
      {/* окно с жалюзи */}
      <g transform="translate(700,330)">
        <rect x={-10} y={-10} width={320} height={420} rx={6} fill="#F7F1E6" />
        <rect x={0} y={0} width={300} height={400} fill={pr ? pr : "#7FB5E6"} opacity={pr ? 0.9 : 1} />
        {!pr && <><circle cx={220} cy={90} r={40} fill="#FFF3C4" opacity={0.8} /><rect x={0} y={260} width={300} height={140} fill="#9CC47A" /></>}
        {Array.from({ length: 16 }).map((_, i) => <rect key={i} x={0} y={i * 25} width={300} height={14} fill="#F2EADC" opacity={0.92} />)}
      </g>
      {/* настенные часы бабушки */}
      <g transform="translate(470,250)">
        <circle r={78} fill="#7A4A26" /><circle r={64} fill="#FFF8E8" />
        {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={Math.sin(i * Math.PI / 6) * 52} y1={-Math.cos(i * Math.PI / 6) * 52} x2={Math.sin(i * Math.PI / 6) * 60} y2={-Math.cos(i * Math.PI / 6) * 60} stroke="#3A2418" strokeWidth={4} />)}
        <line x1={0} y1={0} x2={0} y2={-40} stroke="#3A2418" strokeWidth={6} strokeLinecap="round" transform="rotate(300)" />
        <line x1={0} y1={0} x2={0} y2={-54} stroke="#C0392B" strokeWidth={3} transform={`rotate(${Math.floor(t) * 6})`} />
        <path d={`M0,78 L0,150`} stroke="#7A4A26" strokeWidth={4} transform={`rotate(${tick ? 8 : -8})`} />
        <circle cx={0} cy={150} r={14} fill="#C9A23A" transform={`rotate(${tick ? 8 : -8})`} />
      </g>
      {/* дверь слева */}
      <g transform="translate(40,560)">
        <rect x={-14} y={-14} width={268} height={724} fill="#6B4123" />
        <rect x={0} y={0} width={240} height={700} fill="#1E1408" />
        <g transform={`translate(${doorBroken ? 0 : 0},0) skewY(${doorOpen * -6}) scale(${1 - doorOpen * 0.75},1)`}>
          <rect x={0} y={0} width={240} height={700} fill="#A8693A" />
          <rect x={30} y={40} width={180} height={260} rx={8} fill="#96592E" /><rect x={30} y={360} width={180} height={290} rx={8} fill="#96592E" />
          <circle cx={205} cy={370} r={14} fill="#E3B341" />
        </g>
      </g>
      {/* зеркало справа */}
      <g transform="translate(905,700)">
        <ellipse cx={0} cy={0} rx={120} ry={210} fill="#C59A3A" />
        <ellipse cx={0} cy={0} rx={100} ry={190} fill="#BFD9E6" />
        <path d="M-60,-120 L-20,-160 M-70,-60 L10,-150" stroke="#fff" strokeWidth={10} opacity={0.6} strokeLinecap="round" />
      </g>
      {/* пол и ковёр */}
      <rect x={-400} y={1270} width={1900} height={900} fill={K.floor} />
      {Array.from({ length: 10 }).map((_, i) => <line key={i} x1={-400} y1={1330 + i * 70} x2={1500} y2={1330 + i * 70} stroke={K.floorDark} strokeWidth={4} />)}
      <ellipse cx={560} cy={1600} rx={520} ry={130} fill={K.rug} />
      <ellipse cx={560} cy={1600} rx={460} ry={100} fill="none" stroke="#F2C14E" strokeWidth={8} strokeDasharray="20 16" />
      {/* полицейские отсветы */}
      {pr && <rect x={-400} y={-200} width={1900} height={2400} fill={pr} opacity={0.18 * police} style={{ mixBlendMode: "screen" }} />}
    </g>
  );
};

export const Couch: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x={-330} y={-260} width={660} height={230} rx={60} fill={K.couchDark} />
    <rect x={-300} y={-110} width={600} height={140} rx={30} fill={K.couch} />
    <rect x={-380} y={-170} width={110} height={220} rx={45} fill={K.couch} />
    <rect x={270} y={-170} width={110} height={220} rx={45} fill={K.couch} />
    <rect x={-330} y={40} width={30} height={50} fill="#3A2418" /><rect x={300} y={40} width={30} height={50} fill="#3A2418" />
  </g>
);

export const Table: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x},${y})`}>
    <ellipse cx={0} cy={0} rx={240} ry={44} fill="#5A3A22" />
    <ellipse cx={0} cy={-8} rx={240} ry={44} fill="#7A4E2C" />
    <rect x={-170} y={20} width={22} height={120} fill="#5A3A22" /><rect x={150} y={20} width={22} height={120} fill="#5A3A22" />
  </g>
);

// ------------------------------------------------------------------ ГЕРОЙ (анфас), начало координат — середина таза
export type Face = "neutral" | "squint" | "panic" | "joy" | "blink" | "shock" | "serious";
export type GuyPose = {
  suit: boolean; face: Face; glasses?: boolean; ring?: boolean;
  armL?: [number, number]; armR?: [number, number];   // углы плеча и локтя (0 = вниз, + = наружу)
  sit?: number; walk?: number; lean?: number; headTilt?: number; lookX?: number; pockets?: number; snap?: number; pinch?: number;
};
export const Guy: React.FC<{ x: number; y: number; s?: number; p: GuyPose; t: number }> = ({ x, y, s = 1, p, t }) => {
  const suit = p.suit;
  const body = suit ? K.suit : K.tee, bodyD = suit ? "#0B0C0F" : K.teeDark;
  const sit = p.sit ?? 0, walk = p.walk ?? 0;
  const [l1, l2] = p.armL ?? [12, 8], [r1, r2] = p.armR ?? [12, 8];
  const breath = Math.sin(t * 2.4) * 3;
  const legA = Math.sin(walk) * 22 * (1 - sit);
  const arm = (a1: number, a2: number, side: number, ring: boolean, pinch: boolean, snap: boolean) => (
    <g transform={`translate(${side * 92},-300) rotate(${side * a1})`}>
      <line x1={0} y1={0} x2={0} y2={150} stroke={body} strokeWidth={50} strokeLinecap="round" />
      {suit && <line x1={0} y1={8} x2={0} y2={140} stroke={K.suitStripe} strokeWidth={2} strokeDasharray="1 0" opacity={0.6} transform="translate(-10,0)" />}
      <g transform={`translate(0,150) rotate(${side * a2})`}>
        <line x1={0} y1={0} x2={0} y2={130} stroke={body} strokeWidth={44} strokeLinecap="round" />
        {suit && <rect x={-24} y={118} width={48} height={18} rx={6} fill={K.shirt} />}
        <circle cx={0} cy={150} r={pinch ? 24 : 27} fill={K.skin} />
        {pinch && <path d="M-14,140 Q0,100 14,140" fill={K.skin} stroke={K.skinShade} strokeWidth={4} />}
        {snap && <g><path d="M-30,130 l-26,-26 M-34,150 l-36,0 M-30,170 l-26,26" stroke={K.neon} strokeWidth={6} strokeLinecap="round" /></g>}
        {ring && <rect x={-14} y={136} width={28} height={16} rx={5} fill={K.gold} stroke="#B8860B" strokeWidth={3} />}
      </g>
    </g>
  );
  return (
    <g transform={`translate(${x},${y}) scale(${s}) rotate(${p.lean ?? 0})`}>
      {/* ноги */}
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(${side * 48},0) rotate(${side === -1 ? legA : -legA})`}>
          {sit > 0.5 ? (
            <g>
              <line x1={0} y1={0} x2={0} y2={60} stroke={suit ? K.suit : K.pants} strokeWidth={66} strokeLinecap="round" />
              <line x1={0} y1={60} x2={0} y2={230} stroke={suit ? K.suit : K.pants} strokeWidth={58} strokeLinecap="round" />
            </g>
          ) : (
            <line x1={0} y1={0} x2={0} y2={300} stroke={suit ? K.suit : K.pants} strokeWidth={62} strokeLinecap="round" />
          )}
          {!suit && sit <= 0.5 && <ellipse cx={0} cy={150} rx={36} ry={30} fill="#5A606E" />}
          <path d={`M-36,${sit > 0.5 ? 230 : 300} Q-40,${sit > 0.5 ? 270 : 340} ${side * 10 + 0},${sit > 0.5 ? 272 : 342} Q${44},${sit > 0.5 ? 272 : 342} 40,${sit > 0.5 ? 230 : 300} Z`}
            fill={suit ? "#050505" : "#D9D4C8"} />
          {suit && <ellipse cx={-6} cy={sit > 0.5 ? 254 : 324} rx={14} ry={6} fill="#fff" opacity={0.6} />}
        </g>
      ))}
      {/* корпус */}
      <path d={`M-100,${-330 - breath} Q-120,-150 -84,20 L84,20 Q120,-150 100,${-330 - breath} Q0,${-360 - breath} -100,${-330 - breath} Z`} fill={body} />
      {suit ? (
        <g>
          {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={-90 + i * 22} y1={-320} x2={-82 + i * 20} y2={16} stroke={K.suitStripe} strokeWidth={2} />)}
          <path d="M-40,-340 L0,-180 L40,-340 Z" fill={K.shirt} />
          <path d="M-8,-320 L8,-320 L12,-200 L0,-180 L-12,-200 Z" fill={K.red} />
          <path d="M-60,-300 L-6,-150 L-40,-60 L-80,-120 Z" fill="#0B0C0F" opacity={0.6} /><path d="M60,-300 L6,-150 L40,-60 L80,-120 Z" fill="#0B0C0F" opacity={0.6} />
          <rect x={-50} y={-150} width={100} height={150} fill="#22242A" />
          {[-110, -70, -30].map((yy) => <circle key={yy} cx={0} cy={yy} r={6} fill="#C9A23A" />)}
          <path d="M44,-260 l40,0 l-6,22 l-28,0 Z" fill={K.shirt} /><path d="M50,-262 l10,-16 l10,16 l10,-14 l6,14 Z" fill={K.red} />
          {/* оттопыренные карманы с деньгами */}
          {(p.pockets ?? 0) > 0 && [-1, 1].map((sd) => (
            <g key={sd} transform={`translate(${sd * 70},-60) scale(${1 + (p.pockets ?? 0) * 0.5})`}>
              <ellipse cx={0} cy={0} rx={40} ry={30} fill={K.suit} />
              <rect x={-26} y={-44} width={52} height={22} rx={3} fill="#5FA35A" transform={`rotate(${sd * 12})`} />
              <rect x={-20} y={-54} width={44} height={20} rx={3} fill="#74B86D" transform={`rotate(${-sd * 8})`} />
            </g>
          ))}
        </g>
      ) : (
        <g>
          <path d="M-40,-345 Q0,-300 40,-345" stroke={K.teeDark} strokeWidth={10} fill="none" />
          <ellipse cx={30} cy={-150} rx={26} ry={18} fill="#C7A27A" opacity={0.6} />
          <text x={-60} y={-200} fontFamily="'Oswald', sans-serif" fontWeight={700} fontSize={42} fill="#E8EEF5" opacity={0.85}>РЕЛАКС</text>
          {(p.pockets ?? 0) > 0 && <rect x={-50} y={-10} width={36} height={30} rx={6} fill="#E8D44D" />}
        </g>
      )}
      {/* руки */}
      {arm(l1, l2, -1, false, false, false)}
      {arm(r1, r2, 1, !!p.ring, !!p.pinch, (p.snap ?? 0) > 0)}
      {/* голова */}
      <g transform={`translate(0,${-370 - breath}) rotate(${p.headTilt ?? 0})`}>
        <rect x={-30} y={-10} width={60} height={50} fill={K.skinShade} />
        <ellipse cx={0} cy={-90} rx={92} ry={104} fill={K.skin} />
        <ellipse cx={-92} cy={-80} rx={18} ry={26} fill={K.skinShade} /><ellipse cx={92} cy={-80} rx={18} ry={26} fill={K.skinShade} />
        {suit ? <path d="M-94,-120 Q-90,-210 0,-206 Q90,-210 94,-120 Q60,-170 0,-168 Q-60,-170 -94,-120 Z" fill={K.hair} />
          : <path d="M-94,-110 Q-110,-220 0,-210 Q60,-226 80,-190 Q110,-160 94,-110 Q70,-150 50,-140 Q30,-176 0,-150 Q-30,-176 -50,-140 Q-70,-150 -94,-110 Z" fill={K.hair} />}
        <Eyes face={p.face} lookX={p.lookX ?? 0} glasses={!!p.glasses} t={t} />
        <path d="M-6,-88 Q0,-56 12,-60" stroke={K.skinShade} strokeWidth={6} fill="none" strokeLinecap="round" />
        <Mouth face={p.face} />
        {suit && p.face !== "joy" && <path d="M-46,-26 Q0,-10 46,-26" stroke="#9C6B4E" strokeWidth={3} fill="none" opacity={0.0} />}
      </g>
    </g>
  );
};

const Eyes: React.FC<{ face: Face; lookX: number; glasses: boolean; t: number }> = ({ face, lookX, glasses, t }) => {
  const lx = lookX * 10;
  const brow = face === "serious" || face === "squint" ? 12 : face === "panic" || face === "shock" ? -16 : 0;
  return (
    <g>
      {[-38, 38].map((ex, i) => {
        const tilt = (face === "serious" || face === "squint") ? (i ? -14 : 14) : (face === "panic" ? (i ? 10 : -10) : 0);
        return (
          <g key={ex}>
            {face === "blink" ? <path d={`M${ex - 20},-100 Q${ex},-92 ${ex + 20},-100`} stroke={K.ink} strokeWidth={6} fill="none" strokeLinecap="round" />
              : face === "joy" ? <path d={`M${ex - 20},-96 Q${ex},-118 ${ex + 20},-96`} stroke={K.ink} strokeWidth={7} fill="none" strokeLinecap="round" />
              : face === "squint" || face === "serious" ? <g><ellipse cx={ex} cy={-100} rx={20} ry={8} fill="#fff" /><circle cx={ex + lx} cy={-100} r={7} fill={K.ink} /></g>
              : <g><ellipse cx={ex} cy={-100} rx={face === "shock" || face === "panic" ? 24 : 18} ry={face === "shock" || face === "panic" ? 26 : 20} fill="#fff" />
                  <circle cx={ex + lx} cy={-98} r={face === "shock" ? 6 : 9} fill={K.ink} /></g>}
            <path d={`M${ex - 26},${-134 + brow} L${ex + 26},${-134 + brow}`} stroke={K.hair} strokeWidth={11} strokeLinecap="round" transform={`rotate(${tilt},${ex},${-134 + brow})`} />
          </g>
        );
      })}
      {glasses && <g>
        <path d="M-74,-112 L-4,-112 L-10,-80 Q-38,-70 -66,-80 Z M4,-112 L74,-112 L66,-80 Q38,-70 10,-80 Z" fill="#0A0A0C" />
        <line x1={-4} y1={-106} x2={4} y2={-106} stroke="#0A0A0C" strokeWidth={6} />
        <path d="M-60,-106 L-40,-106" stroke="#fff" strokeWidth={4} opacity={0.5} />
      </g>}
    </g>
  );
};
const Mouth: React.FC<{ face: Face }> = ({ face }) => {
  if (face === "joy") return <path d="M-40,-36 Q0,20 40,-36 Z" fill="#7A1E1E" />;
  if (face === "panic") return <path d="M-26,-26 Q-13,-40 0,-26 Q13,-12 26,-26" stroke={K.ink} strokeWidth={6} fill="none" />;
  if (face === "shock") return <ellipse cx={0} cy={-28} rx={16} ry={20} fill="#7A1E1E" />;
  if (face === "serious" || face === "squint") return <path d="M-30,-30 L30,-34" stroke={K.ink} strokeWidth={7} strokeLinecap="round" />;
  return <path d="M-24,-34 Q0,-22 24,-34" stroke={K.ink} strokeWidth={6} fill="none" strokeLinecap="round" />;
};

// ------------------------------------------------------------------ ГРОМИЛА: широкий, плащ, очки, шляпа, «томми-ган»
export const Goon: React.FC<{ x: number; y: number; s?: number; kneel?: number; gunUp?: number; flip?: boolean; folder?: boolean; t: number; mouth?: number; tint?: string }> =
  ({ x, y, s = 1, kneel = 0, gunUp = 0, flip, folder, t, mouth = 0, tint = "#3B2A20" }) => {
  const k = kneel;
  const bob = Math.sin(t * 2) * 2;
  return (
    <g transform={`translate(${x},${y + k * 120}) scale(${flip ? -s : s},${s})`}>
      {/* ноги */}
      <rect x={-80} y={-20} width={70} height={k > 0.5 ? 160 : 300} rx={20} fill="#1C1C20" />
      <rect x={10} y={-20} width={70} height={k > 0.5 ? 120 : 300} rx={20} fill="#1C1C20" transform={k > 0.5 ? "rotate(-70,45,-20)" : ""} />
      <ellipse cx={-45} cy={k > 0.5 ? 150 : 290} rx={50} ry={22} fill="#0A0A0A" />
      {/* плащ */}
      <path d={`M-150,${-380 + bob} Q-180,-100 -140,${k > 0.5 ? 60 : 120} L140,${k > 0.5 ? 60 : 120} Q180,-100 150,${-380 + bob} Q0,${-420 + bob} -150,${-380 + bob} Z`} fill={tint} />
      <path d={`M0,${-400 + bob} L0,110`} stroke="#22170F" strokeWidth={6} />
      <rect x={-150} y={-120} width={300} height={34} fill="#22170F" />
      <rect x={-20} y={-126} width={40} height={46} rx={4} fill="none" stroke="#C9A23A" strokeWidth={6} />
      <path d="M-70,-400 L0,-300 L70,-400" fill="#2E211A" />
      {/* голова */}
      <g transform={`translate(0,${-440 + bob})`}>
        <rect x={-50} y={0} width={100} height={60} fill="#C99677" />
        <ellipse cx={0} cy={-60} rx={95} ry={92} fill="#D8A585" />
        <path d="M-80,-20 Q0,30 80,-20 Q70,30 0,40 Q-70,30 -80,-20 Z" fill="#3B2A20" opacity={0.6} />
        <path d="M-88,-76 L-8,-76 L-14,-44 L-80,-44 Z M8,-76 L88,-76 L80,-44 L14,-44 Z" fill="#050506" />
        <line x1={-8} y1={-70} x2={8} y2={-70} stroke="#050506" strokeWidth={6} />
        <ellipse cx={0} cy={-6} rx={30} ry={4 + mouth * 14} fill="#5A1A1A" />
        {/* шляпа-федора */}
        <ellipse cx={0} cy={-118} rx={140} ry={26} fill="#16120F" />
        <path d="M-84,-118 Q-90,-200 0,-206 Q90,-200 84,-118 Z" fill="#1F1915" />
        <rect x={-86} y={-140} width={172} height={20} fill="#8A1C1C" />
      </g>
      {/* автомат */}
      <g transform={`translate(40,-160) rotate(${-gunUp * 55})`}>
        <rect x={-20} y={-16} width={300} height={32} rx={6} fill="#26282C" />
        <rect x={240} y={-10} width={110} height={18} rx={4} fill="#1A1C1F" />
        {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={250 + i * 16} y={-14} width={4} height={26} fill="#3A3C40" />)}
        <circle cx={120} cy={40} r={46} fill="#1A1C1F" /><circle cx={120} cy={40} r={14} fill="#3A3C40" />
        <path d="M-20,-10 L-110,10 L-110,50 L-20,20 Z" fill="#6E3B1E" />
        <rect x={180} y={10} width={30} height={60} rx={8} fill="#6E3B1E" />
      </g>
      {/* руки */}
      <path d="M-130,-330 Q-150,-220 -20,-160" stroke={tint} strokeWidth={56} fill="none" strokeLinecap="round" />
      <circle cx={-10} cy={-160} r={30} fill="#D8A585" />
      {folder && <g transform="translate(60,-260) rotate(-8)">
        <rect x={-10} y={-10} width={240} height={170} rx={8} fill="#C8A060" />
        <rect x={0} y={0} width={220} height={150} rx={6} fill="#E3C27F" />
        <text x={110} y={60} textAnchor="middle" fontFamily="'Oswald', sans-serif" fontWeight={700} fontSize={30} fill="#7A1E1E">ДОЛЖНИКИ</text>
        <text x={110} y={98} textAnchor="middle" fontFamily="'Oswald', sans-serif" fontWeight={700} fontSize={30} fill="#7A1E1E">КЛАНА</text>
        <rect x={150} y={110} width={50} height={26} fill="none" stroke="#B3261E" strokeWidth={4} transform="rotate(-12,175,123)" />
      </g>}
    </g>
  );
};

// ------------------------------------------------------------------ МАМА: халат, бигуди, руки в боки
export const Mom: React.FC<{ x: number; y: number; s?: number; t: number; talk?: number }> = ({ x, y, s = 1, t, talk = 0 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-60} y={0} width={46} height={240} rx={14} fill="#E7B79A" /><rect x={14} y={0} width={46} height={240} rx={14} fill="#E7B79A" />
    <ellipse cx={-36} cy={250} rx={44} ry={20} fill="#E85C9A" /><ellipse cx={36} cy={250} rx={44} ry={20} fill="#E85C9A" />
    <path d="M-130,-330 Q-170,-100 -140,60 L140,60 Q170,-100 130,-330 Q0,-370 -130,-330 Z" fill="#7E5AB8" />
    {Array.from({ length: 8 }).map((_, i) => <circle key={i} cx={-100 + (i % 4) * 66} cy={-260 + Math.floor(i / 4) * 160} r={18} fill="#F2D24B" opacity={0.85} />)}
    <rect x={-140} y={-110} width={280} height={24} fill="#5A3A92" />
    <path d="M-120,-300 Q-230,-200 -110,-130" stroke="#7E5AB8" strokeWidth={52} fill="none" strokeLinecap="round" />
    <path d="M120,-300 Q230,-200 110,-130" stroke="#7E5AB8" strokeWidth={52} fill="none" strokeLinecap="round" />
    <g transform="translate(0,-400)">
      <ellipse cx={0} cy={0} rx={88} ry={98} fill="#F0C2A0" />
      {[-60, -20, 20, 60].map((cx) => <rect key={cx} x={cx - 20} y={-118} width={40} height={30} rx={14} fill={cx % 40 ? "#4FA3E0" : "#F06A9A"} />)}
      <path d="M-86,-40 Q-100,-110 0,-104 Q100,-110 86,-40 Q60,-80 0,-78 Q-60,-80 -86,-40 Z" fill="#8A5A3A" />
      <path d="M-56,-30 L-14,-20 M56,-30 L14,-20" stroke="#5A3A22" strokeWidth={9} strokeLinecap="round" />
      <ellipse cx={-34} cy={-4} rx={9} ry={11} fill="#1A1A1A" /><ellipse cx={34} cy={-4} rx={9} ry={11} fill="#1A1A1A" />
      <ellipse cx={0} cy={46} rx={24} ry={6 + talk * 16} fill="#8A2A2A" />
    </g>
  </g>
);

// ------------------------------------------------------------------ РЕКВИЗИТ
export const Bill: React.FC<{ x: number; y: number; r: number; s?: number; flyer?: number }> = ({ x, y, r, s = 1, flyer = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${r}) scale(${s})`}>
    <rect x={-60} y={-28} width={120} height={56} rx={4} fill={flyer > 0.5 ? "#FFF6D6" : "#79B46E"} stroke={flyer > 0.5 ? "#E0C060" : "#3F7A3A"} strokeWidth={3} />
    {flyer > 0.5 ? <g><rect x={-50} y={-18} width={60} height={8} fill="#E1262B" /><rect x={-50} y={-4} width={90} height={5} fill="#999" /><rect x={-50} y={6} width={70} height={5} fill="#999" /><text x={30} y={18} fontSize={16} fontWeight={700} fill="#E1262B" fontFamily="'Oswald', sans-serif">-50%</text></g>
      : <g><circle cx={0} cy={0} r={16} fill="#5C9A55" /><text x={0} y={7} textAnchor="middle" fontSize={20} fontWeight={700} fill="#E8F5E0" fontFamily="'Oswald', sans-serif">$</text>
        <text x={-48} y={-10} fontSize={14} fill="#E8F5E0" fontWeight={700} fontFamily="'Oswald', sans-serif">100</text><text x={30} y={22} fontSize={14} fill="#E8F5E0" fontWeight={700} fontFamily="'Oswald', sans-serif">100</text></g>}
  </g>
);

export const Case: React.FC<{ x: number; y: number; open: number; s?: number }> = ({ x, y, open, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-220} y={-120} width={440} height={130} rx={14} fill="#B9BEC6" stroke="#7D838C" strokeWidth={6} />
    {open > 0.05 && <g>
      <rect x={-200} y={-150} width={400} height={50} fill="#2D6A2A" />
      {Array.from({ length: 8 }).map((_, i) => <rect key={i} x={-190 + i * 48} y={-170 + (i % 2) * 8} width={44} height={60} rx={3} fill={i % 3 === 2 ? K.gold : "#79B46E"} stroke={i % 3 === 2 ? "#B8860B" : "#3F7A3A"} strokeWidth={3} />)}
      <rect x={-170} y={-200} width={120} height={40} rx={6} fill={K.gold} stroke="#B8860B" strokeWidth={4} />
      <rect x={60} y={-196} width={120} height={40} rx={6} fill={K.gold} stroke="#B8860B" strokeWidth={4} />
      <circle cx={0} cy={-170} r={90} fill="#FFE680" opacity={0.35 * open} filter="url(#glow)" />
    </g>}
    {/* крышка */}
    <g transform={`translate(0,-120) scale(1,${1 - open * 1.9})`}>
      <rect x={-220} y={-120} width={440} height={120} rx={14} fill="#CDD2D9" stroke="#7D838C" strokeWidth={6} />
      <rect x={-60} y={-150} width={120} height={36} rx={14} fill="none" stroke="#7D838C" strokeWidth={12} />
    </g>
    <rect x={-170} y={-130} width={40} height={24} rx={4} fill="#8C929B" /><rect x={130} y={-130} width={40} height={24} rx={4} fill="#8C929B" />
  </g>
);

// Неоновый таймер
export const Timer: React.FC<{ x: number; y: number; s?: number; v: number; alarm?: boolean; t: number }> = ({ x, y, s = 1, v, alarm, t }) => {
  const sec = Math.max(0, Math.ceil(v));
  const txt = `00:${String(Math.min(60, sec)).padStart(2, "0")}`;
  const col = alarm ? (Math.floor(t * 8) % 2 ? "#FF2A4D" : "#FF8A9A") : K.neon;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x={-170} y={-62} width={340} height={124} rx={26} fill="rgba(10,10,14,0.55)" stroke={col} strokeWidth={5} filter="url(#glow)" />
      <text x={0} y={30} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontWeight={800} fontSize={84} fill={col} filter="url(#glow)">{txt}</text>
    </g>
  );
};

// Искры/блёстки
export const Sparkles: React.FC<{ x: number; y: number; p: number; n?: number; r?: number; color?: string; seed?: number }> = ({ x, y, p, n = 18, r = 380, color = "#FFE07A", seed = 1 }) => (
  <g opacity={1 - p}>
    {Array.from({ length: n }).map((_, i) => {
      const a = rnd(i + seed) * Math.PI * 2, d = r * p * (0.4 + 0.6 * rnd(i * 3 + seed));
      const sz = 10 + rnd(i) * 14;
      return <path key={i} d={`M0,-${sz} L${sz * 0.3},0 L0,${sz} L-${sz * 0.3},0 Z M-${sz},0 L0,${sz * 0.3} L${sz},0 L0,-${sz * 0.3} Z`}
        fill={color} transform={`translate(${x + Math.cos(a) * d},${y + Math.sin(a) * d}) rotate(${p * 180})`} filter="url(#glow)" />;
    })}
  </g>
);

export const Puff: React.FC<{ x: number; y: number; p: number; s?: number }> = ({ x, y, p, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4}>
    {Array.from({ length: 11 }).map((_, i) => {
      const a = (i / 11) * Math.PI * 2, d = 60 + p * 260;
      return <circle key={i} cx={Math.cos(a) * d * 0.9} cy={Math.sin(a) * d * 0.7 - 200} r={90 + p * 80 + noise1(i, 3) * 20} fill="#F4F1EC" />;
    })}
    <circle cx={0} cy={-200} r={120 + p * 200} fill="#FFFFFF" />
  </g>
);
