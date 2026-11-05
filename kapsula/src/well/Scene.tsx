// 3D-сцена «Ведро и труба»: бак с водой слева, две бочки справа. Первый носит вёдра, второй копает траншею,
// затягивает в неё трубу, открывает кран — вода сама идёт в его бочку. Единственный акцент — голубая вода.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useCurrentFrame } from "remotion";
import { Stickman, solveFacing, flat } from "../Stickman";
import {
  V2, TANK, PIPE_Z, PIPE_R, PIPE_X0, PIPE_X1, BARREL_A, BARREL_B, Z1, Z2, TURN, A, B, FLOW_HIT, FLOW_RISER, HA_FRAMES,
  poseA, poseB, bucketFullA, trenchLeft, valveA, flowX, levelA, levelB, whiteB, tiredA, camState, sectionState, SECTIONS,
  RISER, LEVER as LEV, SH_REST_LOW, SH_REST_HIGH, BUCKET_B_GROUND, BUCKET_B_Z, TOSS_LAND,
  seg, lerp, hash, SHOVEL_LOW, DIG_HIT, K, mapA, mapB, MAP_A, MAP_B, realTimes,
} from "./plan";

const lin = (hex: string) => new THREE.Color(hex);
const WATER = "#3FA8FF";
const waterMat = (k: number) => new THREE.MeshBasicMaterial({ color: lin(WATER).multiplyScalar(k), toneMapped: false });
const WATER_STREAM = waterMat(1.05), WATER_DROP = waterMat(1.0);

// грани: верх светлее, бока с градиентом в чёрное книзу (как фасады серии)
const faceMat = (top: string, side: string, yTop: number, fade = 1.0) => new THREE.ShaderMaterial({
  uniforms: { uTop: { value: lin(top) }, uSide: { value: lin(side) }, uY: { value: yTop }, uF: { value: fade } },
  vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uTop; uniform vec3 uSide; uniform float uY; uniform float uF; varying vec3 vW; varying vec3 vN;
    void main(){ vec3 c; if (vN.y > 0.6) c = uTop; else if (vN.y < -0.6) c = vec3(0.0);
      else { float g = exp(-1.6*clamp((uY - vW.y)/uF, 0.0, 3.0)); c = uSide*(0.35 + 0.65*g) * (0.75 + 0.25*max(vN.z, 0.0)); }
      gl_FragColor = vec4(c, 1.0); }`,
});
const EDGE = flat("#8C898D"), EDGE_DIM = flat("#5C595D");
// глянцевый пол: почти чёрный, пишет stencil = 1 — по нему рисуются отражения персонажей (mirrorMat)
const floorMat = new THREE.ShaderMaterial({
  uniforms: { uC: { value: lin("#151216") } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uC; varying vec3 vW; void main(){ float r = length(vec2(vW.x*0.55, vW.z)); gl_FragColor = vec4(uC * (1.0 - smoothstep(1.2, 3.6, r)), 1.0); }`,
});
floorMat.stencilWrite = true; floorMat.stencilRef = 1; floorMat.stencilFunc = THREE.AlwaysStencilFunc; floorMat.stencilZPass = THREE.ReplaceStencilOp;
// отражение свечения воды в полу (аддитивное пятно, лежит на полу)
const floorGlowMat = new THREE.ShaderMaterial({
  uniforms: { uC: { value: lin(WATER) }, uK: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uC; uniform float uK; varying vec2 vUv; void main(){ vec2 d = (vUv - 0.5) * 2.0; float r = length(d);
    gl_FragColor = vec4(uC * uK * exp(-r * r * 4.0) * (1.0 - smoothstep(0.8, 1.0, r)), 1.0); }`,
  blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
});
// ореол-спрайт (класс B)
const haloMat = (hex: string) => new THREE.ShaderMaterial({
  uniforms: { uC: { value: lin(hex) }, uK: { value: 0.5 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uC; uniform float uK; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0;
    gl_FragColor = vec4(uC * uK * exp(-r * r * 5.0) * (1.0 - smoothstep(0.8, 1.0, r)), 1.0); }`,
  blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
});
const Halo: React.FC<{ p: [number, number, number]; size: number; k: number; mat: THREE.ShaderMaterial }> = ({ p, size, k, mat }) => {
  mat.uniforms.uK.value = k;
  return k > 0.001 ? <mesh material={mat} position={p} renderOrder={8}><planeGeometry args={[size, size]} /></mesh> : null;
};
const HALO_B = haloMat(WATER), HALO_TANK = haloMat(WATER), HALO_PIPE = haloMat(WATER), HALO_PUDDLE = haloMat(WATER);

// ------------------------------------------------------------------ бак
const tankSide = faceMat("#3A373B", "#2E2B2F", TANK.h, 1.1);
const Tank: React.FC<{ f: number }> = ({ f }) => {
  const w = TANK.x1 - TANK.x0, d = TANK.z1 - TANK.z0, cx = (TANK.x0 + TANK.x1) / 2, cz = (TANK.z0 + TANK.z1) / 2, t = 0.09;
  const ripple = (a: number) => Math.exp(-Math.max(0, f - a) / 10) * (f >= a ? 1 : 0);
  const rp = Math.max(ripple(A.dip1[0] + 7), ripple(A.dip2[0] + 7));
  const surf = useMemo(() => waterMat(0.6), []);
  surf.color.set(WATER).multiplyScalar(0.6 + 0.35 * rp);
  return (<group>
    {/* четыре стенки */}
    <mesh material={tankSide} position={[cx, TANK.h / 2, TANK.z1 - t / 2]}><boxGeometry args={[w, TANK.h, t]} /></mesh>
    <mesh material={tankSide} position={[cx, TANK.h / 2, TANK.z0 + t / 2]}><boxGeometry args={[w, TANK.h, t]} /></mesh>
    <mesh material={tankSide} position={[TANK.x0 + t / 2, TANK.h / 2, cz]}><boxGeometry args={[t, TANK.h, d]} /></mesh>
    <mesh material={tankSide} position={[TANK.x1 - t / 2, TANK.h / 2, cz]}><boxGeometry args={[t, TANK.h, d]} /></mesh>
    {/* вода */}
    <mesh material={surf} position={[cx, TANK.water, cz]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w - 2 * t, d - 2 * t]} /></mesh>
    {/* светлые кромки */}
    {[[cx, TANK.h, TANK.z1, w, 0], [cx, TANK.h, TANK.z0, w, 0], [TANK.x0, TANK.h, cz, d, 1], [TANK.x1, TANK.h, cz, d, 1]].map(([x, y, z, l, r], i) =>
      <mesh key={i} material={EDGE} position={[x, y, z]} rotation={[0, r ? Math.PI / 2 : 0, 0]}><boxGeometry args={[l, 0.012, 0.012]} /></mesh>)}
    <mesh material={EDGE_DIM} position={[TANK.x1, TANK.h / 2, TANK.z1]}><boxGeometry args={[0.01, TANK.h, 0.01]} /></mesh>
    <mesh material={EDGE_DIM} position={[TANK.x0, TANK.h / 2, TANK.z1]}><boxGeometry args={[0.01, TANK.h, 0.01]} /></mesh>
  </group>);
};

// ------------------------------------------------------------------ бочки (тело вращения) с уровнем воды
const barrelGeo = (() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) { const y = (i / 24) * BARREL_B.h; pts.push(new THREE.Vector2(BARREL_B.r * (0.88 + 0.12 * Math.sin(Math.PI * y / BARREL_B.h)), y)); }
  return new THREE.LatheGeometry(pts, 64);
})();
const barrelMat = faceMat("#2E2B2F", "#353236", BARREL_B.h, 0.9);
const Barrel: React.FC<{ x: number; z: number; level: number; glow: number; overflow: number; f: number; seed: number }> = ({ x, z, level, glow, overflow, f, seed }) => {
  const surf = useMemo(() => waterMat(0.4), []);
  surf.color.set(WATER).multiplyScalar(0.3 + 0.75 * glow);
  const rl = BARREL_B.r * (0.88 + 0.12 * Math.sin(Math.PI * level / BARREL_B.h)) * 0.97;
  return (<group position={[x, 0, z]}>
    <mesh geometry={barrelGeo} material={barrelMat} />
    <mesh material={surf} position={[0, level, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[rl, 48]} /></mesh>
    {[0.12, 0.83].map((y) => <mesh key={y} material={EDGE_DIM} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[BARREL_B.r * (0.88 + 0.12 * Math.sin(Math.PI * y / BARREL_B.h)) + 0.004, 0.009, 6, 64]} /></mesh>)}
    <mesh material={EDGE} position={[0, BARREL_B.h, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[BARREL_B.r * 0.88 + 0.002, 0.011, 6, 64]} /></mesh>
    {overflow > 0 ? <Drips f={f} r={BARREL_B.r * 0.9} k={overflow} seed={seed} /> : null}
  </group>);
};

// ------------------------------------------------------------------ частицы (детерминированные)
const GRAIN = new THREE.SphereGeometry(1, 8, 6);
const useInst = (n: number, mat: THREE.Material) => useMemo(() => { const m = new THREE.InstancedMesh(GRAIN, mat, n); m.frustumCulled = false; return m; }, []);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), P3 = new THREE.Vector3(), S3 = new THREE.Vector3();
const setI = (m: THREE.InstancedMesh, i: number, x: number, y: number, z: number, s: number) => { P3.set(x, y, z); S3.set(s, s, s); M4.compose(P3, Q, S3); m.setMatrixAt(i, M4); };

// перелив через край бочки: капли бегут по боку
const Drips: React.FC<{ f: number; r: number; k: number; seed: number }> = ({ f, r, k, seed }) => {
  const N = 60, m = useInst(N, WATER_DROP);
  let c = 0;
  for (let i = 0; i < N * k; i++) {
    const s = (f / 26 + hash(i + seed)) % 1, a = (hash(i * 3 + seed) - 0.5) * 2.6;   // фронтальная полуокружность
    const y = BARREL_B.h - s * s * BARREL_B.h, rr = r * (0.9 + 0.12 * Math.sin(Math.PI * y / BARREL_B.h)) + 0.01;
    setI(m, c++, Math.sin(a) * rr, y, Math.cos(a) * rr, 0.012);
  }
  m.count = c; m.instanceMatrix.needsUpdate = true;
  return <primitive object={m} />;
};
// струя: столбик + капли от p0 вниз до y1
const Stream: React.FC<{ p0: [number, number, number]; y1: number; f: number; k: number }> = ({ p0, y1, f, k }) => {
  const N = 70, m = useInst(N, WATER_DROP);
  const len = Math.max(0.01, p0[1] - y1);
  for (let i = 0; i < N; i++) {
    const s = (f / 9 + hash(i)) % 1;
    setI(m, i, p0[0] + (hash(i + 7) - 0.5) * 0.04 + 0.04 * s, p0[1] - len * s * s, p0[2] + (hash(i + 13) - 0.5) * 0.03, k > 0 ? 0.01 + 0.006 * hash(i + 3) : 0);
  }
  m.instanceMatrix.needsUpdate = true;
  return k > 0 ? (<>
    <primitive object={m} />
    <mesh material={WATER_STREAM} position={[p0[0] + 0.02, y1 + len / 2, p0[2]]} scale={[k, 1, k]}><cylinderGeometry args={[0.018, 0.026, len, 10, 1, true]} /></mesh>
  </>) : null;
};
type Burst = { f0: number; p: [number, number, number]; n: number; v: number; up: number; life: number; seed: number; floor?: number; dir?: number; water?: boolean };
const DIRT = new THREE.MeshBasicMaterial({ color: lin("#4A4447") });
const Bursts: React.FC<{ f: number; list: Burst[]; mat: THREE.Material }> = ({ f, list, mat }) => {
  const MAX = 700, m = useInst(MAX, mat);
  let c = 0;
  for (const b of list) {
    const t = f - b.f0;
    if (t < 0 || t > b.life) continue;
    for (let k = 0; k < b.n && c < MAX; k++) {
      const sd = b.seed * 1000 + k, a = hash(sd) * Math.PI * 2, sp = b.v * (0.4 + hash(sd + 1));
      const vx = Math.cos(a) * sp + (b.dir ?? 0) * b.v, vz = Math.sin(a) * sp * 0.5, vy = b.up * (0.5 + hash(sd + 2));
      let y = b.p[1] + vy * t - 0.0065 * t * t;
      if (b.floor !== undefined) y = Math.max(b.floor + 0.01, y);
      setI(m, c++, b.p[0] + vx * t, y, b.p[2] + vz * t, 0.014 * (1 - (t / b.life) * 0.6));
    }
  }
  m.count = c; m.instanceMatrix.needsUpdate = true;
  return <primitive object={m} />;
};

// ------------------------------------------------------------------ траншея, труба, кран
const trenchMat = flat("#08060A");
const Trench: React.FC<{ f: number }> = ({ f }) => {
  const x0 = trenchLeft(f), len = PIPE_X1 - x0;
  if (len < 0.02) return null;
  const cx = (x0 + PIPE_X1) / 2;
  return (<group>
    <mesh material={trenchMat} position={[cx, 0.002, PIPE_Z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[len, 0.24]} /></mesh>
    {[-0.12, 0.12].map((dz) => <mesh key={dz} material={EDGE_DIM} position={[cx, 0.004, PIPE_Z + dz]}><boxGeometry args={[len, 0.008, 0.012]} /></mesh>)}
  </group>);
};
const LEVER = flat("#B9B6BA");
const stubMat = faceMat("#5A575B", "#4A474B", 0.2, 0.3);
const pipeMat = new THREE.ShaderMaterial({
  uniforms: { uSide: { value: lin("#4A474B") }, uW: { value: lin(WATER) }, uFlow: { value: -99 }, uF: { value: 0 } },
  vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uSide; uniform vec3 uW; uniform float uFlow; uniform float uF; varying vec3 vW; varying vec3 vN;
    void main(){ float up = clamp(vN.y*0.5+0.5, 0.0, 1.0); vec3 c = uSide*(0.45 + 0.75*up);
      float on = 1.0 - smoothstep(uFlow - 0.12, uFlow, vW.x);
      float band = 0.75 + 0.25*sin(vW.x*9.0 - uF*0.55);
      c = mix(c, uW*(0.85 + 0.6*up)*band, on*0.9);
      gl_FragColor = vec4(c, 1.0); }`,
});
const riserWet = waterMat(0.95), riserDry = faceMat("#5A575B", "#4A474B", 1.1, 1.2);
const Section: React.FC<{ k: number; f: number; hands: V2 }> = ({ k, f, hands }) => {
  const st = sectionState(k, f, hands), L = SECTIONS[k], len = L[1] - L[0] - 0.02;
  return (<group position={[st.c[0], st.c[1], st.z]}>
    <mesh material={pipeMat} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[PIPE_R, PIPE_R, len, 20]} /></mesh>
    {[-len / 2, len / 2].map((dx) => <mesh key={dx} material={EDGE} position={[dx, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[PIPE_R + 0.012, PIPE_R + 0.012, 0.035, 20]} /></mesh>)}
  </group>);
};
// колено у бочки B: стояк вверх по боку и излив над краем; кран-рычаг на стояке; патрубок из бака
const Fixtures: React.FC<{ f: number }> = ({ f }) => {
  pipeMat.uniforms.uFlow.value = f >= TURN ? flowX(f) : -99;
  const wet = f >= FLOW_RISER;
  const a = valveA(f);
  const rz = PIPE_Z, r = PIPE_R * 0.9;
  return (<group>
    <mesh material={stubMat} position={[TANK.x1 + 0.05, 0.035, rz]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[PIPE_R + 0.01, PIPE_R + 0.01, 0.12, 20]} /></mesh>
    <mesh material={EDGE} position={[TANK.x1 + 0.1, 0.035, rz]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[PIPE_R + 0.02, PIPE_R + 0.02, 0.03, 20]} /></mesh>
    <mesh material={wet ? riserWet : riserDry} position={[RISER.x, RISER.top / 2, rz]}><cylinderGeometry args={[r, r, RISER.top, 18]} /></mesh>
    <mesh material={wet ? riserWet : riserDry} position={[(RISER.x + RISER.spoutX) / 2, RISER.top, rz]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r, r, RISER.spoutX - RISER.x + r, 18]} /></mesh>
    <mesh material={EDGE} position={[RISER.x, 0.035, rz]}><sphereGeometry args={[PIPE_R + 0.01, 16, 10]} /></mesh>
    <mesh material={EDGE} position={[RISER.spoutX, RISER.top - 0.03, rz]}><cylinderGeometry args={[r + 0.012, r + 0.012, 0.05, 18]} /></mesh>
    <group position={[LEV.x, LEV.y, rz + 0.1]} rotation={[0, 0, a]}>
      <mesh material={LEVER} position={[LEV.len / 2, 0, 0]}><boxGeometry args={[LEV.len, 0.04, 0.04]} /></mesh>
      <mesh material={LEVER} position={[LEV.len, 0, 0]}><sphereGeometry args={[0.035, 12, 8]} /></mesh>
    </group>
    <mesh material={EDGE} position={[LEV.x, LEV.y, rz + 0.06]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 0.06, 16]} /></mesh>
  </group>);
};
// ------------------------------------------------------------------ ведро и лопата
const bucketGeo = (() => { const pts = [new THREE.Vector2(0.001, -0.12), new THREE.Vector2(0.105, -0.12), new THREE.Vector2(0.135, 0.12), new THREE.Vector2(0.125, 0.12), new THREE.Vector2(0.095, -0.105), new THREE.Vector2(0.001, -0.105)]; return new THREE.LatheGeometry(pts, 32); })();
const bucketMat = faceMat("#3E3B3F", "#4A474B", 0.0, 9.0);
const Bucket: React.FC<{ hand: V2; tilt: number; s: number; z: number; full: boolean; fall?: number; ground?: V2; fly?: number; from?: V2 }> = ({ hand, tilt, s, z, full, fall = 0, ground, fly = 0, from }) => {
  const sg = s < 0 ? -1 : 1;
  const surf = useMemo(() => waterMat(0.55), []);
  let px = hand[0], py = hand[1], rot = -sg * tilt * 1.9;
  if (ground) { px = ground[0]; py = ground[1] + 0.33; rot = 0.0; }
  if (ground && from && fly < 1) { px = lerp(from[0], ground[0], fly); py = lerp(from[1], 0.33, fly) + 0.35 * Math.sin(Math.PI * fly); rot = 4.5 * fly; }
  if (fall > 0) { py = lerp(hand[1], 0.14, fall); rot = -sg * lerp(0, 1.45, fall); px = hand[0] + sg * 0.12 * fall; }
  return (<group position={[px, py, z]} rotation={[0, 0, rot]}>
    <group position={[0, -0.21, 0]}>
      <mesh geometry={bucketGeo} material={bucketMat} />
      <mesh material={EDGE} position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.13, 0.008, 6, 32]} /></mesh>
      {full && tilt < 0.3 && fall === 0 ? <mesh material={surf} position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.12, 24]} /></mesh> : null}
    </group>
    {/* дужка */}
    <mesh material={EDGE_DIM} position={[0, -0.12, 0]}><torusGeometry args={[0.13, 0.006, 5, 24, Math.PI]} /></mesh>
  </group>);
};
const shaftMat = flat("#4A4447"), bladeMat = faceMat("#6A676B", "#58555A", 0.3, 0.4);
const Shovel: React.FC<{ low: V2; high: V2; z: number }> = ({ low, high, z }) => {
  const dx = low[0] - high[0], dy = low[1] - high[1], l = Math.max(1e-4, Math.hypot(dx, dy)), v: V2 = [dx / l, dy / l];
  const top: V2 = [high[0] - v[0] * 0.18, high[1] - v[1] * 0.18];
  let tip: V2 = [low[0] + v[0] * SHOVEL_LOW, low[1] + v[1] * SHOVEL_LOW];
  const len = Math.hypot(tip[0] - top[0], tip[1] - top[1]);
  const ang = Math.atan2(v[1], v[0]) - Math.PI / 2;
  const mid: V2 = [(top[0] + tip[0]) / 2, (top[1] + tip[1]) / 2];
  const bladeC: V2 = [tip[0] - v[0] * 0.13, tip[1] - v[1] * 0.13];
  return (<group>
    <mesh material={shaftMat} position={[mid[0], mid[1], z]} rotation={[0, 0, ang]}><cylinderGeometry args={[0.017, 0.017, len, 10]} /></mesh>
    <mesh material={bladeMat} position={[bladeC[0], bladeC[1], z]} rotation={[0, 0, ang]}><boxGeometry args={[0.2, 0.27, 0.025]} /></mesh>
  </group>);
};

// ------------------------------------------------------------------ лужа от упавшего ведра
const puddleMat = waterMat(0.6);
const Puddle: React.FC<{ f: number; x: number; z: number }> = ({ f, x, z }) => {
  const u = seg(f, A.land, A.land + 14), fade = 1 - 0.65 * seg(f, A.land + 10, A.land + 50);
  if (u <= 0) return null;
  puddleMat.color.set(WATER).multiplyScalar(0.55 * fade);
  return (<group>
    <mesh material={puddleMat} position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]}><circleGeometry args={[0.1 + 0.42 * u, 40]} /></mesh>
    <Halo p={[x, 0.08, z + 0.05]} size={1.6} k={0.18 * fade * u} mat={HALO_PUDDLE} />
  </group>);
};

// ------------------------------------------------------------------ камера
const ELEV = THREE.MathUtils.degToRad(15);
export const camPose = (f: number) => {
  const c = camState(f);
  return { pos: new THREE.Vector3(c.tx, c.ty + Math.sin(ELEV) * c.d, Math.cos(ELEV) * c.d), look: new THREE.Vector3(c.tx, c.ty, 0) };
};
const CamRig: React.FC<{ f: number }> = ({ f }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera, s = camPose(f);
  c.position.copy(s.pos); c.lookAt(s.look); c.fov = 28; c.near = 0.5; c.far = 200; c.updateProjectionMatrix();
  return null;
};

// ------------------------------------------------------------------ всплески
const lip = (hand: V2, tilt: number, s: number): [number, number] => {
  const sg = s < 0 ? -1 : 1, r = -sg * tilt * 1.9;
  const lx = sg * 0.135, ly = -0.21 + 0.12;
  return [hand[0] + lx * Math.cos(r) - ly * Math.sin(r), hand[1] + lx * Math.sin(r) + ly * Math.cos(r)];
};
type BurstO = Burst & { who: "A" | "B" };
// всплески заданы в кадрах раскадровки; разворачиваем в реальные кадры по картам (рейсы первого повторяются)
const expand = (l: BurstO[]): Burst[] => l.flatMap((x) => realTimes(x.who === "A" ? MAP_A : MAP_B, x.f0).map((r) => ({ ...x, f0: r, p: [...x.p] as [number, number, number] })));
const WATER_BURSTS: Burst[] = expand([
  { who: "A", f0: A.dip1[0] + 7, p: [TANK.x1 - 0.2, TANK.water, Z1 + 0.2], n: 26, v: 0.012, up: 0.03, life: 14, seed: 1, floor: TANK.water },
  { who: "A", f0: A.dip2[0] + 7, p: [TANK.x1 - 0.2, TANK.water, Z1 + 0.2], n: 26, v: 0.012, up: 0.03, life: 14, seed: 2, floor: TANK.water },
  { who: "A", f0: A.pour1[0] + 9, p: [BARREL_A.x, 0.9, BARREL_A.z], n: 44, v: 0.01, up: 0.042, life: 16, seed: 3, floor: 0.86 },
  { who: "A", f0: A.pour2[0] + 9, p: [BARREL_A.x, 0.9, BARREL_A.z], n: 44, v: 0.01, up: 0.042, life: 16, seed: 8, floor: 0.86 },
  { who: "B", f0: B.pour[0] + 9, p: [BARREL_B.x - 0.1, 0.86, BARREL_B.z], n: 44, v: 0.01, up: 0.042, life: 16, seed: 4, floor: 0.84 },
  { who: "B", f0: FLOW_HIT, p: [BARREL_B.x - 0.1, 0.9, BARREL_B.z], n: 70, v: 0.016, up: 0.06, life: 22, seed: 6, floor: 0.88 },
  { who: "A", f0: A.land, p: [0, 0.1, Z1 + 0.2], n: 60, v: 0.03, up: 0.05, life: 20, seed: 7, floor: 0.0 },
]);
const DROP_BURST = WATER_BURSTS.find((x) => x.seed === 7)!;
const DIRT_BURSTS: Burst[] = expand(B.digs.flatMap((d, k): BurstO[] => [
  { who: "B", f0: d + 5, p: [DIG_HIT(k), 0.02, PIPE_Z], n: 22, v: 0.012, up: 0.035, life: 14, seed: 20 + k, floor: 0.0 },
  { who: "B", f0: d + 10, p: [DIG_HIT(k) + 0.05, 0.55, PIPE_Z], n: 34, v: 0.01, up: 0.03, life: 22, seed: 40 + k, floor: 0.0, dir: -1.6 },
]).concat(B.place.map(([p0], k): BurstO => ({ who: "B", f0: p0 + B.placeHit, p: [(SECTIONS[k][0] + SECTIONS[k][1]) / 2, 0.02, PIPE_Z], n: 30, v: 0.02, up: 0.02, life: 14, seed: 70 + k, floor: 0.0 }))));

// ------------------------------------------------------------------ сцена
const TOSS_FROM = poseB(B.toss[0] + 5).bucket.hand;
export const WellScene: React.FC = () => {
  const fn = useCurrentFrame(), fA = mapA(fn), fB = mapB(fn);
  const a = poseA(fA, fn), b = poseB(fB);
  const ja = solveFacing(a.pose, a.s), jb = solveFacing(b.pose, b.s);
  const wb = whiteB(fB);
  const mix = (c1: string, c2: string, t: number) => "#" + lin(c1).lerp(lin(c2), t).getHexString();
  const greyA = mix("#B2B0B4", "#9A979B", seg(fA, A.land, A.land + 16));
  const greyAF = mix("#8F8D91", "#7D7A7E", seg(fA, A.land, A.land + 16));
  const nearB = mix("#B2B0B4", "#FDFDFD", wb), farB = mix("#8F8D91", "#D7D4D8", wb);
  const lipA = lip(a.bucket.hand, a.bucket.tilt, a.s), lipB = lip(b.bucket.hand, b.bucket.tilt, b.s);
  const fullB = levelB(fB), glowB = seg(fB, FLOW_HIT - 2, FLOW_HIT + 10) * (0.7 + 0.3 * seg(fB, FLOW_HIT, 330));
  const overflow = seg(fB, 328, 345);
  const dropX = a.bucket.hand[0] + 0.12;
  DROP_BURST.p[0] = dropX;
  const fullA = levelA(fn);
  pipeMat.uniforms.uF.value = fn;
  return (<>
    <color attach="background" args={["#010002"]} />
    <CamRig f={fB} />
    <mesh material={floorMat} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}><circleGeometry args={[9, 96]} /></mesh>
    <Stickman j={ja} z={Z1} near={greyA} far={greyAF} mirror order={-1} />
    <Stickman j={jb} z={Z2} near={nearB} far={farB} mirror order={-1} />
    {(() => { floorGlowMat.uniforms.uK.value = 0.22 * glowB; return glowB > 0.01 ? <mesh material={floorGlowMat} position={[BARREL_B.x, 0.006, BARREL_B.z + 0.55]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={7}><planeGeometry args={[1.6, 1.0]} /></mesh> : null; })()}
    <Tank f={fA} />
    <Halo p={[(TANK.x0 + TANK.x1) / 2, TANK.water + 0.1, TANK.z1 + 0.1]} size={1.5} k={0.05} mat={HALO_TANK} />
    <Barrel x={BARREL_A.x} z={BARREL_A.z} level={fullA} glow={-0.12} overflow={0} f={fn} seed={1} />
    <Barrel x={BARREL_B.x} z={BARREL_B.z} level={fullB} glow={0.12 + glowB} overflow={overflow} f={fn} seed={2} />
    <Halo p={[BARREL_B.x, fullB + 0.12, BARREL_B.z + 0.38]} size={1.1 + 0.3 * glowB} k={0.2 * glowB} mat={HALO_B} />
    <Trench f={fB} />
    {[0, 1, 2].map((k) => <Section key={k} k={k} f={fB} hands={b.hands} />)}
    <Fixtures f={fB} />
    <Stream p0={[RISER.spoutX, RISER.top - 0.06, BARREL_B.z]} y1={fullB} f={fn} k={fB >= FLOW_HIT ? 1 : 0} />
    {fB >= TURN ? <Halo p={[flowX(fB), 0.08, PIPE_Z + 0.2]} size={0.9} k={0.35 * (1 - seg(fB, FLOW_HIT, FLOW_HIT + 8))} mat={HALO_PIPE} /> : null}
    {[A.pour1, A.pour2].map((p, i) => <Stream key={i} p0={[lipA[0], lipA[1], BARREL_A.z]} y1={fullA} f={fn} k={fA > p[0] + 6 && fA < p[1] - 5 ? 1 : 0} />)}
    <Stream p0={[lipB[0], lipB[1], BARREL_B.z]} y1={fullB} f={fn} k={fB > B.pour[0] + 6 && fB < B.pour[1] - 5 ? 1 : 0} />
    <Bursts f={fn} list={WATER_BURSTS} mat={WATER_DROP} />
    <Bursts f={fn} list={DIRT_BURSTS} mat={DIRT} />
    <Puddle f={fA} x={dropX} z={Z1 + 0.15} />
    {!b.shovel.on && fB < B.grabShovel[0] + 5 ? <Shovel low={SH_REST_LOW} high={SH_REST_HIGH} z={Z2 - 0.1} /> : null}
    {!b.shovel.on && fB >= B.dropShovel[0] + 6 ? <Shovel low={[-1.05, 0.03]} high={[-0.65, 0.04]} z={Z2 + 0.15} /> : null}
    {b.shovel.on ? <Shovel low={b.shovel.low} high={b.shovel.high} z={Z2 + 0.2} /> : null}
    <Bucket hand={a.bucket.hand} tilt={a.bucket.tilt} s={a.s} z={Z1 + 0.2} full={bucketFullA(fA)} fall={a.bucket.fall} />
    <Bucket hand={b.bucket.hand} tilt={b.bucket.tilt} s={b.s} z={b.bucket.on ? Z2 + 0.2 : lerp(Z2 + 0.2, BUCKET_B_Z, b.bucket.fly ?? 1)} full={fB < B.pour[0] + 8} ground={b.bucket.on ? undefined : BUCKET_B_GROUND} fly={b.bucket.fly} from={TOSS_FROM} />
    <Stickman j={ja} z={Z1} near={greyA} far={greyAF} />
    <Stickman j={jb} z={Z2} near={nearB} far={farB} />
    <EffectComposer multisampling={8} stencilBuffer>
      <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.3} intensity={0.13} mipmapBlur radius={0.5} />
    </EffectComposer>
  </>);
};
export { HA_FRAMES, tiredA };
