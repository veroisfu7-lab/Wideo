// Локальные шрифты (Google Fonts через прокси в контейнере не грузятся): Inter (HUD), PT Mono (машинопись), Oswald (штамп), JetBrains Mono (цифры).
import { continueRender, delayRender, staticFile } from "remotion";
const CYR = "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116";
const LAT = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const list: [string, string, string][] = [];
for (const w of ["400", "500", "600", "700"]) list.push(["HInter", `inter-cyrillic-${w}-normal.woff2`, w], ["HInter", `inter-latin-${w}-normal.woff2`, w]);
list.push(["HMono", "pt-mono-cyrillic-400-normal.woff2", "400"], ["HMono", "pt-mono-latin-400-normal.woff2", "400"]);
for (const w of ["500", "700"]) list.push(["HStamp", `oswald-cyrillic-${w}-normal.woff2`, w], ["HStamp", `oswald-latin-${w}-normal.woff2`, w]);
for (const w of ["400", "500", "700"]) list.push(["HCode", `jetbrains-mono-cyrillic-${w}-normal.woff2`, w], ["HCode", `jetbrains-mono-latin-${w}-normal.woff2`, w]);
if (typeof document !== "undefined" && !(window as any).__fontsLoading) {
  (window as any).__fontsLoading = true;
  const h = delayRender("fonts", { timeoutInMilliseconds: 240000 });
  const faces = list.map(([fam, file, w]) => new FontFace(fam, `url(${staticFile("fonts/" + file)}) format("woff2")`, { weight: w, unicodeRange: file.includes("cyrillic") ? CYR : LAT }));
  Promise.all(faces.map((f) => f.load())).then((ls) => { ls.forEach((l) => (document.fonts as any).add(l)); continueRender(h); })
    .catch((e) => { console.error("font", e); continueRender(h); });
}
export const F = { ui: "HInter, sans-serif", mono: "HMono, monospace", stamp: "HStamp, sans-serif", code: "HCode, monospace" };
