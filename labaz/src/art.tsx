// Векторная графика: окружение (сопки, деревья, огонь, мох) и персонажи (охотник-марионетка, марал, дятел, существо).
import React from "react";
import { useCurrentFrame } from "remotion";
import { C, noise1, rnd } from "./lib";

// ======================================================================= ОКРУЖЕНИЕ
// Ярус сопок: волнистая линия-силуэт
export const Ridge: React.FC<{ y: number; amp: number; color: string; seed: number; x0?: number; period?: number; opacity?: number }> =
  ({ y, amp, color, seed, x0 = 0, period = 420, opacity = 1 }) => {
  let d = `M-400,2400 L-400,${y}`;
  for (let x = -400; x <= 1500; x += 30) {
    const xx = x + x0;
    const yy = y - amp * (0.55 * Math.sin(xx / period + seed) + 0.3 * Math.sin(xx / (period * 0.37) + seed * 2.1) + 0.15 * Math.sin(xx / (period * 0.13) + seed * 4.7));
    d += ` L${x},${yy.toFixed(1)}`;
  }
  d += " L1500,2400 Z";
  return <path d={d} fill={color} opacity={opacity} />;
};

// Ель/пихта силуэтом: ярусы-треугольники с рваным краем
export const Conifer: React.FC<{ x: number; y: number; h: number; color: string; seed?: number; w?: number; opacity?: number }> =
  ({ x, y, h, color, seed = 1, w, opacity = 1 }) => {
  const ww = w ?? h * 0.32;
  const tiers = 9;
  let d = `M${x},${y - h}`;
  const pts: string[] = [];
  for (let i = 1; i <= tiers; i++) {
    const t = i / tiers;
    const yy = y - h + t * h * 0.92;
    const half = ww * t * (0.75 + 0.25 * rnd(seed * 17 + i));
    pts.push(`${x + half},${yy}`, `${x + half * 0.45},${yy - h * 0.02}`);
  }
  d += " L" + pts.join(" L");
  d += ` L${x + ww * 0.05},${y} L${x - ww * 0.05},${y}`;
  const left: string[] = [];
  for (let i = tiers; i >= 1; i--) {
    const t = i / tiers;
    const yy = y - h + t * h * 0.92;
    const half = ww * t * (0.75 + 0.25 * rnd(seed * 23 + i));
    left.push(`${x - half * 0.45},${yy - h * 0.02}`, `${x - half},${yy}`);
  }
  d += " L" + left.join(" L") + " Z";
  return <path d={d} fill={color} opacity={opacity} />;
};

// Ствол с корой
export const Trunk: React.FC<{ x: number; w: number; top: number; bottom: number; color: string; bark?: string; seed?: number; taper?: number }> =
  ({ x, w, top, bottom, color, bark = "rgba(0,0,0,0.35)", seed = 1, taper = 0.85 }) => {
  const wt = w * taper;
  const lines = [];
  for (let i = 0; i < Math.round(w / 14); i++) {
    const r = rnd(seed * 11 + i);
    const xx = x - w / 2 + (i + 0.5) * (w / Math.round(w / 14)) + (r - 0.5) * 6;
    const y0 = top + r * (bottom - top) * 0.3;
    const y1 = bottom - rnd(seed * 3 + i) * (bottom - top) * 0.25;
    lines.push(<path key={i} d={`M${xx},${y0} Q${xx + (r - 0.5) * 14},${(y0 + y1) / 2} ${xx},${y1}`} stroke={bark} strokeWidth={2 + r * 4} fill="none" />);
  }
  return (
    <g>
      <path d={`M${x - wt / 2},${top} L${x + wt / 2},${top} L${x + w / 2},${bottom} Q${x + w * 0.62},${bottom + 10} ${x + w * 0.75},${bottom + 14} L${x - w * 0.75},${bottom + 14} Q${x - w * 0.62},${bottom + 10} ${x - w / 2},${bottom} Z`} fill={color} />
      {lines}
    </g>
  );
};

// Ветка кедра/пихты (лапа) — для переднего плана
export const Bough: React.FC<{ x: number; y: number; len: number; angle: number; color: string; seed?: number; needle?: number; sw?: number }> =
  ({ x, y, len, angle, color, seed = 1, needle = 46, sw = 10 }) => {
  const parts = [];
  const n = 16;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const px = t * len, py = Math.sin(t * 2.2) * len * 0.06;
    const nl = needle * (1 - t * 0.55) * (0.8 + 0.4 * rnd(seed + i));
    parts.push(<path key={"a" + i} d={`M${px},${py} l${nl * 0.55},${-nl * 0.85} M${px},${py} l${nl * 0.55},${nl * 0.85} M${px},${py} l${nl * 0.9},${-nl * 0.25} M${px},${py} l${nl * 0.9},${nl * 0.25}`}
      stroke={color} strokeWidth={sw * 0.55} strokeLinecap="round" />);
  }
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      <path d={`M0,0 Q${len * 0.5},${len * 0.05} ${len},${Math.sin(2.2) * len * 0.06}`} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {parts}
    </g>
  );
};

// Бородатый лишайник (уснея)
export const Lichen: React.FC<{ x: number; y: number; len: number; color?: string; seed?: number }> = ({ x, y, len, color = "#9aa79a", seed = 1 }) => {
  const f = useCurrentFrame();
  return (
    <g opacity={0.75}>
      {Array.from({ length: 7 }).map((_, i) => {
        const r = rnd(seed * 5 + i);
        const sway = noise1(f * 0.04, seed + i) * 10;
        const l = len * (0.5 + r * 0.6);
        const xx = x + (r - 0.5) * 40;
        return <path key={i} d={`M${xx},${y} q${sway * 0.5},${l * 0.5} ${sway},${l}`} stroke={color} strokeWidth={2 + r * 3} fill="none" strokeLinecap="round" />;
      })}
    </g>
  );
};

export const Stars: React.FC<{ n?: number; h?: number; seed?: number }> = ({ n = 70, h = 900, seed = 3 }) => {
  const f = useCurrentFrame();
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const tw = 0.5 + 0.5 * Math.sin(f * 0.08 + i * 3.1);
        return <circle key={i} cx={rnd(seed + i) * 1080} cy={rnd(seed + i * 2.3) * h} r={0.8 + rnd(i * 7) * 1.8} fill="#dfe9ff" opacity={0.25 + 0.5 * tw * rnd(i)} />;
      })}
    </g>
  );
};

// Костёр: языки пламени, свечение, искры. lit — 0..1 разгорание
export const Fire: React.FC<{ x: number; y: number; s?: number; lit?: number; seed?: number; logs?: boolean; sparks?: number }> =
  ({ x, y, s = 1, lit = 1, seed = 0, logs = true, sparks = 22 }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const tongue = (i: number, w: number, h: number, col: string, k: number) => {
    const sway = noise1(t * 3 + i * 1.7, seed + i) * w * 0.9;
    const hh = h * (0.75 + 0.25 * (0.5 + 0.5 * noise1(t * 5 + i, seed * 2 + i))) * lit;
    const ox = (i - 2) * w * 0.55 * k;
    return <path key={col + i} d={`M${ox - w},0 C${ox - w},${-hh * 0.35} ${ox + sway * 0.5 - w * 0.3},${-hh * 0.62} ${ox + sway},${-hh} C${ox + sway * 0.5 + w * 0.3},${-hh * 0.62} ${ox + w},${-hh * 0.35} ${ox + w},0 Z`} fill={col} />;
  };
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <circle cx={0} cy={-60} r={420} fill="url(#fireGlow)" opacity={0.9 * lit * (0.85 + 0.15 * noise1(t * 6, seed))} />
      {logs && <g>
        <rect x={-150} y={-22} width={300} height={40} rx={20} fill="#140d08" transform="rotate(12)" />
        <rect x={-150} y={-22} width={300} height={40} rx={20} fill="#1d130b" transform="rotate(-14)" />
        <ellipse cx={0} cy={4} rx={110} ry={16} fill={C.fire} opacity={0.55 * lit} filter="url(#blur8)" />
      </g>}
      <g filter="url(#glow)">
        {[0, 1, 2, 3, 4].map((i) => tongue(i, 46, 230 - Math.abs(i - 2) * 50, C.fire, 1))}
        {[0, 1, 2, 3, 4].map((i) => tongue(i, 30, 160 - Math.abs(i - 2) * 36, "#FFA21A", 0.8))}
        {[1, 2, 3].map((i) => tongue(i, 18, 95 - Math.abs(i - 2) * 22, "#FFE6A0", 0.6))}
      </g>
      {Array.from({ length: sparks }).map((_, i) => {
        const life = 38 + rnd(i + seed) * 30;
        const ph = ((f + rnd(i * 3 + seed) * life) % life) / life;
        const sx = (rnd(i * 5 + seed) - 0.5) * 120 + noise1(ph * 6 + i, i) * 50 * ph;
        const sy = -40 - ph * (260 + rnd(i * 9) * 300);
        return <circle key={i} cx={sx} cy={sy} r={2 + rnd(i) * 2.5} fill="#FFC060" opacity={(1 - ph) * lit} filter="url(#glow)" />;
      })}
    </g>
  );
};
export const FireDefs: React.FC = () => (
  <defs>
    <radialGradient id="fireGlow"><stop offset="0" stopColor="#FF8A1E" stopOpacity="0.75" /><stop offset="0.35" stopColor="#FF6B00" stopOpacity="0.28" /><stop offset="1" stopColor="#FF6B00" stopOpacity="0" /></radialGradient>
    <radialGradient id="moonGlow"><stop offset="0" stopColor="#E0F7FF" stopOpacity="0.5" /><stop offset="1" stopColor="#E0F7FF" stopOpacity="0" /></radialGradient>
  </defs>
);

// Кочка мха / ягеля
export const MossClump: React.FC<{ x: number; y: number; r: number; color: string; hi?: string; seed?: number; squash?: number }> =
  ({ x, y, r, color, hi, seed = 1, squash = 1 }) => (
  <g transform={`translate(${x},${y}) scale(1,${squash})`}>
    {Array.from({ length: 9 }).map((_, i) => {
      const a = (i / 9) * Math.PI;
      const rr = r * (0.35 + 0.25 * rnd(seed + i));
      return <circle key={i} cx={Math.cos(a) * r * 0.75} cy={-Math.sin(a) * r * 0.45} r={rr} fill={i % 3 === 0 && hi ? hi : color} />;
    })}
    <ellipse cx={0} cy={0} rx={r} ry={r * 0.35} fill={color} />
  </g>
);

// ======================================================================= ПЕРСОНАЖИ
export type Pal = { jacket: string; jacketDark: string; pants: string; boot: string; hat: string; skin: string; strap: string; wood: string; metal: string; rim?: string };
export const PAL_DAY: Pal = { jacket: "#6b6a45", jacketDark: "#4f4e33", pants: "#3e3d2e", boot: "#3a2a1c", hat: "#1f2226", skin: "#c39274", strap: "#7a6a48", wood: "#9b6a3c", metal: "#2a2d30" };
export const PAL_DUSK: Pal = { jacket: "#3b4036", jacketDark: "#2b2f28", pants: "#24261f", boot: "#1d1712", hat: "#121417", skin: "#6e5a52", strap: "#40392b", wood: "#4f3a26", metal: "#15181a" };
export const PAL_NIGHT: Pal = { jacket: "#151a17", jacketDark: "#0d110f", pants: "#0d0f0d", boot: "#0a0806", hat: "#07080a", skin: "#2d2622", strap: "#1a1712", wood: "#22180f", metal: "#0b0c0d" };
export const PAL_FIRE: Pal = { jacket: "#4a3a22", jacketDark: "#2a2015", pants: "#241b12", boot: "#1a120b", hat: "#120d0a", skin: "#a8613a", strap: "#4a361f", wood: "#7a4520", metal: "#1e1a17", rim: "#FF8A2A" };

export type Pose = {
  torso?: number; head?: number;
  armBack1?: number; armBack2?: number; armFront1?: number; armFront2?: number;
  legBack1?: number; legBack2?: number; legFront1?: number; legFront2?: number;
  rifle?: "back" | "hands" | "knees" | "none" | "hand"; hatInHand?: boolean;
};

// Охотник-марионетка, смотрит вправо. Начало координат — таз. Углы в градусах, «вперёд» = положительно.
export const Hunter: React.FC<{ x: number; y: number; s?: number; pose: Pose; pal?: Pal; flip?: boolean; breath?: number }> =
  ({ x, y, s = 1, pose, pal = PAL_DAY, flip, breath = 0 }) => {
  const p = { torso: 0, head: 0, armBack1: 8, armBack2: 10, armFront1: -6, armFront2: 12, legBack1: -4, legBack2: 4, legFront1: 6, legFront2: 4, rifle: "back" as const, ...pose };
  const rim = pal.rim;
  const limb = (len: number, w: number, col: string) => <line x1={0} y1={0} x2={0} y2={len} stroke={col} strokeWidth={w} strokeLinecap="round" />;
  const rifleShape = (
    <g>
      <rect x={-6} y={-230} width={12} height={250} rx={4} fill={pal.metal} />
      <path d="M-10,10 L10,10 L22,120 Q22,140 4,142 L-14,142 Z" fill={pal.wood} />
      <rect x={-9} y={-30} width={18} height={44} rx={3} fill={pal.metal} />
    </g>
  );
  const leg = (a1: number, a2: number, col: string, boot: string) => (
    <g transform={`rotate(${-a1})`}>
      {limb(140, 50, col)}
      <g transform={`translate(0,140) rotate(${a2})`}>
        {limb(132, 40, col)}
        <path d="M-20,120 L-22,150 L44,150 Q52,140 40,128 Z" fill={boot} />
      </g>
    </g>
  );
  const arm = (a1: number, a2: number, col: string, front: boolean) => (
    <g transform={`rotate(${-a1})`}>
      {limb(118, 38, col)}
      <g transform={`translate(0,118) rotate(${-a2})`}>
        {limb(108, 32, col)}
        <circle cx={0} cy={118} r={17} fill={pal.skin} />
        {front && p.rifle === "hand" && <g transform="translate(0,118) rotate(200)">{rifleShape}</g>}
        {front && p.hatInHand && <path d="M-26,128 Q0,96 26,128 Q26,148 0,150 Q-26,148 -26,128 Z" fill={pal.hat} />}
      </g>
    </g>
  );
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
      {/* дальняя рука и нога */}
      {leg(p.legBack1, p.legBack2, pal.pants, pal.boot)}
      <g transform={`rotate(${p.torso})`}>
        <g transform="translate(0,-212)">{arm(p.armBack1, p.armBack2, pal.jacketDark, false)}</g>
        {p.rifle === "back" && <g transform="translate(-34,-120) rotate(-24)">{rifleShape}</g>}
      </g>
      {leg(p.legFront1, p.legFront2, pal.pants, pal.boot)}
      {/* корпус */}
      <g transform={`rotate(${p.torso})`}>
        <path d={`M-44,6 Q-58,-110 -50,-200 Q-40,-${238 + breath * 3} 0,-${240 + breath * 3} Q40,-${238 + breath * 3} 50,-196 Q58,-110 44,6 Z`} fill={pal.jacket} />
        <path d="M-44,6 Q-58,-110 -50,-200 L-30,-200 Q-38,-100 -24,6 Z" fill={pal.jacketDark} opacity={0.7} />
        <path d="M-40,-205 L36,-10" stroke={pal.strap} strokeWidth={12} />
        <rect x={-46} y={-40} width={92} height={16} rx={6} fill={pal.jacketDark} />
        {rim && <path d="M44,6 Q58,-110 50,-196" stroke={rim} strokeWidth={6} fill="none" opacity={0.8} />}
        {/* голова */}
        <g transform={`translate(4,-252) rotate(${p.head})`}>
          <rect x={-14} y={-6} width={28} height={30} fill={pal.skin} />
          <ellipse cx={4} cy={-34} rx={36} ry={42} fill={pal.skin} />
          <path d="M36,-36 L48,-18 L36,-14 Z" fill={pal.skin} />
          <path d="M-30,-18 Q-10,4 30,-6 Q32,4 26,10 Q0,16 -24,2 Z" fill="rgba(40,30,25,0.45)" />
          <circle cx={22} cy={-40} r={4} fill="#1a1412" />
          {!p.hatInHand && <path d="M-36,-46 Q-38,-92 4,-94 Q44,-92 42,-48 Q4,-58 -36,-46 Z" fill={pal.hat} />}
          {p.hatInHand && <path d="M-34,-50 Q-30,-82 4,-80 Q38,-80 38,-52 Q4,-64 -34,-50 Z" fill="#2a221c" />}
          {rim && <path d="M40,-46 Q44,-10 30,8" stroke={rim} strokeWidth={5} fill="none" />}
        </g>
        {/* ближняя рука */}
        <g transform="translate(6,-212)">{arm(p.armFront1, p.armFront2, pal.jacket, true)}</g>
        {p.rifle === "hands" && <g transform="translate(60,-120) rotate(80)">{rifleShape}</g>}
      </g>
      {p.rifle === "knees" && <g transform="translate(90,-20) rotate(82)">{rifleShape}</g>}
    </g>
  );
};

// Марал (самка): смотрит влево. graze 0..1 — опускание головы к траве
export const Deer: React.FC<{ x: number; y: number; s?: number; color: string; rim?: string; graze?: number; step?: number; calf?: boolean }> =
  ({ x, y, s = 1, color, rim, graze = 0, step = 0, calf }) => {
  const legLen = calf ? 150 : 175;
  const bw = calf ? 120 : 175, bh = calf ? 52 : 78;
  const neckA = -32 - 88 * graze;
  const legs = [[-bw * 0.62, step * 6], [-bw * 0.42, -step * 6], [bw * 0.5, -step * 4], [bw * 0.68, step * 4]];
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {legs.map(([lx, a], i) => (
        <g key={i} transform={`translate(${lx},${-legLen + 10}) rotate(${a})`}>
          <path d={`M-9,0 L9,0 L6,${legLen * 0.55} L4,${legLen} L-4,${legLen} L-5,${legLen * 0.55} Z`} fill={color} opacity={i % 2 ? 0.85 : 1} />
        </g>
      ))}
      <ellipse cx={0} cy={-legLen - bh * 0.25} rx={bw} ry={bh} fill={color} />
      <ellipse cx={bw * 0.85} cy={-legLen - bh * 0.3} rx={20} ry={14} fill={color} />
      <g transform={`translate(${-bw * 0.72},${-legLen - bh * 0.55}) rotate(${neckA})`}>
        <path d={`M-22,0 L22,0 L16,${-(calf ? 90 : 150)} L-12,${-(calf ? 90 : 150)} Z`} fill={color} />
        <g transform={`translate(0,${-(calf ? 96 : 158)}) rotate(${-neckA - 12 - 48 * graze})`}>
          <ellipse cx={-30} cy={0} rx={calf ? 34 : 46} ry={calf ? 18 : 24} fill={color} />
          <ellipse cx={-62} cy={6} rx={calf ? 12 : 18} ry={calf ? 10 : 14} fill={color} />
          <path d={`M-6,-14 L${calf ? 6 : 10},${calf ? -48 : -62} L${calf ? -14 : -18},-18 Z`} fill={color} />
          <path d={`M8,-10 L${calf ? 26 : 34},${calf ? -40 : -54} L-2,-16 Z`} fill={color} opacity={0.85} />
        </g>
      </g>
      {rim && <path d={`M${-bw * 0.9},${-legLen - bh * 0.9} Q0,${-legLen - bh * 1.35} ${bw * 0.95},${-legLen - bh * 0.7}`} stroke={rim} strokeWidth={5} fill="none" opacity={0.85} />}
    </g>
  );
};

// Желна: чёрный дятел с красной шапочкой. peck 0..1 — удар
export const Woodpecker: React.FC<{ x: number; y: number; s?: number; peck: number }> = ({ x, y, s = 1, peck }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M10,40 L30,120 L0,118 Z" fill="#0b0b0c" />
    <ellipse cx={0} cy={0} rx={30} ry={62} fill="#111214" transform="rotate(-12)" />
    <g transform={`translate(-14,-58) rotate(${-peck * 28})`}>
      <circle cx={0} cy={0} r={24} fill="#141518" />
      <path d="M-6,-22 Q10,-34 22,-14 Q8,-14 -6,-8 Z" fill="#E0202E" />
      <path d="M-20,-4 L-62,4 L-20,8 Z" fill="#d9d2b0" />
      <circle cx={-8} cy={-4} r={4} fill="#f0f0e0" /><circle cx={-8} cy={-4} r={2} fill="#000" />
    </g>
    <path d="M-10,30 L-24,60 M6,34 L-6,64" stroke="#333" strokeWidth={5} strokeLinecap="round" />
  </g>
);

// Глаза существа: две узкие вертикальные щели
export const CreatureEyes: React.FC<{ x: number; y: number; s?: number; o?: number; blink?: number }> = ({ x, y, s = 1, o = 1, blink = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s},${s * blink})`} opacity={o}>
    {[-30, 30].map((dx) => (
      <g key={dx}>
        <ellipse cx={dx} cy={0} rx={22} ry={30} fill="#FFE8A0" opacity={0.25} filter="url(#blur8)" />
        <ellipse cx={dx} cy={0} rx={5} ry={26} fill="#FFF3B8" filter="url(#glow)" />
      </g>
    ))}
  </g>
);

// Вытянутая серая фигура
export const TallFigure: React.FC<{ x: number; y: number; s?: number; o?: number; color?: string }> = ({ x, y, s = 1, o = 1, color = "#8f9590" }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={o}>
    <path d="M-10,-640 Q-40,-640 -38,-590 Q-36,-552 -14,-540 L-44,-520 Q-70,-380 -60,-200 L-52,0 L-30,0 L-22,-210 L-6,-210 L4,0 L26,0 L34,-200 Q48,-380 30,-520 L8,-540 Q30,-556 30,-596 Q28,-640 -10,-640 Z" fill={color} />
    <path d="M-50,-500 Q-110,-340 -120,-150 L-104,-148 Q-86,-330 -40,-470 Z" fill={color} opacity={0.9} />
    <path d="M-124,-152 l-10,40 M-116,-150 l-2,44 M-108,-150 l8,40" stroke={color} strokeWidth={4} strokeLinecap="round" />
  </g>
);
