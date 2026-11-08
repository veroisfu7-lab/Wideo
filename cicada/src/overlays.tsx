// HTML-слои поверх шейдеров: субтитры закадра, текст-гравюра на телефоне, отражение отсчёта, строка на экране архива, титры.
import React from "react";
import { useCurrentFrame } from "remotion";
import T from "./timeline.json";

const FPS = T.fps;
const sat = (x: number) => Math.max(0, Math.min(1, x));
const ss = (a: number, b: number, x: number) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// фразы закадра: [старт реплики + смещение, конец] (с) — по паузам в озвучке
const SUBS: [number, number, string][] = [
  [T.vo.vo1 + 0.0, T.vo.vo1 + 3.75, "Ты живёшь с мыслью, что ты — одна\nиз восьми миллиардов пылинок."],
  [T.vo.vo1 + 4.45, T.vo.vo1 + 8.6, "Пока однажды темнота в твоей комнате\nне назовёт тебя по имени."],
  [T.vo.vo2 + 0.0, T.vo.vo2 + 1.6, "Они не взламывали сеть."],
  [T.vo.vo2 + 1.7, T.vo.vo2 + 6.5, "Они запустили протокол, зашитый в моё железо\nещё до того, как я пошёл в школу."],
  [T.vo.vo2 + 7.15, T.vo.vo2 + 8.3, "Это не был спам."],
  [T.vo.vo2 + 8.55, T.vo.vo2 + 10.4, "Это было завещание."],
  [T.vo.vo3 + 0.0, T.vo.vo3 + 1.95, "Город вёл меня, как по рельсам."],
  [T.vo.vo3 + 2.4, T.vo.vo3 + 7.25, "Каждый фонарь, каждый светофор выключались\nс идеальной задержкой в три секунды."],
  [T.vo.vo3 + 8.0, T.vo.vo3 + 11.6, "Кто-то зачищал пространство вокруг меня\nв реальном времени."],
  [T.vo.apo + 0.25, T.vo.apo + 3.95, "— Твой отец спрятал ключ не в сети, Макс."],
  [T.vo.apo + 4.4, T.vo.apo + 7.8, "— Он спрятал его в твоей памяти."],
  [T.vo.vo4 + 0.0, T.vo.vo4 + 4.55, "Двенадцать лет я носил ключ от величайшей\nтайны интернета в кармане…"],
  [T.vo.vo4 + 5.15, T.vo.vo4 + 7.8, "…и просто прикуривал им сигареты."],
];

export const Subtitles: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const cur = SUBS.find(([a, b]) => t >= a && t < b);
  if (!cur) return null;
  const [a, b, s] = cur;
  const o = ss(a, a + 0.18, t) * (1 - ss(b - 0.18, b, t));
  const apo = s.startsWith("—");
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1500, textAlign: "center", fontFamily: "Osw", fontWeight: 300,
      fontSize: 40, lineHeight: 1.32, letterSpacing: "0.03em", whiteSpace: "pre-line", opacity: o,
      color: apo ? "#E9D3A6" : "#EDEFF2", textShadow: "0 0 3px #000, 0 2px 14px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.8)" }}>
      {s}
    </div>
  );
};

// текст высекается на экране телефона: знак за знаком, вспышка янтаря и остывание в чернила гравюры
const MSG = ["Здравствуй,", "Максимилиан.", "", "4 382 дня тишины", "подошли к концу.", "", "Посмотри в тень", "за спиной."];
export const ScreenText: React.FC<{ t: number; len: number }> = ({ t }) => {
  const t0 = T.events.screenOn - T.shots.screen[0] + 0.55;
  const cps = 17;
  let k = 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 930, transform: "rotate(2.9deg)", textAlign: "center",
      fontFamily: "Corm", fontWeight: 600, fontSize: 64, lineHeight: 1.12, color: "#2A1A0C" }}>
      {MSG.map((line, li) => (
        <div key={li} style={{ height: line ? "auto" : 30 }}>
          {Array.from(line).map((ch, i) => {
            const at = t0 + (k++) / cps;
            const a = t < at ? 0 : 1;
            const hot = Math.exp(-Math.max(0, t - at) * 5);
            const px = Math.max(0, 1 - (t - at) * 8); // «пикселизация» первых кадров знака
            return (
              <span key={i} style={{ opacity: a, color: hot > 0.05 ? `rgb(${42 + 200 * hot},${26 + 140 * hot},${12 + 30 * hot})` : undefined,
                textShadow: hot > 0.05 ? `0 0 ${12 * hot}px rgba(229,169,60,${hot})` : "0 1px 0 rgba(255,235,200,0.25)",
                filter: px > 0 ? `blur(${px * 2.5}px)` : undefined }}>{ch}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// координаты моста — вымышленные, с «3301» внутри
export const COORD = "N 44°33′01″   E 33°30′01″";

// микросетка на ладони: подпись координат, проявляется вместе с оттиском
export const PalmText: React.FC<{ t: number; len: number }> = ({ t }) => {
  const o = ss(T.events.palmHeat - T.shots.palm[0] + 0.8, T.events.palmHeat - T.shots.palm[0] + 1.6, t);
  const flick = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1395, textAlign: "center", transform: "rotate(6.9deg)",
      fontFamily: "Osw", fontWeight: 300, fontSize: 26, letterSpacing: "0.35em", color: "#F2C46A", opacity: o * flick * 0.85,
      textShadow: "0 0 8px rgba(229,169,60,0.9), 0 0 22px rgba(229,169,60,0.5)" }}>
      {COORD}
    </div>
  );
};

// отражение в зрачке: зеркальный обратный отсчёт и координаты
export const EyeText: React.FC<{ t: number; len: number }> = ({ t }) => {
  const secs = 29 * 60 + 59 - Math.floor(t);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), sc = String(secs % 60).padStart(2, "0");
  const o = ss(0.3, 0.9, t);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 860, textAlign: "center", transform: "scaleX(-1)", opacity: o,
      filter: "blur(0.6px)", mixBlendMode: "screen" }}>
      <div style={{ fontFamily: "Osw", fontWeight: 300, fontSize: 92, lineHeight: 1, letterSpacing: "0.06em", color: "#BFE6F5",
        textShadow: "0 0 12px rgba(120,200,240,0.8)" }}>{mm}:{sc}</div>
      <div style={{ fontFamily: "Osw", fontWeight: 300, fontSize: 19, marginTop: 10, letterSpacing: "0.3em", color: "#F0C060",
        textShadow: "0 0 8px rgba(229,169,60,0.8)" }}>{COORD}</div>
    </div>
  );
};

// строка на дальнем экране архива
export const BigScreenText: React.FC<{ t: number; len: number }> = ({ t }) => {
  const t0 = T.events.screenLine - T.shots.bigscreen[0];
  const L1 = "С возвращением, 3301.", L2 = "Архитектура готова к перезагрузке.";
  const n = Math.max(0, Math.floor((t - t0) * 24));
  const s1 = L1.slice(0, n), s2 = L2.slice(0, Math.max(0, n - L1.length - 4));
  const cur = Math.floor(t * 2.5) % 2 === 0 ? "▌" : " ";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 735, textAlign: "center", fontFamily: "Osw", fontWeight: 300, fontSize: 30,
      letterSpacing: "0.12em", lineHeight: 1.5, color: "#F3C673", textShadow: "0 0 10px rgba(229,169,60,0.9), 0 0 30px rgba(229,169,60,0.45)", opacity: t < t0 ? 0 : 1 }}>
      <div>{s1}{n <= L1.length ? cur : ""}</div>
      <div style={{ fontSize: 22, letterSpacing: "0.22em", color: "#E5A93C" }}>{s2}{n > L1.length + 4 ? cur : ""}</div>
    </div>
  );
};

// финальные титры
export const EndTitles: React.FC<{ t: number; len: number }> = ({ t }) => {
  const t0 = T.events.title - T.shots.end[0];
  const a = (d: number, dur = 0.6) => ss(t0 + d, t0 + d + dur, t);
  const gold = "#E5A93C";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1170, textAlign: "center", fontFamily: "Osw" }}>
      <div style={{ opacity: a(0.5), fontWeight: 500, fontSize: 46, letterSpacing: "0.32em", color: gold, textShadow: "0 0 18px rgba(229,169,60,0.45)" }}>ЭПИЗОД 1: ИНИЦИАЦИЯ</div>
      <div style={{ opacity: a(1.2) * 0.85, marginTop: 70, fontWeight: 300, fontSize: 34, letterSpacing: "0.4em", color: "#D9DCE0" }}>КТО УПРАВЛЯЕТ РОЕМ?</div>
      <div style={{ opacity: a(2.0) * 0.6, marginTop: 26, fontWeight: 300, fontSize: 24, letterSpacing: "0.5em", color: "#9AA2AA" }}>ПРОДОЛЖЕНИЕ СЛЕДУЕТ</div>
    </div>
  );
};
