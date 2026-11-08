// Кадры для проверки: node tools/stills.mjs <scale> <сек> ...  → checks/s_<сек>.png
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
const [scale, ...secs] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
const composition = await selectComposition({ serveUrl, id: "Mafia", inputProps: {}, puppeteerInstance: browser });
for (const s of secs) {
  await renderStill({ composition, serveUrl, frame: Math.round(Number(s) * 30), output: `checks/s_${s}.png`, scale: Number(scale), inputProps: {}, puppeteerInstance: browser, chromiumOptions: { gl: "angle" } });
}
await browser.close({ silent: true });
console.log("done");
