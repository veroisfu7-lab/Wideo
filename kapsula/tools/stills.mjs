// Быстрые кадры для проверки: один бандл, много кадров.  node tools/stills.mjs <scale> <кадр> <кадр> ...  → checks/st_<кадр>.png
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
const [scale, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
const inputProps = { ms: 0 };
const composition = await selectComposition({ serveUrl, id: "Kapsula", inputProps, puppeteerInstance: browser });
for (const f of frames) {
  await renderStill({ composition, serveUrl, frame: Number(f), output: `checks/st_${f}.png`, scale: Number(scale), inputProps, puppeteerInstance: browser, chromiumOptions: { gl: "angle" } });
  console.log("ok", f);
}
await browser.close({ silent: true });
