// 00:02–00:05 — ведущий Captain Power спит в эфире, просыпается и зевает: «YAWN!».
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, H, W, Pt, ell, lin, mixPt, pop, rect, ease, easeOut } from "../theme";
import { BurstPanel, Bug, Curtains, Defs, Floor, Hand, Inset, Limb, LowerThird, OnAir, P, S, Word } from "../fx";
import { CaptainHead, CapEyes } from "../heads";
import T from "../timeline.json";

const K = T.captain;

const Camera: React.FC = () => (
  <g transform="translate(1790,0)">
    <S d="M0,690 L-80,900 M0,690 L80,900 M0,690 L0,905" w={9} />
    <P d={rect(-90, 560, 170, 120, 10)} fill="#2A2238" sh="R" />
    <P d={ell(-40, 540, 40, 40)} fill="#2A2238" sw={6} />
    <P d={ell(40, 540, 40, 40)} fill="#2A2238" sw={6} />
    <circle cx={-40} cy={540} r={9} fill={C.chrome} />
    <circle cx={40} cy={540} r={9} fill={C.chrome} />
    <P d={rect(-150, 590, 70, 60, 6)} fill="url(#chromeG)" sw={6} />
    <P d={ell(-152, 620, 18, 34)} fill="#1A2630" sw={5} />
    <circle cx={50} cy={600} r={8} fill={C.red} />
  </g>
);

const Mic: React.FC = () => (
  <g>
    <P d={ell(1000, 754, 56, 13)} fill="url(#chromeG)" sw={5} />
    <P d={rect(993, 630, 14, 124)} fill="url(#chromeG)" sw={4} />
    <P d={rect(948, 674, 104, 38, 6)} fill={C.red} sw={5} />
    <text x={1000} y={703} textAnchor="middle" fontFamily="Bangers" fontSize={29} fill={C.paper} letterSpacing={2}>HERO FM</text>
    <P d={rect(958, 534, 84, 104, 40)} fill="url(#chromeG)" sw={6} />
    {[560, 576, 592, 608].map((y) => <S key={y} d={`M968,${y} H1032`} w={3} op={0.7} />)}
    <S d="M958,586 H1042" w={5} />
  </g>
);

const Mug: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {[0, 1, 2].map((i) => {
      const x = 1468 + i * 24, ph = f * 0.18 + i * 1.7;
      const d = `M${x},676 Q${x + 12 * Math.sin(ph)},650 ${x},628 Q${x - 12 * Math.sin(ph + 1)},606 ${x + 4},584`;
      return <S key={i} d={d} w={4} c={C.paper} op={0.85} />;
    })}
    <P d={ell(1550, 718, 26, 22)} fill="none" sw={12} />
    <path d="M1550,718 m-26,0 a26,22 0 1,0 52,0 a26,22 0 1,0 -52,0" fill="none" stroke={C.paper} strokeWidth={5} />
    <P d="M1440,680 L1546,680 L1540,752 Q1493,764 1446,752Z" fill={C.paper} sh="R" />
    <P d="M1462,680 l8,12 l8,-12Z" fill={C.ink} sw={2} />
    <text x={1493} y={704} textAnchor="middle" fontFamily="Anton" fontSize={14} fill={C.ink}>WORLD'S</text>
    <text x={1493} y={722} textAnchor="middle" fontFamily="Anton" fontSize={14} fill={C.red}>OKAYEST</text>
    <text x={1493} y={742} textAnchor="middle" fontFamily="Anton" fontSize={17} fill={C.ink}>HERO</text>
  </g>
);

const PillJar: React.FC = () => (
  <g>
    <P d={rect(1572, 568, 132, 190, 18)} fill="#EFE8D6" sh="R" />
    <P d={rect(1566, 532, 144, 46, 8)} fill={C.red} sh="R" dots="dk" />
    {[1582, 1600, 1618, 1636, 1654, 1672, 1690].map((x) => <S key={x} d={`M${x},538 V572`} w={3} op={0.6} />)}
    <P d={rect(1580, 606, 116, 116, 4)} fill={C.ochre} sw={5} />
    <text x={1638} y={644} textAnchor="middle" fontFamily="Bangers" fontSize={36} fill={C.paper} stroke={C.ink} strokeWidth={5} paintOrder="stroke">SUPER-</text>
    <text x={1638} y={680} textAnchor="middle" fontFamily="Bangers" fontSize={36} fill={C.paper} stroke={C.ink} strokeWidth={5} paintOrder="stroke">PILLS</text>
    <P d={rect(1588, 690, 100, 24, 3)} fill={C.ink} sw={0} />
    <text x={1638} y={709} textAnchor="middle" fontFamily="Anton" fontSize={17} fill={C.paper} letterSpacing={1}>JOINT CARE</text>
  </g>
);

export const Captain: React.FC = () => {
  const f = useCurrentFrame();
  const wake = pop(f, K.wake, 10, 260);
  const yawn = f < K.yawn ? 0 : f < K.yawnEnd - 10 ? lin(f, K.yawn, K.yawn + 12, 0, 1, easeOut) : lin(f, K.yawnEnd - 10, K.yawnEnd, 1, 0.7);
  const sleeping = f < K.wake;
  const breathe = Math.sin(f * 0.25) * 4;
  // голова: откинута во сне → резко выпрямляется → лёгкий запрокид во время зевка
  const tilt = sleeping ? -15 + Math.sin(f * 0.25) * 1.5 : lin(wake, 0, 1, -15, 0) - yawn * 6;
  const headY = sleeping ? -6 + breathe * 0.5 : lin(wake, 0, 1, -6, -22) + (1 - wake) * 0 + yawn * -6;
  const jolt = f >= K.wake && f < K.wake + 6 ? -14 * Math.sin(((f - K.wake) / 6) * Math.PI) : 0;
  const eyes: CapEyes = sleeping ? "closed" : f < K.yawn ? "wide" : yawn > 0.3 ? "squeeze" : "half";
  const mouth = sleeping ? "snore" : f < K.yawn ? "closed" : "yawn";
  // руки: на столе → потягиваются вверх
  const s = yawn;
  const lSh: Pt = [1112, 628], rSh: Pt = [1388, 628];
  const lEl = mixPt([1050, 735], [1000, 520], s), lHa = mixPt([1150, 748], [960, 360], s);
  const rEl = mixPt([1450, 735], [1500, 520], s), rHa = mixPt([1350, 748], [1540, 360], s);
  const zs = sleeping
    ? [0, 1, 2].map((i) => {
        const t = ((f + i * 9) % 27) / 27;
        const x = 1330 + i * 50 + t * 40, y = 280 - i * 70 - t * 50, sc = 0.7 + i * 0.25 + Math.sin(f * 0.4 + i) * 0.08;
        return (
          <text key={i} x={x} y={y} fontFamily="Bangers" fontSize={70 * sc} fill={C.paper} stroke={C.ink} strokeWidth={6} paintOrder="stroke" opacity={Math.min(1, (1 - t) * 3)}>
            {i === 2 ? "Z" : "z"}
          </text>
        );
      })
    : null;
  const yawnWord = pop(f, K.word, 7, 220);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs />
      <g transform={`translate(960,540) scale(${lin(f, 0, 106, 1.0, 1.05)}) translate(-960,-540)`}>
        <Curtains />
        <BurstPanel id="capPanel" x={110} y={150} w={1040} h={600} rot={-4} cx={520} cy={470} seed={7} f={f} />
        <OnAir x={1560} y={120} f={f} />
        <Camera />
        <Floor y0={890} />
        {/* тело */}
        <g transform={`translate(0,${breathe * 0.4 + jolt})`}>
          <P d={rect(1212, 520, 76, 90)} fill={C.skin} sh="R" />
          <P d="M1100,612 Q1250,568 1400,612 L1440,780 L1060,780Z" fill="#4F7F99" sh="R" dots="dBlue" />
          <g transform="translate(1250,690)">
            <P d="M-48,-44 L48,-44 L44,8 Q30,40 0,54 Q-30,40 -44,8Z" fill={C.ochre} sh="R" dots="dOchre" />
            <P d="M0,-30 L9,-8 L32,-8 L13,6 L20,30 L0,16 L-20,30 L-13,6 L-32,-8 L-9,-8Z" fill={C.red} sw={4} />
          </g>
          <P d="M1100,612 Q1150,596 1196,612 L1186,780 L1060,780Z" fill={C.maroon} sh="R" dots="dk" />
          <P d="M1400,612 Q1350,596 1304,612 L1314,780 L1440,780Z" fill={C.maroon} sh="L" dots="dk" />
          <S d="M1188,618 L1180,780 M1312,618 L1320,780" w={9} c="#5A1726" />
          {[660, 724].map((y) => (
            <g key={y}>
              <P d={ell(1194, y, 11, 11)} fill={C.wood} sw={4} />
              <P d={ell(1306, y, 11, 11)} fill={C.wood} sw={4} />
            </g>
          ))}
          {/* руки */}
          <Limb pts={[lSh, lEl, lHa]} w={62} fill={C.maroon} dots="dk" />
          <Limb pts={[rSh, rEl, rHa]} w={62} fill={C.maroon} dots="dk" />
          <Hand x={lHa[0]} y={lHa[1]} r={32} />
          <Hand x={rHa[0]} y={rHa[1]} r={32} />
          {/* голова */}
          <g transform={`translate(1250,${420 + headY}) rotate(${tilt},0,130)`}>
            <CaptainHead eyes={eyes} mouth={mouth as any} yawn={yawn} />
          </g>
        </g>
        {/* стол */}
        <P d="M880,752 L1680,752 L1720,792 L840,792Z" fill={C.wood} sh="R" dots="dOchre" />
        <P d={rect(848, 792, 864, 128)} fill={C.woodDark} sh="RS" />
        <S d="M880,830 Q1100,820 1300,836 T1690,826 M880,870 Q1000,880 1200,866 T1690,878" w={3} op={0.6} />
        <P d={rect(1180, 812, 200, 84, 6)} fill={C.ochre} sw={5} />
        <text x={1280} y={870} textAnchor="middle" fontFamily="Bangers" fontSize={44} fill={C.ink} letterSpacing={2}>LATE NIGHT</text>
        <rect x={900} y={920} width={760} height={56} fill={C.ink} opacity={0.55} />
        <P d={rect(866, 920, 44, 72)} fill={C.woodDark} />
        <P d={rect(1650, 920, 44, 72)} fill={C.woodDark} />
        {/* пижама и клетчатые тапочки */}
        <P d={rect(1178, 920, 50, 46)} fill="#4F7F99" sw={5} />
        <P d={rect(1282, 920, 50, 46)} fill="#4F7F99" sw={5} />
        <P d="M1150,1000 Q1146,960 1200,958 Q1240,958 1238,1000Z" fill="url(#plaid)" sw={5} />
        <P d="M1272,1000 Q1270,958 1310,958 Q1364,960 1360,1000Z" fill="url(#plaid)" sw={5} />
        <Mic />
        <Mug f={f} />
        <PillJar />
        {zs}
        {/* ECU-врезка: сомкнутые старческие глаза */}
        <Inset id="capEcu" f={f} start={K.ecu} x={70} y={56} w={560} h={230} rot={-3} bg={C.skin}>
          <g transform="translate(350,250) scale(3.1)">
            <CaptainHead eyes={sleeping ? "closed" : yawn > 0.3 ? "squeeze" : f < K.yawn ? "wide" : "half"} mouth="closed" />
          </g>
          <rect x={70} y={56} width={560} height={230} fill="url(#dkS)" opacity={0.18} />
        </Inset>
        {yawnWord > 0 && (
          <Word text="YAWN!" x={520} y={520} size={250} rot={-8} scale={yawnWord * (1 + 0.03 * Math.sin(f * 0.6))} depth={14} />
        )}
        <LowerThird f={f} start={K.lower} name="CAPTAIN POWER" sub="(RETIRED) • HOST" x={70} y={900} />
        <Bug />
      </g>
    </svg>
  );
};
