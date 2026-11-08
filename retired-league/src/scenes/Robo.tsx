// 00:11–00:13 — Robo-Chuck бьёт по тарелке и барабану, из локтя летят пружины и гайка: «BOOM!».
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, H, W, Pt, ell, jit, lin, mixPt, pop, poly, rect, ease, easeIn, easeOut, starBurst } from "../theme";
import { BurstPanel, Bug, Curtains, Defs, Floor, Hand, Kirby, Limb, LowerThird, P, S, WaveRiser, Word } from "../fx";
import { RoboHead } from "../heads";
import T from "../timeline.json";

const K = T.robo;

const Drum: React.FC<{ x: number; y: number; rx: number; h: number }> = ({ x, y, rx, h }) => (
  <g>
    <P d={`M${x - rx},${y} L${x - rx},${y + h} A${rx},${rx * 0.24} 0 0,0 ${x + rx},${y + h} L${x + rx},${y}Z`} fill={C.red} sh="R" dots="dk" />
    <S d={`M${x - rx},${y + h * 0.5} A${rx},${rx * 0.24} 0 0,0 ${x + rx},${y + h * 0.5}`} w={4} op={0.5} />
    <P d={ell(x, y, rx, rx * 0.24)} fill={C.paper} sw={7} />
    <path d={ell(x, y, rx, rx * 0.24)} fill="none" stroke={C.chrome} strokeWidth={4} />
  </g>
);

const Spring: React.FC<{ x: number; y: number; rot: number; s?: number }> = ({ x, y, rot, s = 1 }) => {
  let d = "M-30,0";
  for (let i = 0; i < 8; i++) d += ` L${-26 + i * 7.5},${i % 2 ? 12 : -12}`;
  d += " L30,0";
  return (
    <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
      <S d={d} w={10} />
      <S d={d} w={5} c={C.chrome} />
    </g>
  );
};

const Nut: React.FC<{ x: number; y: number; rot: number }> = ({ x, y, rot }) => {
  const pts: Pt[] = Array.from({ length: 6 }, (_, i) => [Math.cos((i * Math.PI) / 3) * 18, Math.sin((i * Math.PI) / 3) * 18]);
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <P d={poly(pts)} fill="url(#chromeG)" sw={5} />
      <P d={ell(0, 0, 7, 7)} fill={C.ink} sw={0} />
    </g>
  );
};

const Gear: React.FC<{ x: number; y: number; r: number; rot: number; fill?: string; sw?: number }> = ({ x, y, r, rot, fill = C.ochre, sw = 5 }) => {
  const pts: Pt[] = [];
  const n = 10;
  for (let i = 0; i < n * 4; i++) {
    const a = (i / (n * 4)) * Math.PI * 2;
    const rr = i % 4 < 2 ? r : r * 0.78;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`}>
      <P d={poly(pts)} fill={fill} sh="BR" dots="dOchre" sw={sw} />
      <P d={ell(0, 0, r * 0.32, r * 0.32)} fill={C.ink} sw={0} />
    </g>
  );
};

// механическая рука: сегменты, поршень, шестерёнка в локте, изолента
const MechArm: React.FC<{ sh: Pt; el: Pt; ha: Pt; f: number }> = ({ sh, el, ha, f }) => {
  const seg = (a: Pt, b: Pt, w: number) => {
    const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return (
      <g transform={`translate(${a[0]},${a[1]}) rotate(${ang})`}>
        <P d={rect(0, -w / 2, len, w, 8)} fill="url(#chromeG)" sw={6} />
        <S d={`M14,${-w / 2 - 10} L${len - 18},${-w / 2 - 10}`} w={12} />
        <S d={`M14,${-w / 2 - 10} L${len * 0.6},${-w / 2 - 10}`} w={6} c={C.chrome} />
        <P d={rect(len * 0.42, -w / 2 - 6, 34, w + 12, 3)} fill="#CFCAB8" sw={4} />
        <S d={`M${len * 0.42 + 8},${-w / 2 - 6} L${len * 0.42 + 26},${w / 2 + 6}`} w={2.5} op={0.6} />
        <circle cx={18} cy={0} r={5} fill={C.ink} />
        <circle cx={len - 18} cy={0} r={5} fill={C.ink} />
      </g>
    );
  };
  return (
    <g>
      {seg(sh, el, 44)}
      {seg(el, ha, 38)}
      <Gear x={el[0]} y={el[1]} r={32} rot={f * 8} fill="#9AA5AB" sw={5} />
      <Gear x={sh[0]} y={sh[1]} r={30} rot={-f * 5} fill={C.ochre} />
    </g>
  );
};

export const Robo: React.FC = () => {
  const f = useCurrentFrame();
  // замах → удар → отдача
  const up = lin(f, K.wind, K.hit - 3, 0, 1, ease);
  const down = lin(f, K.hit - 3, K.hit, 0, 1, easeIn);
  const recoil = f >= K.hit ? Math.exp(-(f - K.hit) / 5) * Math.cos((f - K.hit) * 1.3) : 0;
  const ph = (a: Pt, b: Pt, c: Pt): Pt => (f < K.hit - 3 ? mixPt(a, b, up) : mixPt(mixPt(b, c, down), b, Math.max(0, recoil) * 0.35));
  const mSh: Pt = [1082, 468];
  const mEl = ph([1180, 570], [1150, 400], [1196, 488]);
  const mHa = ph([1256, 500], [1170, 230], [1300, 430]);
  const hSh: Pt = [838, 468];
  const hEl = ph([760, 560], [770, 430], [752, 548]);
  const hHa = ph([700, 560], [740, 300], [690, 584]);
  const stickM = mixPt(mHa, [mHa[0] + 150, mHa[1] - 60], 1);
  const stickH = [hHa[0] - 70, hHa[1] + 60] as Pt;
  const hit = f >= K.hit;
  const shakeAmp = hit ? 22 * Math.exp(-(f - K.hit) / 6) : 0;
  const sx = jit(f, 1, shakeAmp), sy = jit(f, 2, shakeAmp);
  const boom = pop(f, K.hit, 8, 210);
  const cymRot = hit ? Math.sin((f - K.hit) * 1.4) * 14 * Math.exp(-(f - K.hit) / 10) : 0;
  const tt = f - K.hit;
  const elbow0: Pt = [1196, 488];
  const flying = hit && tt < 40;
  const traj = (vx: number, vy: number): Pt => [elbow0[0] + vx * tt, elbow0[1] + vy * tt + 1.6 * tt * tt];
  const nutP: Pt = (() => {
    const p = traj(9, -22);
    return [p[0], Math.min(p[1], 930)];
  })();
  const smoke = hit
    ? [0, 1, 2, 3].map((i) => {
        const t = tt - i * 3;
        if (t < 0) return null;
        const r = 18 + t * 2.4;
        return <P key={i} d={ell(elbow0[0] + 10 + i * 10 + t * 1.5, elbow0[1] - 20 - t * 6, r, r * 0.85)} fill="#B7B2C2" sh="R" sw={5} op={0.9} />;
      })
    : null;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs />
      <g transform={`translate(${sx},${sy}) translate(960,540) scale(${lin(f, 0, 62, 1.0, 1.06)}) translate(-960,-540)`}>
        <Curtains />
        <BurstPanel id="roboPanel" x={380} y={110} w={1160} h={620} rot={-3} cx={960} cy={330} seed={23} f={f} />
        <Floor y0={890} />
        <WaveRiser y={840} f={f} />
        {/* тело */}
        <P d="M820,470 Q960,430 1100,470 L1120,760 L800,760Z" fill="#E9E1CC" sh="R" dots="dkS" />
        <P d="M820,470 L900,460 L930,560 L860,600Z" fill="#B0652A" sh="R" dots="dOchre" />
        <P d="M1100,470 L1020,460 L990,560 L1060,600Z" fill="#B0652A" sh="R" dots="dOchre" />
        <P d={ell(960, 600, 46, 46)} fill="url(#chromeG)" sw={6} />
        <circle cx={960} cy={600} r={22} fill={C.lime} opacity={0.4 + 0.3 * Math.sin(f * 0.5)} filter="url(#glowS)" />
        <P d={ell(960, 600, 18, 18)} fill={C.lime} sw={4} />
        {[930, 990].map((x) => <circle key={x} cx={x} cy={575} r={4} fill={C.ink} />)}
        <P d={rect(930, 400, 60, 70)} fill={C.skin} sh="R" />
        <g transform={`translate(960,${290 + (hit ? Math.sin(tt * 1.5) * 6 * Math.exp(-tt / 8) : 0)})`}>
          <RoboHead f={f} />
        </g>
        {/* тарелки и барабаны */}
        <S d="M560,520 L560,890 M520,890 L560,860 L600,890" w={7} />
        <P d={ell(560, 520, 92, 16)} fill={C.ochre} sw={5} />
        <P d={ell(560, 506, 92, 16)} fill={C.ochre} sw={5} />
        <S d="M1380,430 L1380,890 M1340,890 L1380,860 L1420,890" w={7} />
        <g transform={`rotate(${-10 + cymRot},1380,430)`}>
          <P d={ell(1380, 430, 150, 26)} fill={C.ochre} sh="R" dots="dOchre" />
          <S d="M1260,430 Q1380,450 1500,430 M1300,424 Q1380,438 1460,424" w={2.5} op={0.6} />
          <P d={ell(1380, 424, 14, 6)} fill={C.ink} sw={0} />
        </g>
        <S d="M680,700 L640,890 M680,700 L720,890" w={7} />
        <Drum x={680} y={640} rx={110} h={70} />
        <S d="M1250,720 L1220,890 M1250,720 L1290,890" w={7} />
        <Drum x={1250} y={690} rx={120} h={100} />
        {/* живая рука с якорем */}
        <Limb pts={[hSh, hEl, hHa]} w={58} fill={C.skin} dots="dk" />
        <g transform={`translate(${(hSh[0] + hEl[0]) / 2},${(hSh[1] + hEl[1]) / 2})`}>
          <S d="M0,-16 V16 M-10,-8 H10 M-14,6 Q0,22 14,6" w={4.5} c={C.blue} />
          <circle cx={0} cy={-19} r={4} fill="none" stroke={C.blue} strokeWidth={3} />
        </g>
        <S d={`M${hHa[0]},${hHa[1]} L${stickH[0]},${stickH[1]}`} w={16} />
        <S d={`M${hHa[0]},${hHa[1]} L${stickH[0]},${stickH[1]}`} w={9} c="#E8C994" />
        <Hand x={hHa[0]} y={hHa[1]} r={30} />
        {/* механическая рука */}
        <MechArm sh={mSh} el={mEl} ha={mHa} f={f} />
        <S d={`M${mHa[0]},${mHa[1]} L${stickM[0]},${stickM[1]}`} w={16} />
        <S d={`M${mHa[0]},${mHa[1]} L${stickM[0]},${stickM[1]}`} w={9} c="#E8C994" />
        <P d={ell(mHa[0], mHa[1], 26, 24)} fill="url(#chromeG)" sw={5} />
        {/* бас-бочка с логотипом */}
        <g>
          <P d={ell(960, 740, 172, 172)} fill={C.red} sw={8} />
          <P d={ell(960, 740, 150, 150)} fill={C.paper} sw={5} />
          <path d={ell(960, 740, 150, 150)} fill="url(#dkS)" mask="url(#shBR)" opacity={0.5} />
          <Gear x={960} y={752} r={66} rot={f * 2} />
          <P d="M920,800 L990,700 Q1004,680 1022,694 Q1036,708 1022,720" fill="none" sw={16} />
          <path d="M920,800 L990,700 Q1004,680 1022,694 Q1036,708 1022,720" fill="none" stroke={C.paper} strokeWidth={8} strokeLinecap="round" />
          <defs>
            <path id="kickArc" d="M845,740 A115,115 0 0,1 1075,740" />
          </defs>
          <text fontFamily="Bangers" fontSize={30} fill={C.ink} letterSpacing={2}>
            <textPath href="#kickArc" startOffset="50%" textAnchor="middle">THE RUSTY JOINTS</textPath>
          </text>
          <P d={rect(912, 822, 96, 34, 4)} fill={C.ink} sw={0} />
          <text x={960} y={848} textAnchor="middle" fontFamily="Bangers" fontSize={28} fill={C.lime} letterSpacing={3}>BAND</text>
        </g>
        {/* пружины, гайка, дым */}
        {smoke}
        {flying && (
          <g>
            <Spring x={traj(14, -26)[0]} y={traj(14, -26)[1]} rot={tt * 30} />
            <Spring x={traj(-8, -30)[0]} y={traj(-8, -30)[1]} rot={-tt * 24} s={0.8} />
          </g>
        )}
        {hit && <Nut x={nutP[0]} y={nutP[1]} rot={tt * 40} />}
        {/* взрыв в стиле Кирби */}
        {boom > 0 && (
          <g transform={`translate(1430,300) scale(${boom * (1 + 0.03 * Math.sin(f))}) rotate(${-6 + tt * 0.3})`}>
            <P d={starBurst(0, 0, 18, 210, 340, 41, 1.35, 1, 0.4)} fill={C.yellow} sw={10} />
            <P d={starBurst(0, 0, 14, 120, 210, 42, 1.3, 1, 0.4)} fill="#E2452B" sw={7} />
            <Kirby cx={0} cy={0} n={16} R={290} seed={5} />
            <Word text="BOOM!" x={0} y={10} size={210} fill={C.paper} ext={C.red} depth={14} />
          </g>
        )}
        <LowerThird f={f} start={K.lower} name="ROBO-CHUCK" sub="STUDIO BAND" x={1850} y={900} right />
        <Bug />
      </g>
    </svg>
  );
};
