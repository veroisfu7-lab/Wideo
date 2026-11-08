// Головы четырёх пенсионеров-героев: используются в сценах, во врезках крупного плана и в портретах финала.
import React from "react";
import { C, ell, rect } from "./theme";
import { P, S, Zap } from "./fx";

const MOUTH = "#3A1420";

// ---------------------------------------------------------------- Captain Power
export type CapEyes = "closed" | "open" | "half" | "wide" | "squeeze";
export const CaptainHead: React.FC<{ eyes?: CapEyes; mouth?: "closed" | "snore" | "yawn"; yawn?: number }> = ({
  eyes = "open", mouth = "closed", yawn = 0,
}) => {
  const jy = yawn * 42;
  const face = `M-102,-110 Q-100,-158 -40,-160 L40,-160 Q100,-158 102,-110 L106,40 Q108,${118 + jy} 50,${140 + jy} L-50,${140 + jy} Q-108,${118 + jy} -106,40 Z`;
  const browY = eyes === "wide" ? -12 : eyes === "squeeze" ? 6 : 0;
  const eye = (sx: number) => {
    switch (eyes) {
      case "closed":
        return (
          <g transform={`scale(${sx},1)`}>
            <S d="M-74,-30 Q-46,-12 -18,-30" w={6} />
            <S d="M-64,-22 l-4,9 M-50,-19 l-2,10 M-36,-20 l1,9" w={3.5} />
            <S d="M-72,-6 Q-46,6 -22,-6" w={3} />
            <S d="M-84,-38 l-15,-6 M-85,-30 l-16,0 M-84,-22 l-14,6" w={3} />
          </g>
        );
      case "squeeze":
        return (
          <g transform={`scale(${sx},1)`}>
            <S d="M-74,-42 L-24,-30 L-74,-18" w={7} />
            <S d="M-86,-44 l-14,-8 M-88,-30 l-16,0 M-86,-16 l-14,8" w={3.5} />
          </g>
        );
      default: {
        const big = eyes === "wide";
        return (
          <g transform={`scale(${sx},1)`}>
            <P d={ell(-46, -30, big ? 25 : 21, big ? 23 : 16)} fill="#fff" sw={5} />
            <circle cx={big ? -46 : -42} cy={big ? -30 : -27} r={big ? 5 : 7.5} fill={C.ink} />
            {eyes === "half" && <P d="M-70,-30 Q-46,-56 -22,-30 Q-46,-36 -70,-30Z" fill={C.skin} sw={5} />}
            {!big && <S d="M-69,-38 Q-46,-52 -23,-38" w={6} />}
            <S d="M-72,-6 Q-46,6 -22,-6" w={3} />
            <S d="M-84,-38 l-15,-6 M-85,-30 l-16,0" w={3} />
          </g>
        );
      }
    }
  };
  const my = 94 + jy * 0.55;
  return (
    <g>
      <P d="M-122,-30 Q-142,-160 -60,-196 Q10,-228 86,-198 Q146,-165 125,-30 Q112,-80 100,-100 L-100,-100 Q-112,-80 -122,-30Z" fill={C.hair} sh="R" />
      <P d={ell(-108, -5, 22, 34)} fill={C.skin} sh="L" />
      <P d={ell(108, -5, 22, 34)} fill={C.skin} sh="R" />
      <S d="M-112,-20 Q-100,-5 -110,14 M112,-20 Q100,-5 110,14" w={3.5} />
      <P d={face} fill={C.skin} sh="R" op={0.8} />
      <path d={ell(0, 96 + jy * 0.5, 82, 42 + jy * 0.4)} fill="url(#dkS)" opacity={0.45} />
      <P d="M-104,-100 Q-124,-186 -30,-206 Q60,-224 113,-166 Q124,-126 104,-100 Q80,-150 30,-138 Q-30,-160 -104,-100Z" fill={C.hair} sh="R" />
      <S d="M-70,-165 Q-20,-198 60,-182 M-50,-150 Q0,-170 70,-160" w={3} op={0.6} />
      <S d="M-6,-140 q-36,14 -20,48 q15,12 23,-7" w={6} />
      <S d="M-56,-112 Q0,-122 56,-112 M-44,-96 Q0,-104 44,-96" w={3.5} />
      <g transform={`translate(0,${browY})`}>
        <P d="M-84,-62 Q-52,-86 -16,-68 Q-50,-72 -84,-54Z" fill={C.hair} sw={5} />
        <P d="M84,-62 Q52,-86 16,-68 Q50,-72 84,-54Z" fill={C.hair} sw={5} />
      </g>
      {eye(1)}
      {eye(-1)}
      <S d="M-8,-22 Q-14,24 -28,46 Q-14,62 0,55 Q14,62 28,46" w={5} />
      <path d={ell(16, 40, 14, 12)} fill="url(#dk)" opacity={0.7} />
      <S d="M-34,40 Q-54,82 -46,112 M34,40 Q54,82 46,112" w={3.5} />
      {/* очки для чтения, сползшие на кончик носа */}
      <g>
        <path d={rect(-64, 30, 54, 30, 10)} fill="#CFE6F0" opacity={0.55} />
        <path d={rect(10, 30, 54, 30, 10)} fill="#CFE6F0" opacity={0.55} />
        <S d="M-52,38 l14,-4 M22,38 l14,-4" w={3} c="#fff" />
        <path d={rect(-64, 30, 54, 30, 10)} fill="none" stroke={C.ink} strokeWidth={5} />
        <path d={rect(10, 30, 54, 30, 10)} fill="none" stroke={C.ink} strokeWidth={5} />
        <S d="M-10,40 Q0,32 10,40 M-64,40 L-104,6 M64,40 L104,6" w={4} />
      </g>
      {mouth === "closed" && <S d={`M-38,${my} Q0,${my + 9} 38,${my} M-44,${my - 4} l6,4 M44,${my - 4} l-6,4`} w={5} />}
      {mouth === "snore" && <P d={ell(0, my + 2, 17, 14)} fill={MOUTH} sw={5} />}
      {mouth === "yawn" && (
        <g>
          <P d={ell(0, my, 26 + 26 * yawn, 12 + 44 * yawn)} fill={MOUTH} sw={6} />
          <path d={ell(0, my + (12 + 44 * yawn) * 0.55, (26 + 26 * yawn) * 0.6, (12 + 44 * yawn) * 0.33)} fill="#D9545A" />
          <path d={rect(-(26 + 26 * yawn) * 0.55, my - (12 + 44 * yawn) + 4, (26 + 26 * yawn) * 1.1, 9, 3)} fill="#fff" />
        </g>
      )}
      <S d={`M0,${120 + jy} q-6,9 0,17`} w={4} />
    </g>
  );
};

// ---------------------------------------------------------------- Nana Flame
export const NanaHead: React.FC<{ mouth?: "smile" | "o"; tilt?: number }> = ({ mouth = "smile", tilt = 0 }) => (
  <g transform={`rotate(${tilt})`}>
    <P d={ell(0, -172, 58, 50)} fill={C.hair} sh="R" />
    <S d="M-32,-176 Q0,-210 32,-176 Q12,-148 -14,-168" w={3.5} />
    <P d="M-118,0 Q-132,-142 0,-152 Q132,-142 118,0 Q96,-80 0,-90 Q-96,-80 -118,0Z" fill={C.hair} sh="R" />
    <P d="M-100,-60 Q-104,-112 0,-114 Q104,-112 100,-60 L102,30 Q100,122 0,136 Q-100,122 -102,30Z" fill={C.skin} sh="R" op={0.75} />
    <P d="M-104,-46 Q-102,-122 0,-126 Q102,-122 104,-46 Q72,-96 22,-82 Q-20,-104 -62,-80 Q-90,-82 -104,-46Z" fill={C.hair} sh="R" />
    <S d="M-80,-92 Q-50,-112 -10,-108 M20,-110 Q60,-112 86,-88" w={3} op={0.6} />
    <path d={ell(-62, 42, 28, 18)} fill="url(#dPink)" />
    <path d={ell(62, 42, 28, 18)} fill="url(#dPink)" />
    {/* улыбающиеся прищуренные глаза */}
    <S d="M-70,-12 Q-48,-34 -26,-12 M26,-12 Q48,-34 70,-12" w={6} />
    <S d="M-72,-20 l-10,-6 M72,-20 l10,-6 M-80,-2 l-12,2 M80,-2 l12,2" w={3} />
    {/* очки-бабочки + цепочка */}
    {[1, -1].map((sx) => (
      <g key={sx} transform={`scale(${sx},1)`}>
        <path d="M-108,-44 Q-116,-74 -84,-60 L-18,-46 Q-10,-12 -42,-2 Q-94,4 -108,-44Z" fill="#D8F0F5" opacity={0.45} />
        <path d="M-108,-44 Q-116,-74 -84,-60 L-18,-46 Q-10,-12 -42,-2 Q-94,4 -108,-44Z" fill="none" stroke={C.ink} strokeWidth={13} strokeLinejoin="round" />
        <path d="M-108,-44 Q-116,-74 -84,-60 L-18,-46 Q-10,-12 -42,-2 Q-94,4 -108,-44Z" fill="none" stroke={C.red} strokeWidth={6} strokeLinejoin="round" />
        <S d="M-92,-50 l18,4" w={3} c="#fff" />
        <S d="M-106,-40 Q-150,60 -116,176" w={2.5} />
        <S d="M-106,-40 Q-150,60 -116,176" w={6} c={C.ochre} dash="0.5 11" />
      </g>
    ))}
    <S d="M-18,-46 Q0,-56 18,-46" w={6} />
    <S d="M-4,4 Q-16,34 -2,42 Q10,44 16,36" w={4.5} />
    <P d={ell(-104, 44, 11, 11)} fill="#fff" sw={4} />
    <P d={ell(104, 44, 11, 11)} fill="#fff" sw={4} />
    {mouth === "smile" ? (
      <g>
        <P d="M-50,66 Q0,108 50,66 Q0,84 -50,66Z" fill={C.red} sw={5} />
        <S d="M-58,58 q4,10 10,10 M58,58 q-4,10 -10,10" w={3.5} />
      </g>
    ) : (
      <P d={ell(0, 76, 16, 19)} fill={MOUTH} sw={5} />
    )}
    <S d="M-74,82 Q-62,112 -32,122 M74,82 Q62,112 32,122" w={3} />
  </g>
);

// ---------------------------------------------------------------- Lord Tempest
export const TempestHead: React.FC<{ mode?: "proud" | "pain"; bolt?: boolean }> = ({ mode = "proud", bolt }) => {
  const pain = mode === "pain";
  const leaves = [];
  for (let i = 0; i < 9; i++) {
    const a = ((200 + i * 17) * Math.PI) / 180;
    const x = Math.cos(a) * 98, y = Math.sin(a) * 92 - 72;
    leaves.push(<P key={i} d={ell(0, 0, 22, 9)} fill={C.ochre} sw={4} />);
    leaves[i] = <g key={i} transform={`translate(${x},${y}) rotate(${(a * 180) / Math.PI + 90 + (i < 4 ? 25 : -25)})`}>{leaves[i]}</g>;
  }
  return (
    <g>
      <P d="M-90,-70 Q-150,-80 -140,-14 Q-168,30 -130,64 Q-120,96 -92,62Z" fill="#F2F2EE" sh="L" />
      <P d="M90,-70 Q150,-80 140,-14 Q168,30 130,64 Q120,96 92,62Z" fill="#F2F2EE" sh="R" />
      <P d="M-92,-80 Q-90,-166 0,-170 Q90,-166 92,-80 L96,30 Q96,92 0,102 Q-96,92 -96,30Z" fill={C.skin} sh="R" op={0.8} />
      <S d="M-40,-150 Q-10,-160 20,-156" w={5} c="#fff" op={0.8} />
      {leaves}
      <S d="M-50,-112 Q0,-122 50,-112 M-40,-98 Q0,-106 40,-98" w={3} />
      <g transform={`translate(0,${pain ? -14 : 0})`}>
        <P d={`M-96,-52 Q-66,${pain ? -104 : -96} -12,-70 Q-40,-62 -56,-48 Q-78,-46 -96,-52Z`} fill="#F7F7F2" sw={5} />
        <P d={`M96,-52 Q66,${pain ? -104 : -96} 12,-70 Q40,-62 56,-48 Q78,-46 96,-52Z`} fill="#F7F7F2" sw={5} />
      </g>
      {pain ? (
        <g>
          <P d={ell(-42, -30, 25, 27)} fill="#fff" sw={5} />
          <P d={ell(42, -30, 25, 27)} fill="#fff" sw={5} />
          <circle cx={-42} cy={-30} r={4.5} fill={C.ink} />
          <circle cx={42} cy={-30} r={4.5} fill={C.ink} />
          <S d="M-86,-70 l-14,-12 M-92,-46 l-18,-4 M86,-70 l14,-12 M92,-46 l18,-4" w={4} />
        </g>
      ) : (
        <g>
          <P d={ell(-42, -32, 20, 13)} fill="#fff" sw={5} />
          <P d={ell(42, -32, 20, 13)} fill="#fff" sw={5} />
          <circle cx={-50} cy={-30} r={6.5} fill={C.ink} />
          <circle cx={34} cy={-30} r={6.5} fill={C.ink} />
          <S d="M-64,-36 L-20,-38 M20,-38 L64,-36" w={7} />
        </g>
      )}
      <P d="M-8,-50 L-26,24 Q0,44 26,24 L8,-50Z" fill={C.skin} sh="R" />
      <P d="M-96,24 Q-112,130 -72,224 Q-52,300 -22,334 Q-4,300 10,344 Q40,292 62,302 Q82,222 102,140 Q112,70 96,24 Q60,62 0,62 Q-60,62 -96,24Z" fill="#F4F4F0" sh="R" op={0.7} />
      <S d="M-60,90 Q-70,170 -40,250 M-20,100 Q-30,190 -6,290 M24,100 Q30,190 40,270 M60,90 Q72,160 64,230" w={3} op={0.7} />
      {pain && (
        <g>
          <P d={ell(0, 92, 34, 30)} fill={MOUTH} sw={6} />
          <path d={rect(-24, 66, 48, 10, 3)} fill="#fff" />
          <path d={rect(-20, 108, 40, 8, 3)} fill="#fff" />
        </g>
      )}
      <P d="M-74,54 Q-40,28 0,44 Q40,28 74,54 Q94,76 62,70 Q30,54 0,62 Q-30,54 -62,70 Q-94,76 -74,54Z" fill="#F7F7F2" sw={5} />
      {pain && (
        <g>
          <P d="M106,-20 q8,18 0,26 q-8,-8 0,-26Z" fill="#9FD8FF" sw={3} />
          <P d="M-110,-6 q8,18 0,26 q-8,-8 0,-26Z" fill="#9FD8FF" sw={3} />
        </g>
      )}
      {bolt && <Zap x={128} y={-108} s={0.75} rot={20} />}
    </g>
  );
};

// ---------------------------------------------------------------- Robo-Chuck
export const RoboHead: React.FC<{ wink?: boolean; f?: number }> = ({ wink, f = 0 }) => (
  <g>
    <S d="M58,-148 L92,-212" w={6} />
    <P d={ell(92, -214, 13, 13)} fill={C.red} sw={4} />
    <P d="M-80,0 Q-86,98 0,112 Q86,98 80,0Z" fill={C.skin} sh="R" op={0.8} />
    <path d={ell(0, 82, 62, 26)} fill="url(#dkS)" opacity={0.5} />
    <P d="M0,46 Q-40,30 -70,48 Q-88,60 -98,40 Q-92,70 -60,64 Q-30,60 0,60 Q30,60 60,64 Q92,70 98,40 Q88,60 70,48 Q40,30 0,46Z" fill="#F4F4F0" sw={5} />
    <S d="M-28,84 Q0,96 30,82" w={5} />
    <P d="M-124,40 Q-134,-150 0,-166 Q134,-150 124,40 L96,40 Q96,10 90,0 L-90,0 Q-96,10 -96,40Z" fill={C.blue} sh="R" dots="dBlue" />
    {[-100, -70, -36, 0, 36, 70, 100].map((x, i) => (
      <circle key={i} cx={x} cy={-122 + Math.abs(x) * Math.abs(x) * 0.0055} r={5} fill={C.chrome} stroke={C.ink} strokeWidth={2.5} />
    ))}
    <P d={ell(-124, -24, 24, 40)} fill="url(#chromeG)" sw={5} />
    <P d={ell(124, -24, 24, 40)} fill="url(#chromeG)" sw={5} />
    <circle cx={-124} cy={-24} r={7} fill={C.ink} />
    <circle cx={124} cy={-24} r={7} fill={C.ink} />
    <S d="M-124,16 Q-110,90 -60,104 M124,16 Q110,90 60,104" w={5} />
    <P d="M-104,-74 Q0,-100 104,-74 L98,10 Q0,26 -98,10Z" fill="#1D2B33" sw={6} />
    <S d="M-80,-70 Q-60,-76 -30,-80 M-84,-56 L-70,-58" w={4} c="#fff" op={0.35} />
    <rect x={-70} y={-56} width={60} height={34} fill={C.lime} opacity={0.5} filter="url(#glowS)" />
    <path d={rect(-62, -48, 46, 18, 7)} fill={C.lime} />
    {wink ? (
      <S d="M18,-34 Q40,-52 62,-34" w={7} c={C.lime} />
    ) : (
      <g>
        <rect x={10} y={-56} width={60} height={34} fill={C.lime} opacity={0.5} filter="url(#glowS)" />
        <path d={rect(16, -48, 46, 18, 7)} fill={C.lime} />
      </g>
    )}
    <S d="M70,-84 L48,-52 L64,-36 L36,-6 M48,-52 L24,-60" w={4} c={C.paper} />
    <S d="M70,-84 L48,-52 L64,-36 L36,-6" w={1.5} c={C.ink} />
  </g>
);
