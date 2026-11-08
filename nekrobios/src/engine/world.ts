// Реставрационная мастерская: пол из дубовой доски, графитовые стены, шкафы, колбы, верстак, лампа с зелёным абажуром,
// объёмный конус света и пылинки. Геометрия декораций — сразу в мировых координатах (vLocal = мир).
import * as THREE from "three";
import { patch, withAO, NOISE_GLSL } from "./materials";

export const ROOM = { x0: -2.6, x1: 2.6, zB: -0.62, zF: 5.6, h: 3.05 };
export const LAMP = { pos: new THREE.Vector3(0.62, 2.28, 0.95) };       // лампочка
export const BENCH = { x0: 0.78, x1: 2.25, z0: -0.25, z1: 0.62, y: 0.905 };

const C = (h: string) => new THREE.Color(h);

// ----------------------------------------------------------------------------------- материалы декораций
export function woodMat(o: { base: string; dark: string; grain?: number; plank?: number; axis?: "x" | "z" | "y"; rough?: number; key: string; gloss?: number }) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: o.rough ?? 0.62, metalness: 0, clearcoat: o.gloss ?? 0.0, clearcoatRoughness: 0.35 });
  const ax = o.axis ?? "z";
  const along = ax === "z" ? "p.z" : ax === "x" ? "p.x" : "p.y";
  const across = ax === "z" ? "p.x" : ax === "x" ? "p.z" : "p.x";
  const third = ax === "y" ? "p.z" : "p.y";
  return patch(m, {
    key: "wood-" + o.key,
    uniforms: { uBase: { value: C(o.base) }, uDark: { value: C(o.dark) } },
    fColor: `
      vec3 p = vLocal;
      float pw = ${(o.plank ?? 0.0).toFixed(3)};
      float pid = pw > 0.0 ? floor(${across} / pw) : 0.0;
      float off = fract(sin(pid * 91.7) * 4375.85);
      float u = pw > 0.0 ? fract(${across} / pw) : 0.5;
      float al = ${along} + off * 7.0;
      float rings = fbm3(vec3(${across} * 24.0 + pid * 3.1, al * 1.6, ${third} * 24.0)) ;
      float grain = sin((${across} + rings * 0.06 + off) * ${(o.grain ?? 140).toFixed(1)}) * 0.5 + 0.5;
      grain = pow(grain, 3.0);
      vec3 col = mix(uBase, uDark, grain * 0.55 + (1.0 - rings) * 0.35);
      col *= 0.82 + 0.36 * off;
      // шов между досками
      float seam = pw > 0.0 ? smoothstep(0.0, 0.012, u) * smoothstep(1.0, 0.988, u) : 1.0;
      col *= mix(0.25, 1.0, seam);
      // поперечные стыки досок
      if (pw > 0.0) { float L = 1.4 + off * 1.2; float v = fract((${along} + off * 3.0) / L); col *= mix(0.35, 1.0, smoothstep(0.0, 0.004, v) * smoothstep(1.0, 0.996, v)); }
      col *= 0.85 + 0.3 * vnoise(p * 9.0);
      diffuseColor.rgb = col;
      float woodSeam = seam;`,
    fRough: `roughnessFactor = clamp(roughnessFactor + (vnoise(vLocal * 6.0) - 0.5) * 0.25 + (1.0 - woodSeam) * 0.3, 0.2, 1.0);`,
    fNormal: `{ vec3 p = vLocal; float h = (sin((${across} + fbm3(vec3(${across}*24.0, ${along}*1.6, ${third}*24.0))*0.06) * ${(o.grain ?? 140).toFixed(1)}) * 0.00008) + vnoise(p * 600.0) * 0.00004; normal = bumpN(-vViewPosition, normal, h, faceDirection); }`,
  });
}

export function plasterMat(key: string, base = "#0F1115") {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.9 });
  return patch(m, {
    key: "plaster-" + key,
    uniforms: { uBase: { value: C(base) } },
    fColor: `vec3 p = vLocal; float n = fbm3(p * 3.0); float s = vnoise(p * 40.0);
      vec3 col = uBase * (0.75 + 0.6 * n) * (0.9 + 0.2 * s);
      col *= mix(0.6, 1.0, smoothstep(0.0, 0.9, p.y));   // темнее у пола
      col = mix(col, col * vec3(1.15, 1.05, 0.9), smoothstep(0.55, 0.75, fbm3(p * 1.3 + 4.0)) * 0.6); // пятна
      diffuseColor.rgb = col;`,
    fNormal: `{ float h = fbm3(vLocal * 30.0) * 0.0008 + vnoise(vLocal * 220.0) * 0.00012; normal = bumpN(-vViewPosition, normal, h, faceDirection); }`,
  });
}

export function metalMat(key: string, color: string, rough: number, metal = 1.0) {
  const m = new THREE.MeshPhysicalMaterial({ color: C(color), roughness: rough, metalness: metal });
  withAO(m);
  return patch(m, {
    key: "metal-" + key,
    fColor: `diffuseColor.rgb *= 0.75 + 0.5 * vnoise(vLocal * 80.0); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55,0.42,0.3), smoothstep(0.55, 0.8, fbm3(vLocal * 40.0)) * 0.7);`,
    fRough: `roughnessFactor = clamp(roughnessFactor + (fbm3(vLocal * 60.0) - 0.5) * 0.35, 0.05, 1.0);`,
    fNormal: `{ float h = vnoise(vLocal * 900.0) * 0.00004; normal = bumpN(-vViewPosition, normal, h, faceDirection); }`,
  });
}

// почерневшая бронза: в нишах чёрная, на выступах — протёртая до тёплого металла; змеи — чешуя
export function bronzeMat() {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.45, metalness: 1.0 });
  withAO(m);
  return patch(m, {
    key: "bronze",
    vDecl: "attribute float snake; varying float vSnake;", vMain: "vSnake = snake;", fDecl: "varying float vSnake;",
    fColor: `
      float ex = smoothstep(0.55, 0.95, vAO);
      vec3 dark = vec3(0.045, 0.035, 0.025);
      vec3 worn = vec3(0.42, 0.30, 0.16);
      vec3 col = mix(dark, worn, ex * (0.55 + 0.45 * vnoise(vLocal * 70.0)));
      col = mix(col, vec3(0.06, 0.09, 0.07), smoothstep(0.6, 0.85, fbm3(vLocal * 25.0)) * (1.0 - ex) * 0.6); // патина
      // чешуя у змей
      float sc = vSnake;
      vec2 q = vec2(atan(vLocal.z - 0.03, vLocal.x) * 30.0, vLocal.y * 260.0);
      vec2 cell = fract(q + vec2(0.0, floor(q.x) * 0.5)) - 0.5;
      float scale = smoothstep(0.42, 0.3, length(cell));
      col = mix(col, col * (0.6 + 0.6 * scale), sc);
      diffuseColor.rgb = col;
      float bronzeEx = ex;`,
    fRough: `roughnessFactor = mix(0.7, 0.28, bronzeEx);`,
    fNormal: `{ float h = vnoise(vLocal * 500.0) * 0.00006 + vSnake * 0.00012 * smoothstep(0.4, 0.2, length(fract(vec2(atan(vLocal.z - 0.03, vLocal.x) * 30.0, vLocal.y * 260.0)) - 0.5)); normal = bumpN(-vViewPosition, normal, h, faceDirection); }`,
  });
}

export function glassMat(tint = "#9fb4b0", op = 0.18) {
  return new THREE.MeshPhysicalMaterial({ color: C(tint), roughness: 0.04, metalness: 0, transparent: true, opacity: op, clearcoat: 1, clearcoatRoughness: 0.02,
    specularIntensity: 1, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
}

// ----------------------------------------------------------------------------------- утилиты геометрии
const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
};
const lathe = (prof: [number, number][], seg = 40) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, shadow = true) => {
  const o = new THREE.Mesh(g, m); o.castShadow = shadow; o.receiveShadow = true; return o;
};
function merge(geos: THREE.BufferGeometry[]) {
  // простое слияние non-indexed
  const gs = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const n = gs.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of gs) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute("position", new THREE.BufferAttribute(pos, 3)); r.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return r;
}
const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ----------------------------------------------------------------------------------- набор
export class World {
  group = new THREE.Group();
  lampShade!: THREE.Mesh; bulb!: THREE.Mesh; bulbMat!: THREE.MeshBasicMaterial; cone!: THREE.Mesh; coneMat!: THREE.ShaderMaterial;
  dust!: THREE.InstancedMesh; dustMat!: THREE.ShaderMaterial;
  mkey!: THREE.SpotLight; mfill!: THREE.PointLight;
  key!: THREE.SpotLight; fill!: THREE.PointLight; rim!: THREE.SpotLight; moon!: THREE.SpotLight; shadeGlow!: THREE.PointLight; amb!: THREE.HemisphereLight;
  benchTools = new THREE.Group();
  folderSpot = new THREE.Vector3(1.55, BENCH.y, 0.22);

  constructor() {
    const g = this.group;
    const oak = woodMat({ base: "#2a1c11", dark: "#120b06", plank: 0.19, axis: "z", grain: 120, rough: 0.55, key: "floor", gloss: 0.15 });
    const darkOak = woodMat({ base: "#2b1d12", dark: "#140d07", axis: "x", grain: 160, rough: 0.5, key: "bench", gloss: 0.25 });
    const cab = woodMat({ base: "#21160e", dark: "#0e0905", axis: "y", grain: 150, rough: 0.45, key: "cab", gloss: 0.35 });
    const wall = plasterMat("wall");
    const ceil = plasterMat("ceil", "#0b0c0f");

    // пол, стены, потолок
    const fl = new THREE.PlaneGeometry(ROOM.x1 - ROOM.x0, ROOM.zF - ROOM.zB, 1, 1); fl.rotateX(-Math.PI / 2); fl.translate(0, 0, (ROOM.zB + ROOM.zF) / 2);
    g.add(mesh(fl, oak, false));
    // задняя стена не рисуется там, где стекло зеркала (стекло пишет stencil=1 и «далёкую» глубину отражения)
    const wallBack = plasterMat("wallback");
    wallBack.stencilWrite = true; wallBack.stencilRef = 1; wallBack.stencilFunc = THREE.NotEqualStencilFunc; wallBack.stencilWriteMask = 0;
    wallBack.stencilFail = THREE.KeepStencilOp; wallBack.stencilZFail = THREE.KeepStencilOp; wallBack.stencilZPass = THREE.KeepStencilOp;
    g.add(mesh(box(ROOM.x0 - 0.1, ROOM.x1 + 0.1, 0, ROOM.h, ROOM.zB - 0.1, ROOM.zB), wallBack, false));
    g.add(mesh(box(ROOM.x0 - 0.1, ROOM.x0, 0, ROOM.h, ROOM.zB, ROOM.zF), wall, false));
    g.add(mesh(box(ROOM.x1, ROOM.x1 + 0.1, 0, ROOM.h, ROOM.zB, ROOM.zF), wall, false));
    g.add(mesh(box(ROOM.x0 - 0.1, ROOM.x1 + 0.1, 0, ROOM.h, ROOM.zF, ROOM.zF + 0.1), wall, false));
    g.add(mesh(box(ROOM.x0 - 0.1, ROOM.x1 + 0.1, ROOM.h, ROOM.h + 0.1, ROOM.zB - 0.1, ROOM.zF + 0.1), ceil, false));
    // плинтус и балки
    for (const [x0, x1, z0, z1] of [[ROOM.x0, ROOM.x1, ROOM.zB, ROOM.zB + 0.025], [ROOM.x0, ROOM.x0 + 0.025, ROOM.zB, ROOM.zF], [ROOM.x1 - 0.025, ROOM.x1, ROOM.zB, ROOM.zF]])
      g.add(mesh(box(x0, x1, 0, 0.14, z0, z1), cab, false));
    for (let z = 0.4; z < ROOM.zF; z += 1.25) g.add(mesh(box(ROOM.x0, ROOM.x1, ROOM.h - 0.22, ROOM.h, z, z + 0.2), darkOak, false));

    // ---- верстак справа
    const B = BENCH;
    g.add(mesh(box(B.x0, B.x1, B.y - 0.065, B.y, B.z0, B.z1), darkOak));
    for (const [x, z] of [[B.x0 + 0.06, B.z0 + 0.06], [B.x1 - 0.06, B.z0 + 0.06], [B.x0 + 0.06, B.z1 - 0.06], [B.x1 - 0.06, B.z1 - 0.06]])
      g.add(mesh(box(x - 0.04, x + 0.04, 0, B.y - 0.065, z - 0.04, z + 0.04), darkOak));
    g.add(mesh(box(B.x0 + 0.05, B.x1 - 0.05, 0.16, 0.2, B.z0 + 0.05, B.z1 - 0.05), darkOak));       // нижняя полка
    g.add(mesh(box(B.x0 + 0.1, B.x0 + 0.62, B.y - 0.22, B.y - 0.07, B.z1 - 0.02, B.z1 + 0.0), cab)); // ящик
    const brass = metalMat("brass", "#7a5a2a", 0.35);
    g.add(mesh(box(B.x0 + 0.33, B.x0 + 0.39, B.y - 0.155, B.y - 0.135, B.z1, B.z1 + 0.02), brass));
    // тиски на углу
    const iron = metalMat("iron", "#2a2a2c", 0.55);
    g.add(mesh(box(B.x1 - 0.32, B.x1 - 0.16, B.y, B.y + 0.09, B.z1 - 0.12, B.z1 + 0.02), iron));
    g.add(mesh(box(B.x1 - 0.3, B.x1 - 0.18, B.y + 0.02, B.y + 0.08, B.z1 + 0.02, B.z1 + 0.08), iron));
    // инструменты на верстаке (сдвигаются в сцене 3): стамески, киянка, банки, кисти
    const handleMat = woodMat({ base: "#5a3a1e", dark: "#2b1a0c", axis: "x", grain: 200, rough: 0.4, key: "handle", gloss: 0.4 });
    const steel = metalMat("steel", "#8a8c90", 0.3);
    const tools: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const tg = new THREE.Group();
      const h = new THREE.CylinderGeometry(0.012, 0.014, 0.12, 12); h.rotateZ(Math.PI / 2); h.translate(-0.06, 0.013, 0);
      const bl = new THREE.BoxGeometry(0.13, 0.006, 0.016 + i * 0.004); bl.translate(0.065, 0.006, 0);
      tg.add(mesh(h, handleMat), mesh(bl, steel));
      tg.position.set(1.15 + i * 0.05, B.y, 0.05 + i * 0.07); tg.rotation.y = 0.3 + i * 0.15;
      this.benchTools.add(tg);
    }
    // киянка
    { const tg = new THREE.Group();
      const hh = new THREE.CylinderGeometry(0.011, 0.011, 0.26, 10); hh.rotateZ(Math.PI / 2); hh.translate(-0.13, 0.03, 0);
      const hd = new THREE.CylinderGeometry(0.035, 0.035, 0.12, 20); hd.translate(0.0, 0.035, 0);
      tg.add(mesh(hh, handleMat), mesh(hd, handleMat)); tg.position.set(1.75, B.y, 0.38); tg.rotation.y = -0.5; this.benchTools.add(tg); }
    // банки и бутылочки
    const jarG = lathe([[0.0, 0], [0.035, 0], [0.038, 0.005], [0.038, 0.09], [0.03, 0.1], [0.028, 0.115], [0.0, 0.115]]);
    const jarMat = glassMat("#7a6a4a", 0.35);
    for (let i = 0; i < 3; i++) { const j = mesh(jarG, jarMat, false); j.position.set(2.0 - i * 0.09, B.y, -0.12 + i * 0.03); this.benchTools.add(j); }
    g.add(this.benchTools);

    // ---- шкаф слева со стеклянными дверцами и колбами
    const cx0 = -2.45, cx1 = -1.25, cz0 = ROOM.zB, cz1 = -0.08;
    g.add(mesh(box(cx0, cx1, 0, 2.35, cz0, cz0 + 0.03), cab));
    g.add(mesh(box(cx0, cx0 + 0.04, 0, 2.35, cz0, cz1), cab)); g.add(mesh(box(cx1 - 0.04, cx1, 0, 2.35, cz0, cz1), cab));
    g.add(mesh(box(cx0, cx1, 2.35, 2.42, cz0, cz1 + 0.03), cab));
    g.add(mesh(box(cx0, cx1, 0, 0.82, cz0, cz1), cab));
    for (const y of [0.82, 1.3, 1.78]) g.add(mesh(box(cx0 + 0.04, cx1 - 0.04, y, y + 0.025, cz0, cz1 - 0.02), cab));
    // ящики нижней тумбы
    for (let k = 0; k < 3; k++) {
      g.add(mesh(box(cx0 + 0.06, cx1 - 0.06, 0.08 + k * 0.24, 0.29 + k * 0.24, cz1, cz1 + 0.015), cab));
      g.add(mesh(box((cx0 + cx1) / 2 - 0.05, (cx0 + cx1) / 2 + 0.05, 0.18 + k * 0.24, 0.2 + k * 0.24, cz1 + 0.015, cz1 + 0.03), brass));
    }
    // рамы дверей и стекло
    const doorGlass = glassMat("#8fa3a0", 0.12);
    for (const [x0, x1] of [[cx0 + 0.04, (cx0 + cx1) / 2], [(cx0 + cx1) / 2, cx1 - 0.04]]) {
      g.add(mesh(box(x0, x1, 0.84, 0.88, cz1, cz1 + 0.025), cab)); g.add(mesh(box(x0, x1, 2.28, 2.33, cz1, cz1 + 0.025), cab));
      g.add(mesh(box(x0, x0 + 0.045, 0.84, 2.33, cz1, cz1 + 0.025), cab)); g.add(mesh(box(x1 - 0.045, x1, 0.84, 2.33, cz1, cz1 + 0.025), cab));
      const pg = new THREE.PlaneGeometry(x1 - x0 - 0.09, 1.4); pg.translate((x0 + x1) / 2, 1.58, cz1 + 0.012);
      g.add(mesh(pg, doorGlass, false));
    }
    // колбы на полках
    const flaskG = [
      lathe([[0, 0], [0.05, 0.0], [0.065, 0.04], [0.06, 0.09], [0.03, 0.12], [0.014, 0.135], [0.014, 0.2], [0.017, 0.205], [0, 0.205]]),
      lathe([[0, 0], [0.045, 0], [0.045, 0.16], [0.04, 0.17], [0, 0.17]]),
      lathe([[0, 0], [0.025, 0], [0.065, 0.06], [0.06, 0.1], [0.012, 0.13], [0.012, 0.2], [0, 0.2]]),
    ];
    const flaskMats = [glassMat("#9ab8b0", 0.2), glassMat("#6a8a5a", 0.28), glassMat("#a08060", 0.25)];
    let k = 0;
    for (const y of [0.845, 1.325, 1.805]) for (let i = 0; i < 6; i++) {
      const fx = cx0 + 0.13 + i * 0.18 + hash(k) * 0.04, fz = cz0 + 0.12 + hash(k + 7) * 0.2;
      const f = mesh(flaskG[k % 3], flaskMats[(k * 7) % 3], false); f.position.set(fx, y, fz); f.scale.setScalar(0.8 + hash(k + 3) * 0.5); g.add(f); k++;
    }
    // полка на задней стене слева от зеркала: банки, книги
    g.add(mesh(box(-1.15, -0.72, 1.45, 1.475, ROOM.zB, ROOM.zB + 0.22), cab));
    g.add(mesh(box(-1.15, -0.72, 1.05, 1.075, ROOM.zB, ROOM.zB + 0.22), cab));
    const bookMat = woodMat({ base: "#3a1d14", dark: "#1a0c08", axis: "y", grain: 30, rough: 0.8, key: "book" });
    for (let i = 0; i < 9; i++) {
      const w = 0.03 + hash(i) * 0.02, h = 0.2 + hash(i + 9) * 0.08;
      g.add(mesh(box(-1.13 + i * 0.045, -1.13 + i * 0.045 + w, 1.075, 1.075 + h, ROOM.zB + 0.03, ROOM.zB + 0.19), bookMat));
    }
    for (let i = 0; i < 4; i++) { const f = mesh(flaskG[i % 3], flaskMats[i % 3], false); f.position.set(-1.08 + i * 0.1, 1.475, ROOM.zB + 0.12); f.scale.setScalar(0.7); g.add(f); }
    // стеллаж с инструментами справа на задней стене (перфопанель)
    g.add(mesh(box(0.9, 2.2, 1.15, 2.1, ROOM.zB, ROOM.zB + 0.02), cab));
    for (let i = 0; i < 9; i++) {
      const x = 1.0 + i * 0.13, len = 0.18 + hash(i + 20) * 0.22;
      g.add(mesh(box(x - 0.008, x + 0.008, 1.9 - len, 1.9, ROOM.zB + 0.03, ROOM.zB + 0.05), i % 3 === 0 ? handleMat : steel));
      g.add(mesh(box(x - 0.02, x + 0.02, 1.9 - len - 0.06, 1.9 - len, ROOM.zB + 0.025, ROOM.zB + 0.055), i % 2 ? steel : iron));
    }
    // передняя стена (видна в зеркале): дверь, окно с жалюзи, вешалка
    g.add(mesh(box(-1.9, -1.0, 0, 2.15, ROOM.zF - 0.04, ROOM.zF), cab));
    g.add(mesh(box(-1.15, -1.08, 1.0, 1.08, ROOM.zF - 0.09, ROOM.zF - 0.04), brass));
    const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.12, 0.16) });
    const wn = new THREE.PlaneGeometry(0.9, 1.1); wn.rotateY(Math.PI); wn.translate(1.1, 1.65, ROOM.zF - 0.01); g.add(mesh(wn, winMat, false));
    for (let i = 0; i < 12; i++) g.add(mesh(box(0.65, 1.55, 1.12 + i * 0.09, 1.135 + i * 0.09, ROOM.zF - 0.06, ROOM.zF - 0.03), cab));
    // ---- лампа: шнур, абажур (зелёная эмаль снаружи, белая внутри), лампочка
    const L = LAMP.pos;
    const cord = new THREE.CylinderGeometry(0.005, 0.005, ROOM.h - L.y - 0.1, 8); cord.translate(L.x, (ROOM.h + L.y + 0.1) / 2, L.z);
    g.add(mesh(cord, iron, false));
    const shadeG = lathe([[0.02, 0.17], [0.045, 0.16], [0.1, 0.09], [0.17, 0.02], [0.2, 0.0], [0.205, -0.005]], 48);
    shadeG.translate(L.x, L.y - 0.02, L.z);
    const shadeOut = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.03, 0.16, 0.08), roughness: 0.25, metalness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.12, side: THREE.FrontSide });
    const shadeIn = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.4, 1.5), side: THREE.BackSide });
    this.lampShade = mesh(shadeG, shadeOut, true); g.add(this.lampShade);
    const inner = new THREE.Mesh(shadeG, shadeIn); g.add(inner);
    const cap = new THREE.CylinderGeometry(0.025, 0.03, 0.06, 16); cap.translate(L.x, L.y + 0.17, L.z); g.add(mesh(cap, brass, false));
    this.bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(40, 24, 9) });
    this.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.032, 24, 16), this.bulbMat); this.bulb.position.copy(L); g.add(this.bulb);

    // ---- свет
    this.key = new THREE.SpotLight(new THREE.Color("#FFA448"), 9, 9, 0.78, 0.65, 1.6);
    this.key.position.copy(L); this.key.target.position.set(L.x - 0.35, 0, L.z - 0.15);
    this.key.castShadow = true; this.key.shadow.mapSize.set(1536, 1536); this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 0.02;
    this.key.shadow.camera.near = 0.1; this.key.shadow.camera.far = 6; this.key.shadow.radius = 4; this.key.shadow.camera.layers.enable(1);
    g.add(this.key, this.key.target);
    this.shadeGlow = new THREE.PointLight(new THREE.Color("#FFB060"), 0.6, 1.2, 2); this.shadeGlow.position.copy(L).add(new THREE.Vector3(0, 0.06, 0)); g.add(this.shadeGlow);
    this.fill = new THREE.PointLight(new THREE.Color("#D9822B"), 0.7, 7, 2); this.fill.position.set(-0.8, 1.6, 2.8); g.add(this.fill);
    // холодный контровой (от «окна» и самого зеркала)
    this.rim = new THREE.SpotLight(new THREE.Color("#B4C6D4"), 4, 7, 0.5, 0.8, 1.5);
    this.rim.position.set(-1.6, 2.7, -0.3); this.rim.target.position.set(0.1, 1.3, 1.0); g.add(this.rim, this.rim.target);
    this.moon = new THREE.SpotLight(new THREE.Color("#8FA6C0"), 2, 8, 0.6, 0.9, 1.5);
    this.moon.position.set(1.1, 1.7, ROOM.zF - 0.2); this.moon.target.position.set(-0.4, 0.6, 2.0); g.add(this.moon, this.moon.target);
    // свет «Зазеркалья»: только в проходе отражения (слой 2) — подсвечивает лицо двойника изнутри
    this.mkey = new THREE.SpotLight(new THREE.Color("#FFB070"), 3.2, 6, 0.6, 0.8, 1.5);
    this.mkey.position.set(0.55, 2.0, -0.9); this.mkey.target.position.set(0.0, 1.55, 0.6);
    this.mkey.layers.set(2); this.mkey.target.layers.set(2); g.add(this.mkey, this.mkey.target);
    this.mfill = new THREE.PointLight(new THREE.Color("#8FB4D0"), 0.6, 4, 2); this.mfill.position.set(-0.6, 1.3, -0.7); this.mfill.layers.set(2); g.add(this.mfill);
    this.amb = new THREE.HemisphereLight(new THREE.Color("#2a2f3a"), new THREE.Color("#1a120a"), 0.12); g.add(this.amb);

    // ---- объёмный конус света (аддитивный)
    const coneLen = 2.4;
    const cg = new THREE.ConeGeometry(Math.tan(0.72) * coneLen, coneLen, 48, 1, true); cg.translate(0, -coneLen / 2, 0);
    this.coneMat = new THREE.ShaderMaterial({
      uniforms: { uK: { value: 0.05 }, uTop: { value: L.clone() }, uLen: { value: coneLen }, uCol: { value: new THREE.Color("#FFA448") } },
      vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uK; uniform vec3 uTop; uniform float uLen; uniform vec3 uCol; varying vec3 vW; varying vec3 vN; ${NOISE_GLSL}
        void main(){ vec3 V = normalize(cameraPosition - vW); float f = abs(dot(normalize(vN), V)); float t = clamp((uTop.y - vW.y) / uLen, 0.0, 1.0);
          float a = pow(max(1.0 - f, 0.0), 1.5) * 0.4 + 0.6 * pow(f, 0.8);
          float n = 0.7 + 0.6 * fbm3(vW * 3.0);
          float k = uK * a * (1.0 - smoothstep(0.55, 1.0, t)) * smoothstep(0.0, 0.08, t) * n;
          gl_FragColor = vec4(uCol * k, 1.0); }`,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      clipping: true, clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.01)],
    });
    this.cone = new THREE.Mesh(cg, this.coneMat); this.cone.position.copy(L); this.cone.renderOrder = 5; this.cone.visible = false; g.add(this.cone);

    // ---- пылинки
    const N = 900;
    const qg = new THREE.PlaneGeometry(1, 1);
    this.dustMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uTop: { value: L.clone() }, uK: { value: 1 }, uSize: { value: 0.0035 } },
      vertexShader: `attribute vec4 seed; uniform float uT; uniform vec3 uTop; uniform float uSize; varying float vB; varying vec2 vUv;
        void main(){
          vec3 c = vec3(-1.0 + seed.x * 2.6, 0.15 + seed.y * 2.3, 0.08 + seed.z * 3.0);
          float t = uT;
          c += vec3(sin(t * 0.21 + seed.w * 40.0) * 0.08 + t * 0.012, sin(t * 0.13 + seed.x * 30.0) * 0.06 - t * 0.006, cos(t * 0.17 + seed.y * 50.0) * 0.08);
          c.y = mod(c.y - 0.15, 2.3) + 0.15; c.z = max(c.z, 0.06);
          vec3 d = c - uTop; float L = length(d);
          float ang = acos(clamp(-d.y / max(L, 1e-4), -1.0, 1.0));
          vB = (1.0 - smoothstep(0.45, 0.78, ang)) * (1.0 / (1.0 + L * L * 0.5)) * (0.4 + 0.6 * fract(seed.w * 13.7));
          vB *= 0.5 + 0.5 * sin(t * (1.0 + seed.z * 3.0) + seed.w * 20.0);
          vec4 mv = viewMatrix * vec4(c, 1.0);
          float s = uSize * (0.5 + seed.w);
          mv.xy += position.xy * s;
          vUv = uv; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uK; varying float vB; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float a = exp(-r * r * 4.0) * (1.0 - smoothstep(0.85, 1.0, r));
        gl_FragColor = vec4(vec3(1.0, 0.72, 0.38) * vB * a * uK * 6.0, 1.0); }`,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    });
    const ig = new THREE.InstancedBufferGeometry(); ig.index = qg.index; ig.attributes.position = qg.attributes.position; ig.attributes.uv = qg.attributes.uv;
    const seeds = new Float32Array(N * 4); for (let i = 0; i < N * 4; i++) seeds[i] = hash(i * 1.37 + 0.5);
    ig.setAttribute("seed", new THREE.InstancedBufferAttribute(seeds, 4)); ig.instanceCount = N;
    this.dust = new THREE.Mesh(ig, this.dustMat) as any; this.dust.frustumCulled = false; this.dust.renderOrder = 6; g.add(this.dust);
  }

  update(t: number) { this.dustMat.uniforms.uT.value = t; }
}
