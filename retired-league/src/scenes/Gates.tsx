// 00:00–00:02 — ночные ворота «SUNNY SHORES», схлопывание круговой шторкой с лаймовой каймой.
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, H, W, Pt, ell, lin, poly, rect, easeIn, ease, rng } from "../theme";
import { Defs, P, Rays, S } from "../fx";
import T from "../timeline.json";

const G = T.gates;

const pathPoly = (center: Pt[], w0: number, w1: number) => {
  const L: Pt[] = [], R: Pt[] = [];
  center.forEach((p, i) => {
    const a = center[Math.max(0, i - 1)], b = center[Math.min(center.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    const w = w0 + (w1 - w0) * (i / (center.length - 1));
    L.push([p[0] + nx * w / 2, p[1] + ny * w / 2]);
    R.push([p[0] - nx * w / 2, p[1] - ny * w / 2]);
  });
  return poly([...L, ...R.reverse()]);
};
// гладкая кривая через точки (Catmull-Rom)
const smooth = (pts: Pt[], n = 8) => {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as Pt);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};

const Road: React.FC<{ pts: Pt[]; w0: number; w1: number }> = ({ pts, w0, w1 }) => {
  const seg = (k: number, add: number, color: string) =>
    pts.slice(0, -1).map((p, i) => {
      const q = pts[i + 1], w = w0 + (w1 - w0) * (i / (pts.length - 1));
      return <line key={k + "-" + i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={color} strokeWidth={w + add} strokeLinecap="round" />;
    });
  return (
    <g>
      {seg(0, 14, C.ink)}
      {seg(1, 0, "#E9DAB0")}
      <g opacity={0.45}>{seg(2, -w0 * 0.25, "url(#dOchre)")}</g>
    </g>
  );
};

const GateHalf: React.FC<{ x0: number; x1: number; open: number; side: 1 | -1 }> = ({ x0, x1, open, side }) => {
  // x0 — петля, x1 — центр ворот
  const bars: React.ReactNode[] = [];
  const n = 13;
  const topAt = (t: number) => 380 - Math.sin(t * Math.PI * 0.5) * 70; // арка к центру
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, top = topAt(t);
    bars.push(<rect key={"b" + i} x={x - 6} y={top} width={12} height={1010 - top} fill={C.ink} />);
    bars.push(<rect key={"h" + i} x={x + 2} y={top + 10} width={3} height={1000 - top} fill="#6A5A9A" opacity={0.7} />);
    bars.push(<path key={"s" + i} d={poly([[x - 13, top + 4], [x, top - 40], [x + 13, top + 4]])} fill={C.ink} />);
  }
  const top = smooth(Array.from({ length: 9 }, (_, i) => [x0 + ((x1 - x0) * i) / 8, topAt(i / 8) + 20] as Pt), 4);
  const rail = (y: number) => <rect x={Math.min(x0, x1)} y={y} width={Math.abs(x1 - x0)} height={16} fill={C.ink} />;
  const scrolls: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n;
    scrolls.push(<circle key={i} cx={x} cy={560} r={15} fill="none" stroke={C.ink} strokeWidth={7} />);
  }
  const s = 1 - open * 0.55;
  return (
    <g transform={`translate(${x0},0) scale(${s},1) skewY(${side * open * -7}) translate(${-x0},0)`}>
      {bars}
      <path d={"M" + top.map((p) => p.join(",")).join(" L")} stroke={C.ink} strokeWidth={14} fill="none" />
      {rail(530)}
      {rail(590)}
      {rail(930)}
      {scrolls}
    </g>
  );
};

const Column: React.FC<{ x: number; w: number; seed: number; plaque?: boolean }> = ({ x, w, seed, plaque }) => {
  const r = rng(seed);
  const blocks: React.ReactNode[] = [];
  for (let y = 330, row = 0; y < 1080; y += 70, row++) {
    blocks.push(<S key={"r" + y} d={`M${x},${y} H${x + w}`} w={4} />);
    const off = row % 2 ? w * 0.5 : w * 0.25;
    blocks.push(<S key={"c" + y} d={`M${x + off},${y} V${y + 70}`} w={4} />);
  }
  const cracks = [0, 1, 2].map((i) => {
    const cx = x + 20 + r() * (w - 40), cy = 380 + r() * 560;
    return <S key={"k" + i} d={`M${cx},${cy} l${10 + r() * 14},${18} l${-12},${20} l${14},${22}`} w={3.5} />;
  });
  return (
    <g>
      <P d={rect(x, 320, w, 780)} fill="#8C8698" sh="R" dots="dk" />
      {blocks}
      {cracks}
      <P d={rect(x - 26, 282, w + 52, 46)} fill="#A39DAF" sh="R" />
      <P d={rect(x - 12, 246, w + 24, 40)} fill="#8C8698" sh="R" />
      <P d={ell(x + w / 2, 214, 44, 40)} fill="#A39DAF" sh="R" />
      {plaque && (
        <g>
          <rect x={x + 20} y={512} width={w - 26} height={168} fill={C.ink} />
          <P d={rect(x + 12, 504, w - 26, 166, 8)} fill="#B8923A" sh="BR" dots="dOchre" />
          <path d={ell(x + 40, 520, 30, 16)} fill="#6FA58A" opacity={0.85} />
          <path d={ell(x + w - 40, 650, 36, 14)} fill="#6FA58A" opacity={0.85} />
          <path d={ell(x + w / 2, 664, 22, 9)} fill="#6FA58A" opacity={0.7} />
          <text x={x + w / 2 - 1} y={560} textAnchor="middle" fontFamily="Bangers" fontSize={33} fill="#3B2A10" letterSpacing={1}>SUNNY SHORES</text>
          <S d={`M${x + 32},${576} H${x + w - 46}`} w={3} c="#3B2A10" />
          <text x={x + w / 2 - 1} y={610} textAnchor="middle" fontFamily="Anton" fontSize={23} fill="#3B2A10" letterSpacing={1.5}>HOME FOR</text>
          <text x={x + w / 2 - 1} y={642} textAnchor="middle" fontFamily="Anton" fontSize={23} fill="#3B2A10" letterSpacing={1.5}>RETIRED HEROES</text>
          {[[x + 24, 516], [x + w - 28, 516], [x + 24, 658], [x + w - 28, 658]].map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={5} fill="#E9D18A" stroke={C.ink} strokeWidth={2.5} />
          ))}
        </g>
      )}
    </g>
  );
};

export const Gates: React.FC = () => {
  const f = useCurrentFrame();
  const zoom = lin(f, 0, G.irisEnd, 1, 1.2, ease);
  const open = lin(f, G.creak, 40, 0, 1, ease);
  const iris = lin(f, G.iris, G.irisEnd, 1250, 0, easeIn);
  const r = rng(11);
  const stars = Array.from({ length: 40 }, (_, i) => {
    const x = r() * W, y = r() * 520, s = 3 + r() * 6, tw = 0.5 + 0.5 * Math.sin(f * 0.4 + i);
    return <path key={i} d={`M${x},${y - s} L${x + s * 0.3},${y} L${x},${y + s} L${x - s * 0.3},${y}Z M${x - s},${y} L${x},${y + s * 0.3} L${x + s},${y} L${x},${y - s * 0.3}Z`} fill={C.paper} opacity={0.4 + 0.6 * tw} />;
  });
  const roadC = smooth([[960, 1100], [880, 990], [1010, 890], [1150, 810], [1060, 730], [1090, 660], [1110, 618]], 10);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs />
      <clipPath id="iris">
        <circle cx={960} cy={560} r={iris} />
      </clipPath>
      <g clipPath="url(#iris)">
        <g transform={`translate(960,600) scale(${zoom}) translate(-960,-600)`}>
          <linearGradient id="sky" x1={0} y1={0} x2={0} y2={1}>
            <stop offset={0} stopColor="#170C2B" />
            <stop offset={0.7} stopColor={C.indigo2} />
          </linearGradient>
          <rect width={W} height={H} fill="url(#sky)" />
          <rect width={W} height={700} fill="url(#dPurpleL)" opacity={0.35} />
          {stars}
          {/* Луна в растре Бен-Дей */}
          <circle cx={1330} cy={270} r={330} fill="url(#yellowGlow)" opacity={0.45} />
          <P d={ell(1330, 270, 205, 205)} fill="#F8EDC2" sw={8} />
          <path d={ell(1330, 270, 205, 205)} fill="url(#dYellow)" opacity={0.75} />
          <path d={ell(1330, 270, 205, 205)} fill="url(#dk)" mask="url(#shL)" opacity={0.35} />
          <P d={ell(1260, 200, 40, 30)} fill="#E7D08A" sw={4} />
          <P d={ell(1400, 330, 55, 38)} fill="#E7D08A" sw={4} />
          <P d={ell(1390, 170, 22, 16)} fill="#E7D08A" sw={4} />
          <P d="M1040,330 Q1080,290 1140,310 Q1180,270 1250,300 Q1320,280 1360,320 Q1420,320 1430,350 L1040,352Z" fill="#2A1A4C" sw={6} />
          {/* холмы */}
          <P d="M-20,640 Q200,520 460,600 Q700,500 980,580 Q1200,520 1450,590 Q1700,520 1960,600 L1960,1100 L-20,1100Z" fill="#3E2A6E" sh="T" dots="dPurple" />
          {/* далёкий дом ретрита */}
          <g transform="translate(1110,600)">
            <P d={poly([[-90, 0], [-90, -80], [0, -150], [90, -80], [90, 0]])} fill="#1C1033" sw={5} />
            <P d={rect(-40, -200, 26, 70)} fill="#1C1033" sw={4} />
            {[[-60, -60], [-20, -60], [20, -60], [60, -60], [-40, -100], [40, -100]].map((p, i) => (
              <g key={i}>
                <rect x={p[0] - 10} y={p[1] - 14} width={20} height={26} fill={C.lime} opacity={0.4} filter="url(#glowS)" />
                <path d={rect(p[0] - 8, p[1] - 12, 16, 22)} fill={C.lime} />
              </g>
            ))}
            <path d={rect(-11, -28, 22, 28)} fill={C.ochre} />
          </g>
          <P d="M-20,760 Q260,650 560,720 Q820,640 1060,700 Q1300,640 1560,720 Q1780,660 1960,720 L1960,1100 L-20,1100Z" fill="#4C3385" sh="T" dots="dPurple" />
          <Road pts={roadC} w0={210} w1={10} />
          <P d="M-20,900 Q300,830 620,880 Q760,900 820,1100 L-20,1100Z" fill="#2E1C52" sh="T" dots="dPurple" />
          <P d="M1960,900 Q1640,820 1300,880 Q1150,900 1100,1100 L1960,1100Z" fill="#2E1C52" sh="T" dots="dPurple" />
          {/* ворота и колонны */}
          <GateHalf x0={330} x1={960} open={open} side={1} />
          <GateHalf x0={1590} x1={960} open={open} side={-1} />
          <Column x={130} w={200} seed={3} />
          <Column x={1590} w={200} seed={8} plaque />
          {/* клиновидные спид-лайны по углам */}
          <Rays cx={960} cy={560} n={80} seed={21} rIn={lin(f, 0, 58, 760, 640)} rInVar={0.7} wMin={0.006} wMax={0.03} />
        </g>
      </g>
      {f >= G.iris && iris > 2 && (
        <g>
          <circle cx={960} cy={560} r={iris} fill="none" stroke={C.lime} strokeWidth={46} opacity={0.6} filter="url(#glow)" />
          <circle cx={960} cy={560} r={iris} fill="none" stroke={C.ink} strokeWidth={40} />
          <circle cx={960} cy={560} r={iris} fill="none" stroke={C.lime} strokeWidth={24} />
        </g>
      )}
    </svg>
  );
};
