// Кадры для проверки: node tools/stills.mjs <scale> <shotId:сек|кадр> ...  → checks/<имя>.png
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import fs from "fs";
const [scale, ...specs] = process.argv.slice(2);
const shots = JSON.parse(fs.readFileSync("src/shots.json", "utf8"));
const starts = {}; let acc = 0; for (const s of shots) { starts[s.id] = acc; acc += Math.round(s.dur * 30); }
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
const composition = await selectComposition({ serveUrl, id: "Labaz", inputProps: {}, puppeteerInstance: browser });
for (const sp of specs) {
  const [id, sec] = sp.includes(":") ? sp.split(":") : [null, sp];
  const frame = id ? starts[id] + Math.round(Number(sec) * 30) : Number(sec);
  await renderStill({ composition, serveUrl, frame, output: `checks/${sp.replace(":", "_")}.png`, scale: Number(scale), inputProps: {}, puppeteerInstance: browser, chromiumOptions: { gl: "angle" } });
  console.log("ok", sp, frame);
}
await browser.close({ silent: true });
