// Зеркало: бронзовая рама + стекло с отражением из отдельного прохода (камера-отражение, свой слой «Зазеркалья»).
// Стекло пишет в буфер глубины «виртуальную» глубину отражения — DOF фокусируется внутрь зеркала как у настоящего.
// Эффекты стекла: старение (пятна амальгамы по краям), пыль и полировка тряпкой, царапины, жидкая ртуть (круги),
// марево, кровавые/ртутные отпечатки ладоней со стёками, свечение аномалии.
import * as THREE from "three";
import { NOISE_GLSL } from "./materials";

export const GLASS = { x: 0.42, y0: 0.20, y1: 1.95 };
export const LAYER = { BOTH: 0, REAL: 1, MIRROR: 2 };
export const MAX_STROKES = 40;

const VS = `
uniform mat4 texMatrix; varying vec4 vProj; varying vec2 vG; varying vec3 vW;
void main(){ vG = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vProj = texMatrix * w; gl_Position = projectionMatrix * viewMatrix * w; }`;

const FS = `
uniform sampler2D tRefl; uniform sampler2D tDepth; uniform float near; uniform float far; uniform vec2 res;
uniform float uDirt; uniform vec4 uStroke[${MAX_STROKES}]; uniform float uT;
uniform vec4 uRipple; uniform vec4 uRipple2; uniform vec4 uHaze; uniform float uHazeAmt;
uniform vec4 uPrints; uniform vec3 uGlow; uniform float uDarken; uniform vec3 uLampG; uniform float uLiquid;
varying vec4 vProj; varying vec2 vG; varying vec3 vW;
${NOISE_GLSL}
float lin(float d){ return near * far / (far - d * (far - near)); }
// 2D ладонь: x вправо, y вверх, м
float palm(vec2 p){
  float d = length((p - vec2(0.0, -0.01)) / vec2(0.042, 0.05)) - 1.0; d *= 0.045;
  vec2 tips[5]; tips[0] = vec2(-0.05, 0.0); tips[1] = vec2(-0.026, 0.085); tips[2] = vec2(0.0, 0.095); tips[3] = vec2(0.024, 0.088); tips[4] = vec2(0.044, 0.07);
  vec2 bases[5]; bases[0] = vec2(-0.03, -0.025); bases[1] = vec2(-0.022, 0.035); bases[2] = vec2(-0.002, 0.04); bases[3] = vec2(0.016, 0.037); bases[4] = vec2(0.032, 0.028);
  for (int i = 0; i < 5; i++){ vec2 pa = p - bases[i], ba = tips[i] - bases[i]; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    d = min(d, length(pa - ba * h) - (i == 0 ? 0.011 : 0.0085)); }
  return d;
}
vec2 rippleN(vec2 g, vec4 R){
  if (R.w <= 0.0) return vec2(0.0);
  vec2 d = g - R.xy; float r = length(d) + 1e-4;
  float t = R.z; float wave = r - t * 0.55;
  float a = R.w * 1.6 * exp(-r * 3.2) * exp(-t * 0.55) * smoothstep(0.0, 0.05, t * 0.55 - r + 0.08);
  float s = cos(wave * 70.0) * a;
  return d / r * s;
}
void main(){
  vec2 g = vG; // локальные координаты стекла, м (центр стекла — 0)
  // жидкость: нормаль из кругов
  vec2 rn = rippleN(g, uRipple) + rippleN(g, uRipple2);
  // марево
  if (uHazeAmt > 0.0) {
    vec2 hz = (g - uHaze.xy) / uHaze.zw; float m = (1.0 - smoothstep(0.6, 1.0, length(hz))) * uHazeAmt;
    rn += m * vec2(sin(g.y * 90.0 + uT * 9.0) + sin(g.y * 37.0 - uT * 5.0), sin(g.x * 70.0 + uT * 7.0)) * 0.012;
  }
  vec2 uv = vProj.xy / vProj.w;
  uv += rn * 0.06;
  vec3 refl = texture2D(tRefl, uv).rgb;
  float dv = texture2D(tDepth, uv).x;
  // лёгкая мягкость старого стекла
  vec2 px = 1.0 / res;
  refl = refl * 0.6 + 0.1 * (texture2D(tRefl, uv + px * vec2(1.5, 0.0)).rgb + texture2D(tRefl, uv - px * vec2(1.5, 0.0)).rgb + texture2D(tRefl, uv + px * vec2(0.0, 1.5)).rgb + texture2D(tRefl, uv - px * vec2(0.0, 1.5)).rgb);
  // старение амальгамы по краям
  vec2 e = vec2(${GLASS.x.toFixed(3)}, ${((GLASS.y1 - GLASS.y0) / 2).toFixed(3)}) - abs(g);
  float edge = min(e.x, e.y);
  float fox = smoothstep(0.55, 0.85, fbm3(vec3(g * 9.0, 1.3))) * (1.0 - smoothstep(0.02, 0.16, edge));
  fox += smoothstep(0.72, 0.9, fbm3(vec3(g * 22.0, 5.1))) * 0.6;
  float spots = smoothstep(0.78, 0.86, vnoise(vec3(g * 60.0, 2.0))) * 0.5;
  vec3 col = refl * vec3(0.80, 0.84, 0.88);
  col *= 1.0 - clamp(fox * 0.75 + spots * 0.4, 0.0, 0.92);
  col += vec3(0.05, 0.04, 0.03) * fox * 0.15;
  // пыль/мутность и полировка
  float clean = 0.0;
  for (int i = 0; i < ${MAX_STROKES}; i++) { vec4 s = uStroke[i]; if (s.w <= 0.0) continue;
    float dd = length((g - s.xy) / vec2(1.0, 0.8)); clean = max(clean, s.w * (1.0 - smoothstep(s.z * 0.35, s.z, dd))); }
  clean *= 0.85 + 0.15 * fbm3(vec3(g * 25.0, 2.0));
  float dirt = uDirt * (0.65 + 0.5 * fbm3(vec3(g * 14.0, 9.0))) * (1.0 - clean);
  // мутная плёнка гасит отражение и рассеивает свет лампы
  float lampN = max(0.0, 1.0 - length(vW - uLampG) / 2.6);
  col = mix(col, vec3(0.06, 0.055, 0.05) * (0.4 + 1.6 * lampN) + col * 0.3, clamp(dirt, 0.0, 0.92));
  // глубокий серебряный блеск после полировки
  col *= 1.0 + clean * 0.25 * (1.0 - uDirt * 0.3);
  // царапины ловят свет
  float sc = smoothstep(0.985, 1.0, sin((g.x * 0.8 + g.y) * 900.0 + vnoise(vec3(g * 30.0, 3.0)) * 40.0)) * smoothstep(0.6, 0.8, vnoise(vec3(g * 6.0, 4.0)));
  col += vec3(1.0, 0.75, 0.45) * sc * lampN * 0.4;
  // перламутровый перелив ртути под стеклом (видно при полировке)
  float irid = (1.0 - dirt) * smoothstep(0.4, 0.9, fbm3(vec3(g * 5.0, uT * 0.05)));
  col += 0.02 * irid * vec3(0.5 + 0.5 * sin(g.x * 40.0 + 1.0), 0.5 + 0.5 * sin(g.x * 40.0 + 3.0), 0.5 + 0.5 * sin(g.x * 40.0 + 5.0)) * lampN;
  // жидкая ртуть: тяжелее, темнее, с бликами
  float liq = uLiquid * clamp(length(rn) * 60.0, 0.0, 1.0);
  col = mix(col, col * vec3(0.5, 0.54, 0.6) + vec3(0.75, 0.8, 0.88) * pow(clamp(dot(normalize(vec3(rn * 30.0, 1.0)), normalize(vec3(0.4, 0.6, 0.7))), 0.0, 1.0), 60.0) * 0.5, liq);
  // отпечатки ладоней изнутри: кровь + ртуть, сползают вниз и оставляют полосы
  if (uPrints.w > 0.0) {
    for (int k = 0; k < 2; k++) {
      float sx = k == 0 ? -1.0 : 1.0;
      vec2 c0 = vec2(k == 0 ? 0.12 : 0.33, uPrints.x + (k == 0 ? 0.0 : 0.07));
      float slide = uPrints.y * (k == 0 ? 1.0 : 0.85);
      vec2 c = c0 - vec2(0.0, slide);
      vec2 pp = (g - c) * vec2(sx, 1.0);
      float dp = palm(vec2(pp.x, pp.y) / 1.55) * 1.55;
      float body = 1.0 - smoothstep(-0.005, 0.005, dp + (vnoise(vec3(g * 70.0, float(k))) - 0.5) * 0.006);
      // полосы от пальцев и ладони вверх (след сползания)
      float strip = 0.0;
      for (int j = 0; j < 5; j++) { float fx = c.x + sx * (-0.055 + float(j) * 0.029); float w = 0.009 + 0.005 * vnoise(vec3(float(j), float(k), 1.0));
        strip = max(strip, (1.0 - smoothstep(w * 0.5, w, abs(g.x - fx))) * step(c.y + 0.02, g.y) * step(g.y, c0.y + 0.09) * (1.0 - smoothstep(0.0, slide + 0.05, g.y - c.y)) ); }
      float m = max(body, strip * 0.75) * uPrints.w;
      float merc = smoothstep(0.45, 0.7, vnoise(vec3(g * 40.0, 7.0 + float(k))));
      vec3 blood = vec3(0.16, 0.004, 0.006) * (0.6 + 0.6 * lampN);
      vec3 hg = vec3(0.75, 0.8, 0.85) * (0.3 + 1.2 * lampN);
      col = mix(col, mix(blood, hg, merc * 0.45), m * 0.92);
    }
  }
  col += uGlow * (0.4 + 0.6 * fbm3(vec3(g * 4.0, uT * 0.4)));
  col *= 1.0 - uDarken;
  gl_FragColor = vec4(col, 1.0);
  // глубина отражения → глубина основной камеры
  float z = lin(dv);
  float d = (1.0 / z - 1.0 / near) / (1.0 / far - 1.0 / near);
  gl_FragDepth = clamp(d, 0.0, 1.0);
}`;

export class Mirror {
  frame: THREE.Mesh; glass: THREE.Mesh; mat: THREE.ShaderMaterial;
  rt: THREE.WebGLRenderTarget; vcam = new THREE.PerspectiveCamera();
  texMatrix = new THREE.Matrix4();
  clip = [new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.002)];
  strokes: THREE.Vector4[] = [];
  enabled = true;

  constructor(frameGeo: THREE.BufferGeometry, frameMat: THREE.Material, W: number, H: number) {
    this.frame = new THREE.Mesh(frameGeo, frameMat); this.frame.castShadow = true; this.frame.receiveShadow = true;
    this.rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: true, samples: 0 });
    this.rt.depthTexture = new THREE.DepthTexture(W, H, THREE.UnsignedIntType);
    for (let i = 0; i < MAX_STROKES; i++) this.strokes.push(new THREE.Vector4(0, 0, 0, 0));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS,
      uniforms: {
        tRefl: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, texMatrix: { value: this.texMatrix }, near: { value: 0.05 }, far: { value: 40 },
        res: { value: new THREE.Vector2(W, H) }, uDirt: { value: 0 }, uStroke: { value: this.strokes }, uT: { value: 0 },
        uRipple: { value: new THREE.Vector4() }, uRipple2: { value: new THREE.Vector4() }, uHaze: { value: new THREE.Vector4(0, 0, 0.1, 0.1) }, uHazeAmt: { value: 0 },
        uPrints: { value: new THREE.Vector4() }, uGlow: { value: new THREE.Color(0, 0, 0) }, uDarken: { value: 0 }, uLampG: { value: new THREE.Vector3() }, uLiquid: { value: 0 },
      },
    });
    this.mat.stencilWrite = true; this.mat.stencilRef = 1; this.mat.stencilFunc = THREE.AlwaysStencilFunc; this.mat.stencilZPass = THREE.ReplaceStencilOp;
    const gg = new THREE.PlaneGeometry(GLASS.x * 2 + 0.02, GLASS.y1 - GLASS.y0 + 0.02);
    this.glass = new THREE.Mesh(gg, this.mat);
    this.glass.position.set(0, (GLASS.y0 + GLASS.y1) / 2, 0.0);
    this.glass.renderOrder = -10;
    this.glass.layers.set(LAYER.REAL);
  }

  // точка в мире → локальные координаты стекла
  toGlass(p: THREE.Vector3) { return new THREE.Vector2(p.x, p.y - (GLASS.y0 + GLASS.y1) / 2); }

  renderReflection(r: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.PerspectiveCamera) {
    cam.updateMatrixWorld();
    const v = this.vcam;
    v.copy(cam, false);
    const S = new THREE.Matrix4().makeScale(1, 1, -1);
    // отражение позиции, направления взгляда и «верха»
    const pos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld).applyMatrix4(S);
    const fwd = new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld).applyMatrix4(S);
    const up = new THREE.Vector3(0, 1, 0).transformDirection(cam.matrixWorld).applyMatrix4(S);
    v.position.copy(pos); v.up.copy(up); v.lookAt(pos.clone().add(fwd));
    v.near = cam.near; v.far = cam.far; v.fov = cam.fov; v.aspect = cam.aspect; v.updateProjectionMatrix();
    v.updateMatrixWorld(); v.matrixWorldInverse.copy(v.matrixWorld).invert();
    v.layers.set(LAYER.BOTH); v.layers.enable(LAYER.MIRROR);
    this.texMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.texMatrix.multiply(v.projectionMatrix).multiply(v.matrixWorldInverse);
    this.mat.uniforms.near.value = cam.near; this.mat.uniforms.far.value = cam.far;
    const old = r.clippingPlanes;
    r.clippingPlanes = this.clip;
    r.setRenderTarget(this.rt);
    r.setClearColor(0x000000, 1); r.clear();
    r.render(scene, v);
    r.clippingPlanes = old;
  }

  setStrokes(list: [number, number, number, number][]) {
    for (let i = 0; i < MAX_STROKES; i++) {
      const s = list[i];
      if (s) this.strokes[i].set(s[0], s[1], s[2], s[3]); else this.strokes[i].set(0, 0, 0, 0);
    }
  }
}
