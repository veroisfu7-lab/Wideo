// 00:05–00:08 — кулинарная рубрика: Nana Flame сыпет витамины в мини-реактор, пузырь — «BLOOP!».
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, H, W, Pt, ell, lin, pop, rect, rng, ease, easeIn } from "../theme";
import { BurstPanel, Bug, Curtains, Defs, Floor, Hand, Limb, LowerThird, P, S, Word } from "../fx";
import { NanaHead } from "../heads";
import T from "../timeline.json";

const K = T.nana;
const PILL_COLORS = [C.red, C.ochre, C.lime, C.blue, C.paper, "#B05BD0"];

const Shelf: React.FC = () => (
  <g>
    <P d={rect(1430, 520, 470, 26)} fill={C.wood} sh="B" dots="dOchre" />
    <S d="M1480,546 l30,40 M1850,546 l-30,40" w={9} />
    {/* хлопья */}
    <g>
      <P d={rect(1450, 300, 150, 220)} fill={C.red} sh="R" dots="dk" />
      <P d={ell(1525, 400, 58, 46)} fill={C.yellow} sw={5} />
      <text x={1525} y={346} textAnchor="middle" fontFamily="Bangers" fontSize={40} fill={C.paper} stroke={C.ink} strokeWidth={5} paintOrder="stroke">SUPER</text>
      <text x={1525} y={414} textAnchor="middle" fontFamily="Bangers" fontSize={38} fill={C.red} stroke={C.ink} strokeWidth={3} paintOrder="stroke">FLAKES</text>
      <P d={rect(1458, 456, 134, 46, 4)} fill={C.paper} sw={4} />
      <text x={1525} y={475} textAnchor="middle" fontFamily="Anton" fontSize={15} fill={C.ink}>WITH EXTRA</text>
      <text x={1525} y={495} textAnchor="middle" fontFamily="Anton" fontSize={15} fill={C.ink}>CALCIUM</text>
    </g>
    {/* бутыль */}
    <g>
      <P d="M1640,520 L1640,370 Q1640,340 1665,330 L1665,280 L1705,280 L1705,330 Q1730,340 1730,370 L1730,520Z" fill="#5FB0C9" sh="R" dots="dBlue" />
      <P d={rect(1660, 262, 50, 24, 4)} fill={C.ink} sw={3} />
      <P d={rect(1632, 386, 106, 110, 4)} fill={C.paper} sw={5} />
      <text x={1685} y={418} textAnchor="middle" fontFamily="Anton" fontSize={17} fill={C.ink}>METABOLISM</text>
      <text x={1685} y={446} textAnchor="middle" fontFamily="Bangers" fontSize={30} fill={C.red}>BOOST</text>
      <text x={1685} y={484} textAnchor="middle" fontFamily="Bangers" fontSize={40} fill={C.ink}>3000</text>
    </g>
    {/* радиоактивный сахар */}
    <g>
      <rect x={1740} y={380} width={150} height={150} fill={C.lime} opacity={0.35} filter="url(#glow)" />
      <P d={rect(1760, 410, 120, 110, 14)} fill="#D7F7A0" sh="R" dots="dLime" />
      <P d={rect(1754, 390, 132, 26, 6)} fill={C.lime} sw={5} />
      <P d={ell(1820, 446, 20, 20)} fill={C.yellow} sw={4} />
      {[0, 120, 240].map((a) => (
        <path key={a} d="M1820,446 L1834,422 A28,28 0 0,0 1806,422Z" fill={C.ink} transform={`rotate(${a},1820,446)`} />
      ))}
      <circle cx={1820} cy={446} r={5} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
      <text x={1820} y={488} textAnchor="middle" fontFamily="Anton" fontSize={17} fill={C.ink}>RADIOACTIVE</text>
      <text x={1820} y={510} textAnchor="middle" fontFamily="Anton" fontSize={19} fill={C.ink}>SUGAR</text>
    </g>
    {/* левая полка */}
    <P d={rect(40, 470, 330, 24)} fill={C.wood} sh="B" dots="dOchre" />
    {[70, 150, 230, 300].map((x, i) => (
      <g key={x}>
        <P d={rect(x, 470 - 70 - (i % 2) * 20, 52, 70 + (i % 2) * 20, 8)} fill={[C.ochre, C.paper, C.red, C.lime][i]} sh="R" />
        <P d={rect(x - 3, 462 - 70 - (i % 2) * 20, 58, 14, 4)} fill={C.ink} sw={2} />
      </g>
    ))}
  </g>
);

const Reactor: React.FC<{ f: number }> = ({ f }) => {
  const r = rng(4);
  const bubbles = Array.from({ length: 9 }, (_, i) => {
    const per = 16 + Math.floor(r() * 10), off = Math.floor(r() * per);
    const t = ((f + off) % per) / per;
    const x = 640 + r() * 240, rr = 8 + r() * 14;
    const y = 488 - t * 70;
    return (
      <g key={i} opacity={t > 0.85 ? 0 : 1}>
        <P d={ell(x, y, rr * (0.6 + t * 0.6), rr * (0.6 + t * 0.6))} fill={C.lime} sw={4} />
        <path d={ell(x, y, rr * (0.6 + t * 0.6), rr * (0.6 + t * 0.6))} fill="url(#dLime)" mask="url(#shBR)" />
        <S d={`M${x - rr * 0.4},${y - rr * 0.3} q${rr * 0.2},${-rr * 0.25} ${rr * 0.45},${-rr * 0.25}`} w={3} c="#fff" />
      </g>
    );
  });
  const gauge = Math.sin(f * 0.5) * 30 + 20;
  return (
    <g>
      <ellipse cx={760} cy={500} rx={260} ry={130} fill="url(#limeGlow)" />
      <P d={rect(600, 700, 320, 22, 6)} fill="#2A2238" sw={5} />
      <rect x={620} y={706} width={280} height={8} fill={C.lime} opacity={0.6} filter="url(#glowS)" />
      <P d="M610,506 L610,690 Q760,722 910,690 L910,506Z" fill="url(#chromeG)" sw={7} />
      <path d="M610,506 L610,690 Q760,722 910,690 L910,506Z" fill="url(#dk)" mask="url(#shRS)" opacity={0.6} />
      <P d="M610,598 L910,598 L910,632 Q760,652 610,632Z" fill={C.ochre} sw={5} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} d={`M${622 + i * 38},600 l20,0 l-14,34 l-20,0Z`} fill={C.ink} />
      ))}
      {[630, 670, 710, 750, 790, 830, 870, 900].map((x) => (
        <circle key={x} cx={x} cy={540} r={5} fill={C.chrome} stroke={C.ink} strokeWidth={2.5} />
      ))}
      <P d={ell(680, 665, 24, 24)} fill={C.paper} sw={5} />
      <S d={`M680,665 l${Math.cos(((gauge - 90) * Math.PI) / 180) * 18},${Math.sin(((gauge - 90) * Math.PI) / 180) * 18}`} w={4} c={C.red} />
      <P d={rect(910, 560, 46, 22, 4)} fill="url(#chromeG)" sw={5} />
      <P d={rect(946, 540, 18, 62, 4)} fill={C.red} sw={4} />
      <text x={820} y={676} textAnchor="middle" fontFamily="Anton" fontSize={20} fill={C.ink}>MK-II</text>
      {/* варево */}
      <P d={ell(760, 506, 158, 36)} fill="#2A2238" sw={7} />
      <P d="M614,502 Q630,460 680,470 Q720,440 770,462 Q820,440 860,466 Q905,462 906,502 Q760,530 614,502Z" fill={C.lime} sw={5} />
      <path d="M614,502 Q630,460 680,470 Q720,440 770,462 Q820,440 860,466 Q905,462 906,502 Q760,530 614,502Z" fill="url(#dLime)" mask="url(#shB)" />
      <P d="M640,508 Q646,552 656,560 Q666,552 668,512Z" fill={C.lime} sw={4} />
      <P d="M842,510 Q846,580 858,584 Q870,576 870,508Z" fill={C.lime} sw={4} />
      {bubbles}
    </g>
  );
};

export const Nana: React.FC = () => {
  const f = useCurrentFrame();
  const tilt = lin(f, K.pour - 2, K.pour + 6, 0, -62, ease) * (f > K.pourEnd ? lin(f, K.pourEnd, K.pourEnd + 8, 1, 0.3) : 1);
  const tremble: Pt = [Math.sin(f * 2.3) * 3.5 + Math.sin(f * 5.1) * 1.5, Math.cos(f * 2.9) * 3];
  const hand: Pt = [830 + tremble[0], 372 + tremble[1]];
  // капсулы: падают из мерного стакана в котёл
  const rp = rng(17);
  const pills = Array.from({ length: 16 }, (_, i) => {
    const t0 = K.pour + 4 + i * 1.6, dur = 9 + rp() * 3;
    const t = (f - t0) / dur;
    const c = PILL_COLORS[i % PILL_COLORS.length], spin = rp() * 360 + f * 25, dx = (rp() - 0.5) * 50;
    if (t < 0 || t > 1 || f > K.pourEnd + 10) return null;
    const x = 790 + dx * t + tremble[0], y = 360 + t * t * 140;
    return (
      <g key={i} transform={`translate(${x},${y}) rotate(${spin})`}>
        <path d={rect(-14, -7, 28, 14, 7)} fill={c} stroke={C.ink} strokeWidth={3.5} />
        <path d={rect(0, -7, 14, 14, 7)} fill={C.paper} opacity={0.7} />
      </g>
    );
  });
  // большой пузырь
  const bt = lin(f, K.bubble, K.pop, 0, 1, easeIn);
  const bigBubble = f >= K.bubble && f < K.pop && (
    <g>
      <P d={ell(760, 480 - bt * 170, 20 + bt * 60, 18 + bt * 56)} fill={C.lime} sw={6} />
      <path d={ell(760, 480 - bt * 170, 20 + bt * 60, 18 + bt * 56)} fill="url(#dLime)" mask="url(#shBR)" />
      <S d={`M${740 - bt * 30},${470 - bt * 190} q10,-14 30,-18`} w={5} c="#fff" />
    </g>
  );
  const popT = f - K.pop;
  const splash = popT >= 0 && popT < 16 && (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2, d = 60 + popT * 16;
        return <P key={i} d={ell(760 + Math.cos(a) * d, 310 + Math.sin(a) * d * 0.8 + popT * popT * 0.8, 12 - popT * 0.5, 12 - popT * 0.5)} fill={C.lime} sw={4} />;
      })}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3, r0 = 40 + popT * 8, r1 = r0 + 50;
        return <S key={"l" + i} d={`M${760 + Math.cos(a) * r0},${310 + Math.sin(a) * r0} L${760 + Math.cos(a) * r1},${310 + Math.sin(a) * r1}`} w={6} op={1 - popT / 16} />;
      })}
    </g>
  );
  const bloop = pop(f, K.pop + 1, 7, 230);
  const sh: Pt = [978, 470], el: Pt = [905 + tremble[0] * 0.3, 520], rsh: Pt = [1182, 470];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs />
      <g transform={`translate(960,540) scale(${lin(f, 0, 90, 1.0, 1.05)}) translate(-960,-540)`}>
        <Curtains />
        <BurstPanel id="nanaPanel" x={520} y={130} w={880} h={560} rot={3} cx={1000} cy={360} seed={13} f={f} />
        <Shelf />
        <Floor y0={890} />
        {/* героиня */}
        <g>
          <P d="M960,470 Q1080,440 1200,470 L1250,760 L910,760Z" fill="#5B3C8F" sh="R" dots="dPurple" />
          <P d={rect(1050, 400, 60, 70)} fill={C.skin} sh="R" />
          <P d="M1040,476 L1120,476 L1150,560 Q1190,640 1180,740 L980,740 Q970,640 1010,560Z" fill={C.paper} sh="R" dots="dkS" />
          {[[1030, 600], [1150, 620], [1060, 700], [1140, 710], [1000, 680], [1100, 580]].map((p, i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={p[0] + Math.cos((a * Math.PI) / 180) * 9} cy={p[1] + Math.sin((a * Math.PI) / 180) * 9} r={7} fill={i % 2 ? C.red : C.ochre} stroke={C.ink} strokeWidth={2} />
              ))}
              <circle cx={p[0]} cy={p[1]} r={5} fill={C.yellow} stroke={C.ink} strokeWidth={2} />
            </g>
          ))}
          <P d={rect(1012, 612, 140, 66, 6)} fill={C.paper} sw={4} />
          <text x={1082} y={640} textAnchor="middle" fontFamily="Bangers" fontSize={30} fill={C.red} letterSpacing={1}>KISS</text>
          <text x={1082} y={670} textAnchor="middle" fontFamily="Bangers" fontSize={28} fill={C.ink} letterSpacing={1}>THE HERO</text>
          <S d="M1046,476 Q1080,430 1114,476" w={5} />
          {/* правая рука на бедре */}
          <Limb pts={[rsh, [1262, 572], [1196, 650]]} w={52} fill="#5B3C8F" dots="dPurple" />
          <Limb pts={[[1262, 572], [1196, 650]]} w={50} fill="#7B4FC2" />
          <P d={ell(1236, 600, 26, 18)} fill="#7B4FC2" sw={5} />
          <Hand x={1196} y={652} r={28} fill="#7B4FC2" />
          {/* левая рука с мерным стаканом */}
          <Limb pts={[sh, el]} w={52} fill="#5B3C8F" dots="dPurple" />
          <Limb pts={[el, hand]} w={50} fill="#7B4FC2" />
          <P d={ell(el[0] - 8, el[1] - 22, 26, 18)} fill="#7B4FC2" sw={5} />
          <g transform={`translate(${hand[0]},${hand[1]}) rotate(${tilt})`}>
            <P d="M-40,-70 L40,-70 L34,10 Q0,18 -34,10Z" fill="#DDF3F7" sw={5} />
            <path d="M-36,-30 L36,-30 L34,10 Q0,18 -34,10Z" fill={C.red} opacity={tilt < -40 ? 0.25 : 0.85} />
            {[-55, -40, -25, -10].map((y) => <S key={y} d={`M-30,${y} h16`} w={3} />)}
            <P d="M40,-50 Q66,-40 40,-10" fill="none" sw={6} />
          </g>
          <Hand x={hand[0] + 4} y={hand[1] + 8} r={28} fill="#7B4FC2" />
          <g transform="translate(1080,290)">
            <NanaHead mouth="smile" tilt={-4 + Math.sin(f * 0.15) * 2} />
          </g>
        </g>
        {pills}
        {/* кухонный остров */}
        <P d={rect(330, 720, 1250, 34, 6)} fill={C.paper} sh="B" />
        <P d={rect(350, 754, 1210, 150)} fill={C.red} sh="RS" dots="dk" />
        {[600, 850, 1100, 1350].map((x) => <P key={x} d={rect(x - 8, 754, 16, 150)} fill={C.ochre} sw={4} />)}
        <Reactor f={f} />
        {bigBubble}
        {splash}
        {bloop > 0 && (
          <Word text="BLOOP!" x={590} y={240} size={240} fill={C.lime} ext={C.limeDark} glow="#FFE94A" rot={-6} scale={bloop * (1 + 0.04 * Math.sin(f * 0.7))} depth={12} />
        )}
        <LowerThird f={f} start={K.lower} name="NANA FLAME" sub="KITCHEN DEFENDER" x={1850} y={900} right />
        <Bug />
      </g>
    </svg>
  );
};
