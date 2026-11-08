// 00:08–00:11 — прогноз погоды: Lord Tempest пафосно вскидывает указку и хватается за поясницу.
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, H, W, Pt, ell, lin, mixPt, pop, poly, rect, rng, ease, easeOut, starBurst } from "../theme";
import { BurstPanel, Bug, Curtains, Defs, Floor, Hand, Inset, Limb, LowerThird, P, Rays, S, Word, Zap, WaveRiser } from "../fx";
import { TempestHead } from "../heads";
import T from "../timeline.json";

const K = T.tempest;

const wobbleLoop = (cx: number, cy: number, rx: number, ry: number, seed: number) => {
  const r = rng(seed);
  const ph = [r() * 6, r() * 6];
  const pts: Pt[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const k = 1 + 0.09 * Math.sin(a * 3 + ph[0]) + 0.05 * Math.sin(a * 5 + ph[1]);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return poly(pts);
};

const Knee: React.FC<{ x: number; y: number; f: number; s?: number }> = ({ x, y, f, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <P d="M-8,-60 L8,-60 L10,-14 L-10,-14Z" fill={C.paper} sw={4} />
    <P d="M-8,60 L8,60 L10,14 L-10,14Z" fill={C.paper} sw={4} />
    <P d={ell(0, 0, 22, 18)} fill={C.paper} sw={4} />
    {[0, 1, 2, 3].map((i) => {
      const a = (i * Math.PI) / 2 + Math.PI / 4, k = 1 + 0.15 * Math.sin(f * 0.8 + i);
      return <S key={i} d={`M${Math.cos(a) * 30 * k},${Math.sin(a) * 30 * k} l${Math.cos(a) * 12},${Math.sin(a) * 4} l${Math.cos(a) * 4},${Math.sin(a) * 12}`} w={4.5} c={C.red} />;
    })}
  </g>
);

const WeatherMap: React.FC<{ f: number }> = ({ f }) => {
  // холодно-тёплый фронт «ARTHRITIS FRONT»: треугольники и полукруги вдоль кривой
  const frontPts: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    frontPts.push([560 + Math.sin(t * Math.PI * 1.2) * 60 + t * 40, 230 + t * 420]);
  }
  const marks = [];
  for (let i = 1; i < 20; i += 2) {
    const a = frontPts[i - 1], b = frontPts[i + 1], m = frontPts[i];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const nx = Math.cos(ang - Math.PI / 2), ny = Math.sin(ang - Math.PI / 2);
    if ((i - 1) % 4 === 0)
      marks.push(<path key={i} d={poly([[m[0] - Math.cos(ang) * 16, m[1] - Math.sin(ang) * 16], [m[0] + Math.cos(ang) * 16, m[1] + Math.sin(ang) * 16], [m[0] - nx * 26, m[1] - ny * 26]])} fill={C.blue} stroke={C.ink} strokeWidth={3} />);
    else marks.push(<circle key={i} cx={m[0]} cy={m[1]} r={15} fill={C.red} stroke={C.ink} strokeWidth={3} />);
  }
  const mercury = lin(f, 0, 40, 0.55, 1.08);
  return (
    <g transform="rotate(-2,465,440)">
      <rect x={104} y={176} width={770} height={570} fill={C.ink} />
      <P d={rect(86, 158, 770, 570)} fill={C.ochre} sw={7} />
      <P d={rect(108, 214, 726, 492)} fill={C.blue} sw={5} />
      <path d={rect(108, 214, 726, 492)} fill="url(#dBlue)" opacity={0.7} />
      <text x={471} y={203} textAnchor="middle" fontFamily="Bangers" fontSize={40} fill={C.ink} letterSpacing={3}>TONIGHT'S PRESSURE</text>
      <P d="M150,300 Q220,240 330,262 Q420,230 520,270 Q640,250 700,320 Q760,420 700,520 Q660,620 540,640 Q420,690 300,650 Q180,630 150,540 Q120,420 150,300Z" fill={C.paper} sh="R" dots="dkS" />
      {[[150, 95, 3], [220, 150, 5], [290, 205, 9]].map(([rx, ry, s]) => (
        <path key={s} d={wobbleLoop(370, 430, rx, ry, s)} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray={s === 9 ? "14 8" : undefined} />
      ))}
      <text x={520} y={340} fontFamily="Anton" fontSize={20} fill={C.ink}>1040</text>
      <P d={ell(370, 420, 52, 52)} fill={C.red} sw={6} />
      <text x={370} y={444} textAnchor="middle" fontFamily="Bangers" fontSize={72} fill={C.paper} stroke={C.ink} strokeWidth={5} paintOrder="stroke">H</text>
      <P d={rect(220, 488, 300, 44, 4)} fill={C.yellow} sw={5} />
      <text x={370} y={520} textAnchor="middle" fontFamily="Anton" fontSize={25} fill={C.ink} letterSpacing={1}>HIGH JOINT PAIN ZONE</text>
      <path d={"M" + frontPts.map((p) => p.join(",")).join(" L")} fill="none" stroke={C.ink} strokeWidth={6} />
      {marks}
      <P d={rect(500, 650, 250, 40, 4)} fill={C.paper} sw={5} />
      <text x={625} y={680} textAnchor="middle" fontFamily="Anton" fontSize={24} fill={C.blue} letterSpacing={1}>ARTHRITIS FRONT</text>
      <Knee x={210} y={600} f={f} s={0.8} />
      <Knee x={650} y={420} f={f + 5} s={0.7} />
      {/* градусник, зашкаливающий в красную зону */}
      <g>
        <P d={rect(770, 232, 40, 380, 20)} fill={C.paper} sw={6} />
        <rect x={780} y={252 + 340 * (1 - Math.min(1, mercury))} width={20} height={340 * Math.min(1, mercury) + 20} fill={C.red} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <S key={i} d={`M770,${280 + i * 48} h12`} w={3} />)}
        <P d={ell(790, 640, 34, 34)} fill={C.red} sw={6} />
        <path d={rect(770, 232, 40, 120, 20)} fill={C.red} opacity={0.35} />
        {mercury > 1 && (
          <g>
            <P d={starBurst(790, 228, 9, 16, 36, 4)} fill={C.yellow} sw={4} />
            <text x={790} y={240} textAnchor="middle" fontFamily="Bangers" fontSize={30} fill={C.red}>!!</text>
          </g>
        )}
      </g>
    </g>
  );
};

const Pointer: React.FC<{ from: Pt; to: Pt; f: number; spark: number }> = ({ from, to, f, spark }) => {
  const segs = [0.45, 0.75, 1].map((t) => mixPt(from, to, t));
  const r = rng(Math.floor(f) * 13 + 1);
  const bolts = [];
  if (spark > 0.05)
    for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2, len = (18 + r() * 26) * spark;
      let d = `M${to[0]},${to[1]}`, x = to[0], y = to[1];
      for (let k = 0; k < 4; k++) {
        x += (Math.cos(a) * len) / 4 + (r() - 0.5) * 10;
        y += (Math.sin(a) * len) / 4 + (r() - 0.5) * 10;
        d += ` L${x},${y}`;
      }
      bolts.push(<S key={i} d={d} w={4} c="#8FD8FF" op={spark} />);
      bolts.push(<S key={"w" + i} d={d} w={1.6} c="#fff" op={spark} />);
    }
  return (
    <g>
      <S d={`M${from[0]},${from[1]} L${segs[0][0]},${segs[0][1]}`} w={16} />
      <S d={`M${from[0]},${from[1]} L${segs[0][0]},${segs[0][1]}`} w={9} c={C.chrome} />
      <S d={`M${segs[0][0]},${segs[0][1]} L${segs[1][0]},${segs[1][1]}`} w={12} />
      <S d={`M${segs[0][0]},${segs[0][1]} L${segs[1][0]},${segs[1][1]}`} w={6} c={C.chrome} />
      <S d={`M${segs[1][0]},${segs[1][1]} L${to[0]},${to[1]}`} w={9} />
      <S d={`M${segs[1][0]},${segs[1][1]} L${to[0]},${to[1]}`} w={4} c={C.chrome} />
      {spark > 0.05 && <circle cx={to[0]} cy={to[1]} r={22 * spark} fill="#8FD8FF" opacity={0.6} filter="url(#glowS)" />}
      <P d={ell(to[0], to[1], 9, 9)} fill={C.ochre} sw={4} />
      {bolts}
    </g>
  );
};

export const Tempest: React.FC = () => {
  const f = useCurrentFrame();
  const raise = lin(f, K.raise, K.raise + 12, 0, 1, easeOut) * (f > K.grab ? lin(f, K.grab, K.grab + 10, 1, 0.75) : 1);
  const pain = f >= K.crack;
  const grab = lin(f, K.grab - 1, K.grab + 5, 0, 1, easeOut);
  const bend = pain ? lin(f, K.crack, K.crack + 5, 0, 7, easeOut) + Math.sin(f * 1.7) * 0.8 : Math.sin(f * 0.2) * 0.6;
  const shake = pain && f < K.crack + 14 ? Math.sin(f * 4) * 4 : 0;
  // искры: две слабые вспышки, потом угасают
  const spark = Math.max(0, ...K.sparks.map((s) => (f >= s && f < s + 7 ? 1 - (f - s) / 7 : 0))) * (0.6 + 0.4 * Math.abs(Math.sin(f * 3))) +
    (pain ? Math.max(0, 1 - (f - K.crack) / 6) * 0.5 : 0);
  const lSh: Pt = [1138, 486], rSh: Pt = [1366, 486];
  const lEl = mixPt([1060, 580], [1090, 420], raise), lHa = mixPt([962, 512], [1060, 290], raise);
  const tip = mixPt([640, 384], [900, 10], raise);
  const rEl = mixPt([1414, 610], [1470, 600], grab), rHa = mixPt([1392, 716], [1386, 792], grab);
  const linesIn = pain ? lin(f, K.word - 2, K.word + 12, 60, 420, easeOut) : 0;
  const word = pop(f, K.word, 8, 220);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs />
      <g transform={`translate(960,540) scale(${lin(f, 0, 90, 1.0, 1.05)}) translate(-960,-540) translate(${shake},0)`}>
        <Curtains />
        <BurstPanel id="tmpPanel" x={980} y={130} w={760} h={640} rot={4} seed={19} f={f} />
        <WeatherMap f={f} />
        <Floor y0={890} />
        <WaveRiser y={860} f={f} />
        {pain && f >= K.word - 2 && <Rays cx={1250} cy={300} n={120} seed={31} rIn={linesIn} rInVar={0.6} wMin={0.003} wMax={0.014} op={lin(f, K.word - 2, K.word + 4, 0, 0.85)} />}
        {/* фигура */}
        <g transform={`rotate(${bend},1250,860)`}>
          <P d={rect(1180, 780, 64, 120)} fill="#5E5E68" sh="R" />
          <P d={rect(1258, 780, 64, 120)} fill="#5E5E68" sh="R" />
          <P d={ell(1206, 904, 46, 16)} fill={C.ink} sw={0} />
          <P d={ell(1294, 904, 46, 16)} fill={C.ink} sw={0} />
          <P d="M1130,470 Q1250,440 1370,470 L1350,800 L1150,800Z" fill="#1F2D4A" sh="R" dots="dBlue" />
          <Zap x={1250} y={640} s={1.5} />
          <P d="M1128,470 Q1170,456 1200,470 L1214,560 L1196,800 L1140,800 Q1110,640 1128,470Z" fill="#8E8E99" sh="L" />
          <P d="M1372,470 Q1330,456 1300,470 L1286,560 L1304,800 L1360,800 Q1390,640 1372,470Z" fill="#8E8E99" sh="R" />
          <P d="M1200,470 L1222,560 L1190,520 L1180,476Z" fill="#6C6C78" sw={4} />
          <P d="M1300,470 L1278,560 L1310,520 L1320,476Z" fill="#6C6C78" sw={4} />
          <P d="M1318,540 l30,-4 l-2,22 l-28,2Z" fill={C.red} sw={3} />
          {/* рука к пояснице */}
          <Limb pts={[rSh, rEl, rHa]} w={56} fill="#8E8E99" dots="dk" />
          <Hand x={rHa[0]} y={rHa[1]} r={30} />
          {grab > 0.5 && (
            <g>
              {[0, 1, 2].map((i) => <S key={i} d={`M${1420 + i * 14},${770 + i * 18} l22,-6`} w={5} c={C.red} />)}
              <text x={1500} y={840} fontFamily="Bangers" fontSize={56} fill={C.yellow} stroke={C.ink} strokeWidth={7} paintOrder="stroke" transform={`rotate(-10,1500,840) scale(${pop(f, K.crack, 8, 260)})`} style={{ transformOrigin: "1500px 820px" }}>CRICK!</text>
            </g>
          )}
          {/* голова */}
          <g transform={`translate(1250,${300 + (pain ? 8 : 0)}) rotate(${pain ? -4 : 0})`}>
            <TempestHead mode={pain ? "pain" : "proud"} />
          </g>
          {/* рука с указкой */}
          <Pointer from={lHa} to={tip} f={f} spark={spark} />
          <Limb pts={[lSh, lEl, lHa]} w={56} fill="#8E8E99" dots="dk" />
          <Hand x={lHa[0]} y={lHa[1]} r={30} />
        </g>
        {/* врезка: глаза, распахнутые от прострела */}
        <Inset id="tmpEcu" f={f} start={K.inset} x={1440} y={150} w={430} h={210} rot={3} bg={C.orange}>
          <g transform="translate(1655,340) scale(3)">
            <TempestHead mode="pain" />
          </g>
        </Inset>
        {word > 0 && (
          <g transform={`translate(610,250) scale(${word}) rotate(-5)`}>
            <P d={starBurst(0, 0, 16, 190, 270, 9, 1.55, 1)} fill={C.paper} sw={9} />
            <path d="M360,-40 L530,110 L350,60Z" fill={C.paper} stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
            <path d="M340,-40 L510,104 L330,62Z" fill={C.paper} />
            <Word text="AWOOO..." x={0} y={-55} size={130} fill={C.paper} ext={C.blue} depth={8} />
            <Word text="MY BACK!" x={10} y={75} size={120} fill={C.red} ext={C.ink} depth={6} />
          </g>
        )}
        <LowerThird f={f} start={K.lower} name="LORD TEMPEST" sub="WEATHER FORECAST" x={70} y={900} />
        <Bug />
      </g>
    </svg>
  );
};
