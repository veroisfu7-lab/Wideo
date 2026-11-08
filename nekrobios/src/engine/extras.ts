// Дополнительный реквизит: рука-коготь из зеркала (скелет), капли ртути и дымок, архивная папка и лист со схемой (canvas),
// крепления предметов к кистям, кубическая камера для глаз двойника.
import * as THREE from "three";
import { loadJSON, loadPack } from "./assets";
import { Character } from "./character";
import { patch, withAO } from "./materials";
import { LAYER } from "./mirror";

const D2R = Math.PI / 180;

// ----------------------------------------------------------------------------- рука-коготь
export class Claw {
  root = new THREE.Group(); bones: Record<string, THREE.Bone> = {}; mesh!: THREE.SkinnedMesh; mat!: THREE.MeshPhysicalMaterial;
  U = { uWet: { value: 1 } };
  async init() {
    const [rig, pack] = await Promise.all([loadJSON("claw_rig.json"), loadPack("claw")]);
    const list: THREE.Bone[] = [];
    const heads: Record<string, THREE.Vector3> = {};
    for (const b of rig.bones) { const bone = new THREE.Bone(); bone.name = b.name; this.bones[b.name] = bone; list.push(bone); heads[b.name] = new THREE.Vector3(...b.head); }
    for (const b of rig.bones) {
      const bone = this.bones[b.name];
      if (b.parent) { this.bones[b.parent].add(bone); bone.position.copy(heads[b.name]).sub(heads[b.parent]); }
      else { this.root.add(bone); bone.position.copy(heads[b.name]); }
    }
    this.root.updateMatrixWorld(true);
    const sk = new THREE.Skeleton(list);
    this.mat = withAO(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.08 })) as THREE.MeshPhysicalMaterial;
    patch(this.mat, {
      key: "claw", uniforms: this.U as any,
      vDecl: "attribute float claw; varying float vClaw;", vMain: "vClaw = claw;", fDecl: "varying float vClaw;",
      fColor: `vec3 ash = vec3(0.33, 0.34, 0.35) * (0.7 + 0.5 * vnoise(vLocal * 120.0));
        vec3 merc = vec3(0.75, 0.8, 0.85);
        float wet = smoothstep(0.35, 0.7, fbm3(vLocal * 40.0)) * uWet;
        vec3 c = mix(ash, merc, wet * 0.8);
        c = mix(c, vec3(0.012), vClaw);
        diffuseColor.rgb = c; float clawWet = wet;`,
      fRough: `metalnessFactor = mix(0.25, 1.0, clawWet); roughnessFactor = mix(0.45, 0.06, clawWet); roughnessFactor = mix(roughnessFactor, 0.2, vClaw); metalnessFactor *= (1.0 - vClaw * 0.8);`,
      fNormal: `{ float h = vnoise(vLocal * 700.0) * 0.00005 + fbm3(vLocal * 90.0) * 0.0002; normal = bumpN(-vViewPosition, normal, h, faceDirection); }`,
    });
    this.mesh = new THREE.SkinnedMesh(pack.geos.claw, this.mat);
    this.mesh.bind(sk, new THREE.Matrix4()); this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    this.root.add(this.mesh);
    this.root.traverse((o) => o.layers.set(LAYER.REAL));
  }
  // сжатие пальцев: 0 — раскрыты, 1 — сжаты в кулак вокруг запястья
  grip(k: number, spread = 0) {
    for (const f of ["index", "middle", "ring", "pinky"]) for (let i = 1; i <= 3; i++) {
      const b = this.bones[`${f}${i}`];
      b.quaternion.setFromEuler(new THREE.Euler((i === 1 ? 35 : 55) * k * D2R + (1 - k) * -8 * D2R, (f === "index" ? -1 : f === "pinky" ? 1 : 0) * spread * D2R * (i === 1 ? 1 : 0), 0));
    }
    for (let i = 1; i <= 3; i++) this.bones[`thumb${i}`].quaternion.setFromEuler(new THREE.Euler(30 * k * D2R, -25 * k * D2R, 0));
  }
}

// ----------------------------------------------------------------------------- капли ртути + дымок на полу
export class Droplets {
  N = 70; mesh: THREE.InstancedMesh; smoke: THREE.Mesh; smokeMat: THREE.ShaderMaterial; seeds: number[][] = [];
  constructor(env: THREE.Texture | null) {
    const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.85, 0.88, 0.92), metalness: 1, roughness: 0.06, envMapIntensity: 4, emissive: new THREE.Color(0.05, 0.055, 0.06) });
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), m, this.N);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false;
    for (let i = 0; i < this.N; i++) { const h = (k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); }; this.seeds.push([h(1), h(2), h(3), h(4), h(5)]); }
    const N2 = 40;
    this.smokeMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uK: { value: 0 } },
      vertexShader: `attribute vec4 seed; uniform float uT; varying float vA; varying vec2 vUv;
        void main(){ float t = max(uT - seed.w * 0.6, 0.0); vec3 c = vec3(-0.5 + seed.x * 1.0, 0.01 + t * 0.12 * (0.5 + seed.y), 0.15 + seed.z * 0.7);
          vA = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.6, 1.6, t));
          vec4 mv = viewMatrix * vec4(c, 1.0); mv.xy += position.xy * (0.03 + t * 0.06); vUv = uv; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uK; varying float vA; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float a = exp(-r * r * 3.0) * vA * uK;
        gl_FragColor = vec4(vec3(0.55, 0.55, 0.6) * a * 0.25, 1.0); }`,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    });
    const qg = new THREE.PlaneGeometry(1, 1);
    const ig = new THREE.InstancedBufferGeometry(); ig.index = qg.index; ig.attributes.position = qg.attributes.position; ig.attributes.uv = qg.attributes.uv;
    const s = new Float32Array(N2 * 4); for (let i = 0; i < N2 * 4; i++) { const x = Math.sin(i * 91.7 + 3.3) * 4375.85; s[i] = x - Math.floor(x); }
    ig.setAttribute("seed", new THREE.InstancedBufferAttribute(s, 4)); ig.instanceCount = N2;
    this.smoke = new THREE.Mesh(ig, this.smokeMat); this.smoke.frustumCulled = false; this.smoke.renderOrder = 7;
  }
  // t — секунды «реального» времени после удара; origin — точка удара
  update(t: number, origin: THREE.Vector3, k = 1) {
    const M = new THREE.Matrix4(); const g = 9.8;
    for (let i = 0; i < this.N; i++) {
      const s = this.seeds[i];
      const t0 = s[4] * 0.35; const tt = Math.max(0, t - t0);
      const r = 0.0018 + s[0] * s[0] * 0.006;
      if (t < t0 || k <= 0) { M.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, M); continue; }
      const ang = s[1] * Math.PI * 2, el = 0.2 + s[2] * 1.1, sp = 0.6 + s[3] * 1.6;
      const v = new THREE.Vector3(Math.cos(ang) * Math.cos(el) * sp * 0.9, Math.sin(el) * sp * 0.6 + 0.3, 0.25 + Math.abs(Math.sin(ang)) * sp * 0.45);
      let p = origin.clone().addScaledVector(v, tt); p.y -= 0.5 * g * tt * tt;
      if (p.y < r) { // на полу: остановились, растеклись
        const tl = (v.y + Math.sqrt(v.y * v.y + 2 * g * (origin.y - r))) / g;
        p = origin.clone().addScaledVector(v, tl); p.y = r * 0.35;
        const sx = 1.6 + s[0];
        M.makeScale(r * sx, r * 0.35, r * sx); M.setPosition(p);
      } else {
        const st = 1 + Math.min(tt * 3, 0.6);
        M.makeScale(r, r * st, r); M.setPosition(p);
      }
      this.mesh.setMatrixAt(i, M);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.smokeMat.uniforms.uT.value = Math.max(0, t - 0.55); this.smokeMat.uniforms.uK.value = k;
  }
}

// ----------------------------------------------------------------------------- крепления к кистям
export function attach(obj: THREE.Object3D, ch: Character, side: "L" | "R", ofs: THREE.Vector3, rot: THREE.Euler, scale = 1) {
  ch.root.updateMatrixWorld(true);
  const hb = ch.bones["hand." + side];
  const HF = new THREE.Matrix4().setFromMatrix3(ch.hf[side]);
  if (HF.determinant() < 0) HF.multiply(new THREE.Matrix4().makeScale(1, 1, -1)); // правая кисть: собственный поворот (большой палец к -Z)
  const O = new THREE.Matrix4().makeRotationFromEuler(rot).scale(new THREE.Vector3(scale, scale, scale)).setPosition(ofs);
  const M = hb.matrixWorld.clone().multiply(HF).multiply(O);
  obj.matrixAutoUpdate = false;
  if (obj.parent && obj.parent.matrixWorld) { const inv = obj.parent.matrixWorld.clone().invert(); obj.matrix.copy(inv.multiply(M)); }
  else obj.matrix.copy(M);
  obj.matrixWorldNeedsUpdate = true;
}

// ----------------------------------------------------------------------------- папка и лист (canvas)
const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function paperNoise(ctx: CanvasRenderingContext2D, w: number, h: number, base: [number, number, number], amt: number, seed: number) {
  const img = ctx.createImageData(w, h); const d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const n = (hash(x * 0.37 + y * 13.1 + seed) - 0.5) * amt;
    const f = (hash(Math.floor(x / 3) * 7.1 + Math.floor(y / 9) * 3.3 + seed) - 0.5) * amt * 0.5; // волокна
    const ex = Math.min(x, y, w - x, h - y) / Math.min(w, h);
    const edge = Math.min(1, ex * 9);
    const k = 0.78 + 0.22 * edge;
    d[i] = Math.max(0, Math.min(255, (base[0] + n + f) * k)); d[i + 1] = Math.max(0, Math.min(255, (base[1] + n + f) * k)); d[i + 2] = Math.max(0, Math.min(255, (base[2] + n + f) * k * 0.98)); d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function distressed(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, k: number) {
  // вытирает часть краски (штамп/машинопись)
  ctx.save(); ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 2600 * k; i++) {
    const x = hash(i + seed) * w, y = hash(i * 3.7 + seed) * h, r = 0.6 + hash(i * 1.3 + seed) * 2.6;
    ctx.globalAlpha = 0.35 + hash(i * 9.1) * 0.6; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export class Folder {
  group = new THREE.Group(); cover: THREE.Mesh; back: THREE.Mesh; paper: THREE.Mesh; coverPivot = new THREE.Group();
  paperCanvas: HTMLCanvasElement; paperTex: THREE.CanvasTexture; paperBase: HTMLCanvasElement;
  ties: THREE.Mesh[] = [];
  W = 0.245; H = 0.335; // м
  constructor() {
    const coverC = document.createElement("canvas"); coverC.width = 1024; coverC.height = 1400;
    const c = coverC.getContext("2d")!;
    paperNoise(c, 1024, 1400, [128, 126, 118], 26, 1);
    // потёртости и пятна
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(60,50,40,${0.04 + hash(i) * 0.06})`; c.beginPath(); c.ellipse(hash(i * 2) * 1024, hash(i * 3) * 1400, 20 + hash(i * 4) * 120, 10 + hash(i * 5) * 60, hash(i) * 3, 0, 7); c.fill(); }
    c.fillStyle = "#2a2622"; c.textAlign = "center";
    c.font = "500 34px HStamp"; c.fillText("АКАДЕМИЯ НАУК СССР", 512, 120);
    // герб: венок из колосьев, звезда, земной шар
    c.save(); c.translate(512, 300); c.strokeStyle = "#2a2622"; c.lineWidth = 5;
    c.beginPath(); c.arc(0, 0, 92, 0, Math.PI * 2); c.stroke();
    for (let k = 0; k < 7; k++) { c.beginPath(); c.ellipse(0, 0, 92, Math.abs(92 * Math.cos(k / 7 * Math.PI)) + 0.5, 0, 0, Math.PI * 2); c.lineWidth = 2; c.stroke(); }
    c.beginPath(); c.moveTo(-92, 0); c.lineTo(92, 0); c.stroke();
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) {
      const a = Math.PI * 0.62 + k * 0.17; const x = Math.cos(a) * 128 * s, y = -Math.sin(a) * 120 + 60;
      c.save(); c.translate(x, y); c.rotate(-s * (a - Math.PI / 2) + (s > 0 ? 0 : 0)); c.fillStyle = "#2a2622"; c.beginPath(); c.ellipse(0, 0, 9, 22, 0, 0, 7); c.fill(); c.restore();
    }
    c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 14 : 34; const a = -Math.PI / 2 + k * Math.PI / 5; c.lineTo(Math.cos(a) * r, -120 + Math.sin(a) * r); } c.closePath(); c.fillStyle = "#2a2622"; c.fill();
    c.restore();
    c.font = "500 44px HStamp"; c.fillText("ДЕЛО №  1984 / 17-Н", 512, 520);
    c.font = "400 30px HMono"; c.fillText("Начато ____ 1984 г.     Окончено ____ 19__ г.", 512, 580);
    c.font = "400 30px HMono"; c.fillText("Хранить постоянно", 512, 1250);
    // наклейка с названием
    c.fillStyle = "rgba(222,214,190,0.95)"; c.fillRect(170, 640, 684, 170); c.strokeStyle = "#3a352e"; c.lineWidth = 3; c.strokeRect(170, 640, 684, 170);
    c.fillStyle = "#1f1b17"; c.font = "400 46px HMono"; c.fillText('ПРОЕКТ "НЕКРОБИОС"', 512, 715); c.font = "400 38px HMono"; c.fillText("1984 г.", 512, 775);
    // красный штамп
    const st = document.createElement("canvas"); st.width = 760; st.height = 260; const s2 = st.getContext("2d")!;
    s2.strokeStyle = "#b3141c"; s2.fillStyle = "#b3141c"; s2.lineWidth = 9; s2.strokeRect(14, 14, 732, 232); s2.lineWidth = 4; s2.strokeRect(30, 30, 700, 200);
    s2.textAlign = "center"; s2.font = "700 76px HStamp"; s2.fillText("СОВ. СЕКРЕТНО", 380, 120); s2.font = "700 54px HStamp"; s2.fillText("//  АН СССР  //", 380, 200);
    distressed(s2, 760, 260, 5, 1.4);
    c.save(); c.translate(560, 1010); c.rotate(-0.12); c.globalAlpha = 0.82; c.drawImage(st, -380, -130); c.restore();
    const coverTex = new THREE.CanvasTexture(coverC); coverTex.colorSpace = THREE.SRGBColorSpace; coverTex.anisotropy = 4;
    const coverMat = new THREE.MeshPhysicalMaterial({ map: coverTex, roughness: 0.92, sheen: 0.3, sheenColor: new THREE.Color(0.4, 0.4, 0.4) });
    const plainMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.22, 0.21, 0.19), roughness: 0.95 });
    const cg = new THREE.BoxGeometry(this.W, 0.0025, this.H);
    // крышка: UV верхней грани — вся текстура
    this.cover = new THREE.Mesh(cg, [plainMat, plainMat, coverMat, plainMat, plainMat, plainMat]);
    this.cover.position.set(this.W / 2, 0.0, 0); this.cover.castShadow = true; this.cover.receiveShadow = true;
    this.coverPivot.add(this.cover); this.coverPivot.position.set(-this.W / 2, 0.006, 0);
    this.back = new THREE.Mesh(cg, plainMat); this.back.position.y = 0.0013; this.back.receiveShadow = true; this.back.castShadow = true;
    // лист: базовая текстура (бумага + машинопись) + динамическая схема
    this.paperBase = document.createElement("canvas"); this.paperBase.width = 1536; this.paperBase.height = 2100;
    this.drawPaperBase();
    this.paperCanvas = document.createElement("canvas"); this.paperCanvas.width = 1536; this.paperCanvas.height = 2100;
    this.paperTex = new THREE.CanvasTexture(this.paperCanvas); this.paperTex.colorSpace = THREE.SRGBColorSpace; this.paperTex.anisotropy = 8;
    const pg = new THREE.PlaneGeometry(this.W - 0.012, this.H - 0.012); pg.rotateX(-Math.PI / 2);
    this.paper = new THREE.Mesh(pg, new THREE.MeshPhysicalMaterial({ map: this.paperTex, roughness: 0.85, emissive: new THREE.Color(0, 0, 0), emissiveMap: this.paperTex }));
    this.paper.position.y = 0.0032; this.paper.receiveShadow = true;
    // завязки
    const tieM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.55, 0.52, 0.45), roughness: 0.95 });
    for (const z of [-0.06, 0.06]) {
      const tg = new THREE.BoxGeometry(0.11, 0.0012, 0.006); tg.translate(0.055, 0, 0);
      const t = new THREE.Mesh(tg, tieM); t.position.set(this.W / 2 - 0.01, 0.007, z); t.castShadow = true; this.ties.push(t); this.group.add(t);
    }
    this.group.add(this.back, this.paper, this.coverPivot);
    this.group.traverse((o) => o.layers.set(LAYER.BOTH));
  }

  drawPaperBase() {
    const c = this.paperBase.getContext("2d")!; const w = 1536, h = 2100;
    paperNoise(c, w, h, [222, 206, 168], 18, 9);
    // пятна времени
    for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(150,110,50,${0.03 + hash(i + 50) * 0.05})`; c.beginPath(); c.ellipse(hash(i * 2 + 9) * w, hash(i * 3 + 9) * h, 30 + hash(i * 4) * 160, 20 + hash(i * 5) * 90, hash(i), 0, 7); c.fill(); }
    c.fillStyle = "#1d1a17"; c.textAlign = "left";
    c.font = "400 40px HMono";
    c.fillText("ПРИЛОЖЕНИЕ № 3  к отчёту лаб. 17-Н", 120, 150);
    c.font = "400 46px HMono"; c.textAlign = "center"; c.fillText("СХЕМА ПЕРЕХОДА ЧЕРЕЗ АМАЛЬГАМУ", w / 2, 240); c.textAlign = "left";
    c.font = "400 34px HMono";
    const lines = [
      "Объект: зеркало венецианское, 1782 г., амальгама —",
      "сверхочищенная ртуть (Hg 99,9999 %). Наблюдения 1983–84 гг.",
      "",
      "Вывод комиссии:",
    ];
    let y = 1420;
    for (const l of lines) { c.fillText(l, 120, y); y += 52; }
    y += 10;
    const key = ["Ртуть помнит всех, кто в неё смотрел. Созданная", "сущность копирует оригинал. Когда задержка", "составит 5 секунд — оригинал станет отражением."];
    for (const l of key) { c.fillText(l, 120, y); y += 56; }
    c.font = "400 30px HMono";
    c.fillText("Опыты прекратить. Объект опечатать.          Подпись: ________", 120, y + 70);
    c.fillText("Экз. единств.", 1180, 2010);
    distressed(c, w, h, 21, 0.25);
    // рамка схемы
    c.strokeStyle = "rgba(40,36,30,0.6)"; c.lineWidth = 2; c.strokeRect(120, 300, w - 240, 1020);
  }

  // p — прогресс анимации схемы 0..1+, under — прогресс подчёркивания пальцем 0..1, glow — циановое свечение
  drawPaper(p: number, t: number, under: number, glow: number) {
    const c = this.paperCanvas.getContext("2d")!; const w = 1536, h = 2100;
    c.drawImage(this.paperBase, 0, 0);
    const ink = "rgba(18,22,40,0.97)";
    const X0 = 140, Y0 = 320, Wd = w - 280, Hd = 980;
    const seg = (a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));
    const line = (x1: number, y1: number, x2: number, y2: number, k: number, col = ink, lw = 7) => {
      if (k <= 0) return; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k); c.stroke();
    };
    // 1) стекло и ртуть (вертикальные слои)
    const gx = X0 + Wd * 0.34, mx = gx + 70;
    const k1 = seg(0.0, 0.18);
    c.fillStyle = `rgba(150,180,200,${0.35 * k1})`; c.fillRect(gx, Y0 + 60, 60, (Hd - 120) * k1);
    c.fillStyle = `rgba(150,155,165,${0.85 * k1})`; c.fillRect(mx, Y0 + 60, 26, (Hd - 120) * k1);
    line(gx, Y0 + 60, gx, Y0 + Hd - 60, k1); line(gx + 60, Y0 + 60, gx + 60, Y0 + Hd - 60, k1); line(mx + 26, Y0 + 60, mx + 26, Y0 + Hd - 60, k1);
    c.fillStyle = ink; c.font = "400 38px HMono";
    if (k1 > 0.6) { c.globalAlpha = (k1 - 0.6) / 0.4; c.fillText("СТЕКЛО", gx - 120, Y0 + 40); c.fillText("РТУТЬ", mx - 10, Y0 + Hd - 20); c.globalAlpha = 1; }
    // 2) бесконечный коридор за амальгамой (перспектива)
    const k2 = seg(0.15, 0.5);
    const vx = X0 + Wd * 0.86, vy = Y0 + Hd * 0.5;
    for (let i = 0; i < 9; i++) {
      const kk = Math.max(0, Math.min(1, k2 * 9 - i));
      if (kk <= 0) break;
      const s = Math.pow(0.68, i + ((t * 0.35) % 1));
      const x0 = mx + 40 + (vx - mx - 40) * (1 - s), hh = (Hd - 160) * 0.5 * s, ww = (vx - mx - 40) * 0.28 * s;
      c.strokeStyle = `rgba(18,22,40,${0.9 * kk * (0.5 + 0.5 * s)})`; c.lineWidth = 6;
      c.strokeRect(x0, vy - hh, ww + 30 * s, hh * 2);
    }
    if (k2 > 0) { for (const [ax, ay] of [[mx + 40, Y0 + 80], [mx + 40, Y0 + Hd - 80]]) line(ax, ay, vx, vy, k2, "rgba(18,22,40,0.6)", 4); }
    // 3) наблюдатель: профиль головы слева и глаз
    const k3 = seg(0.3, 0.55);
    if (k3 > 0) {
      c.strokeStyle = ink; c.lineWidth = 5; c.beginPath();
      const hx = X0 + 120, hy = Y0 + Hd * 0.5;
      c.arc(hx, hy - 30, 95, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * k3 * 0.75); c.stroke();
      c.fillStyle = ink; c.beginPath(); c.arc(hx + 70, hy - 50, 9, 0, 7); c.fill();
    }
    // 4) стрелки перехода и частицы сознания, втягиваемые в ртуть
    const k4 = seg(0.45, 0.75);
    const cy = Y0 + Hd * 0.5;
    for (const dy of [-150, 0, 150]) {
      const ax = X0 + 230, ay = cy - 50 + dy * 0.3, bx = mx + 13, by = cy + dy;
      line(ax, ay, bx, by, k4, "rgba(170,16,22,0.95)", 7);
      if (k4 >= 1) { const ang = Math.atan2(by - ay, bx - ax); c.fillStyle = "rgba(150,20,24,0.9)"; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - 26 * Math.cos(ang - 0.35), by - 26 * Math.sin(ang - 0.35)); c.lineTo(bx - 26 * Math.cos(ang + 0.35), by - 26 * Math.sin(ang + 0.35)); c.fill(); }
      if (k4 > 0.3) for (let j = 0; j < 7; j++) {
        const u = ((t * 0.45 + j / 7 + dy * 0.001) % 1);
        const px = ax + (bx - ax) * u, py = ay + (by - ay) * u + Math.sin(u * 12 + j) * 10;
        c.fillStyle = `rgba(0,170,200,${0.95 * (1 - u * 0.4)})`; c.beginPath(); c.arc(px, py, 11 * (1 - u * 0.5), 0, 7); c.fill();
      }
    }
    // частицы внутри коридора
    if (k4 > 0.5) for (let j = 0; j < 18; j++) {
      const u = ((t * 0.2 + j / 18) % 1); const s = Math.pow(0.68, u * 7);
      const px = mx + 40 + (vx - mx - 40) * (1 - s), py = vy + (hash(j) - 0.5) * (Hd - 200) * s;
      c.fillStyle = `rgba(0,190,210,${0.7 * s})`; c.beginPath(); c.arc(px, py, 6 * s + 1, 0, 7); c.fill();
    }
    // подпись к схеме
    if (p > 0.8) { c.globalAlpha = Math.min(1, (p - 0.8) / 0.15); c.fillStyle = ink; c.font = "400 30px HMono"; c.fillText("Рис. 1. Втягивание отражения в амальгаму. Задержка Δt → 5 с.", X0 + 40, Y0 + Hd - 14); c.globalAlpha = 1; }
    // подчёркивание красным карандашом под ключевой строкой
    const ux0 = 118, ux1 = 1420; const uy = [1662, 1718, 1774];
    c.strokeStyle = "rgba(170,24,26,0.85)"; c.lineWidth = 6; c.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const kk = Math.max(0, Math.min(1, 1.0)); // подчёркнуто карандашом заранее
      c.beginPath(); for (let k = 0; k <= 40 * kk; k++) { const x = ux0 + (ux1 - ux0) * (k / 40) * (i === 2 ? 0.92 : 1); c.lineTo(x, uy[i] + Math.sin(k * 1.7 + i) * 2.5); } c.stroke();
    }
    // палец «ведёт» — подсветка прочитанного
    if (under > 0) {
      const tot = 3 * (ux1 - ux0); let L = under * tot;
      for (let i = 0; i < 3 && L > 0; i++) { const len = Math.min(L, ux1 - ux0); c.fillStyle = "rgba(255,220,120,0.10)"; c.fillRect(ux0, uy[i] - 46, len, 52); L -= len; }
    }
    // циановое свечение «оживания»
    if (glow > 0) {
      c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = glow;
      const gr = c.createRadialGradient(mx, cy, 10, mx, cy, 420); gr.addColorStop(0, "rgba(0,242,254,0.35)"); gr.addColorStop(1, "rgba(0,242,254,0)");
      c.fillStyle = gr; c.fillRect(0, 0, w, h); c.restore();
    }
    this.paperTex.needsUpdate = true;
  }

  // точка на листе (px холста) → мир
  paperToWorld(px: number, py: number) {
    const u = px / 1536 - 0.5, v = py / 2100 - 0.5;
    const p = new THREE.Vector3(u * (this.W - 0.012), 0.004, v * (this.H - 0.012));
    this.group.updateMatrixWorld(true);
    return p.applyMatrix4(this.group.matrixWorld);
  }
}
