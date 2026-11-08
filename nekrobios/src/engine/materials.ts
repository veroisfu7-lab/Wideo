// Материалы: кожа (с бровями, губами, щетиной по объектным координатам), ткань худи, джинсы, кеды, волосы, глаза, зубы.
// Всё — MeshPhysicalMaterial с инъекциями шейдера (bump по шуму через производные экрана, запечённый AO из атрибута).
import * as THREE from "three";

export const NOISE_GLSL = `
float sq(float x){ return x * x; }
float nh3(vec3 p){ p = fract(p*0.3183099 + vec3(0.71,0.113,0.419)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(nh3(i+vec3(0,0,0)), nh3(i+vec3(1,0,0)), f.x), mix(nh3(i+vec3(0,1,0)), nh3(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(nh3(i+vec3(0,0,1)), nh3(i+vec3(1,0,1)), f.x), mix(nh3(i+vec3(0,1,1)), nh3(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*vnoise(p); p = p*2.03 + 1.7; a *= 0.5; } return s; }
vec3 bumpN(vec3 surf_pos, vec3 surf_norm, float h, float faceDirection){
  vec2 dHdxy = vec2(dFdx(h), dFdy(h));
  vec3 vSigmaX = dFdx(surf_pos); vec3 vSigmaY = dFdy(surf_pos); vec3 vN = surf_norm;
  vec3 R1 = cross(vSigmaY, vN); vec3 R2 = cross(vN, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

type Inject = {
  uniforms?: Record<string, THREE.IUniform>;
  vDecl?: string; vMain?: string;       // vMain выполняется после begin_vertex (до морфов/скиннинга): доступны position, ao
  fDecl?: string; fColor?: string;      // после color_fragment: diffuseColor
  fRough?: string;                      // после metalnessmap_fragment: roughnessFactor, metalnessFactor
  fNormal?: string;                     // после normal_fragment_maps: normal
  fLight?: string;                      // после aomap_fragment: reflectedLight
  fEnd?: string;                        // перед dithering: gl_FragColor
  key: string;
};

export function patch<M extends THREE.Material>(m: M, inj: Inject): M {
  const u = inj.uniforms ?? {};
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    const decls = Object.keys(u).map((k) => {
      const v = u[k].value;
      const t = typeof v === "number" ? "float" : v instanceof THREE.Color ? "vec3" : v instanceof THREE.Vector3 ? "vec3" : v instanceof THREE.Vector2 ? "vec2"
        : v instanceof THREE.Vector4 ? "vec4" : v instanceof THREE.Matrix4 ? "mat4" : "sampler2D";
      return `uniform ${t} ${k};`;
    }).join("\n");
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>\n${decls}\nvarying vec3 vLocal; varying float vAO;\n#ifdef HAS_AO\nattribute float ao;\n#endif\n${inj.vDecl ?? ""}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\nvLocal = position;\n#ifdef HAS_AO\nvAO = ao;\n#else\nvAO = 1.0;\n#endif\n${inj.vMain ?? ""}`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\n${decls}\nvarying vec3 vLocal; varying float vAO;\n${NOISE_GLSL}\n${inj.fDecl ?? ""}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${inj.fColor ?? ""}`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>\n${inj.fRough ?? ""}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${inj.fNormal ?? ""}`)
      .replace("#include <aomap_fragment>", `#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= vAO; reflectedLight.indirectSpecular *= mix(1.0, vAO, 0.8);\nreflectedLight.directDiffuse *= mix(1.0, vAO, 0.45); reflectedLight.directSpecular *= mix(1.0, vAO, 0.6);\n${inj.fLight ?? ""}`)
      .replace("#include <dithering_fragment>", `${inj.fEnd ?? ""}\n#include <dithering_fragment>`);
  };
  m.customProgramCacheKey = () => inj.key;
  return m;
}

// атрибут ao есть не у всех мешей — define
export const withAO = (m: THREE.Material) => { (m as any).defines = { ...((m as any).defines ?? {}), HAS_AO: "" }; return m; };

export type SkinUniforms = { uMetal: THREE.IUniform<number>; uPale: THREE.IUniform<number>; uWet: THREE.IUniform<number> };

// --------------------------------------------------------------------- кожа головы
export function skinMaterial(kind: "head" | "hand", U: SkinUniforms) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0, sheen: 0.12, sheenColor: new THREE.Color(0.9, 0.45, 0.35), sheenRoughness: 0.45,
    specularIntensity: 0.55, clearcoat: 0.0 });
  const headMasks = `
    vec3 p = vLocal; float ax = abs(p.x);
    float brow = vMask.x; float lips = vMask.y; float cav = vMask.z;
    float strands = vnoise(vec3(p.x * 900.0 + p.y * 300.0, p.y * 2600.0, p.z * 400.0));
    brow = clamp(brow * (0.55 + 0.6 * strands), 0.0, 1.0);
    float stub = vMask.w * (0.6 + 0.4 * vnoise(p * 3000.0));
    float red = exp(-dot(p - vec3(0.0, -0.03, 0.105), p - vec3(0.0, -0.03, 0.105)) / 0.0004)
              + 0.6 * exp(-dot(vec3(ax, p.y, p.z) - vec3(0.045, -0.03, 0.06), vec3(ax, p.y, p.z) - vec3(0.045, -0.03, 0.06)) / 0.0006)
              + 0.8 * smoothstep(0.072, 0.082, ax) * step(-0.045, p.y) * step(p.y, 0.025);
    float eyeA = exp(-dot(vec3(ax, p.y, p.z) - vec3(0.0318, 0.004, 0.073), vec3(ax, p.y, p.z) - vec3(0.0318, 0.004, 0.073)) / 0.00025);
  `;
  const inj: Inject = {
    key: "skin-" + kind,
    uniforms: U as any,
    fColor: (kind === "head" ? headMasks : `vec3 p = vLocal; float lips = 0.0, cav = 0.0, brow = 0.0, stub = 0.0, red = 0.0, eyeA = 0.0;`) + `
    vec3 base = vec3(0.56, 0.39, 0.32);
    base *= 0.92 + 0.16 * vnoise(p * 180.0);
    base = mix(base, vec3(0.70, 0.33, 0.27), clamp(red, 0.0, 1.0) * 0.35);
    base = mix(base, vec3(0.50, 0.24, 0.22), lips * 0.75);
    base = mix(base, vec3(0.34, 0.27, 0.24), stub * 0.45);
    base = mix(base, base * vec3(0.82, 0.74, 0.74), eyeA * 0.5);
    base = mix(base, vec3(0.07, 0.045, 0.03), clamp(brow, 0.0, 1.0) * 0.85);
    #ifdef HAS_NAIL
    base = mix(base, vec3(0.72, 0.52, 0.48), vNail * 0.85);
    #endif
    base = mix(base, base * vec3(0.78, 0.8, 0.84), uPale);
    base = mix(base, vec3(0.06, 0.012, 0.012), cav);
    vec3 silver = vec3(0.62, 0.66, 0.70) * (0.8 + 0.3 * vnoise(p * 90.0));
    diffuseColor.rgb = mix(base, silver, uMetal);
    float skinCav = cav; float skinLips = lips;`,
    fRough: `roughnessFactor = mix(roughnessFactor - 0.12*skinLips + 0.15*skinCav, 0.3 + 0.12*vnoise(vLocal*140.0), uMetal);
             roughnessFactor = mix(roughnessFactor, 0.12, uWet);
             metalnessFactor = mix(0.0, 0.55, uMetal);`,
    fNormal: `{ float hb = (vnoise(vLocal * 2400.0) * 0.6 + vnoise(vLocal * 700.0) * 0.4) * 0.000035 * (1.0 - uMetal * 0.7);
              normal = bumpN(-vViewPosition, normal, hb, faceDirection); }`,
  };
  if (kind === "head") { inj.vDecl = "attribute vec4 mask; varying vec4 vMask;"; inj.vMain = "vMask = mask;"; inj.fDecl = "varying vec4 vMask;"; }
  if (kind === "hand") {
    inj.vDecl = "attribute float nail; varying float vNail;"; inj.vMain = "vNail = nail;"; inj.fDecl = "varying float vNail;";
    (m as any).defines = { HAS_NAIL: "" };
  }
  withAO(m);
  return patch(m, inj);
}

// --------------------------------------------------------------------- ткань
export function fabricMaterial(kind: "hoodie" | "jeans") {
  const hoodie = kind === "hoodie";
  const m = new THREE.MeshPhysicalMaterial({
    color: hoodie ? new THREE.Color(0.030, 0.030, 0.034) : new THREE.Color(0.030, 0.034, 0.045),
    roughness: hoodie ? 0.92 : 0.85, sheen: 0.6, sheenColor: hoodie ? new THREE.Color(0.10, 0.10, 0.115) : new THREE.Color(0.08, 0.09, 0.12), sheenRoughness: 0.5,
    specularIntensity: 0.25,
  });
  withAO(m);
  return patch(m, {
    key: "fabric-" + kind,
    fColor: `diffuseColor.rgb *= 0.85 + 0.3 * vnoise(vLocal * 60.0);`,
    fNormal: hoodie
      ? `{ float h = (vnoise(vLocal * vec3(1800.0, 900.0, 1800.0)) * 0.7 + vnoise(vLocal * 220.0) * 0.3) * 0.00018; normal = bumpN(-vViewPosition, normal, h, faceDirection); }`
      : `{ float tw = sin((vLocal.x + vLocal.y + vLocal.z) * 2600.0) * 0.5 + 0.5; float h = (tw * 0.6 + vnoise(vLocal * 400.0) * 0.4) * 0.00012; normal = bumpN(-vViewPosition, normal, h, faceDirection); }`,
  });
}

export function shoeMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: 0x111113, roughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color(0.2, 0.2, 0.22) });
  withAO(m);
  return patch(m, {
    key: "shoe",
    fColor: `float sole = 1.0 - smoothstep(0.024, 0.03, vLocal.y); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.58, 0.52), sole);`,
    fRough: `roughnessFactor = mix(roughnessFactor, 0.75, 1.0 - smoothstep(0.024, 0.03, vLocal.y));`,
  });
}

export function hairMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.022, 0.014, 0.009), roughness: 0.42, sheen: 0.8, sheenColor: new THREE.Color(0.35, 0.26, 0.2), sheenRoughness: 0.35, specularIntensity: 0.7 });
  withAO(m);
  return patch(m, {
    key: "hair",
    fColor: `diffuseColor.rgb *= 0.7 + 0.6 * vnoise(vLocal * vec3(2600.0, 600.0, 2600.0));`,
    fNormal: `{ float h = vnoise(vLocal * vec3(3200.0, 500.0, 3200.0)) * 0.00025; normal = bumpN(-vViewPosition, normal, h, faceDirection); }`,
  });
}

export function teethMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.62, 0.58, 0.5), roughness: 0.3, clearcoat: 0.3 });
}

// --------------------------------------------------------------------- глаза: сфера, +z — взгляд
export function eyeMaterial(U: { uMetal: THREE.IUniform<number>; uPupil: THREE.IUniform<number>; uSil: THREE.IUniform<number>; uGlint: THREE.IUniform<number> }) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 1.0, clearcoatRoughness: 0.03, metalness: 0 });
  return patch(m, {
    key: "eye",
    uniforms: U as any,
    fColor: `
      vec3 d = normalize(vLocal); float a = acos(clamp(d.z, -1.0, 1.0));
      float ang = atan(d.y, d.x);
      float iris = 1.0 - smoothstep(0.50, 0.53, a);
      float pupil = 1.0 - smoothstep(uPupil, uPupil + 0.03, a);
      float fib = vnoise(vec3(ang * 14.0, a * 40.0, 1.0)) * 0.6 + vnoise(vec3(ang * 40.0, a * 10.0, 3.0)) * 0.4;
      vec3 ic = mix(vec3(0.16, 0.09, 0.04), vec3(0.36, 0.25, 0.12), fib) * (0.6 + 0.6 * smoothstep(0.5, 0.2, a));
      ic = mix(ic, vec3(0.03, 0.02, 0.015), smoothstep(0.42, 0.51, a));
      vec3 scl = vec3(0.78, 0.72, 0.68) * (1.0 - 0.25 * smoothstep(0.8, 1.6, a));
      scl = mix(scl, vec3(0.7, 0.42, 0.38), 0.25 * vnoise(vec3(ang * 20.0, a * 6.0, 7.0)) * smoothstep(0.8, 1.3, a));
      vec3 c = mix(scl, ic, iris);
      c = mix(c, vec3(0.005), pupil);
      vec3 chrome = vec3(0.86, 0.9, 0.93);
      // отражение испуганного парня в ртутных глазах (силуэт: голова + плечи, контур от лампы)
      vec2 q = d.xy - vec2(0.05, -0.02);
      float head = length((q - vec2(0.0, 0.10)) / vec2(0.10, 0.12));
      float sh = length((q - vec2(0.0, -0.17)) / vec2(0.30, 0.14));
      float sil = (1.0 - smoothstep(0.92, 1.0, min(head, sh))) * step(0.0, d.z) * uSil;
      float rimS = (smoothstep(0.80, 0.95, min(head, sh)) - smoothstep(0.95, 1.05, min(head, sh))) * step(0.0, d.z) * uSil;
      chrome = mix(chrome, vec3(0.04, 0.035, 0.03), sil);
      chrome += vec3(1.0, 0.6, 0.25) * rimS * 0.8;
      diffuseColor.rgb = mix(c, chrome, uMetal);
      float eyePupil = pupil;`,
    fRough: `metalnessFactor = uMetal; roughnessFactor = mix(roughnessFactor, 0.02, uMetal);`,
    fEnd: `{ float fr = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition))); gl_FragColor.rgb += vec3(0.55, 0.6, 0.66) * uMetal * (0.12 + 0.35 * fr);
      gl_FragColor.rgb += vec3(0.75, 0.85, 1.0) * eyePupil * uGlint * 3.0; }`,
  });
}
