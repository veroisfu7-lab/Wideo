// Общие комиксные приёмы: растр Бен-Дей, тушь, 3D-буквы, лучи, панели, студия, титры, переходы.
import React from "react";
import { C, H, W, Pt, ell, lin, line, pop, poly, rect, rng, easeOut, starBurst } from "./theme";

const INK = C.ink;

// ---------------------------------------------------------------- defs: растры, маски тени, свечение
const dot = (id: string, size: number, r: number, color: string, rot = 45) => (
  <pattern key={id} id={id} patternUnits="userSpaceOnUse" width={size} height={size} patternTransform={`rotate(${rot})`}>
    <circle cx={size / 2} cy={size / 2} r={r} fill={color} />
  </pattern>
);
const shadeMask = (id: string, x1: number, y1: number, x2: number, y2: number, from = 0.3) => (
  <React.Fragment key={id}>
    <linearGradient id={`g${id}`} x1={x1} y1={y1} x2={x2} y2={y2}>
      <stop offset={from} stopColor="#000" />
      <stop offset={1} stopColor="#fff" />
    </linearGradient>
    <mask id={`sh${id}`} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x={-0.05} y={-0.05} width={1.1} height={1.1}>
      <rect x={-0.05} y={-0.05} width={1.1} height={1.1} fill={`url(#g${id})`} />
    </mask>
  </React.Fragment>
);

export const Defs: React.FC = () => (
  <defs>
    {dot("dk", 10, 2.5, INK)}
    {dot("dk2", 10, 3.6, INK)}
    {dot("dkS", 7, 1.5, INK)}
    {dot("dPaper", 12, 2.2, C.paper)}
    {dot("dPurple", 11, 3.2, C.indigo3)}
    {dot("dPurpleL", 11, 2.6, "#5A3C92")}
    {dot("dRed", 9, 2.6, C.red)}
    {dot("dOchre", 10, 3, "#B9771A")}
    {dot("dLime", 10, 3, C.limeDark)}
    {dot("dYellow", 12, 3.4, "#E8B92A")}
    {dot("dBlue", 10, 3, "#1E4A61")}
    {dot("dPink", 8, 2.6, "#E5776A")}
    <pattern id="hatch" patternUnits="userSpaceOnUse" width={9} height={9} patternTransform="rotate(-35)">
      <rect width={9} height={3} fill={INK} opacity={0.55} />
    </pattern>
    <pattern id="plaid" patternUnits="userSpaceOnUse" width={22} height={22}>
      <rect width={22} height={22} fill={C.red} />
      <rect width={22} height={6} y={8} fill={C.ochre} opacity={0.8} />
      <rect width={6} height={22} x={8} fill={C.ochre} opacity={0.8} />
      <rect width={22} height={2} y={18} fill={INK} opacity={0.6} />
      <rect width={2} height={22} x={18} fill={INK} opacity={0.6} />
    </pattern>
    <linearGradient id="pleatG" x1={0} x2={1} y1={0} y2={0}>
      <stop offset={0} stopColor="#56389A" />
      <stop offset={0.35} stopColor="#3F2874" />
      <stop offset={0.8} stopColor="#22143E" />
      <stop offset={1} stopColor="#2C1B4D" />
    </linearGradient>
    <pattern id="pleat" patternUnits="userSpaceOnUse" width={120} height={H}>
      <rect width={120} height={H} fill="url(#pleatG)" />
      <path d="M100,0 Q108,540 98,1080" stroke={INK} strokeOpacity={0.55} strokeWidth={3} fill="none" />
    </pattern>
    <linearGradient id="chromeG" x1={0} x2={1} y1={0} y2={0}>
      <stop offset={0} stopColor="#8F9AA1" />
      <stop offset={0.18} stopColor="#F4F7F8" />
      <stop offset={0.35} stopColor="#B9C3C8" />
      <stop offset={0.75} stopColor="#9AA5AB" />
      <stop offset={1} stopColor="#5F6A71" />
    </linearGradient>
    <radialGradient id="limeGlow">
      <stop offset={0} stopColor={C.lime} stopOpacity={0.85} />
      <stop offset={1} stopColor={C.lime} stopOpacity={0} />
    </radialGradient>
    <radialGradient id="yellowGlow">
      <stop offset={0} stopColor="#FFF27A" stopOpacity={0.95} />
      <stop offset={1} stopColor="#FFE94A" stopOpacity={0} />
    </radialGradient>
    {shadeMask("R", 0, 0, 1, 0)}
    {shadeMask("L", 1, 0, 0, 0)}
    {shadeMask("B", 0, 0, 0, 1)}
    {shadeMask("T", 0, 1, 0, 0)}
    {shadeMask("BR", 0, 0, 1, 1)}
    {shadeMask("RS", 0, 0, 1, 0, 0.6)}
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={10} />
    </filter>
    <filter id="glowS" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={4} />
    </filter>
  </defs>
);

// ---------------------------------------------------------------- деталь с тушью и растровой тенью
type PProps = { d: string; fill: string; sh?: string; dots?: string; sw?: number; op?: number; style?: React.CSSProperties };
export const P: React.FC<PProps> = ({ d, fill, sh, dots = "dk", sw = 6, op = 1 }) => (
  <g>
    {fill !== "none" && <path d={d} fill={fill} />}
    {sh && <path d={d} fill={`url(#${dots})`} mask={`url(#sh${sh})`} opacity={op} />}
    {sw > 0 && <path d={d} fill="none" stroke={INK} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />}
  </g>
);
// штрих тушью
export const S: React.FC<{ d: string; w?: number; c?: string; op?: number; dash?: string }> = ({ d, w = 5, c = INK, op = 1, dash }) => (
  <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={op} strokeDasharray={dash} />
);
// конечность: толстая линия с обводкой
export const Limb: React.FC<{ pts: Pt[]; w: number; fill: string; sw?: number; dots?: string }> = ({ pts, w, fill, sw = 6, dots }) => {
  const d = line(pts);
  return (
    <g>
      <path d={d} stroke={INK} strokeWidth={w + sw * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={fill} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {dots && <path d={d} stroke={`url(#${dots})`} strokeWidth={w * 0.45} fill="none" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${w * 0.22},${w * 0.12})`} />}
    </g>
  );
};
// кулак/кисть
export const Hand: React.FC<{ x: number; y: number; r?: number; fill?: string; rot?: number }> = ({ x, y, r = 30, fill = C.skin, rot = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${rot})`}>
    <P d={ell(0, 0, r, r * 0.86)} fill={fill} sh="R" />
    <S d={`M${-r * 0.2},${-r * 0.75} Q${-r * 0.1},${-r * 0.2} ${-r * 0.25},${r * 0.2} M${r * 0.25},${-r * 0.7} Q${r * 0.3},${-r * 0.2} ${r * 0.15},${r * 0.3}`} w={3.5} />
  </g>
);

// ---------------------------------------------------------------- 3D-комиксные буквы
type WordProps = {
  text: string; x: number; y: number; size: number; fill?: string; ext?: string; depth?: number; dx?: number; dy?: number;
  sw?: number; rot?: number; scale?: number; font?: string; glow?: string; spacing?: number; skew?: number; op?: number;
};
export const Word: React.FC<WordProps> = ({
  text, x, y, size, fill = "#fff", ext = C.orange, depth = 12, dx = 1, dy = 1.1, sw, rot = 0, scale = 1,
  font = "Bangers", glow, spacing = 2, skew = 0, op = 1,
}) => {
  const st = sw ?? Math.max(6, size * 0.075);
  const step = size / 120;
  const tp = { fontFamily: font, fontSize: size, textAnchor: "middle" as const, letterSpacing: spacing, dominantBaseline: "middle" as const };
  const layers = Array.from({ length: depth }, (_, i) => depth - i);
  return (
    <g transform={`translate(${x},${y}) rotate(${rot}) skewX(${skew}) scale(${scale})`} opacity={op}>
      {glow && (
        <text {...tp} fill={glow} stroke={glow} strokeWidth={st * 3.2} strokeLinejoin="round" filter="url(#glow)" opacity={0.95}>
          {text}
        </text>
      )}
      {layers.map((i) => (
        <text key={"o" + i} {...tp} x={i * dx * step} y={i * dy * step} fill={INK} stroke={INK} strokeWidth={st} strokeLinejoin="round">
          {text}
        </text>
      ))}
      {layers.map((i) => (
        <text key={"f" + i} {...tp} x={i * dx * step} y={i * dy * step} fill={ext}>
          {text}
        </text>
      ))}
      {depth > 0 && (
        <text {...tp} x={depth * dx * step} y={depth * dy * step} fill="url(#hatch)">
          {text}
        </text>
      )}
      <text {...tp} fill={fill} stroke={INK} strokeWidth={st * 0.9} strokeLinejoin="round" paintOrder="stroke">
        {text}
      </text>
      <text {...tp} fill="#fff" opacity={0.0}>
        {text}
      </text>
    </g>
  );
};

// ---------------------------------------------------------------- лучи действия / спид-лайны
export const Rays: React.FC<{ cx: number; cy: number; n?: number; seed?: number; rIn?: number; rInVar?: number; R?: number; color?: string; wMin?: number; wMax?: number; rot?: number; op?: number }> = ({
  cx, cy, n = 110, seed = 3, rIn = 140, rInVar = 1.6, R = 2600, color = INK, wMin = 0.004, wMax = 0.03, rot = 0, op = 1,
}) => {
  const r = rng(seed);
  const ps: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.05 + (rot * Math.PI) / 180;
    const hw = wMin + r() * (wMax - wMin);
    const ri = rIn * (0.75 + r() * rInVar);
    ps.push(
      poly([
        [cx + Math.cos(a) * ri, cy + Math.sin(a) * ri],
        [cx + Math.cos(a - hw) * R, cy + Math.sin(a - hw) * R],
        [cx + Math.cos(a + hw) * R, cy + Math.sin(a + hw) * R],
      ]),
    );
  }
  return <path d={ps.join(" ")} fill={color} opacity={op} />;
};

// наклонная бумажная панель с лучами (фон за персонажем)
export const BurstPanel: React.FC<{ id: string; x: number; y: number; w: number; h: number; rot?: number; cx?: number; cy?: number; seed?: number; f?: number }> = ({
  id, x, y, w, h, rot = 0, cx, cy, seed = 5, f = 0,
}) => {
  const ccx = cx ?? x + w / 2, ccy = cy ?? y + h / 2;
  return (
    <g transform={`rotate(${rot},${x + w / 2},${y + h / 2})`}>
      <clipPath id={id}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <rect x={x + 14} y={y + 16} width={w} height={h} fill={INK} />
      <rect x={x} y={y} width={w} height={h} fill={C.paper} />
      <g clipPath={`url(#${id})`}>
        <Rays cx={ccx} cy={ccy} n={150} seed={seed} rIn={Math.min(w, h) * 0.22} R={2200} rot={f * 0.05} />
      </g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={INK} strokeWidth={9} />
    </g>
  );
};

// ---------------------------------------------------------------- студия: шторы, пол, волна
export const Curtains: React.FC = () => (
  <g>
    <rect width={W} height={H} fill={C.indigo} />
    <rect width={W} height={H} fill="url(#pleat)" />
    <rect width={W} height={H} fill="url(#dPurple)" opacity={0.55} />
    <path
      d={`M0,0 H${W} V70 ` + Array.from({ length: 16 }, (_, i) => `Q${W - i * 120 - 60},${125} ${W - (i + 1) * 120},70`).join(" ") + " Z"}
      fill="#24143F"
      stroke={INK}
      strokeWidth={6}
    />
    <path d={`M0,0 H${W} V70 H0Z`} fill="url(#dPurpleL)" opacity={0.6} />
  </g>
);

export const Floor: React.FC<{ y0?: number; vpY?: number; cell?: number }> = ({ y0 = 890, vpY = 120, cell = 150 }) => {
  const vpX = W / 2;
  const rows = [0, 0.1, 0.24, 0.42, 0.66, 1.0].map((t) => y0 + (H - y0) * t);
  const xAt = (xb: number, y: number) => vpX + ((xb - vpX) * (y - vpY)) / (H - vpY);
  const cols: number[] = [];
  for (let xb = -2400; xb <= W + 2400; xb += cell) cols.push(xb);
  const cells: string[] = [];
  for (let r = 0; r < rows.length - 1; r++)
    for (let c = 0; c < cols.length - 1; c++) {
      if ((r + c) % 2) continue;
      const ya = rows[r], yb = rows[r + 1];
      cells.push(poly([[xAt(cols[c], ya), ya], [xAt(cols[c + 1], ya), ya], [xAt(cols[c + 1], yb), yb], [xAt(cols[c], yb), yb]]));
    }
  return (
    <g>
      <rect x={0} y={y0} width={W} height={H - y0} fill={C.paper} />
      <path d={cells.join(" ")} fill={INK} />
      <rect x={0} y={y0} width={W} height={(H - y0) * 0.5} fill="url(#dk)" opacity={0.5} />
      <S d={`M0,${y0} H${W}`} w={6} />
    </g>
  );
};

export const wavePath = (y: number, h: number, amp: number, wl: number, phase: number, ampB = amp) => {
  let d = `M-50,${y + Math.sin(phase) * amp}`;
  for (let x = -50; x <= W + 60; x += 20) d += ` L${x},${(y + Math.sin((x / wl) * Math.PI * 2 + phase) * amp).toFixed(1)}`;
  for (let x = W + 60; x >= -50; x -= 20) d += ` L${x},${(y + h + Math.sin((x / wl) * Math.PI * 2 + phase * 1.3 + 1.7) * ampB).toFixed(1)}`;
  return d + "Z";
};
// подиум: лаймово-фиолетовая волна
export const WaveRiser: React.FC<{ y: number; f: number }> = ({ y, f }) => (
  <g>
    <P d={wavePath(y, 120, 16, 420, f * 0.05)} fill={C.lime} sh="B" dots="dLime" />
    <P d={wavePath(y + 26, 120, 18, 520, f * 0.04 + 2)} fill="#5B3C8F" sh="B" dots="dPurple" />
  </g>
);

// ---------------------------------------------------------------- логотип канала и ON AIR
export const Bug: React.FC<{ x?: number; y?: number; s?: number }> = ({ x = 1820, y = 78, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <P d={rect(-62, -44, 124, 88, 18)} fill={C.ochre} sh="B" dots="dOchre" sw={5} />
    <P d={rect(-50, -34, 100, 64, 12)} fill={C.blue} sw={4} />
    <text x={0} y={-10} fontFamily="Bangers" fontSize={26} textAnchor="middle" fill={C.paper} stroke={INK} strokeWidth={4} paintOrder="stroke">RETIRE</text>
    <text x={0} y={18} fontFamily="Bangers" fontSize={24} textAnchor="middle" fill={C.lime} stroke={INK} strokeWidth={4} paintOrder="stroke">VISION</text>
    <S d="M-30,44 L-42,60 M30,44 L42,60" w={5} />
  </g>
);

export const OnAir: React.FC<{ x: number; y: number; f: number }> = ({ x, y, f }) => {
  const fl = Math.floor(f / 3) % 17 === 5 ? 0.45 : 1;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-20} y={-20} width={260} height={110} fill={C.lime} opacity={0.35 * fl} filter="url(#glow)" />
      <P d={rect(0, 0, 220, 72, 10)} fill="#1D1430" sw={6} />
      <text x={110} y={50} fontFamily="Bangers" fontSize={52} textAnchor="middle" fill={C.lime} opacity={fl} letterSpacing={3}
        stroke={C.lime} strokeWidth={1}>ON AIR</text>
      <text x={110} y={50} fontFamily="Bangers" fontSize={52} textAnchor="middle" fill="none" stroke="#E8FFB8" strokeWidth={1.5} opacity={fl * 0.8} letterSpacing={3}>ON AIR</text>
    </g>
  );
};

// ---------------------------------------------------------------- нижний титр (lower third)
export const LowerThird: React.FC<{ f: number; start: number; name: string; sub: string; x: number; y?: number; right?: boolean }> = ({
  f, start, name, sub, x, y = 905, right,
}) => {
  const p = pop(f, start, 13, 170);
  if (p <= 0) return null;
  const off = (1 - p) * (right ? 700 : -700);
  const w = Math.max(name.length * 34 + 70, sub.length * 17 + 70);
  const x0 = right ? x - w : x;
  return (
    <g transform={`translate(${off},0) rotate(-2,${x0 + w / 2},${y})`}>
      <rect x={x0 + 10} y={y + 10} width={w} height={84} fill={INK} />
      <P d={rect(x0, y, w, 84)} fill={INK} sw={5} />
      <rect x={x0} y={y} width={16} height={84} fill={C.ochre} />
      <text x={x0 + 40} y={y + 58} fontFamily="Anton" fontSize={52} fill={C.paper} letterSpacing={1.5}>{name}</text>
      <P d={rect(x0 + 24, y + 82, w - 24, 38)} fill={C.lime} sw={5} />
      <text x={x0 + 40} y={y + 111} fontFamily="Anton" fontSize={26} fill={INK} letterSpacing={2}>{sub}</text>
    </g>
  );
};

// ---------------------------------------------------------------- врезка-панель крупного плана
export const Inset: React.FC<{ id: string; f: number; start: number; x: number; y: number; w: number; h: number; rot?: number; bg?: string; children: React.ReactNode; end?: number }> = ({
  id, f, start, x, y, w, h, rot = -3, bg = C.orange, children, end,
}) => {
  const p = pop(f, start, 11, 210);
  const out = end !== undefined ? 1 - pop(f, end, 14, 200) : 1;
  const s = p * out;
  if (s <= 0.01) return null;
  const cx = x + w / 2, cy = y + h / 2;
  return (
    <g transform={`translate(${cx},${cy}) rotate(${rot}) scale(${s}) translate(${-cx},${-cy})`}>
      <clipPath id={id}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <rect x={x + 14} y={y + 14} width={w} height={h} fill={INK} />
      <rect x={x} y={y} width={w} height={h} fill={bg} />
      <g clipPath={`url(#${id})`}>{children}</g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={INK} strokeWidth={10} />
    </g>
  );
};

// ---------------------------------------------------------------- переход: волна лаймово-фиолетовых лент
export const WaveWipe: React.FC<{ f: number }> = ({ f }) => {
  // f — кадр относительно центра перехода, покрывает экран при f=0
  if (f < -10 || f > 10) return null;
  const ty = lin(f, -10, 10, 1180, -1700);
  const ph = f * 0.25;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(0,${ty})`}>
        <P d={wavePath(0, 1540, 40, 520, ph, 40)} fill={C.lime} sw={8} />
        <P d={wavePath(50, 1440, 40, 520, ph + 0.8, 40)} fill="#5B3C8F" sw={8} />
        <path d={wavePath(50, 1440, 40, 520, ph + 0.8, 40)} fill="url(#dPurple)" opacity={0.5} />
        <P d={wavePath(560, 70, 30, 460, ph + 2, 30)} fill={C.lime} sw={7} />
        <P d={wavePath(900, 40, 26, 400, ph + 3, 26)} fill={C.paper} sw={6} />
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------- огонёк/искорка, капли туши
export const Zap: React.FC<{ x: number; y: number; s?: number; rot?: number; c?: string }> = ({ x, y, s = 1, rot = 0, c = C.yellow }) => (
  <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
    <P d="M10,-60 L-22,6 L2,6 L-12,60 L26,-10 L2,-10 L18,-60Z" fill={c} sw={5} />
  </g>
);

export const Kirby: React.FC<{ cx: number; cy: number; n: number; R: number; seed: number; s?: number }> = ({ cx, cy, n, R, seed, s = 1 }) => {
  const r = rng(seed);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = R * Math.sqrt(r());
    const rr = (6 + r() * 22) * s;
    out.push(<circle key={i} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d} r={rr} fill={C.ink} />);
    if (r() < 0.5) out.push(<circle key={"b" + i} cx={cx + Math.cos(a) * d + rr * 1.3} cy={cy + Math.sin(a) * d - rr * 0.6} r={rr * 0.45} fill={C.ink} />);
  }
  return <g>{out}</g>;
};

export { starBurst, ell, rect, poly, line, easeOut };
