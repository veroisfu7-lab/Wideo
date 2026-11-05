// Плоский тун-человечек-пиктограмма: капсулы + круг-голова, unlit, тёмная обводка (инвертированный хулл).
// Дальние рука и нога темнее (×0.85) и стоят глубже по z, поэтому обводка ближних ложится поверх них.
import React from "react";
import * as THREE from "three";
import {
  V2, ik, reach, THIGH, SHIN, UPPER, FORE, TORSO, SHOULDER, HEAD_UP, HEAD_R, LIMB_R, ARM_R, TORSO_R, OUTLINE, LEG_MAX,
} from "./anim";

export type Pose = {
  pelvis: V2; lean: number; footN: V2; footF: V2; handN: V2; handF: V2; headOff?: V2;
};
export type Joints = {
  pelvis: V2; neck: V2; shoulder: V2; head: V2; kneeN: V2; kneeF: V2; footN: V2; footF: V2;
  elbowN: V2; elbowF: V2; handN: V2; handF: V2;
};

const up = (p: V2, lean: number, l: number): V2 => [p[0] + Math.sin(lean) * l, p[1] + Math.cos(lean) * l];

export const solve = (p: Pose): Joints => {
  const neck = up(p.pelvis, p.lean, TORSO);
  const shoulder = up(p.pelvis, p.lean, SHOULDER);
  const h = up(p.pelvis, p.lean * 0.9, HEAD_UP);
  const head: V2 = [h[0] + (p.headOff?.[0] ?? 0), h[1] + (p.headOff?.[1] ?? 0)];
  const footN = reach(p.pelvis, p.footN, LEG_MAX), footF = reach(p.pelvis, p.footF, LEG_MAX);
  const handN = reach(shoulder, p.handN, (UPPER + FORE) * 0.99), handF = reach(shoulder, p.handF, (UPPER + FORE) * 0.99);
  return {
    pelvis: p.pelvis, neck, shoulder, head, footN, footF, handN, handF,
    kneeN: ik(p.pelvis, footN, THIGH, SHIN, 1), kneeF: ik(p.pelvis, footF, THIGH, SHIN, 1),
    elbowN: ik(shoulder, handN, UPPER, FORE, -1), elbowF: ik(shoulder, handF, UPPER, FORE, -1),
  };
};

// Поворот героя: s = +1 смотрит вправо, −1 влево, промежуточные значения — разворот (фигура сплющивается по x).
// Цели позы задаются в мировых координатах; колени и локти гнутся в сторону взгляда.
export const solveFacing = (p: Pose, s: number): Joints => {
  const root = p.pelvis[0], sg = s < 0 ? -1 : 1, k = Math.max(0.35, Math.abs(s));   // в развороте фигура сжимается не больше чем до 35 %
  const m = (v: V2): V2 => [root + (v[0] - root) * sg, v[1]];
  const j = solve({ ...p, footN: m(p.footN), footF: m(p.footF), handN: m(p.handN), handF: m(p.handF),
    headOff: p.headOff ? [p.headOff[0] * sg, p.headOff[1]] : undefined });
  const b = (v: V2): V2 => [root + (v[0] - root) * sg * k, v[1]];
  return {
    pelvis: b(j.pelvis), neck: b(j.neck), shoulder: b(j.shoulder), head: b(j.head), kneeN: b(j.kneeN), kneeF: b(j.kneeF),
    footN: b(j.footN), footF: b(j.footF), elbowN: b(j.elbowN), elbowF: b(j.elbowF), handN: b(j.handN), handF: b(j.handF),
  };
};

// ------------------------------------------------------------------ общие геометрии и материалы
const CYL = new THREE.CylinderGeometry(1, 1, 1, 28, 1, true);
const SPH = new THREE.SphereGeometry(1, 32, 20);
export const INK = new THREE.MeshBasicMaterial({ color: "#161616", side: THREE.BackSide, toneMapped: false });
const matCache = new Map<string, THREE.Material>();
export const flat = (hex: string) => {
  if (!matCache.has(hex)) matCache.set(hex, new THREE.MeshBasicMaterial({ color: hex, toneMapped: false }));
  return matCache.get(hex)!;
};

// Отражение: аддитивно, гаснет по глубине под полом, рисуется только там, где пол записал стенсил = 1.
const mirrorCache = new Map<string, THREE.ShaderMaterial>();
export const mirrorMat = (hex: string, strength = 0.25, lambda = 0.36) => {
  const key = hex + strength + lambda;
  if (!mirrorCache.has(key)) {
    const m = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(hex) }, uK: { value: strength }, uL: { value: lambda } },
      vertexShader: `varying float vY; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uK; uniform float uL; varying float vY;
        void main(){ float a = uK * exp(min(vY,0.0) / uL); gl_FragColor = vec4(uColor * a, 1.0); }`,
      blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    });
    m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.EqualStencilFunc;
    m.stencilFail = THREE.KeepStencilOp; m.stencilZFail = THREE.KeepStencilOp; m.stencilZPass = THREE.KeepStencilOp;
    mirrorCache.set(key, m);
  }
  return mirrorCache.get(key)!;
};

type SegProps = { a: V2; b: V2; r: number; z: number; mat: THREE.Material; hull: boolean; order: number; ink?: THREE.Material };
export const Seg: React.FC<SegProps> = ({ a, b, r, z, mat, hull, order, ink = INK }) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.max(1e-4, Math.hypot(dx, dy));
  const rot = Math.atan2(dy, dx) - Math.PI / 2;
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z];
  const parts = (rr: number, m: THREE.Material, ro: number) => (<>
    <mesh geometry={CYL} material={m} position={mid} rotation={[0, 0, rot]} scale={[rr, len, rr]} renderOrder={ro} />
    <mesh geometry={SPH} material={m} position={[a[0], a[1], z]} scale={rr} renderOrder={ro} />
    <mesh geometry={SPH} material={m} position={[b[0], b[1], z]} scale={rr} renderOrder={ro} />
  </>);
  return (<>{parts(r, mat, order)}{hull ? parts(r + OUTLINE, ink, order) : null}</>);
};

export const Ball: React.FC<{ c: V2; r: number; z: number; mat: THREE.Material; hull: boolean; order: number; ink?: THREE.Material }> = ({ c, r, z, mat, hull, order, ink = INK }) => (<>
  <mesh geometry={SPH} material={mat} position={[c[0], c[1], z]} scale={r} renderOrder={order} />
  {hull ? <mesh geometry={SPH} material={ink} position={[c[0], c[1], z]} scale={r + OUTLINE} renderOrder={order} /> : null}
</>);

// Сам человечек. mirror — копия-отражение в глянцевом полу (y → −y).
// thin — множитель толщины конечностей и корпуса (голова не меняется); op — прозрачность для растворения «смены дней».
const fadeCache = new Map<string, THREE.Material>();
const fadeMat = (hex: string, op: number) => {
  const k = hex + op.toFixed(2);
  if (!fadeCache.has(k)) fadeCache.set(k, new THREE.MeshBasicMaterial({ color: hex, toneMapped: false, transparent: true, opacity: op, depthWrite: true }));
  return fadeCache.get(k)!;
};
const inkFade = (op: number) => {
  const k = "ink" + op.toFixed(2);
  if (!fadeCache.has(k)) fadeCache.set(k, new THREE.MeshBasicMaterial({ color: "#161616", side: THREE.BackSide, toneMapped: false, transparent: true, opacity: op, depthWrite: true }));
  return fadeCache.get(k)!;
};
export const Stickman: React.FC<{ j: Joints; z: number; near: string; far: string; mirror?: boolean; order?: number; thin?: number; op?: number; children?: React.ReactNode }> =
  ({ j, z, near, far, mirror = false, order, thin = 1, op = 1, children }) => {
    const q = Math.round(op * 20) / 20;
    const mN = mirror ? mirrorMat(near, 0.25 * q) : q < 1 ? fadeMat(near, q) : flat(near);
    const mF = mirror ? mirrorMat(far, 0.25 * q) : q < 1 ? fadeMat(far, q) : flat(far);
    const ink = q < 1 ? inkFade(q) : INK;
    const hull = !mirror, ord = order ?? (mirror ? 1 : 2);
    const LR = LIMB_R * thin, AR = ARM_R * thin, TR = TORSO_R * thin;
    if (q <= 0.001) return null;
    return (
      <group position={[0, 0, z]} scale={[1, mirror ? -1 : 1, 1]}>
        {/* дальние конечности — глубже */}
        <Seg a={j.pelvis} b={j.kneeF} r={LR} z={-0.12} mat={mF} hull={hull} ink={ink} order={ord} />
        <Seg a={j.kneeF} b={j.footF} r={LR} z={-0.12} mat={mF} hull={hull} ink={ink} order={ord} />
        <Seg a={j.shoulder} b={j.elbowF} r={AR} z={-0.2} mat={mF} hull={hull} ink={ink} order={ord} />
        <Seg a={j.elbowF} b={j.handF} r={AR} z={-0.2} mat={mF} hull={hull} ink={ink} order={ord} />
        {/* корпус и голова */}
        <Seg a={j.pelvis} b={j.neck} r={TR} z={0} mat={mN} hull={hull} ink={ink} order={ord} />
        <Ball c={j.head} r={HEAD_R} z={0} mat={mN} hull={hull} ink={ink} order={ord} />
        {/* ближние */}
        <Seg a={j.pelvis} b={j.kneeN} r={LR} z={0.12} mat={mN} hull={hull} ink={ink} order={ord} />
        <Seg a={j.kneeN} b={j.footN} r={LR} z={0.12} mat={mN} hull={hull} ink={ink} order={ord} />
        <Seg a={j.shoulder} b={j.elbowN} r={AR} z={0.2} mat={mN} hull={hull} ink={ink} order={ord} />
        <Seg a={j.elbowN} b={j.handN} r={AR} z={0.2} mat={mN} hull={hull} ink={ink} order={ord} />
        {children}
      </group>
    );
  };
