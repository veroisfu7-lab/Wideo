// HUD в стиле iOS / Vision Pro: матовое стекло (backdrop-filter), тонкие белые рамки, неоновые маркеры.
import React from "react";
import { F } from "../fonts";

const NEON = { cyan: "#00F2FE", red: "#FF0844", yellow: "#FFD23F", green: "#39FF88", merc: "#B4C6D4" };
const glass = (a: number): React.CSSProperties => ({
  background: `rgba(16,18,24,${0.38 * a})`, backdropFilter: `blur(${22 * a}px) saturate(${100 + 50 * a}%)`, WebkitBackdropFilter: `blur(${22 * a}px)`,
  border: `1.5px solid rgba(255,255,255,${0.32 * a})`, boxShadow: `0 10px 40px rgba(0,0,0,${0.35 * a}), inset 0 1px 0 rgba(255,255,255,${0.18 * a})`,
});
const pop = (a: number) => ({ opacity: Math.min(1, a * 1.4), transform: `scale(${0.94 + 0.06 * a}) translateY(${(1 - a) * 14}px)`, filter: `blur(${(1 - a) * 6}px)` });

// текст «печатается»
const typed = (s: string, k: number) => s.slice(0, Math.round(s.length * Math.max(0, Math.min(1, k))));

export const HUD: React.FC<{ hud: any; frame: number }> = ({ hud, frame }) => {
  const t = hud.t as number;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: F.ui, color: "#fff" }}>
      {hud.plate > 0 && <Plate a={hud.plate} />}
      {hud.desync && <Desync d={hud.desync} t={t} />}
      {hud.phone && <PhoneOverlay p={hud.phone} t={t} />}
      {hud.phoneFull && <PhoneFull p={hud.phoneFull} t={t} frame={frame} />}
      {hud.quote && hud.quote.a > 0 && <Quote q={hud.quote} />}
      {hud.title && <Title ti={hud.title} frame={frame} />}
    </div>
  );
};

// ------------------------------------------------------------------ 1. плашка артефакта
const Plate: React.FC<{ a: number }> = ({ a }) => (
  <div style={{ position: "absolute", left: 70, right: 70, top: 300, borderRadius: 34, padding: "30px 38px", ...glass(a), ...pop(a) }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: NEON.cyan, boxShadow: `0 0 14px ${NEON.cyan}, 0 0 30px ${NEON.cyan}` }} />
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.65)" }}>ОБЪЕКТ ХРАНЕНИЯ</div>
    </div>
    <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: "0.02em", lineHeight: 1.18 }}>
      АРТЕФАКТ: ВЕНЕЦИЯ, 1782 ГОД
    </div>
    <div style={{ height: 1.5, background: "rgba(255,255,255,0.22)", margin: "18px 0" }} />
    <div style={{ fontSize: 34, fontWeight: 500, color: NEON.merc, lineHeight: 1.25 }}>
      <span style={{ color: NEON.cyan }}>•</span> АМАЛЬГАМА: СВЕРХОЧИЩЕННАЯ РТУТЬ
    </div>
  </div>
);

// ------------------------------------------------------------------ 2. рассинхрон
const Desync: React.FC<{ d: any; t: number }> = ({ d, t }) => {
  const crit = d.crit ?? 0;
  const col = crit > 0 ? NEON.red : NEON.yellow;
  const blinkA = crit > 0 ? (d.blink ? 0.35 : 1) : 0.7 + 0.3 * Math.sin(t * 9);
  const val = crit > 0 ? "05.00 сек" : `+${d.val.toFixed(2)} сек`;
  return (
    <div style={{ position: "absolute", left: d.x, top: d.y, ...pop(d.a) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "16px 26px 16px 20px", borderRadius: 24, ...glass(d.a) }}>
        <div style={{ width: 6, height: 52, borderRadius: 3, background: col, boxShadow: `0 0 16px ${col}, 0 0 34px ${col}` }} />
        <div>
          <div style={{ fontSize: 22, letterSpacing: "0.16em", color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>РАССИНХРОН</div>
          <div style={{ fontFamily: F.code, fontSize: 44, fontWeight: 700, color: col, opacity: blinkA, textShadow: `0 0 18px ${col}` }}>{val}</div>
        </div>
      </div>
      {crit > 0 && (
        <div style={{ marginTop: 14, padding: "14px 24px", borderRadius: 20, ...glass(crit), border: `1.5px solid ${NEON.red}`, boxShadow: `0 0 26px rgba(255,8,68,0.45)` }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.08em", color: NEON.red, textShadow: `0 0 14px ${NEON.red}` }}>КРИТИЧЕСКАЯ ФАЗА: СЛИЯНИЕ</div>
        </div>
      )}
      {/* тонкая полоска-таймкод */}
      <div style={{ marginTop: 12, width: 360, height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, (d.val / 5) * 100)}%`, height: 3, background: col, boxShadow: `0 0 10px ${col}` }} />
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ 3. телефон в руке (POV): трекинг на экране
const PhoneOverlay: React.FC<{ p: any; t: number }> = ({ p }) => {
  if (p.on <= 0) return null;
  const c = p.corners as { x: number; y: number }[];
  const pts = p.pts as { x: number; y: number; in: boolean }[];
  const minX = Math.min(...c.map((q) => q.x)), maxX = Math.max(...c.map((q) => q.x)), minY = Math.min(...c.map((q) => q.y)), maxY = Math.max(...c.map((q) => q.y));
  const w = maxX - minX, h = maxY - minY;
  const vis = pts.filter((q) => q.in);
  const fx = vis.map((q) => q.x), fy = vis.map((q) => q.y);
  const box = vis.length > 4 ? [Math.min(...fx), Math.min(...fy), Math.max(...fx), Math.max(...fy)] : null;
  const s = w / 300; // масштаб интерфейса телефона
  const tr = p.track;
  const clip = `polygon(${c.map((q) => `${q.x}px ${q.y}px`).join(",")})`;
  return (
    <div style={{ position: "absolute", inset: 0, clipPath: clip, opacity: p.on }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {tr > 0 && (p.edges as [number, number][]).map(([a, b], i) => (pts[a].in && pts[b].in ? (
          <line key={i} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y} stroke={NEON.green} strokeWidth={1.2} opacity={0.75 * Math.min(1, tr * 2 - i / 40)} />
        ) : null))}
        {tr > 0 && vis.map((q, i) => <circle key={i} cx={q.x} cy={q.y} r={2.2} fill={NEON.green} opacity={Math.min(1, tr * 3 - i / 12)} />)}
        {box && tr > 0 && (
          <rect x={box[0] - 10 * s} y={box[1] - 14 * s} width={box[2] - box[0] + 20 * s} height={box[3] - box[1] + 24 * s} rx={8 * s} fill="none" stroke={NEON.green} strokeWidth={2} opacity={tr} style={{ filter: `drop-shadow(0 0 4px ${NEON.green})` }} />
        )}
      </svg>
      {/* интерфейс камеры */}
      <div style={{ position: "absolute", left: minX, top: minY, width: w, height: h }}>
        <div style={{ position: "absolute", top: 10 * s, left: 0, right: 0, textAlign: "center", fontSize: 13 * s, fontWeight: 600, color: "#FFD23F" }}>AI SCAN</div>
        <div style={{ position: "absolute", bottom: 18 * s, left: "50%", marginLeft: -22 * s, width: 44 * s, height: 44 * s, borderRadius: 22 * s, border: `${3 * s}px solid #fff` }} />
        <div style={{ position: "absolute", bottom: 74 * s, left: 0, right: 0, textAlign: "center", fontSize: 11 * s, color: "rgba(255,255,255,0.85)" }}>0,5   <b>1×</b>   3</div>
      </div>
      {box && p.label > 0 && (
        <div style={{ position: "absolute", left: minX + 10 * s, right: 1080 - maxX + 10 * s, top: Math.max(minY + 34 * s, box[1] - 62 * s), padding: `${5 * s}px ${7 * s}px`, borderRadius: 8 * s, background: "rgba(8,26,16,0.72)", border: `1.5px solid ${NEON.green}`,
          fontFamily: F.code, fontSize: 13.5 * s, lineHeight: 1.25, color: NEON.green, textAlign: "center", fontWeight: 700, opacity: p.label }}>
          [ ОБЪЕКТ 01: АРТЕМ ]<br />СОВПАДЕНИЕ: 99.8%
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ 4. экран телефона на весь кадр
const PhoneFull: React.FC<{ p: any; t: number; frame: number }> = ({ p, frame }) => {
  const fb = p.faceBox as number[], rb = p.redBox as number[];
  const pts = p.pts as { x: number; y: number }[];
  const g = p.green * (p.flicker ? 0.25 : 1);
  const r = p.red * (p.flicker && p.red < 1 ? 0.3 : 1);
  const gl = p.glitch as number;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* пиксельная сетка экрана и блики стекла */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 3px)", mixBlendMode: "multiply" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 70, boxShadow: "inset 0 0 0 26px rgba(0,0,0,0.92), inset 0 0 60px 40px rgba(0,0,0,0.6)" }} />
      <div style={{ position: "absolute", left: -200, top: -300, width: 900, height: 1400, transform: "rotate(-24deg)", background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%)" }} />
      {/* верхняя панель камеры */}
      <div style={{ position: "absolute", top: 70, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 26, fontSize: 28, fontWeight: 600 }}>
        <span style={{ padding: "8px 18px", borderRadius: 18, background: "rgba(0,0,0,0.45)", color: NEON.yellow }}>AI SCAN • REC</span>
        <span style={{ padding: "8px 18px", borderRadius: 18, background: "rgba(0,0,0,0.45)", fontFamily: F.code }}>{`00:${String(8 + Math.floor((frame - 1440) / 60)).padStart(2, "0")}`}</span>
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {g > 0 && (p.edges as [number, number][]).map(([a, b], i) => (
          <line key={i} x1={pts[a].x} y1={pts[a].y} x2={pts[b].x} y2={pts[b].y} stroke={NEON.green} strokeWidth={1.6} opacity={0.6 * g} />
        ))}
        {g > 0 && pts.map((q, i) => <circle key={i} cx={q.x} cy={q.y} r={3} fill={NEON.green} opacity={g} />)}
        {g > 0 && <rect x={fb[0] - 40} y={fb[1] - 60} width={fb[2] - fb[0] + 80} height={fb[3] - fb[1] + 100} rx={22} fill="none" stroke={NEON.green} strokeWidth={3} opacity={g} />}
        {r > 0 && (
          <g opacity={r}>
            <rect x={rb[0] - 30} y={rb[1] - 30} width={rb[2] - rb[0] + 60} height={rb[3] - rb[1] + 60} rx={18} fill="rgba(255,8,68,0.06)" stroke={NEON.red} strokeWidth={4} style={{ filter: `drop-shadow(0 0 10px ${NEON.red})` }} />
            {[[rb[0] - 30, rb[1] - 30], [rb[2] + 30, rb[1] - 30], [rb[0] - 30, rb[3] + 30], [rb[2] + 30, rb[3] + 30]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={7} fill={NEON.red} />
            ))}
          </g>
        )}
      </svg>
      {g > 0 && (
        <div style={{ position: "absolute", left: Math.max(40, fb[0] - 60), top: fb[1] - 150, padding: "8px 14px", borderRadius: 12, background: "rgba(10,30,18,0.6)", border: `1.5px solid ${NEON.green}`, fontFamily: F.code, fontSize: 26, lineHeight: 1.3, color: NEON.green, opacity: g, whiteSpace: "nowrap", fontWeight: 700 }}>
          [ ОБЪЕКТ 01: АРТЕМ ]<br />СОВПАДЕНИЕ: 99.8%
        </div>
      )}
      {r > 0 && (
        <div style={{ position: "absolute", left: rb[0] - 30, top: rb[1] - 90, padding: "8px 14px", borderRadius: 12, background: "rgba(40,0,10,0.6)", border: `1.5px solid ${NEON.red}`, fontFamily: F.code, fontSize: 24, color: NEON.red, opacity: r, whiteSpace: "nowrap" }}>
          ОБЪЕКТ 02 • ??.?%
        </div>
      )}
      {/* системное окно ошибки */}
      {p.err > 0 && (
        <div style={{ position: "absolute", left: 90, right: 90, top: 1180, borderRadius: 36, padding: "34px 40px", ...glass(p.err), ...pop(p.err), border: `2px solid ${NEON.red}`,
          boxShadow: `0 0 50px rgba(255,8,68,0.35), 0 20px 60px rgba(0,0,0,0.5)`, transform: `${pop(p.err).transform} translateX(${gl ? (Math.sin(frame * 7) * 18) : 0}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 46, height: 46, borderRadius: 23, background: NEON.red, color: "#fff", fontSize: 34, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${NEON.red}` }}>!</div>
            <div style={{ fontSize: 33, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>[ ВНИМАНИЕ: ОБНАРУЖЕН ОБЪЕКТ 02 ]</div>
          </div>
          <div style={{ height: 1.5, background: "rgba(255,255,255,0.2)", margin: "22px 0" }} />
          <Row k="РАССТОЯНИЕ" v="ВНУТРИ СТЕКЛА" c={NEON.cyan} />
          <Row k="СТАТУС" v="ДВИЖЕТСЯ ВПЕРЕД" c={NEON.red} />
        </div>
      )}
      {/* цифровые полосы глитча */}
      {gl > 0 && [0, 1, 2, 3, 4].map((i) => {
        const y = (Math.sin(frame * 13.1 + i * 7.7) * 0.5 + 0.5) * 1920; const hgt = 8 + ((frame * 31 + i * 17) % 40);
        return <div key={i} style={{ position: "absolute", left: 0, right: 0, top: y, height: hgt, background: i % 2 ? "rgba(0,242,254,0.18)" : "rgba(255,8,68,0.16)", mixBlendMode: "screen", transform: `translateX(${Math.sin(frame + i) * 40}px)` }} />;
      })}
      {/* нижняя панель */}
      <div style={{ position: "absolute", bottom: 90, left: "50%", marginLeft: -64, width: 128, height: 128, borderRadius: 64, border: "7px solid #fff", boxSizing: "border-box" }}>
        <div style={{ position: "absolute", inset: 10, borderRadius: 50, background: NEON.red }} />
      </div>
      <div style={{ position: "absolute", bottom: 260, left: 0, right: 0, textAlign: "center", fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>0,5  <span style={{ color: NEON.yellow }}>1×</span>  3</div>
    </div>
  );
};
const Row: React.FC<{ k: string; v: string; c: string }> = ({ k, v, c }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, margin: "10px 0" }}>
    <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: "0.06em" }}>{k}:</span>
    <span style={{ color: c, fontWeight: 700, textShadow: `0 0 12px ${c}` }}>{v}</span>
  </div>
);

// ------------------------------------------------------------------ 5. цитата из дела
const QUOTE = "«Ртуть помнит всех, кто в неё смотрел. Созданная сущность копирует оригинал. Когда задержка составит 5 секунд — оригинал станет отражением».";
const Quote: React.FC<{ q: any }> = ({ q }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: 260, borderRadius: 32, padding: "28px 34px", ...glass(q.a), ...pop(q.a) }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, background: NEON.red, boxShadow: `0 0 12px ${NEON.red}` }} />
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "0.14em", color: "rgba(255,255,255,0.6)" }}>ДЕЛО № 1984/17-Н • ВЫВОД КОМИССИИ</div>
    </div>
    <div style={{ fontFamily: F.mono, fontSize: 36, lineHeight: 1.36, color: "#F3EEDF" }}>
      {typed(QUOTE, q.k * 1.04)}
      <span style={{ opacity: 0.25 }}>{QUOTE.slice(typed(QUOTE, q.k * 1.04).length)}</span>
    </div>
  </div>
);

// ------------------------------------------------------------------ 6. финальные титры
const Title: React.FC<{ ti: any; frame: number }> = ({ ti, frame }) => {
  const gx = (Math.sin(frame * 12.9) * 0.5) * (ti.g > 0.8 ? 14 : 2);
  const t1 = 'ПРОЕКТ "НЕКРОБИОС":', t1b = "СУБЪЕКТ ВЫШЕЛ";
  const neon = (a: number): React.CSSProperties => ({ color: "#F4F8FF", textShadow: `0 0 8px rgba(255,255,255,${0.9 * a}), 0 0 24px rgba(180,198,212,${0.8 * a}), 0 0 60px rgba(0,242,254,${0.35 * a})` });
  const k1 = Math.min(1, ti.a1 * 1.3);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
      <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 58, letterSpacing: "0.06em", textAlign: "center", lineHeight: 1.2, opacity: ti.a1 > 0 ? 1 : 0, transform: `translateX(${gx}px)`, ...neon(k1) }}>
        <div>{typed(t1, ti.a1 * 1.2)}</div>
        <div>{typed(t1b, ti.a1 * 1.2 - 0.2)}</div>
      </div>
      <div style={{ width: 120 * ti.a2, height: 2, background: "rgba(180,198,212,0.8)", boxShadow: "0 0 12px rgba(0,242,254,0.8)" }} />
      <div style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 38, letterSpacing: "0.12em", textAlign: "center", opacity: ti.a2, transform: `translateX(${-gx * 0.6}px)`, color: "#FF5577", textShadow: "0 0 10px rgba(255,8,68,0.9), 0 0 30px rgba(255,8,68,0.5)" }}>
        НЕ СМОТРИ В ЗЕРКАЛО<br />СЕГОДНЯ НОЧЬЮ
      </div>
    </div>
  );
};
