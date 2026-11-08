// Быстрые кадры: node tools/stills.mjs <scale> <сек> <сек> ... → checks/st_<сек>.png
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
const [scale, ...secs] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
const composition = await selectComposition({ serveUrl, id: "Cicada", inputProps: {}, puppeteerInstance: browser });
for (const s of secs) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: Math.round(Number(s) * 30), output: `checks/st_${s}.png`, scale: Number(scale), puppeteerInstance: browser, chromiumOptions: { gl: "angle" } });
  console.log("ok", s, Date.now() - t0, "ms");
}
await browser.close({ silent: true });
