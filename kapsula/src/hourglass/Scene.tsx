// 3D-сцена «Песочные часы»: внутри нижней колбы серый листает телефон, его засыпает красный песок;
// белый лезет по растущей горке, прыгает к горлышку, подтягивается против струи и выходит в верхнюю колбу.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Easing, useCurrentFrame } from "remotion";
import T from "./timeline.json";
import { V2, keys, keys2, seg, inOut, outCubic, lerp, clamp01, LIMB_R, LEG_MAX } from "../anim";
import { Stickman, solveFacing, Pose, flat } from "../Stickman";

const W = T.white, G = T.grey, C = T.camera, S = T.sand;
const lin = (hex: string) => new THREE.Color(hex);

// ------------------------------------------------------------------ форма часов (тело вращения вокруг оси Y)
export const NECK_Y = 3.9, NECK_R = 0.34, TOP_Y = 7.8, SLOPE = 0.65;   // SLOPE = tg угла откоса песка (≈33°)
const ell = (y: number) => { const u = (y - 1.85) / 1.95; return 2.0 * Math.sqrt(Math.max(0, 1 - u * u)); };
export const wallR = (y: number) => Math.max(y <= NECK_Y ? ell(y) : ell(2 * NECK_Y - y), NECK_R);

// уровень песка: вершина нижней горки и уровень в верхней колбе
const hc = (f: number) => S.hc0 + (S.hc1 - S.hc0) * Math.pow(clamp01(f / T.total), 0.95);
const upL = (f: number) => lerp(S.upper0, S.upper1, clamp01(f / T.total));
export const sandY = (x: number, z: number, f: number) => hc(f) - Math.hypot(x, z) * SLOPE;
const FUNNEL0 = NECK_Y + 0.15, HOLE_R = 0.42;   // воронка начинается кольцом r=0.42 над горлышком
export const upperY = (x: number, z: number, f: number) => Math.min(upL(f), FUNNEL0 + Math.max(0, Math.hypot(x, z) - HOLE_R) * SLOPE);

const bisect = (g: (y: number) => number, a: number, b: number) => {
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (g(a) * g(m) <= 0) b = m; else a = m; }
  return (a + b) / 2;
};

// ------------------------------------------------------------------ материалы
const sandMat = new THREE.ShaderMaterial({
  uniforms: { uTop: { value: lin("#8A1520") }, uSide: { value: lin("#4E0A10") }, uGlow: { value: lin("#F62E2A").multiplyScalar(0.55) }, uYTop: { value: 1 }, uHit: { value: new THREE.Vector3() } },
  vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uTop; uniform vec3 uSide; uniform vec3 uGlow; uniform float uYTop; uniform vec3 uHit; varying vec3 vW; varying vec3 vN;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
    void main(){
      float up = abs(vN.y);
      vec3 c = mix(uSide, uTop, smoothstep(0.35, 0.8, up));
      c *= mix(exp(-1.1*max(0.0, uYTop - vW.y)), 1.0, smoothstep(0.35, 0.8, up));   // бока колбы темнеют книзу
      c *= 0.86 + 0.28*h(floor(vW*95.0));                                           // зерно
      c += uGlow * exp(-length(vW - uHit)*3.5) * smoothstep(0.3, 0.8, up);           // свечение в месте удара струи
      gl_FragColor = vec4(c, 1.0);
    }`,
  side: THREE.DoubleSide,
});
const glassMat = new THREE.ShaderMaterial({
  uniforms: { uRim: { value: lin("#A4A1A5") } },
  vertexShader: `varying vec3 vNV; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vNV = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uRim; varying vec3 vNV; varying vec3 vV;
    void main(){ float d = abs(dot(normalize(vNV), normalize(vV))); float rim = pow(1.0 - d, 4.0);
      gl_FragColor = vec4(uRim * (rim * 0.85 + 0.003), 1.0); }`,
  blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
});
const setMat = (top: string, side: string) => new THREE.ShaderMaterial({
  uniforms: { uTop: { value: lin(top) }, uSide: { value: lin(side) } },
  vertexShader: `varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uTop; uniform vec3 uSide; varying vec3 vN; void main(){ gl_FragColor = vec4(vN.y > 0.5 ? uTop : uSide, 1.0); }`,
});
const floorMat = new THREE.ShaderMaterial({
  uniforms: { uC: { value: lin("#1E1B1F") } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uC; varying vec3 vW; void main(){ gl_FragColor = vec4(uC * (1.0 - smoothstep(1.0, 5.5, length(vW.xz))), 1.0); }`,
});
const edgeMat = flat("#8C898D");
const grainMat = new THREE.MeshBasicMaterial({ color: lin("#F62E2A").multiplyScalar(1.25), toneMapped: false });
const streamMat = new THREE.MeshBasicMaterial({ color: lin("#F62E2A").multiplyScalar(1.6), toneMapped: false });

// ------------------------------------------------------------------ стекло и рама
const glassGeo = (() => {
  const pts: THREE.Vector2[] = [];
  for (let y = 0; y <= TOP_Y + 1e-6; y += 0.04) pts.push(new THREE.Vector2(wallR(y), y));
  return new THREE.LatheGeometry(pts, 128);
})();
const Frame: React.FC = () => {
  const plate = useMemo(() => setMat("#353236", "#242125"), []);
  const post = useMemo(() => setMat("#2E2B2F", "#2E2B2F"), []);
  return (<group>
    <mesh material={floorMat} position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[7, 96]} /></mesh>
    {[[-0.11, 0], [TOP_Y + 0.11, 1]].map(([y, i]) => (
      <group key={i} position={[0, y, 0]}>
        <mesh material={plate}><cylinderGeometry args={[2.3, 2.3, 0.22, 96]} /></mesh>
        {[0.11, -0.11].map((dy) => <mesh key={dy} material={edgeMat} position={[0, dy, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.3, 0.008, 6, 160]} /></mesh>)}
      </group>
    ))}
    {[-2.12, 2.12].map((x) => <mesh key={x} material={post} position={[x, TOP_Y / 2, 0]}><cylinderGeometry args={[0.07, 0.07, TOP_Y, 24]} /></mesh>)}
  </group>);
};

// ------------------------------------------------------------------ песок: нижняя горка и верхняя колба (геометрия на каждом кадре)
const lowerProfile = (f: number) => {
  const h = hc(f);
  const ym = bisect((y) => wallR(y) * SLOPE - (h - y), 0, h);
  const pts = [new THREE.Vector2(0.001, h), new THREE.Vector2((h - ym) / SLOPE * 0.99, ym)];
  for (let y = ym - 0.04; y > 0; y -= 0.05) pts.push(new THREE.Vector2(wallR(y) * 0.985, y));
  pts.push(new THREE.Vector2(wallR(0) * 0.985, 0.001), new THREE.Vector2(0.001, 0.001));
  return { pts, h, ym, rm: (h - ym) / SLOPE };
};
const upperProfile = (f: number) => {
  const L = upL(f);
  const meet = bisect((y) => wallR(y) - (HOLE_R + (y - FUNNEL0) / SLOPE), FUNNEL0 + 0.01, TOP_Y - 0.05);
  const top = Math.min(L, meet);
  const pts = [new THREE.Vector2(HOLE_R, FUNNEL0), new THREE.Vector2(HOLE_R + (top - FUNNEL0) / SLOPE * 0.99, top)];
  if (L < meet) pts.push(new THREE.Vector2(wallR(L) * 0.985, L));
  for (let y = top - 0.04; y > FUNNEL0; y -= 0.05) pts.push(new THREE.Vector2(wallR(y) * 0.985, y));
  pts.push(new THREE.Vector2(wallR(FUNNEL0) * 0.985, FUNNEL0), new THREE.Vector2(HOLE_R, FUNNEL0));
  return { pts, top };
};
const Sand: React.FC<{ f: number }> = ({ f }) => {
  const lo = lowerProfile(f), up = upperProfile(f);
  const gLo = useMemo(() => new THREE.LatheGeometry(lo.pts, 128), [f]);
  const gUp = useMemo(() => new THREE.LatheGeometry(up.pts, 128), [f]);
  sandMat.uniforms.uYTop.value = lo.h; sandMat.uniforms.uHit.value.set(0, lo.h, 0);
  return (<>
    <mesh geometry={gLo} material={sandMat} />
    <mesh geometry={gUp} material={sandMat} />
  </>);
};

// ------------------------------------------------------------------ частицы (детерминированные: позиция = функция кадра)
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const GRAIN = new THREE.SphereGeometry(1, 8, 6);
const useInst = (n: number, mat: THREE.Material) => useMemo(() => { const m = new THREE.InstancedMesh(GRAIN, mat, n); m.frustumCulled = false; return m; }, []);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3();
const setI = (m: THREE.InstancedMesh, i: number, x: number, y: number, z: number, s: number) => { P3.set(x, y, z); S3.set(s, s, s); M4.compose(P3, Q, S3); m.setMatrixAt(i, M4); };

// Струя из горлышка: падает с ускорением до вершины горки (или до головы белого, когда он в струе).
const Stream: React.FC<{ f: number; stopY: number }> = ({ f, stopY }) => {
  const N = 420, m = useInst(N, grainMat);
  const y0 = NECK_Y - 0.12;
  for (let i = 0; i < N; i++) {
    const s = (f / 20 + hash(i)) % 1;
    const y = y0 - (y0 - stopY) * s * s;
    setI(m, i, (hash(i + 7) - 0.5) * 0.06 * (0.4 + s), y, (hash(i + 13) - 0.5) * 0.06, 0.011 + 0.006 * hash(i + 3));
  }
  m.instanceMatrix.needsUpdate = true;
  const len = y0 - stopY;
  return (<>
    <primitive object={m} />
    <mesh material={streamMat} position={[0, stopY + len / 2, 0]}><cylinderGeometry args={[0.016, 0.024, Math.max(0.01, len), 12, 1, true]} /></mesh>
  </>);
};
// Осыпь по склону нижней горки и воронка в верхней колбе.
const Slides: React.FC<{ f: number }> = ({ f }) => {
  const N = 300, NU = 160, m = useInst(N + NU, grainMat);
  const lo = lowerProfile(f), L = upL(f);
  for (let i = 0; i < N; i++) {
    const s = (f * (1 / 28 + hash(i + 50) / 40) + hash(i)) % 1;
    const a = hash(i + 99) * Math.PI * 2, r = s * lo.rm * 0.97;
    setI(m, i, Math.cos(a) * r, lo.h - r * SLOPE + 0.012, Math.sin(a) * r, 0.01 * (1 - 0.5 * s));
  }
  const rTop = HOLE_R + (Math.min(L, 6.2) - FUNNEL0) / SLOPE;
  for (let k = 0; k < NU; k++) {
    const s = (f * (1 / 36 + hash(k + 500) / 50) + hash(k + 400)) % 1;
    const a = hash(k + 450) * Math.PI * 2, r = HOLE_R + (1 - s) * Math.max(0, Math.min(rTop, 1.6) - HOLE_R);
    setI(m, N + k, Math.cos(a) * r, FUNNEL0 + (r - HOLE_R) * SLOPE + 0.012, Math.sin(a) * r, 0.009);
  }
  m.instanceMatrix.needsUpdate = true;
  return <primitive object={m} />;
};
// Выбросы песка: срывы под ногами, песок, бьющий по белому в горлышке.
type Burst = { f0: number; p: [number, number, number]; n: number; v: number; up: number; life: number; seed: number; floor?: boolean };
const Bursts: React.FC<{ f: number; list: Burst[] }> = ({ f, list }) => {
  const MAX = 900, m = useInst(MAX, grainMat);
  let c = 0;
  for (const b of list) {
    const t = f - b.f0;
    if (t < 0 || t > b.life) continue;
    for (let k = 0; k < b.n && c < MAX; k++) {
      const sd = b.seed * 1000 + k, a = hash(sd) * Math.PI * 2, sp = b.v * (0.4 + hash(sd + 1));
      const vx = Math.cos(a) * sp, vz = Math.sin(a) * sp * 0.5, vy = b.up * (0.5 + hash(sd + 2));
      let y = b.p[1] + vy * t - 0.0055 * t * t;
      if (b.floor) y = Math.max(b.p[1] + 0.01, y);
      setI(m, c++, b.p[0] + vx * t, y, b.p[2] + vz * t, 0.012 * (1 - t / b.life * 0.6));
    }
  }
  m.count = c; m.instanceMatrix.needsUpdate = true;
  return <primitive object={m} />;
};

// ------------------------------------------------------------------ белый
const WZ = 0.05, GZ = -0.15;
const surfW = (x: number, f: number) => sandY(x, WZ, f) + LIMB_R;
const facingW = (f: number) => keys(f, [[0, 1], [W.turn1[0], 1], [W.turn1[1], -1], [W.turn2[0], -1], [W.turn2[1], 1]], (t) => t);
const pelvisFrom = (fN: V2, fF: V2, dx: number): V2 => {
  const x = (fN[0] + fF[0]) / 2 + dx;
  let y = Infinity;
  for (const p of [fN, fF]) y = Math.min(y, p[1] + Math.sqrt(Math.max(0, LEG_MAX * LEG_MAX - (x - p[0]) ** 2)) - 0.004);
  return [x, y];
};
const shoulderOf = (pel: V2, lean: number): V2 => [pel[0] + Math.sin(lean) * 0.5, pel[1] + Math.cos(lean) * 0.5];
const arc = (a: V2, b: V2, u: number, lift: number): V2 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + lift * Math.sin(Math.PI * u)];

// шаги подъёма по горке: каждые 14 кадров, ноги по очереди, каждая на +0.2 м; два срыва назад по 0.15 м
type Step = { foot: "N" | "F"; t0: number; t1: number; x0: number; x1: number };
const CLIMB: Step[] = (() => {
  const out: Step[] = []; const pos = { N: -0.6, F: -0.48 };
  let k = 0;
  for (let t = W.climb[0]; t + 10 <= W.climb[1]; t += W.stepEvery, k++) {
    const foot = k % 2 ? "F" : "N";
    const x1 = Math.max(pos.N, pos.F) + 0.05;
    out.push({ foot, t0: t, t1: t + 10, x0: pos[foot], x1 }); pos[foot] = x1;
  }
  return out;
})();
const slipOff = (f: number) => W.slips.reduce((s, a) => s + 0.12 * seg(f, a, a + 10, outCubic), 0);
const climbFootX = (foot: "N" | "F", f: number): { x: number; lift: number } => {
  let x = foot === "N" ? -0.6 : -0.48, lift = 0;
  for (const s of CLIMB) {
    if (s.foot !== foot) continue;
    if (f >= s.t1) { x = s.x1; continue; }
    if (f > s.t0) { const u = inOut((f - s.t0) / (s.t1 - s.t0)); x = lerp(s.x0, s.x1, u); lift = 0.1 * Math.sin(Math.PI * u); }
    break;
  }
  return { x: x - slipOff(f), lift };
};
// ноги у серого в начале (до подъёма)
const standFeet = (f: number) => {
  const nX = keys(f, [[0, -0.36], [W.step1[0], -0.36], [W.step1[1], -0.4], [W.back[0], -0.4], [W.back[1], -0.6]]);
  const fX = keys(f, [[0, -0.27], [W.back[0], -0.27], [W.back[1], -0.48]]);
  const sw = seg(f, W.step1[0], W.step1[1]);
  return { N: [nX, surfW(nX, f) + 0.08 * Math.sin(Math.PI * sw)] as V2, F: [fX, surfW(fX, f)] as V2 };
};
const greyShoulder = (f: number): V2 => { const g = greyPose(f); const sh = shoulderOf(g.pelvis, g.lean); return [2 * g.pelvis[0] - sh[0], sh[1]]; };

const whiteGround = (f: number): Pose => {
  // фазы на песке внизу: стоит → разворот → тянет серого → разворот → лезет → приседает
  const s = facingW(f);
  let fN: V2, fF: V2;
  if (f < W.climb[0]) { const q = standFeet(f); fN = q.N; fF = q.F; }
  else {
    const n = climbFootX("N", f), fr = climbFootX("F", f);
    fN = [n.x, surfW(n.x, f) + n.lift]; fF = [fr.x, surfW(fr.x, f) + fr.lift];
  }
  let lean = keys(f, [[0, 0], [W.reach[0], 0], [W.reach[1], 0.3], [W.pull[0], 0.3], [W.pull[0] + 5, 0.34], [W.pull[1], 0.0], [W.back[1], 0.02],
    [W.climb[0], 0.02], [W.climb[0] + 8, 0.22], [W.crouch[0], 0.22], [W.crouch[1], 0.42]]);
  for (const a of W.slips) lean += 0.3 * Math.sin(Math.PI * seg(f, a, a + 16, (t) => t));
  const dx = s * 0.03;
  let pel: V2 = [0, 0];
  for (let k = -2; k <= 2; k++) {   // сглаживание таза
    const g = f + k; let a: V2, b: V2;
    if (g < W.climb[0]) { const q = standFeet(g); a = q.N; b = q.F; }
    else { const n = climbFootX("N", g), fr = climbFootX("F", g); a = [n.x, surfW(n.x, g) + n.lift]; b = [fr.x, surfW(fr.x, g) + fr.lift]; }
    const p = pelvisFrom(a, b, dx); pel = [pel[0] + p[0] / 5, pel[1] + p[1] / 5];
  }
  pel[1] -= 0.3 * seg(f, W.crouch[0], W.crouch[1]);
  for (const a of W.slips) pel[1] -= 0.12 * Math.sin(Math.PI * seg(f, a, a + 16, (t) => t));
  const sh = shoulderOf(pel, lean * s);
  const rest = (side: number): V2 => [sh[0] + s * 0.03 + side * 0.0, sh[1] - 0.55];
  let hN = rest(0), hF = rest(0);
  // рука на плечо серому: тянет, отпускает
  // протянутая рука к серому: прямая, ладонью к нему; два «давай» — рука покачивается вверх-вниз
  const gs = greyShoulder(f);
  const reachU = seg(f, W.reach[0], W.reach[1]) * (1 - seg(f, W.release[0], W.release[1]));
  const toG: V2 = [gs[0] - sh[0], gs[1] + 0.3 - sh[1]], tl = Math.hypot(toG[0], toG[1]);
  const beckon = f > W.pull[0] && f < W.pull[1] ? 0.07 * Math.sin(Math.PI * 4 * seg(f, W.pull[0], W.pull[1], (t) => t)) : 0;
  const offer: V2 = [sh[0] + (toG[0] / tl) * 0.56, sh[1] + (toG[1] / tl) * 0.56 + beckon];
  hN = [lerp(hN[0], offer[0], reachU), lerp(hN[1], offer[1], reachU)];
  // подъём: руки маятником, при срыве — ладони в склон
  if (f >= W.climb[0]) {
    const ph = Math.sin(((f - W.climb[0]) / (2 * W.stepEvery)) * Math.PI * 2);
    hN = [sh[0] + 0.06 + 0.12 * ph, sh[1] - 0.5]; hF = [sh[0] + 0.06 - 0.12 * ph, sh[1] - 0.5];
    for (const a of W.slips) {
      const u = Math.sin(Math.PI * seg(f, a, a + 16, (t) => t));
      const px = pel[0] + 0.5, tgt: V2 = [px, surfW(px, f) + 0.02];
      hN = [lerp(hN[0], tgt[0], u), lerp(hN[1], tgt[1], u)]; hF = [lerp(hF[0], tgt[0] - 0.08, u), lerp(hF[1], tgt[1] + 0.03, u)];
    }
    const cr = seg(f, W.crouch[0], W.crouch[1]);   // замах руками назад перед прыжком
    hN = [lerp(hN[0], sh[0] - 0.35, cr), lerp(hN[1], sh[1] - 0.32, cr)]; hF = [lerp(hF[0], sh[0] - 0.3, cr), lerp(hF[1], sh[1] - 0.36, cr)];
  }
  const look = f < W.turn1[0] ? 1 : 1 - seg(f, W.turn1[0], W.turn1[1]);
  return { pelvis: pel, lean, footN: fN, footF: fF, handN: hN, handF: hF, headOff: [0, 0.035 * look] };
};

// прыжок → вис на горлышке → подтягивание → выход в верхнюю колбу → стоит
const RIM_N: V2 = [-0.22, NECK_Y - 0.06], RIM_F: V2 = [-0.29, NECK_Y - 0.04];
const whiteAir = (f: number): Pose => {
  const P0 = whiteGround(W.jump[0]);
  const swing = f < W.pullup[0] ? 0.05 * Math.sin((f - W.grab) / 5) * Math.exp(-(f - W.grab) / 14) : 0;
  const pel = keys2(f, [
    [W.jump[0], P0.pelvis[0], P0.pelvis[1]], [W.grab, -0.2, 2.8], [W.pullup[0], -0.2, 2.8], [W.pullup[1], -0.16, 3.32],
    [280, 0.0, 4.05], [286, 0.3, 4.62], [W.stand, 1.0, upperY(1.0, WZ, W.stand) + 0.8],
  ], inOut);
  pel[0] += swing;
  if (f >= W.stand) pel[1] = upperY(1.0, WZ, f) + 0.8;
  const lean = keys(f, [[W.jump[0], P0.lean], [W.grab, 0.05], [W.pullup[1], 0.12], [280, 0.6], [286, 0.35], [W.stand, 0.05],
    [W.lookDown[0], 0.05], [W.lookDown[1], 0.16]]);
  // руки: вверх к краю горлышка → держат → переставляются на песок верхней колбы
  const sh = shoulderOf(pel, lean);
  const ju = seg(f, W.jump[0], W.grab, outCubic);
  let hN: V2 = [lerp(P0.handN[0], RIM_N[0], ju), lerp(P0.handN[1], RIM_N[1], ju)];
  let hF: V2 = [lerp(P0.handF[0], RIM_F[0], ju), lerp(P0.handF[1], RIM_F[1], ju)];
  const m1 = seg(f, W.mantle[0], W.mantle[0] + 7), m2 = seg(f, W.mantle[0] + 6, W.mantle[0] + 13);
  const upN: V2 = [0.62, upperY(0.62, WZ, f) + 0.03], upF: V2 = [0.78, upperY(0.78, WZ, f) + 0.04];
  hN = arc(hN, upN, m1, 0.12); hF = arc(hF, upF, m2, 0.12);
  const st = seg(f, 286, W.stand);
  hN = [lerp(hN[0], sh[0] + 0.03, st), lerp(hN[1], sh[1] - 0.55, st)]; hF = [lerp(hF[0], sh[0] + 0.03, st), lerp(hF[1], sh[1] - 0.55, st)];
  // ноги: поджаты в прыжке, висят и болтаются, затем встают на песок вверху
  const kick = f > W.pullup[0] && f < 280 ? Math.sin((f - W.pullup[0]) / 2.6) : 0;
  let fN: V2 = [pel[0] + 0.05 + 0.12 * kick, pel[1] - 0.74 + 0.08 * Math.max(0, kick)];
  let fF: V2 = [pel[0] - 0.02 - 0.12 * kick, pel[1] - 0.74 + 0.08 * Math.max(0, -kick)];
  const tuck = Math.sin(Math.PI * seg(f, W.jump[0], W.grab + 6));
  fN = [fN[0] + 0.12 * tuck, fN[1] + 0.3 * tuck]; fF = [fF[0] + 0.08 * tuck, fF[1] + 0.26 * tuck];
  const j0 = seg(f, W.jump[0], W.jump[0] + 3);   // отрыв: ноги стартуют с места
  fN = [lerp(P0.footN[0], fN[0], j0), lerp(P0.footN[1], fN[1], j0)]; fF = [lerp(P0.footF[0], fF[0], j0), lerp(P0.footF[1], fF[1], j0)];
  // в зоне горлышка ступни не выходят за его радиус
  const inNeck = (v: V2): V2 => (v[1] < FUNNEL0 + 0.05 && v[1] > NECK_Y - 0.25 ? [Math.max(-0.24, Math.min(0.24, v[0])), v[1]] : v);
  fN = inNeck(fN); fF = inNeck(fF);
  const sN: V2 = [1.06, upperY(1.06, WZ, f) + LIMB_R], sF: V2 = [0.94, upperY(0.94, WZ, f) + LIMB_R];
  fN = arc(fN, sN, seg(f, 282, 289), 0.12); fF = arc(fF, sF, seg(f, 286, W.stand), 0.1);
  const ld = seg(f, W.lookDown[0], W.lookDown[1]);
  const back = seg(f, W.jump[0], W.grab) * (1 - seg(f, 276, 286));
  return { pelvis: pel, lean, footN: fN, footF: fF, handN: hN, handF: hF, headOff: [0.01 * ld - 0.1 * back, -0.045 * ld - 0.03 * back] };
};
const whitePose = (f: number) => (f < W.jump[0] ? whiteGround(f) : whiteAir(f));

// ------------------------------------------------------------------ серый: сидит и листает, его засыпает
const G_PEL: V2 = [-0.75, 0.42];
// поза серого задаётся «смотрит вправо» относительно таза, затем зеркалится: он сидит лицом к стеклу, спиной к белому
const mirrorX = (p: Pose): Pose => {
  const m = (v: V2): V2 => [2 * p.pelvis[0] - v[0], v[1]];
  return { ...p, footN: m(p.footN), footF: m(p.footF), handN: m(p.handN), handF: m(p.handF), headOff: p.headOff ? [-p.headOff[0], p.headOff[1]] : undefined };
};
function greyPose(f: number): Pose {
  // белый тянет назад (выпрямляет), серый дёргается вперёд, вырываясь, и снова сутулится над телефоном
  const lean = keys(f, [[0, 0.18], [G.pulled[0], 0.18], [G.pulled[1] - 4, 0.24], [G.jerk[1], 0.5], [G.jerk[1] + 16, 0.2], [T.total, 0.12]]);
  const sh = shoulderOf(G_PEL, lean);
  const raise = 0.32 * seg(f, G.raisePhone[0], G.raisePhone[1]);
  const tap = (f % G.taps) < 2 ? 0.008 : 0;
  const jerk = Math.sin(Math.PI * seg(f, G.jerk[0], G.jerk[1]));
  const hN: V2 = [sh[0] + 0.26 - 0.08 * jerk, sh[1] - 0.06 + raise - tap];
  const hF: V2 = [sh[0] + 0.21 - 0.06 * jerk, sh[1] - 0.1 + raise];
  return {
    pelvis: G_PEL, lean, footN: [G_PEL[0] + 0.34, G_PEL[1] - 0.05], footF: [G_PEL[0] + 0.28, G_PEL[1] - 0.02],
    handN: hN, handF: hF, headOff: [0.03 + 0.07 * jerk, -0.035 + 0.02 * seg(f, G.raisePhone[0], G.raisePhone[1])],
  };
}
const phoneBody = flat("#2A272B");
const screenMat = new THREE.MeshBasicMaterial({ color: lin("#CFE0FF").multiplyScalar(3), toneMapped: false });
const haloMat = new THREE.ShaderMaterial({
  uniforms: { uC: { value: lin("#CFE0FF") }, uK: { value: 0.55 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uC; uniform float uK; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(uC * uK * exp(-r * r * 6.0) * (1.0 - smoothstep(0.85, 1.0, r)), 1.0); }`,
  blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
});
const Phone: React.FC<{ hand: V2; f: number }> = ({ hand, f }) => {
  screenMat.color.set("#CFE0FF").multiplyScalar(4 + 1.2 * hash(Math.floor(f / G.taps)));   // смена картинки при каждом свайпе
  return (<group position={[hand[0] - 0.03, hand[1] + 0.05, 0.2]} rotation={[0, 0, -0.35]}>
    <mesh material={haloMat} position={[0, 0, 0.03]} renderOrder={9}><planeGeometry args={[0.8, 0.8]} /></mesh>
    <mesh material={phoneBody}><boxGeometry args={[0.09, 0.17, 0.014]} /></mesh>
    <mesh material={screenMat} position={[0.01, 0, 0.009]}><planeGeometry args={[0.075, 0.145]} /></mesh>
  </group>);
};

// ------------------------------------------------------------------ камера
const ELEV = THREE.MathUtils.degToRad(6);
const REVEAL = Easing.bezier(0.3, 0, 0.15, 1);
const camState = (f: number) => {
  let tx: number, ty: number, d: number;
  if (f < C.tiltStart) { const u = seg(f, 0, C.tiltStart); tx = -0.75; ty = 1.6; d = lerp(11.0, 10.6, u); }
  else if (f < C.revealStart) {
    const u = inOut(seg(f, C.tiltStart, C.revealStart, (t) => t));
    const b = (a: number, c: number, e: number) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * c + u * u * e;
    tx = b(-0.75, -0.4, 0.35); ty = b(1.6, 3.6, 4.95); d = lerp(10.6, 10.8, u);
  } else {
    const u = REVEAL(clamp01((f - C.revealStart) / (C.revealEnd - C.revealStart)));
    tx = lerp(0.35, -0.1, u); ty = lerp(4.95, 4.1, u); d = lerp(10.8, 17.3, u) + 0.3 * seg(f, C.revealEnd, T.total);
  }
  return { pos: new THREE.Vector3(tx, ty + Math.sin(ELEV) * d, Math.cos(ELEV) * d), look: new THREE.Vector3(tx, ty, 0) };
};
const CamRig: React.FC<{ f: number }> = ({ f }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera, s = camState(f);
  c.position.copy(s.pos); c.lookAt(s.look); c.fov = 28; c.near = 0.5; c.far = 200; c.updateProjectionMatrix();
  return null;
};

// ------------------------------------------------------------------ сцена
const BURSTS: Burst[] = [
  ...W.slips.map((a, i) => ({ f0: a, p: [climbFootX("N", a).x + 0.05, surfW(climbFootX("N", a).x, a), WZ] as [number, number, number], n: 70, v: 0.03, up: 0.035, life: 20, seed: 10 + i, floor: true })),
  { f0: W.jump[0], p: [-0.4, hc(W.jump[0]) - 0.27, WZ], n: 60, v: 0.035, up: 0.05, life: 22, seed: 30, floor: true },
  ...Array.from({ length: 9 }, (_, i) => ({ f0: W.pullup[1] + 2 + i * 2, p: [0.0, NECK_Y - 0.25, WZ] as [number, number, number], n: 18, v: 0.015, up: 0.01, life: 16, seed: 40 + i })),
  { f0: 289, p: [1.0, upperY(1.0, WZ, 289), WZ], n: 30, v: 0.012, up: 0.02, life: 12, seed: 60, floor: true },
];
// где кончается струя: на вершине горки, а пока белый в горлышке — на его голове/плечах
const streamStop = (f: number, wj: { head: V2 }) => {
  const base = hc(f);
  if (f >= W.pullup[1] - 6 && f < 290) return Math.max(base, Math.min(NECK_Y - 0.2, wj.head[1] + 0.15));
  return base;
};

export const HGScene: React.FC = () => {
  const f = useCurrentFrame();
  const wj = solveFacing(whitePose(f), f < W.jump[0] ? facingW(f) : 1);
  const gp = greyPose(f);
  const gj = solveFacing(mirrorX(gp), -1);
  return (<>
    <color attach="background" args={["#010002"]} />
    <CamRig f={f} />
    <Frame />
    <Sand f={f} />
    <Stream f={f} stopY={streamStop(f, wj)} />
    <Slides f={f} />
    <Bursts f={f} list={BURSTS} />
    <Stickman j={gj} z={GZ} near="#B2B0B4" far="#8F8D91">
      <Phone hand={gj.handN} f={f} />
    </Stickman>
    <Stickman j={wj} z={WZ} near="#FDFDFD" far="#D7D4D8" />
    <mesh geometry={glassGeo} material={glassMat} renderOrder={10} />
    <EffectComposer multisampling={8}>
      <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.3} intensity={0.13} mipmapBlur radius={0.5} />
    </EffectComposer>
  </>);
};
