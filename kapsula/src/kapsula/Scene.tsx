// 3D-сцена «Капсула»: комната в разрезе (пол глянцевый), лежак, глухая дверь, люк с янтарной лампой, черты дней,
// миска, манипулятор за люком. Единственный цветной акцент — янтарный (лампа, диод, отсвет изнутри люка).
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useCurrentFrame, getInputProps } from "remotion";
import { Stickman, solveFacing, flat } from "../Stickman";
import {
  ROOM, COT, DOOR, HATCH, LAMP, LIGHT, MARK, ZH, BOWL_SPOT, BOWL_R, TURN, E,
  heroes, heroGrey, whiteAt, flapOpen, bowlFloor, armState, lampAt, innerGlow, marksAt, camState, seg, lerp,
} from "./plan";

const props = getInputProps() as { bloom?: boolean; hide?: string[]; ms?: number };
const hidden = (k: string) => (props.hide ?? []).includes(k);
const lin = (hex: string) => new THREE.Color(hex);
const AMBER = "#FFA21F";

// стены, лежак, дверь: ламберт от «света с потолка» (виртуальный источник перед задней стеной), верх — светлая кромка,
// срез (передние торцы z ≈ 0.6) — почти чёрный. Пишут stencil 0, чтобы отражения были только на полу.
const roomMat = (alb: string, top: string, k = 1.0) => {
  const m = new THREE.ShaderMaterial({
    uniforms: { uA: { value: lin(alb) }, uT: { value: lin(top) }, uL: { value: new THREE.Vector3(0, 1.9, -0.3) }, uK: { value: k } },
    vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uA; uniform vec3 uT; uniform vec3 uL; uniform float uK; varying vec3 vW; varying vec3 vN;
      void main(){ vec3 L = uL - vW; float d = max(length(L), 1e-4); float lam = max(dot(vN, L / d), 0.0); float fall = 1.0 / (1.0 + 0.35*d*d);
        vec3 c;
        if (vN.y > 0.6) c = uT * (0.55 + 0.7*fall);
        else if (vN.z > 0.6 && vW.z > 0.5) c = vec3(0.045, 0.04, 0.05) * (0.6 + 0.4*clamp(vW.y/2.4, 0.0, 1.0));
        else c = uA * (0.08 + 1.5*lam*fall) * uK;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  m.stencilWrite = true; m.stencilRef = 0; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp;
  return m;
};
const WALL = roomMat("#4A474B", "#5C595D"), COTM = roomMat("#6E6B6F", "#9A979B"), METAL = roomMat("#2A272B", "#3A373B", 0.6), ARM = roomMat("#3A373B", "#5C595D", 0.7);
const DOORM = roomMat("#524F53", "#5C595D");
const EDGE = flat("#8C898D"), EDGE_DIM = flat("#5C595D"), SEAM = flat("#0B090C"), SCRATCH = flat("#9C999E");
// глянцевый пол: почти чёрный, светлее у задней стены под светом; пишет stencil = 1 (для отражений героя)
const floorMat = new THREE.ShaderMaterial({
  uniforms: { uC: { value: lin("#1B181C") }, uL: { value: new THREE.Vector3(0, 1.9, -0.3) } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uC; uniform vec3 uL; varying vec3 vW; void main(){ vec3 L = uL - vW; float d = max(length(L), 1e-4);
    float lam = max(L.y / d, 0.0); float fall = 1.0 / (1.0 + 0.35*d*d); gl_FragColor = vec4(uC * (0.35 + 1.3*lam*fall), 1.0); }`,
});
floorMat.stencilWrite = true; floorMat.stencilRef = 1; floorMat.stencilFunc = THREE.AlwaysStencilFunc; floorMat.stencilZPass = THREE.ReplaceStencilOp;
// ореол-спрайт (класс B) и пятно на полу
const haloMat = (hex: string, sharp = 5.0) => new THREE.ShaderMaterial({
  uniforms: { uC: { value: lin(hex) }, uK: { value: 0.5 }, uS: { value: sharp } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 uC; uniform float uK; uniform float uS; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0;
    gl_FragColor = vec4(uC * uK * exp(-r * r * uS) * (1.0 - smoothstep(0.8, 1.0, r)), 1.0); }`,
  blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
});
const Halo: React.FC<{ p: [number, number, number]; w: number; h?: number; k: number; mat: THREE.ShaderMaterial; rotX?: number; order?: number }> = ({ p, w, h, k, mat, rotX = 0, order = 8 }) => {
  mat.uniforms.uK.value = k;
  return k > 0.001 ? <mesh material={mat} position={p} rotation={[rotX, 0, 0]} renderOrder={order}><planeGeometry args={[w, h ?? w]} /></mesh> : null;
};
const HALO_LAMP = haloMat(AMBER), FLOOR_LAMP = haloMat(AMBER, 4.0), HALO_LIGHT = haloMat("#DDE3EA", 3.0), FLOOR_LIGHT = haloMat("#C9CED6", 3.5);
const HALO_INNER = haloMat(AMBER, 3.0), HALO_HERO = haloMat("#FFFFFF", 4.0), HALO_LED = haloMat(AMBER, 6.0);

const Box: React.FC<{ x: [number, number]; y: [number, number]; z: [number, number]; mat: THREE.Material; order?: number }> = ({ x, y, z, mat, order = 0 }) => (
  <mesh material={mat} position={[(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2]} scale={[x[1] - x[0], y[1] - y[0], z[1] - z[0]]} renderOrder={order}>
    <boxGeometry args={[1, 1, 1]} />
  </mesh>
);

// ------------------------------------------------------------------ комната
const W = ROOM.wall, ZB = ROOM.zBack, ZF = ROOM.zFront;
const Room: React.FC = () => (<>
  {/* пол */}
  <mesh material={floorMat} position={[0, 0, (ZB + ZF) / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-2}><planeGeometry args={[ROOM.x1 - ROOM.x0, ZF - ZB]} /></mesh>
  <Box x={[ROOM.x0 - W, ROOM.x1 + W]} y={[-0.14, -0.001]} z={[ZB - W, ZF]} mat={WALL} />
  {/* задняя стена с проёмом люка */}
  <Box x={[ROOM.x0 - W, HATCH.x0]} y={[0, ROOM.h]} z={[ZB - W, ZB]} mat={WALL} />
  <Box x={[HATCH.x1, ROOM.x1 + W]} y={[0, ROOM.h]} z={[ZB - W, ZB]} mat={WALL} />
  <Box x={[HATCH.x0, HATCH.x1]} y={[HATCH.y1, ROOM.h]} z={[ZB - W, ZB]} mat={WALL} />
  <Box x={[HATCH.x0, HATCH.x1]} y={[0, HATCH.y0]} z={[ZB - W, ZB]} mat={WALL} />
  {/* боковые стены */}
  <Box x={[ROOM.x0 - W, ROOM.x0]} y={[0, ROOM.h]} z={[ZB - W, ZF]} mat={WALL} />
  <Box x={[ROOM.x1, ROOM.x1 + W]} y={[0, ROOM.h]} z={[ZB - W, ZF]} mat={WALL} />
  {/* светлые кромки среза */}
  <Box x={[ROOM.x0 - W, ROOM.x1 + W]} y={[-0.012, 0.0]} z={[ZF - 0.012, ZF + 0.002]} mat={EDGE} />
  <Box x={[ROOM.x0 - 0.012, ROOM.x0]} y={[0, ROOM.h]} z={[ZF - 0.012, ZF + 0.002]} mat={EDGE_DIM} />
  <Box x={[ROOM.x1, ROOM.x1 + 0.012]} y={[0, ROOM.h]} z={[ZF - 0.012, ZF + 0.002]} mat={EDGE_DIM} />
  <Box x={[ROOM.x0 - W, ROOM.x0]} y={[ROOM.h - 0.012, ROOM.h]} z={[ZF - 0.012, ZF + 0.002]} mat={EDGE_DIM} />
  <Box x={[ROOM.x1, ROOM.x1 + W]} y={[ROOM.h - 0.012, ROOM.h]} z={[ZF - 0.012, ZF + 0.002]} mat={EDGE_DIM} />
  {/* лежак */}
  <Box x={[COT.x0, COT.x1]} y={[0, COT.top]} z={[COT.z0, COT.z1]} mat={COTM} />
  <Box x={[COT.x0, COT.x1]} y={[COT.top - 0.01, COT.top]} z={[COT.z1 - 0.01, COT.z1 + 0.001]} mat={EDGE} />
  {/* глухая дверь: чуть светлее стены, тёмный шов, без ручки */}
  <Box x={[DOOR.x0, DOOR.x1]} y={[0, DOOR.h]} z={[ZB, ZB + 0.004]} mat={DOORM} />
  <Box x={[DOOR.x0 - 0.014, DOOR.x0]} y={[0, DOOR.h]} z={[ZB, ZB + 0.006]} mat={SEAM} />
  <Box x={[DOOR.x1, DOOR.x1 + 0.014]} y={[0, DOOR.h]} z={[ZB, ZB + 0.006]} mat={SEAM} />
  <Box x={[DOOR.x0 - 0.014, DOOR.x1 + 0.014]} y={[DOOR.h, DOOR.h + 0.014]} z={[ZB, ZB + 0.006]} mat={SEAM} />
  {/* рамка люка */}
  <Box x={[HATCH.x0 - 0.012, HATCH.x0]} y={[HATCH.y0, HATCH.y1 + 0.012]} z={[ZB, ZB + 0.006]} mat={EDGE_DIM} />
  <Box x={[HATCH.x1, HATCH.x1 + 0.012]} y={[HATCH.y0, HATCH.y1 + 0.012]} z={[ZB, ZB + 0.006]} mat={EDGE_DIM} />
  <Box x={[HATCH.x0 - 0.012, HATCH.x1 + 0.012]} y={[HATCH.y1, HATCH.y1 + 0.012]} z={[ZB, ZB + 0.006]} mat={EDGE_DIM} />
  {/* свет, который никогда не гаснет */}
  <Box x={[LIGHT.x0, LIGHT.x1]} y={[LIGHT.y - 0.03, LIGHT.y + 0.03]} z={[ZB, ZB + 0.06]} mat={LIGHT_MAT} />
  <Halo p={[0, LIGHT.y, ZB + 0.07]} w={3.2} h={0.9} k={0.07} mat={HALO_LIGHT} />
  <Halo p={[0, 0.004, ZB + 0.55]} w={2.6} h={1.0} k={0.05} mat={FLOOR_LIGHT} rotX={-Math.PI / 2} />
</>);
const LIGHT_MAT = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF").multiplyScalar(1.6), toneMapped: false });

// ------------------------------------------------------------------ люк: тоннель, створка, рука
const tunnelMat = new THREE.ShaderMaterial({
  uniforms: { uC: { value: lin(AMBER) }, uG: { value: 0 } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform vec3 uC; uniform float uG; varying vec3 vW; void main(){ float k = exp(-abs(vW.z + 1.62) / 0.22);
    gl_FragColor = vec4(vec3(0.012, 0.01, 0.014) + uC * 0.22 * uG * k, 1.0); }`,
  side: THREE.BackSide,
});
const FLAP = roomMat("#3E3B3F", "#8C898D", 0.95);
const Hatch: React.FC<{ f: number }> = ({ f }) => {
  const o = flapOpen(f), hh = HATCH.y1 - HATCH.y0;
  const yb = HATCH.y0 + o * hh;
  tunnelMat.uniforms.uG.value = innerGlow(f);
  return (<>
    <Box x={[HATCH.x0, HATCH.x1]} y={[HATCH.y0, HATCH.y1]} z={[-1.95, ZB - 0.001]} mat={tunnelMat} />
    {/* створка уезжает вверх в толщу стены */}
    <Box x={[HATCH.x0 - 0.002, HATCH.x1 + 0.002]} y={[yb, yb + hh]} z={[ZB - 0.08, ZB - 0.05]} mat={FLAP} />
    {o > 0.02 ? <Box x={[HATCH.x0, HATCH.x1]} y={[yb, yb + 0.012]} z={[ZB - 0.05, ZB - 0.045]} mat={EDGE_DIM} /> : null}
  </>);
};
const ledMat = new THREE.MeshBasicMaterial({ color: lin(AMBER), toneMapped: false });
const Arm: React.FC<{ f: number }> = ({ f }) => {
  const a = armState(f);
  if (!a.on) return null;
  const led = f >= TURN && f < E.armLook[1] ? (Math.floor((f - TURN) / 2) % 2 ? 0.25 : 1) : 0.8;
  ledMat.color.copy(lin(AMBER)).multiplyScalar(0.4 + 2.2 * led);
  const z = a.z, len = -1.95 - z;
  return (<group position={[HATCH.cx, 0.15 + 0.04 * a.look, 0]}>
    <Box x={[-0.025, 0.025]} y={[-0.02, 0.03]} z={[-1.95, z - 0.06]} mat={METAL} />
    <group position={[0, 0, z]} rotation={[0.25 * a.look, 0.55 * a.look, 0]} scale={1.6}>
      <Box x={[-0.1, 0.1]} y={[-0.03, 0.06]} z={[-0.07, 0.05]} mat={ARM} />
      <Box x={[-0.095, -0.07]} y={[-0.11, -0.03]} z={[0.0, 0.035]} mat={ARM} />
      <Box x={[0.07, 0.095]} y={[-0.11, -0.03]} z={[0.0, 0.035]} mat={ARM} />
      <mesh material={ledMat} position={[0.0, 0.015, 0.053]} renderOrder={3}><sphereGeometry args={[0.026, 16, 10]} /></mesh>
      <Halo p={[0, 0.015, 0.07]} w={0.5} k={0.35 * led} mat={HALO_LED} order={9} />
    </group>
    {len < 0 ? null : null}
  </group>);
};
const Lamp: React.FC<{ f: number }> = ({ f }) => {
  const v = lampAt(f);
  const m = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  m.color.copy(lin(AMBER)).multiplyScalar(0.1 + 2.6 * v);
  return (<>
    <Box x={[LAMP.x - 0.025, LAMP.x + 0.025]} y={[LAMP.y - 0.08, LAMP.y + 0.08]} z={[ZB, ZB + 0.03]} mat={m} order={3} />
    <Halo p={[LAMP.x, LAMP.y, ZB + 0.05]} w={0.9} k={0.32 * v} mat={HALO_LAMP} />
    <Halo p={[LAMP.x - 0.1, 0.004, ZB + 0.3]} w={0.9} h={0.6} k={0.12 * v} mat={FLOOR_LAMP} rotX={-Math.PI / 2} />
  </>);
};

// ------------------------------------------------------------------ миска
const bowlGeo = (() => {
  const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.085, 0), new THREE.Vector2(BOWL_R, 0.07), new THREE.Vector2(BOWL_R - 0.012, 0.07), new THREE.Vector2(0.078, 0.012), new THREE.Vector2(0.001, 0.012)];
  return new THREE.LatheGeometry(pts, 40);
})();
const BOWLM = roomMat("#8C898D", "#B9B6BA", 1.2);
const PASTE = roomMat("#CFC8BA", "#D9D2C4", 1.0);
const Bowl: React.FC<{ p: [number, number, number]; tilt?: number; full: boolean; upright?: boolean }> = ({ p, tilt = 0, full, upright }) => (
  <group position={upright ? [p[0], HATCH.y0 + BOWL_R, p[2]] : p} rotation={upright ? [Math.PI / 2, 0, 0] : [0, 0, tilt]}>
    <mesh geometry={bowlGeo} material={BOWLM} position={upright ? [0, -0.035, 0] : [0, 0, 0]} />
    {full ? <mesh material={PASTE} position={[0, upright ? 0.017 : 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.108, 32]} /></mesh> : null}
  </group>
);

// ------------------------------------------------------------------ черты дней
const Marks: React.FC<{ f: number }> = ({ f }) => {
  const { n, last } = marksAt(f);
  const out: React.ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const u = k === n - 1 ? last : 1;
    if (u <= 0.01) continue;
    if (k === 4) { // перечёркивающая пятая
      const L = 0.3 * u, cx = MARK.x(4) - 0.15 + L / 2 * Math.cos(0.5), cy = MARK.y1 - 0.08 - L / 2 * Math.sin(0.5);
      out.push(<mesh key={k} material={SCRATCH} position={[MARK.x(4) - 0.13 + (L / 2) * Math.cos(-0.5), MARK.y1 - 0.06 + (L / 2) * Math.sin(-0.5), ZB + 0.004]} rotation={[0, 0, -0.5]} scale={[L, 0.016, 0.004]}><boxGeometry args={[1, 1, 1]} /></mesh>);
      void cx; void cy; continue;
    }
    const h = (MARK.y1 - MARK.y0) * u;
    out.push(<Box key={k} x={[MARK.x(k) - 0.008, MARK.x(k) + 0.008]} y={[MARK.y1 - h, MARK.y1]} z={[ZB, ZB + 0.004]} mat={SCRATCH} />);
  }
  return <>{out}</>;
};

// ------------------------------------------------------------------ камера
const ELEV = THREE.MathUtils.degToRad(8);
export const camPose = (f: number) => {
  const c = camState(f);
  return { pos: new THREE.Vector3(c.tx, c.ty + Math.sin(ELEV) * c.d, ZH + Math.cos(ELEV) * c.d), look: new THREE.Vector3(c.tx, c.ty, ZH) };
};
const CamRig: React.FC<{ f: number }> = ({ f }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera, s = camPose(f);
  c.position.copy(s.pos); c.lookAt(s.look); c.fov = 28; c.near = 0.5; c.far = 200; c.updateProjectionMatrix();
  return null;
};

// ------------------------------------------------------------------ сцена
const mix = (c1: string, c2: string, t: number) => "#" + lin(c1).lerp(lin(c2), t).getHexString();
export const KapsulaScene: React.FC = () => {
  const f = useCurrentFrame();
  const hs = heroes(f);
  const g = heroGrey(f), w = whiteAt(f);
  const near = mix(mix("#B2B0B4", "#9A979B", g), "#FDFDFD", w), far = mix(mix("#8F8D91", "#7D7A7E", g), "#D7D4D8", w);
  const bf = bowlFloor(f);
  const flash = f >= TURN ? Math.exp(-(f - TURN) / 7) : 0;
  const glowHero = 0.1 * w + 0.5 * flash;
  const j0 = solveFacing(hs[hs.length - 1].pose, hs[hs.length - 1].s);
  return (<>
    <color attach="background" args={["#010002"]} />
    <CamRig f={f} />
    {!hidden("room") ? <Room /> : null}
    {hs.map((h, i) => h.noMirror ? null : <Stickman key={"m" + i} j={solveFacing(h.pose, h.s)} z={ZH} near={near} far={far} mirror order={-1} thin={h.thin} op={h.op} />)}
    <Hatch f={f} />
    <Arm f={f} />
    <Lamp f={f} />
    <Marks f={f} />
    <Halo p={[HATCH.cx, 0.2, ZB + 0.05]} w={0.9} h={0.6} k={0.25 * (f >= E.jam ? innerGlow(f) : 0)} mat={HALO_INNER} />
    {bf.on ? <Bowl p={[BOWL_SPOT[0], 0, bf.z]} full={bf.full} upright={bf.upright} /> : null}
    {hs.map((h, i) => h.bowl ? <Bowl key={"b" + i} p={h.bowl.p} tilt={h.bowl.tilt} full={f < E.eat1[0] + 20 || f >= E.days[0]} /> : null)}
    {hs.map((h, i) => <Stickman key={"h" + i} j={solveFacing(h.pose, h.s)} z={ZH} near={near} far={far} thin={h.thin} op={h.op} />)}
    {glowHero > 0.005 ? <Halo p={[j0.neck[0], j0.neck[1] + 0.05, ZH + 0.3]} w={2.0} h={1.9} k={glowHero} mat={HALO_HERO} /> : null}
    {props.bloom === false ? null : (
      <EffectComposer multisampling={props.ms ?? 8} stencilBuffer>
        <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.3} intensity={0.13} mipmapBlur radius={0.5} />
      </EffectComposer>
    )}
  </>);
};
void seg; void lerp;
