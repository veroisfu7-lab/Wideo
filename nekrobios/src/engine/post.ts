// Пост-обработка «под плёнку»: DOF с овальным боке + размытие краёв (lens blur), bloom, анаморфный блик,
// хроматическая аберрация, тонмаппинг, грейдинг, виньетка, зерно 35 мм. Всё своё, без EffectComposer.
import * as THREE from "three";

export type PostParams = {
  focus: number;        // м, дистанция фокуса
  aperture: number;     // сила DOF (px при 1080 на «бесконечности»)
  maxCoc: number;       // предел радиуса размытия, px при 1080
  edgeBlur: number;     // px при 1080 — размытие краёв кадра
  bloom: number;        // сила bloom
  bloomThreshold: number;
  streak: number;       // анаморфный горизонтальный блик
  exposure: number;
  grain: number;        // 0.0–0.12
  vignette: number;     // 0–1
  chroma: number;       // px при 1080 на краю
  lift: [number, number, number];  // подъём теней (цвет)
  gain: [number, number, number];  // множитель светов
  sat: number;
  glitch: number;       // 0–1 цифровой глитч
  seed: number;         // кадр — для зерна/глитча
  shake: [number, number]; // сдвиг кадра в px (ручная камера) — делается камерой; тут не используется
  haze: [number, number, number, number]; // марево: x0,y0,x1,y1 в uv (0 = нет)
  vol: number;          // плотность объёмного света лампы
  volPos: [number, number, number]; volDir: [number, number, number]; volAngle: number; volColor: [number, number, number];
  hazeAmt: number;
  flash: number;        // общий засвет кадра (0..1)
  black: number;        // затемнение в чёрное (0..1)
};

export const defaultPost = (): PostParams => ({
  focus: 3, aperture: 6, maxCoc: 18, edgeBlur: 7, bloom: 0.55, bloomThreshold: 0.9, streak: 0.18, exposure: 1.0,
  grain: 0.055, vignette: 0.55, chroma: 1.6, lift: [0.010, 0.012, 0.016], gain: [1.0, 1.0, 1.0], sat: 1.06,
  glitch: 0, seed: 0, shake: [0, 0], haze: [0, 0, 0, 0], hazeAmt: 0, flash: 0, black: 0,
  vol: 0.05, volPos: [0.62, 2.28, 0.95], volDir: [-0.15, -0.985, -0.065], volAngle: 0.72, volColor: [1.0, 0.58, 0.25],
});

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const tri = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return g;
})();

const mk = (frag: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });

const rt = (w: number, h: number, type: THREE.TextureDataType = THREE.HalfFloatType) =>
  new THREE.WebGLRenderTarget(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), {
    type, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false,
  });

// --- шейдеры
const COC_FS = `
uniform sampler2D tColor; uniform sampler2D tDepth; uniform float near; uniform float far; uniform float focus;
uniform float aperture; uniform float maxCoc; uniform float edgeBlur; uniform vec2 res; varying vec2 vUv;
float lin(float d){ float z = d*2.0-1.0; return 2.0*near*far/(far+near-z*(far-near)); }
void main(){
  vec3 c = texture2D(tColor, vUv).rgb;
  float z = lin(texture2D(tDepth, vUv).x);
  float coc = aperture * (z - focus) / max(z, 1e-3);           // >0 дальний план, <0 ближний
  vec2 q = (vUv - 0.5) * vec2(1.0, 1.25); float r = length(q) * 2.0;
  float e = edgeBlur * smoothstep(0.42, 1.05, r);
  float a = clamp(abs(coc) + e, 0.0, maxCoc);
  gl_FragColor = vec4(c, a * sign(coc + 1e-5));
}`;

// gather с золотым углом, половинное разрешение. Овальное боке (анаморф): x сжат.
const BLUR_FS = `
uniform sampler2D tCoc; uniform vec2 px; uniform float scale; varying vec2 vUv;
void main(){
  vec4 c0 = texture2D(tCoc, vUv);
  float r0 = abs(c0.a) * scale;
  vec3 acc = c0.rgb; float wsum = 1.0;
  if (r0 > 0.5) {
    for (int i = 1; i < 40; i++) {
      float fi = float(i);
      float rr = sqrt(fi / 40.0) * r0;
      float th = fi * 2.39996323;
      vec2 o = vec2(cos(th) * 0.72, sin(th)) * rr;
      vec4 s = texture2D(tCoc, vUv + o * px);
      float rs = abs(s.a) * scale;
      // фон не тянет резкий передний план; ближний план размывается поверх
      float w = smoothstep(rr - 1.5, rr + 0.5, max(rs, s.a < 0.0 ? rs : min(rs, r0)));
      float lum = dot(s.rgb, vec3(0.3, 0.59, 0.11));
      w *= 1.0 + 1.5 * smoothstep(1.0, 4.0, lum);   // яркие точки — заметнее боке
      acc += s.rgb * w; wsum += w;
    }
  }
  gl_FragColor = vec4(acc / wsum, c0.a);
}`;

const DOFMIX_FS = `
uniform sampler2D tCoc; uniform sampler2D tBlur; uniform float scale; varying vec2 vUv;
void main(){
  vec4 s = texture2D(tCoc, vUv); vec4 b = texture2D(tBlur, vUv);
  float r = max(abs(s.a), abs(b.a) * step(b.a, 0.0)) * scale;   // ближний план расползается на соседей
  float k = smoothstep(0.35, 1.6, r);
  gl_FragColor = vec4(mix(s.rgb, b.rgb, k), 1.0);
}`;

const BRIGHT_FS = `
uniform sampler2D tColor; uniform float threshold; varying vec2 vUv; uniform vec2 px;
void main(){
  vec3 c = (texture2D(tColor, vUv + px*vec2(-0.5,-0.5)).rgb + texture2D(tColor, vUv + px*vec2(0.5,-0.5)).rgb
          + texture2D(tColor, vUv + px*vec2(-0.5,0.5)).rgb + texture2D(tColor, vUv + px*vec2(0.5,0.5)).rgb) * 0.25;
  c = min(c, vec3(60.0));
  float l = max(c.r, max(c.g, c.b));
  float k = max(l - threshold, 0.0); k = k * k / (k + 0.5);
  gl_FragColor = vec4(c * (k / max(l, 1e-4)), 1.0);
}`;

const DOWN_FS = `
uniform sampler2D tSrc; uniform vec2 px; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
  c += texture2D(tSrc, vUv + px*vec2(-1.0,-1.0)).rgb; c += texture2D(tSrc, vUv + px*vec2(1.0,-1.0)).rgb;
  c += texture2D(tSrc, vUv + px*vec2(-1.0,1.0)).rgb;  c += texture2D(tSrc, vUv + px*vec2(1.0,1.0)).rgb;
  gl_FragColor = vec4(c / 8.0, 1.0);
}`;

const UP_FS = `
uniform sampler2D tSrc; uniform sampler2D tPrev; uniform vec2 px; uniform float k; varying vec2 vUv;
void main(){
  vec3 c = vec3(0.0);
  c += texture2D(tSrc, vUv + px*vec2(-1.0, 0.0)).rgb * 2.0; c += texture2D(tSrc, vUv + px*vec2(1.0, 0.0)).rgb * 2.0;
  c += texture2D(tSrc, vUv + px*vec2(0.0, -1.0)).rgb * 2.0; c += texture2D(tSrc, vUv + px*vec2(0.0, 1.0)).rgb * 2.0;
  c += texture2D(tSrc, vUv + px*vec2(-1.0,-1.0)).rgb; c += texture2D(tSrc, vUv + px*vec2(1.0,-1.0)).rgb;
  c += texture2D(tSrc, vUv + px*vec2(-1.0, 1.0)).rgb; c += texture2D(tSrc, vUv + px*vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(texture2D(tPrev, vUv).rgb + c / 12.0 * k, 1.0);
}`;

const STREAK_FS = `
uniform sampler2D tSrc; uniform vec2 px; uniform float step_; varying vec2 vUv;
void main(){
  vec3 c = vec3(0.0); float ws = 0.0;
  for (int i = -6; i <= 6; i++) { float fi = float(i); float w = exp(-fi*fi/18.0);
    c += texture2D(tSrc, vUv + vec2(px.x * fi * step_, 0.0)).rgb * w; ws += w; }
  gl_FragColor = vec4(c / ws, 1.0);
}`;

const VOL_FS = `
uniform sampler2D tDepth; uniform float near; uniform float far; uniform mat4 invProj; uniform mat4 camWorld;
uniform vec3 Lpos; uniform vec3 Ldir; uniform float cosO; uniform float cosI; uniform vec3 Lcol; uniform float seed; uniform float mirrorZ; varying vec2 vUv;
float lin(float d){ float z = d*2.0-1.0; return 2.0*near*far/(far+near-z*(far-near)); }
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float nh3(vec3 p){ p = fract(p*0.3183099 + vec3(0.71,0.113,0.419)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(nh3(i), nh3(i+vec3(1,0,0)), f.x), mix(nh3(i+vec3(0,1,0)), nh3(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(nh3(i+vec3(0,0,1)), nh3(i+vec3(1,0,1)), f.x), mix(nh3(i+vec3(0,1,1)), nh3(i+vec3(1,1,1)), f.x), f.y), f.z); }
void main(){
  float z = lin(texture2D(tDepth, vUv).x);
  vec4 vp = invProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0); vec3 vd = normalize(vp.xyz / vp.w);
  float dist = z / max(-vd.z, 1e-3);
  dist = min(dist, 7.0);
  vec3 ro = (camWorld * vec4(0.0, 0.0, 0.0, 1.0)).xyz; vec3 rd = normalize((camWorld * vec4(vd, 0.0)).xyz);
  float j = h21(gl_FragCoord.xy + seed * 17.0);
  vec3 acc = vec3(0.0);
  const int N = 28;
  float stepL = dist / float(N);
  for (int i = 0; i < N; i++) {
    vec3 p = ro + rd * (stepL * (float(i) + j));
    if (p.z < mirrorZ) p.z = 2.0 * mirrorZ - p.z;
    vec3 d = p - Lpos; float L = length(d);
    float c = dot(d / max(L, 1e-4), Ldir);
    float cone = smoothstep(cosO, cosI, c);
    float n = 0.55 + 0.9 * vn(p * 2.5 + vec3(seed * 0.004, -seed * 0.006, 0.0)) * vn(p * 7.0);
    acc += cone * n / (0.25 + L * L) * stepL;
  }
  gl_FragColor = vec4(Lcol * acc, 1.0);
}`;

const FINAL_FS = `
uniform sampler2D tColor; uniform sampler2D tBloom; uniform sampler2D tStreak; uniform sampler2D tVol; uniform vec2 res;
uniform float bloom; uniform float streak; uniform float exposure; uniform float grain; uniform float vignette; uniform float chroma;
uniform vec3 lift; uniform vec3 gain; uniform float sat; uniform float glitch; uniform float seed; uniform float flash; uniform float black;
uniform vec4 haze; uniform float hazeAmt; varying vec2 vUv;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float h11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
vec3 aces(vec3 x){ const float a=2.51; const float b=0.03; const float c=2.43; const float d=0.59; const float e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0); }
vec3 toSRGB(vec3 c){ c = max(c, vec3(0.0)); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec2 uv = vUv;
  // цифровой глитч: сдвиг строк-полос
  if (glitch > 0.0) {
    float band = floor(uv.y * 48.0 + h11(seed) * 7.0);
    float g = step(1.0 - glitch * 0.55, h11(band * 1.7 + seed * 3.1));
    uv.x += g * (h11(band + seed) - 0.5) * 0.12 * glitch;
    float band2 = floor(uv.y * 220.0);
    uv.x += step(0.985 - glitch*0.05, h11(band2 + seed*7.0)) * 0.02 * glitch;
  }
  // марево (горячий асфальт) внутри прямоугольника
  if (hazeAmt > 0.0) {
    vec2 a = smoothstep(haze.xy, haze.xy + 0.03, uv) * (1.0 - smoothstep(haze.zw - 0.03, haze.zw, uv));
    float m = a.x * a.y * hazeAmt;
    uv += m * vec2(sin(uv.y * 160.0 + seed * 0.9) * 0.0025 + sin(uv.y*37.0 - seed*0.4)*0.002, sin(uv.x * 120.0 + seed * 0.7) * 0.0018);
  }
  vec2 d = uv - 0.5;
  float r2 = dot(d * vec2(1.0, 1.25), d * vec2(1.0, 1.25));
  vec2 ca = d * (chroma / res.x) * 2.0 * (0.3 + r2 * 2.2) + vec2(glitch * 0.006 * h11(seed+2.0), 0.0);
  vec3 c;
  c.r = texture2D(tColor, uv + ca).r;
  c.g = texture2D(tColor, uv).g;
  c.b = texture2D(tColor, uv - ca).b;
  c += texture2D(tVol, uv).rgb;
  vec3 bl = texture2D(tBloom, uv).rgb;
  vec3 st = texture2D(tStreak, uv).rgb;
  c += bl * bloom + st * streak * vec3(0.55, 0.85, 1.25);
  // halation: красноватый ореол вокруг светов (плёнка)
  c += bl * bloom * vec3(0.10, 0.02, 0.0);
  c *= exposure;
  c += flash * vec3(1.6, 1.55, 1.5);
  c = aces(c);
  // грейдинг: lift / gain / насыщенность
  c = c * gain + lift * (1.0 - c);
  float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(L), c, sat);
  // виньетка
  float v = smoothstep(1.15, 0.25, sqrt(r2) * 1.55);
  c *= mix(1.0, v, vignette);
  vec3 o = toSRGB(clamp(c, 0.0, 1.0));
  // зерно 35 мм: два октава, сильнее в средних тонах
  vec2 fc = gl_FragCoord.xy;
  float s = fract(seed * 0.618034);
  float n1 = h21(floor(fc / 1.6) + s * 917.0) - 0.5;
  float n2 = h21(fc + s * 311.0) - 0.5;
  float n = n1 * 0.65 + n2 * 0.45;
  float lum = dot(o, vec3(0.299, 0.587, 0.114));
  o += n * grain * (0.35 + 1.6 * lum * (1.0 - lum));
  o *= 1.0 - black;
  o += (h21(fc + 0.37) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(o, 0.0, 1.0), 1.0);
}`;

export class Post {
  W: number; H: number;
  sceneRT: THREE.WebGLRenderTarget;
  cocRT: THREE.WebGLRenderTarget; blurRT: THREE.WebGLRenderTarget; dofRT: THREE.WebGLRenderTarget;
  bright: THREE.WebGLRenderTarget; down: THREE.WebGLRenderTarget[]; up: THREE.WebGLRenderTarget[];
  streakA: THREE.WebGLRenderTarget; streakB: THREE.WebGLRenderTarget; volRT: THREE.WebGLRenderTarget;
  scene = new THREE.Scene(); cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); quad: THREE.Mesh;
  m: Record<string, THREE.ShaderMaterial> = {};
  dofScale = 0.5; // разрешение размытия

  constructor(public renderer: THREE.WebGLRenderer, W: number, H: number, samples = 4) {
    this.W = W; this.H = H;
    this.sceneRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples, depthBuffer: true, stencilBuffer: true });
    this.sceneRT.depthTexture = new THREE.DepthTexture(W, H, THREE.UnsignedInt248Type);
    this.sceneRT.depthTexture.format = THREE.DepthStencilFormat;
    this.cocRT = rt(W, H); this.dofRT = rt(W, H);
    this.blurRT = rt(W * this.dofScale, H * this.dofScale);
    this.bright = rt(W / 2, H / 2);
    this.down = []; this.up = [];
    let w = W / 2, h = H / 2;
    for (let i = 0; i < 6; i++) { w /= 2; h /= 2; this.down.push(rt(w, h)); }
    for (let i = 0; i < 6; i++) this.up.push(rt(this.down[i].width, this.down[i].height));
    this.streakA = rt(W / 4, H / 8); this.streakB = rt(W / 4, H / 8); this.volRT = rt(W / 2, H / 2);
    this.quad = new THREE.Mesh(tri);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    const u = (v: any) => ({ value: v });
    this.m.coc = mk(COC_FS, { tColor: u(null), tDepth: u(null), near: u(0.1), far: u(100), focus: u(3), aperture: u(6), maxCoc: u(18), edgeBlur: u(7), res: u(new THREE.Vector2(W, H)) });
    this.m.blur = mk(BLUR_FS, { tCoc: u(null), px: u(new THREE.Vector2()), scale: u(1) });
    this.m.mix = mk(DOFMIX_FS, { tCoc: u(null), tBlur: u(null), scale: u(1) });
    this.m.bright = mk(BRIGHT_FS, { tColor: u(null), threshold: u(1), px: u(new THREE.Vector2()) });
    this.m.down = mk(DOWN_FS, { tSrc: u(null), px: u(new THREE.Vector2()) });
    this.m.up = mk(UP_FS, { tSrc: u(null), tPrev: u(null), px: u(new THREE.Vector2()), k: u(1) });
    this.m.streak = mk(STREAK_FS, { tSrc: u(null), px: u(new THREE.Vector2()), step_: u(1) });
    this.m.final = mk(FINAL_FS, {
      tColor: u(null), tBloom: u(null), tStreak: u(null), res: u(new THREE.Vector2(W, H)), bloom: u(0.5), streak: u(0.2), exposure: u(1),
      grain: u(0.05), vignette: u(0.5), chroma: u(1.5), lift: u(new THREE.Vector3()), gain: u(new THREE.Vector3(1, 1, 1)), sat: u(1),
      glitch: u(0), seed: u(0), flash: u(0), black: u(0), haze: u(new THREE.Vector4()), hazeAmt: u(0),
    });
    this.m.vol = mk(VOL_FS, { tDepth: u(null), near: u(0.1), far: u(40), invProj: u(new THREE.Matrix4()), camWorld: u(new THREE.Matrix4()),
      Lpos: u(new THREE.Vector3()), Ldir: u(new THREE.Vector3()), cosO: u(0.7), cosI: u(0.9), Lcol: u(new THREE.Vector3()), seed: u(0), mirrorZ: u(0) });
    this.m.final.uniforms.tVol = u(null);
    this.m.copy = mk(`uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv); }`, { tSrc: u(null) });
  }

  pass(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.cam);
  }

  // сцена уже отрисована в sceneRT; дальше — цепочка
  finish(camera: THREE.PerspectiveCamera, p: PostParams, out: THREE.WebGLRenderTarget | null = null) {
    const k = this.W / 1080; // px-параметры заданы для 1080
    const c = this.m.coc.uniforms;
    c.tColor.value = this.sceneRT.texture; c.tDepth.value = this.sceneRT.depthTexture;
    c.near.value = camera.near; c.far.value = camera.far; c.focus.value = p.focus;
    c.aperture.value = p.aperture * k; c.maxCoc.value = p.maxCoc * k; c.edgeBlur.value = p.edgeBlur * k;
    this.pass(this.m.coc, this.cocRT);
    const b = this.m.blur.uniforms;
    b.tCoc.value = this.cocRT.texture; b.px.value.set(1 / this.W, 1 / this.H); b.scale.value = 1.0;
    this.pass(this.m.blur, this.blurRT);
    const mx = this.m.mix.uniforms;
    mx.tCoc.value = this.cocRT.texture; mx.tBlur.value = this.blurRT.texture; mx.scale.value = 1.0;
    this.pass(this.m.mix, this.dofRT);
    // bloom
    const br = this.m.bright.uniforms;
    br.tColor.value = this.dofRT.texture; br.threshold.value = p.bloomThreshold; br.px.value.set(1 / this.W, 1 / this.H);
    this.pass(this.m.bright, this.bright);
    let src = this.bright;
    for (const d of this.down) {
      const du = this.m.down.uniforms; du.tSrc.value = src.texture; du.px.value.set(1 / src.width, 1 / src.height);
      this.pass(this.m.down, d); src = d;
    }
    // up: up[i] = down[i] + upsample(up[i+1])
    for (let i = this.down.length - 1; i >= 0; i--) {
      const s = i === this.down.length - 1 ? this.down[i] : this.up[i + 1];
      const uu = this.m.up.uniforms; uu.tSrc.value = s.texture; uu.tPrev.value = this.down[i].texture;
      uu.px.value.set(1 / s.width, 1 / s.height); uu.k.value = 1.0;
      this.pass(this.m.up, this.up[i]);
    }
    // анаморфный блик из яркой карты
    const su = this.m.streak.uniforms;
    su.tSrc.value = this.down[0].texture; su.px.value.set(1 / this.streakA.width, 1 / this.streakA.height); su.step_.value = 2.0;
    this.pass(this.m.streak, this.streakA);
    su.tSrc.value = this.streakA.texture; su.step_.value = 7.0; this.pass(this.m.streak, this.streakB);
    su.tSrc.value = this.streakB.texture; su.step_.value = 20.0; this.pass(this.m.streak, this.streakA);
    const vu = this.m.vol.uniforms;
    vu.tDepth.value = this.sceneRT.depthTexture; vu.near.value = camera.near; vu.far.value = camera.far;
    vu.invProj.value.copy(camera.projectionMatrixInverse); vu.camWorld.value.copy(camera.matrixWorld);
    vu.Lpos.value.set(...p.volPos); vu.Ldir.value.set(...p.volDir).normalize(); vu.cosO.value = Math.cos(p.volAngle); vu.cosI.value = Math.cos(p.volAngle * 0.45);
    vu.Lcol.value.set(p.volColor[0] * p.vol, p.volColor[1] * p.vol, p.volColor[2] * p.vol); vu.seed.value = p.seed;
    this.pass(this.m.vol, this.volRT);
    const f = this.m.final.uniforms;
    f.tVol.value = this.volRT.texture;
    f.tColor.value = this.dofRT.texture; f.tBloom.value = this.up[0].texture; f.tStreak.value = this.streakA.texture;
    f.bloom.value = p.bloom; f.streak.value = p.streak; f.exposure.value = p.exposure; f.grain.value = p.grain; f.vignette.value = p.vignette;
    f.chroma.value = p.chroma * k; f.lift.value.set(...p.lift); f.gain.value.set(...p.gain); f.sat.value = p.sat;
    f.glitch.value = p.glitch; f.seed.value = p.seed; f.flash.value = p.flash; f.black.value = p.black;
    f.haze.value.set(...p.haze); f.hazeAmt.value = p.hazeAmt;
    this.pass(this.m.final, out);
  }
}
