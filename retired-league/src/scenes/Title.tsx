// 00:13–00:15 — титульный экран: лучи, лаймовая рваная звезда, логотип, портреты в кругах, бегущая строка.
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, H, W, ell, lin, pop, rect, starBurst } from "../theme";
import { Defs, P, Rays, S, Word, Zap } from "../fx";
import { CaptainHead, NanaHead, RoboHead, TempestHead } from "../heads";
import T from "../timeline.json";

const K = T.title;

const Portrait: React.FC<{ id: string; x: number; y: number; s: number; bg: string; dots: string; children: React.ReactNode; rot?: number }> = ({ id, x, y, s, bg, dots, children, rot = 0 }) => {
  if (s <= 0.01) return null;
  return (
    <g transform={`translate(${x},${y}) scale(${s}) rotate(${rot})`}>
      <clipPath id={id}>
        <circle cx={0} cy={0} r={128} />
      </clipPath>
      <circle cx={10} cy={12} r={136} fill={C.ink} />
      <circle cx={0} cy={0} r={128} fill={bg} />
      <circle cx={0} cy={0} r={128} fill={`url(#${dots})`} opacity={0.6} />
      <g clipPath={`url(#${id})`}>{children}</g>
      <circle cx={0} cy={0} r={128} fill="none" stroke={C.ink} strokeWidth={10} />
    </g>
  );
};

export const Title: React.FC = () => {
  const f = useCurrentFrame();
  const star = pop(f, K.star, 9, 200);
  const ln = K.lines.map((s) => pop(f, s, 8, 220));
  const pr = K.portraits.map((s) => pop(f, s, 9, 200));
  const tick = pop(f, K.ticker, 14, 160);
  const ticker = "WEEKDAYS AT 7:00 PM (BEFORE BEDTIME)  •  ONLY ON RETIRE-VISION  •  ";
  const wink = f > K.portraits[3] + 14 && f < K.portraits[3] + 24;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs />
      <radialGradient id="titleBg">
        <stop offset={0} stopColor="#FBF3D2" />
        <stop offset={0.55} stopColor="#F6E2A0" />
        <stop offset={1} stopColor="#EFC85A" />
      </radialGradient>
      <rect width={W} height={H} fill="url(#titleBg)" />
      <Rays cx={960} cy={500} n={64} seed={77} rIn={260} rInVar={0.4} wMin={0.012} wMax={0.03} rot={f * 0.35} />
      <rect width={W} height={H} fill="url(#dYellow)" opacity={0.25} />
      {/* многослойная рваная звезда */}
      <g transform={`translate(960,500) scale(${star}) rotate(${(1 - star) * -30})`}>
        <P d={starBurst(14, 18, 20, 380, 520, 61, 1.45, 1, 0.3)} fill={C.ink} sw={0} />
        <P d={starBurst(0, 0, 20, 380, 520, 61, 1.45, 1, 0.3)} fill={C.orange} sw={9} />
        <P d={starBurst(0, 0, 18, 330, 450, 62, 1.42, 1, 0.3)} fill={C.lime} sh="B" dots="dLime" sw={9} />
      </g>
      {/* логотип в три строки */}
      {ln[0] > 0 && <Word text="THE RETIRED" x={960} y={330} size={118} font="Luckiest Guy" ext="#E2512B" depth={10} rot={-5} scale={ln[0]} />}
      {ln[1] > 0 && <Word text="LEAGUE" x={960} y={490} size={230} font="Luckiest Guy" ext="#E2512B" depth={16} rot={-5} scale={ln[1]} />}
      {ln[2] > 0 && <Word text="LATE NIGHT" x={975} y={660} size={128} font="Luckiest Guy" ext="#E2512B" depth={11} rot={-5} scale={ln[2]} />}
      {/* портреты */}
      <Portrait id="pCap" x={190} y={190} s={pr[0]} bg={C.blue} dots="dBlue" rot={-6}>
        <g transform="translate(0,50) scale(0.62)">
          <CaptainHead eyes="closed" mouth="snore" />
        </g>
      </Portrait>
      {pr[0] > 0.5 && (
        <text x={300} y={110 - (f % 20)} fontFamily="Bangers" fontSize={60} fill={C.paper} stroke={C.ink} strokeWidth={6} paintOrder="stroke" transform="rotate(-8,300,100)">Zzz</text>
      )}
      <Portrait id="pNana" x={1730} y={190} s={pr[1]} bg={C.red} dots="dRed" rot={6}>
        <g transform="translate(0,46) scale(0.66)">
          <NanaHead mouth="smile" />
        </g>
      </Portrait>
      <Portrait id="pTmp" x={190} y={800} s={pr[2]} bg={C.ochre} dots="dOchre" rot={5}>
        <g transform="translate(0,40) scale(0.58)">
          <TempestHead mode="pain" />
        </g>
      </Portrait>
      {pr[2] > 0.5 && <Zap x={300} y={700} s={0.9} rot={18} />}
      <Portrait id="pRobo" x={1730} y={800} s={pr[3]} bg={C.lime} dots="dLime" rot={-5}>
        <g transform="translate(0,34) scale(0.68)">
          <RoboHead wink={wink} f={f} />
        </g>
      </Portrait>
      {/* бегущая строка */}
      <g transform={`translate(0,${(1 - tick) * 140})`}>
        <rect x={0} y={978} width={W} height={88} fill={C.yellow} />
        <rect x={0} y={978} width={W} height={88} fill="url(#dYellow)" opacity={0.35} />
        <S d={`M0,978 H${W} M0,1066 H${W}`} w={8} />
        <text x={40 - f * 9} y={1040} fontFamily="Anton" fontSize={50} fill={C.ink} letterSpacing={2}>
          {ticker + ticker}
        </text>
      </g>
    </svg>
  );
};
