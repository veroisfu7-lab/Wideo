// 3D-сцена «Путь под ногами»: платформа-обрыв с глянцевым полом, ступени из темноты, два человечка, фонарик.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Easing, getInputProps, useCurrentFrame } from "remotion";
import T from "./timeline.json";
import {
  V2, keys, seg, inOut, outCubic, lerp, clamp01, LIMB_R, LEG_MAX,
  blockTop, blockX, STEP_W, WHITE_Z, GREY_Z,
} from "../anim";
import { Stickman, solve, Pose, flat, INK } from "../Stickman";

const lin = (hex: string) => new THREE.Color(hex);

// ------------------------------------------------------------------ материал декораций (unlit, грани по нормали)
// верх: градиент спереди→назад; фронт и бока: градиент от кромки вниз в чёрное.
const setMat = (o: { top: string; topBack?: string; front: string; side: string; fadeDepth?: number; zFront?: number; zBack?: number }) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: lin(o.top) }, uTopBack: { value: lin(o.topBack ?? o.top) }, uFront: { value: lin(o.front) }, uSide: { value: lin(o.side) },
      uYTop: { value: 0 }, uFade: { value: o.fadeDepth ?? 1.4 }, uZf: { value: o.zFront ?? 1 }, uZb: { value: o.zBack ?? -1 }, uMul: { value: 1 },
    },
    vertexShader: `varying vec3 vW; varying vec3 vN;
      void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uTop; uniform vec3 uTopBack; uniform vec3 uFront; uniform vec3 uSide; uniform float uYTop; uniform float uFade;
      uniform float uZf; uniform float uZb; uniform float uMul; varying vec3 vW; varying vec3 vN;
      void main(){
        vec3 c;
        float down = clamp((uYTop - vW.y)/uFade, 0.0, 1.0);
        float g = exp(-3.2*down);
        if (vN.y > 0.5) { c = mix(uTopBack, uTop, clamp((vW.z - uZb)/(uZf - uZb), 0.0, 1.0)); }
        else if (vN.z > 0.5) { c = uFront * g; }
        else if (vN.y < -0.5) { c = vec3(0.0); }
        else { c = uSide * g; }
        gl_FragColor = vec4(c*uMul, 1.0);
      }`,
  });

// Светлая кромка (линия-ребро). Вертикальные гаснут вниз.
const edgeMat = (hex: string, fadeDepth = 1.2) => {
  const m = setMat({ top: hex, front: hex, side: hex, fadeDepth });
  return m;
};

const BOX = new THREE.BoxGeometry(1, 1, 1);

// ------------------------------------------------------------------ платформа (обрыв справа в x = 0)
const PLAT = { x0: -9, x1: 0, zf: 1.0, zb: -1.4, depth: 7 };
const Platform: React.FC = () => {
  const body = useMemo(() => {
    const m = setMat({ top: "#1E1B1F", front: "#2A272B", side: "#242125", fadeDepth: 1.6 }); return m;
  }, []);
  const top = useMemo(() => {
    const m = setMat({ top: "#201D21", topBack: "#0C090D", front: "#000", side: "#000", zFront: PLAT.zf, zBack: PLAT.zb });
    m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp;
    return m;
  }, []);
  const eTop = useMemo(() => edgeMat("#5C595D"), []);
  const eCliff = useMemo(() => edgeMat("#5C595D", 1.0), []);
  const w = PLAT.x1 - PLAT.x0, d = PLAT.zf - PLAT.zb;
  return (<group>
    <mesh geometry={BOX} material={body} position={[(PLAT.x0 + PLAT.x1) / 2, -PLAT.depth / 2 - 0.001, (PLAT.zf + PLAT.zb) / 2]} scale={[w, PLAT.depth, d]} renderOrder={0} />
    <mesh material={top} position={[(PLAT.x0 + PLAT.x1) / 2, 0.0008, (PLAT.zf + PLAT.zb) / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
      <planeGeometry args={[w, d]} />
    </mesh>
    {/* кромка верх-фронт и вертикальное ребро обрыва */}
    <mesh geometry={BOX} material={eTop} position={[(PLAT.x0 + PLAT.x1) / 2, 0, PLAT.zf]} scale={[w, 0.012, 0.012]} />
    <mesh geometry={BOX} material={eTop} position={[PLAT.x1, 0, (PLAT.zf + PLAT.zb) / 2]} scale={[0.012, 0.012, d]} />
    <mesh geometry={BOX} material={eCliff} position={[PLAT.x1, -1.5, PLAT.zf]} scale={[0.012, 3, 0.012]} />
  </group>);
};

// ------------------------------------------------------------------ ступени: выезжают снизу за 8 кадров до касания
const BLOCK_D = 0.9, SLAB = 0.34, RISE_FROM = 1.6;
const Block: React.FC<{ i: number; land: number; f: number }> = ({ i, land, f }) => {
  const mats = useMemo(() => ({
    body: setMat({ top: "#48454A", front: "#3A373C", side: "#242126", fadeDepth: 0.55 }),
    edge: edgeMat("#C4C1C6", 1.0),
  }), []);
  const t0 = land - T.blockRise - 1, t1 = land - 1;
  if (f < t0) return null;
  const u = outCubic(clamp01((f - t0) / (t1 - t0)));
  const top = blockTop(i) - (1 - u) * RISE_FROM;
  const vis = clamp01((f - t0) / 6);
  // вспышка кромки при касании: к белому и обратно за 8 кадров
  const fl = f >= land ? Math.exp(-(f - land) / 3) : 0;
  mats.body.uniforms.uYTop.value = top; mats.body.uniforms.uMul.value = vis;
  mats.edge.uniforms.uYTop.value = top; mats.edge.uniforms.uMul.value = vis * (1 + 2.6 * fl);
  const x = blockX(i), z = WHITE_Z;
  return (<group>
    <mesh geometry={BOX} material={mats.body} position={[x, top - SLAB / 2, z]} scale={[STEP_W, SLAB, BLOCK_D]} />
    <mesh geometry={BOX} material={mats.edge} position={[x, top, z + BLOCK_D / 2]} scale={[STEP_W, 0.012, 0.012]} />
  </group>);
};

// ------------------------------------------------------------------ белый: шаги по ступеням (IK, таз из ограничений ног)
const STEPS: number[] = T.steps;
const swingStart = (k: number) => {          // k с 1
  if (k === 1) return T.firstSwingStart;
  const gap = STEPS[k - 1] - STEPS[k - 2];
  return Math.max(STEPS[k - 2] + 1, STEPS[k - 1] - Math.min(18, Math.max(9, Math.round(gap * 0.75))));
};
const W_INIT = { N: [-0.3, LIMB_R] as V2, F: [-0.44, LIMB_R] as V2 };
const whiteFoot = (foot: "N" | "F", f: number): V2 => {
  let pos = W_INIT[foot];
  for (let k = 1; k <= STEPS.length; k++) {
    if ((k % 2 === 1 ? "N" : "F") !== foot) continue;
    const land = STEPS[k - 1], s = swingStart(k);
    const tgt: V2 = [blockX(k), blockTop(k) + LIMB_R];
    if (f >= land) { pos = tgt; continue; }
    if (f > s) {
      const t = (f - s) / (land - s), u = 0.35 * inOut(t) + 0.65 * t;
      const lift = 0.07 + 0.25 * Math.max(0, tgt[1] - pos[1]);
      return [lerp(pos[0], tgt[0], u), lerp(pos[1], tgt[1], u) + lift * Math.sin(Math.PI * u)];
    }
    break;
  }
  return pos;
};
const pelvisFrom = (fN: V2, fF: V2, dx: number): V2 => {
  const x = (fN[0] + fF[0]) / 2 + dx;
  let y = Infinity;
  for (const p of [fN, fF]) y = Math.min(y, p[1] + Math.sqrt(Math.max(0, LEG_MAX * LEG_MAX - (x - p[0]) ** 2)) - 0.004);
  return [x, y];
};
const whiteLean = (f: number) => keys(f, [[0, 0.02], [T.white.anticipation[0], 0.02], [50, -0.08], [60, 0.13], [400, 0.13]]);
const whitePelvisDx = (f: number) => keys(f, [[0, 0.02], [T.white.anticipation[0], 0.02], [50, -0.04], [62, 0.06], [400, 0.06]]);
const whitePose = (f: number): Pose => {
  // таз сглажен по 7 кадрам, чтобы не было рывков
  let px = 0, py = 0;
  for (let k = -3; k <= 3; k++) { const p = pelvisFrom(whiteFoot("N", f + k), whiteFoot("F", f + k), whitePelvisDx(f + k)); px += p[0]; py += p[1]; }
  const pelvis: V2 = [px / 7, py / 7];
  const fN = whiteFoot("N", f), fF = whiteFoot("F", f);
  const lean = whiteLean(f);
  const sh: V2 = [pelvis[0] + Math.sin(lean) * 0.5, pelvis[1] + Math.cos(lean) * 0.5];
  const arm = (foot: V2): V2 => { const o = -0.6 * (foot[0] - pelvis[0]); return [sh[0] + 0.03 + o, sh[1] - 0.55 + 0.12 * Math.abs(o)]; };
  return { pelvis, lean, footN: fN, footF: fF, handN: arm(fF), handF: arm(fN) };
};

// ------------------------------------------------------------------ серый: фонарик, испуг, «нет», опускает руку
const G = T.grey;
const greyFeet = (f: number): { N: V2; F: V2 } => {
  const [a1, b1] = G.backSteps[0], [a2, b2] = G.backSteps[1];
  const arc = (x0: number, x1: number, a: number, b: number): V2 => { const u = seg(f, a, b); return [lerp(x0, x1, u), LIMB_R + 0.08 * Math.sin(Math.PI * u)]; };
  return { N: arc(-1.75, -1.93, a2, b2), F: arc(-1.87, -2.03, a1, b1) };
};
// угол луча (градусы от горизонта): всегда выше головы белого — в пустое пространство впереди
const RC = T.camera.revealStart;
const greyAimDeg = (f: number) => {
  const flinch = keys(f, [[G.sweeps[1][0], 0], [G.sweeps[1][1], 1], [95, 0]], outCubic);
  const base = keys(f, [
    [0, -75], [G.raise[0], -75], [G.raise[1], 30], [32, 37], [G.sweeps[0][1], 29], [G.sweeps[1][0], 29],
    [G.sweeps[2][0], 33], [G.sweeps[2][1], 31], [G.sweeps[3][0], 31], [G.sweeps[3][1], 36], [G.sweeps[4][0], 36], [G.sweeps[4][1], 33],
    [RC + 4, 33], [RC + 27, -22], [G.lower[0], -22], [G.lower[1], -70],
  ]);
  return base + 12 * flinch;
};
const shakeLean = (f: number) => {
  if (f <= G.shake[0] || f >= G.shake[1]) return 0;
  const u = (f - G.shake[0]) / (G.shake[1] - G.shake[0]);
  return Math.sin(u * 4 * Math.PI) * 0.035 * Math.sin(Math.PI * u);
};
const greyPose = (f: number) => {
  const ft = greyFeet(f);
  let px = 0, py = 0;
  for (let k = -3; k <= 3; k++) { const q = greyFeet(f + k); const p = pelvisFrom(q.N, q.F, 0); px += p[0]; py += p[1]; }
  const pelvis: V2 = [px / 7, py / 7];
  const lean = shakeLean(f) + keys(f, [[0, 0.0], [67, 0.0], [74, -0.14], [95, -0.02], [G.lookUp[0], -0.02], [G.lookUp[1], -0.06], [G.lower[1], 0.04], [400, 0.04]]);
  const sh: V2 = [pelvis[0] + Math.sin(lean) * 0.5, pelvis[1] + Math.cos(lean) * 0.5];
  const a = THREE.MathUtils.degToRad(greyAimDeg(f));
  const dir: V2 = [Math.cos(a), Math.sin(a)];
  const handN: V2 = [sh[0] + dir[0] * 0.5, sh[1] + dir[1] * 0.5];
  const u = seg(f, G.shake[0], G.shake[1], (t) => t);
  const shake = f > G.shake[0] && f < G.shake[1] ? Math.sin(u * 4 * Math.PI) * 0.06 * Math.sin(Math.PI * u) : 0;
  const look = seg(f, G.lookUp[0], G.lookUp[1]) * (1 - seg(f, G.lower[0] + 6, G.lower[1]));
  const pose: Pose = { pelvis, lean, footN: ft.N, footF: ft.F, handN, handF: [sh[0] + 0.02, sh[1] - 0.56], headOff: [shake - 0.012 * look, 0.014 * look] };
  return { pose, dir, hand: handN };
};
// фонарик горит? (вкл на G.clickOn, мигание G.flicker, выкл на G.clickOff)
const FLICKER = [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0];   // кадры G.flicker[0]…+11
const lampOn = (f: number) => {
  if (f < G.clickOn) return 0;
  if (f === G.clickOn) return 1.8;
  if (f === G.clickOn + 1) return 0.35;
  if (f >= G.flicker[0] && f < G.flicker[1]) return FLICKER[f - G.flicker[0]] ? 0.8 : 0;
  if (f >= G.clickOff) return 0;
  return 1;
};

// ------------------------------------------------------------------ фонарик и луч
const BEAM_LEN = 3.2, BEAM_R = 0.5;
const beamGeo = (() => { const g = new THREE.ConeGeometry(BEAM_R, BEAM_LEN, 48, 1, true); g.translate(0, -BEAM_LEN / 2, 0); return g; })();
const beamMat = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: lin("#FAE6AF") }, uK: { value: 0 } },
  vertexShader: `varying float vT; varying vec3 vNV; varying vec3 vV;
    void main(){ vT = clamp(-position.y/${BEAM_LEN.toFixed(1)}, 0.0, 1.0); vec4 mv = modelViewMatrix*vec4(position,1.0);
      vNV = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uK; varying float vT; varying vec3 vNV; varying vec3 vV;
    void main(){ vec3 n = vNV / max(length(vNV), 1e-4); vec3 v = vV / max(length(vV), 1e-4);
      float fr = pow(max(abs(dot(n, v)), 1e-4), 1.6);   // защита от pow(0) → NaN (ломает bloom на весь кадр)
      float a = uK * pow(max(1.0 - vT, 1e-4), 2.4) * smoothstep(0.0, 0.05, vT) * (1.0 - smoothstep(0.35, 0.85, vT)) * fr;
      gl_FragColor = vec4(uColor * a, 1.0); }`,
  blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
});
const lensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFF2CF").multiplyScalar(5), toneMapped: false });
const lensOff = new THREE.MeshBasicMaterial({ color: "#5A575B", toneMapped: false });
const bodyMat = flat("#3E3B3F");
const CYL = new THREE.CylinderGeometry(1, 1, 1, 24);
const SPH = new THREE.SphereGeometry(1, 24, 16);

const Flashlight: React.FC<{ hand: V2; dir: V2; z: number; on: number }> = ({ hand, dir, z, on }) => {
  const rot = Math.atan2(dir[1], dir[0]) - Math.PI / 2;      // ось Y цилиндра → направление
  const at = (k: number): [number, number, number] => [hand[0] + dir[0] * k, hand[1] + dir[1] * k, z];
  beamMat.uniforms.uK.value = 0.22 * on;
  lensMat.color.set("#FFF2CF").multiplyScalar(1 + 4 * on);
  return (<>
    <mesh geometry={CYL} material={bodyMat} position={at(0.06)} rotation={[0, 0, rot]} scale={[0.042, 0.22, 0.042]} renderOrder={3} />
    <mesh geometry={CYL} material={INK} position={at(0.06)} rotation={[0, 0, rot]} scale={[0.042 + 0.022, 0.22 + 0.04, 0.042 + 0.022]} renderOrder={3} />
    <mesh geometry={SPH} material={on > 0 ? lensMat : lensOff} position={at(0.175)} scale={0.05} renderOrder={3} />
    {on > 0 && !HIDE.has("beam") ? <mesh geometry={beamGeo} material={beamMat} position={at(0.18)} rotation={[0, 0, rot + Math.PI]} renderOrder={4} /> : null}
  </>);
};

// ------------------------------------------------------------------ камера
const ELEV = THREE.MathUtils.degToRad(9);
const REVEAL_EASE = Easing.bezier(0.3, 0, 0.15, 1);   // короткий разгон, долгое торможение
const camState = (f: number) => {
  const C = T.camera;
  // до раскрытия: ведение белого с лёгким отъездом; раскрытие (короткий разгон, долгое торможение); в конце наезд на серого ×1.10
  const tgt0: V2 = [-0.7, 0.95], tgtT: V2 = [0.3, 1.55], tgt1: V2 = [0.75, 2.4], tgt2: V2 = [-0.9, 1.6];
  const d0 = 15.2, d0b = 20.5, d1 = 26.5, d2 = 24.0;
  let tx: number, ty: number, d: number;
  // до раскрытия: медленный наезд, с 95-го кадра камера плавно ведёт белого вправо-вверх
  if (f < C.revealStart) { const u = seg(f, 60, C.revealStart), v = seg(f, 95, C.revealStart); tx = lerp(tgt0[0], tgtT[0], v); ty = lerp(tgt0[1], tgtT[1], v); d = lerp(d0, d0b, u); }
  else if (f < C.pushStart) { const u = REVEAL_EASE(clamp01((f - C.revealStart) / (C.revealEnd - C.revealStart))); tx = lerp(tgtT[0], tgt1[0], u); ty = lerp(tgtT[1], tgt1[1], u); d = lerp(d0b, d1, u); }
  else { const u = seg(f, C.pushStart, C.pushEnd); tx = lerp(tgt1[0], tgt2[0], u); ty = lerp(tgt1[1], tgt2[1], u); d = lerp(d1, d2, u); }
  return { pos: new THREE.Vector3(tx, ty + Math.sin(ELEV) * d, Math.cos(ELEV) * d), look: new THREE.Vector3(tx, ty, 0) };
};
const CamRig: React.FC<{ f: number }> = ({ f }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  const s = camState(f);
  c.position.copy(s.pos); c.lookAt(s.look); c.fov = 28; c.near = 0.5; c.far = 200; c.updateProjectionMatrix();
  return null;
};

// ------------------------------------------------------------------ цвет серого (темнеет в конце)
// множитель яркости в sRGB, как в замерах рефов
const greyHex = (hex: string, f: number) => {
  const k = 1 - 0.22 * seg(f, G.darken[0], G.darken[1]);
  const n = parseInt(hex.slice(1), 16);
  return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k).toString(16).padStart(2, "0")).join("");
};

const IP = getInputProps() as { bloom?: boolean; hide?: string[] };
const BLOOM = IP.bloom !== false;
const HIDE = new Set(IP.hide ?? []);

export const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const wj = solve(whitePose(f));
  const g = greyPose(f);
  const gj = solve(g.pose);
  const gN = greyHex("#B2B0B4", f), gF = greyHex("#8F8D91", f);
  const on = lampOn(f);
  return (<>
    <color attach="background" args={["#010002"]} />
    <CamRig f={f} />
    <Platform />
    {!HIDE.has("blocks") && STEPS.map((land, i) => <Block key={i} i={i + 1} land={land} f={f} />)}
    {/* отражения в глянцевом полу (только над платформой — стенсил) */}
    {!HIDE.has("mirror") && <Stickman j={wj} z={WHITE_Z} near="#FDFDFD" far="#D7D4D8" mirror />}
    {!HIDE.has("mirror") && <Stickman j={gj} z={GREY_Z} near={gN} far={gF} mirror />}
    {/* персонажи */}
    {!HIDE.has("white") && <Stickman j={wj} z={WHITE_Z} near="#FDFDFD" far="#D7D4D8" />}
    <Stickman j={gj} z={GREY_Z} near={gN} far={gF}>
      <Flashlight hand={gj.handN} dir={g.dir} z={0.2} on={on} />
    </Stickman>
    {BLOOM ? (
      <EffectComposer multisampling={8} stencilBuffer>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.3} intensity={0.13} mipmapBlur radius={0.5} />
      </EffectComposer>
    ) : null}
  </>);
};
