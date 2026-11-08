// Общая библиотека GLSL: шум, SDF, эмблема-цикада, силуэты, блики и цветокоррекция ролика.
// Координаты плана: p = (frag − 0.5·res) / res.y → x ∈ [−0.281, 0.281], y ∈ [−0.5, 0.5] (9:16).
export const HEADER = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uT; uniform float uF;
out vec4 outColor;

#define PI 3.14159265
#define INDIGO vec3(0.039,0.067,0.094)
#define ASPHALT vec3(0.071,0.086,0.102)
#define AMBER vec3(0.898,0.663,0.235)
#define CRIMSON vec3(0.659,0.094,0.153)
#define CYAN vec3(0.35,0.78,0.95)

float sat(float x){ return clamp(x, 0.0, 1.0); }
float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = mat2(1.6,1.2,-1.2,1.6) * p; a *= 0.5; } return s; }
float fbm3(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++){ s += a * vnoise(p); p = mat2(1.6,1.2,-1.2,1.6) * p; a *= 0.5; } return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float ss(float a, float b, float x){ return smoothstep(a, b, x); }
float win(float t, float a, float b, float fi, float fo){ return ss(a, a + fi, t) * (1.0 - ss(b - fo, b, t)); }

// ------------------------------------------------------------ SDF
float sdCircle(vec2 p, float r){ return length(p) - r; }
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdRBox(vec2 p, vec2 b, float r){ return sdBox(p, b - r) - r; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h); }
float sdEll(vec2 p, vec2 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-5); }
float sdCaps(vec2 p, vec2 a, vec2 b, float ra, float rb){ vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h) - mix(ra, rb, h); }
float sdTri(vec2 p, vec2 p0, vec2 p1, vec2 p2){
  vec2 e0 = p1-p0, e1 = p2-p1, e2 = p0-p2, v0 = p-p0, v1 = p-p1, v2 = p-p2;
  vec2 pq0 = v0 - e0*sat(dot(v0,e0)/dot(e0,e0)), pq1 = v1 - e1*sat(dot(v1,e1)/dot(e1,e1)), pq2 = v2 - e2*sat(dot(v2,e2)/dot(e2,e2));
  float s = sign(e0.x*e2.y - e0.y*e2.x);
  vec2 d = min(min(vec2(dot(pq0,pq0), s*(v0.x*e0.y-v0.y*e0.x)), vec2(dot(pq1,pq1), s*(v1.x*e1.y-v1.y*e1.x))), vec2(dot(pq2,pq2), s*(v2.x*e2.y-v2.y*e2.x)));
  return -sqrt(d.x)*sign(d.y); }
float smin(float a, float b, float k){ float h = sat(0.5 + 0.5 * (b - a) / k); return mix(b, a, h) - k * h * (1.0 - h); }
float fill(float d, float px){ return 1.0 - ss(-px, px, d); }
float stroke(float d, float w, float px){ return 1.0 - ss(w - px, w + px, abs(d)); }

// ------------------------------------------------------------ эмблема-цикада (вид сверху, голова вверх, размах ≈ ±0.36, высота ≈ ±0.45)
// x: тело, y: крылья, z: прожилки (0..1)
vec3 cicada(vec2 p){
  vec2 q = vec2(abs(p.x), p.y);
  float head = sdEll(q - vec2(0.0, 0.295), vec2(0.1, 0.042));
  float eye = sdEll(q - vec2(0.118, 0.285), vec2(0.03, 0.026));
  float thor = sdEll(q - vec2(0.0, 0.19), vec2(0.13, 0.08));
  thor = min(thor, sdTri(q, vec2(0.0, 0.27), vec2(0.135, 0.2), vec2(0.0, 0.1)));
  float abd = sdEll(q - vec2(0.0, -0.05), vec2(0.078, 0.2));
  float body = smin(smin(min(head, eye), thor, 0.02), abd, 0.03);
  // передние крылья: длинные капли, сложены назад
  vec2 w1 = rot(-0.36) * (q - vec2(0.13, -0.07));
  float fw = sdEll(w1, vec2(0.085, 0.34));
  vec2 w2 = rot(-0.95) * (q - vec2(0.17, 0.05));
  float hw = sdEll(w2, vec2(0.06, 0.17));
  float wing = min(fw, hw);
  // прожилки: продольные линии в системе крыла + поперечные дуги
  float v = 0.0;
  for (int i = -2; i <= 2; i++){ float x0 = float(i) * 0.032 + 0.01 * w1.y; v = max(v, 1.0 - ss(0.0, 0.006, abs(w1.x - x0 * (1.0 - 0.6 * sat(-w1.y / 0.34))))); }
  v = max(v, 1.0 - ss(0.0, 0.006, abs(length(w1 - vec2(0.0, -0.18)) - 0.12)));
  v = max(v, 1.0 - ss(0.0, 0.006, abs(length(w1 - vec2(0.0, -0.18)) - 0.2)));
  v *= step(fw, -0.004);
  // сегменты брюшка
  float seg = abs(fract((p.y + 0.25) / 0.045) - 0.5) * 0.045;
  v = max(v, (1.0 - ss(0.0, 0.004, seg - 0.0)) * step(abd, -0.006) * step(p.y, 0.1));
  return vec3(body, wing, v);
}
// эмблема: цикада внутри кольца со шкалой. Возвращает силу «гравировки» 0..1 (px — ширина пикселя в масштабе p)
float emblem(vec2 p, float px){
  vec3 c = cicada(p * 1.05 - vec2(0.0, 0.02));
  float lines = max(stroke(c.x, 0.006, px), stroke(c.y, 0.006, px));
  lines = max(lines, c.z * step(min(c.x, c.y), 0.0) * 0.8);
  float r = length(p);
  lines = max(lines, stroke(r - 0.5, 0.008, px));
  lines = max(lines, stroke(r - 0.54, 0.004, px));
  float a = atan(p.y, p.x); float tick = abs(fract(a / (2.0 * PI) * 33.0) - 0.5);
  lines = max(lines, step(tick, 0.08) * step(0.505, r) * step(r, 0.535));
  return lines;
}
float emblemFill(vec2 p){ vec3 c = cicada(p * 1.05 - vec2(0.0, 0.02)); return min(c.x, c.y); }

// ------------------------------------------------------------ силуэты (рост ≈ 1.0, ступни на y = 0, центр по x = 0)
// фигура анфас (рост 1.0 ≈ 1.8 м, 7.5 голов); walk — фаза шага, amp — размах; coat: 0 — худи+бомбер, 1 — длинное пальто; hood: 0..1
float sdLimb(vec2 p, vec2 a, vec2 b, vec2 c, float r0, float r1, float r2){ return min(sdCaps(p, a, b, r0, r1), sdCaps(p, b, c, r1, r2)); }
float sdPerson(vec2 p, float walk, float amp, float coat, float hood){
  float s = sin(walk) * amp, bob = abs(cos(walk)) * 0.008 * amp;
  p.y -= bob;
  float x = p.x, ax = abs(p.x);
  // голова, шея
  float head = sdEll(p - vec2(0.0, 0.928), vec2(0.046, 0.06));
  head = smin(head, sdEll(p - vec2(0.0, 0.9), vec2(0.04, 0.045)), 0.02);
  float hoodS = sdEll(p - vec2(0.0, 0.935), vec2(0.064, 0.074));
  hoodS = smin(hoodS, sdEll(p - vec2(0.0, 0.86), vec2(0.075, 0.04)), 0.03);
  head = mix(head, min(head, hoodS), step(0.5, hood));
  float neck = sdBox(p - vec2(0.0, 0.855), vec2(0.022, 0.03));
  // плечи и торс (покатые плечи, талия, бёдра)
  vec2 q = vec2(ax, p.y);
  float sh = sdCaps(q, vec2(0.0, 0.812), vec2(0.088, 0.8), 0.036, 0.032);
  float torso = sdTri(q, vec2(0.0, 0.83), vec2(0.115, 0.79), vec2(0.0, 0.48)) - 0.004;
  torso = min(torso, sdBox(q - vec2(0.0, 0.66), vec2(0.088 - 0.01 * sat((0.66 - q.y) * 8.0), 0.15)));
  float hips = sdEll(q - vec2(0.0, 0.5), vec2(0.088, 0.05));
  float body = smin(smin(sh, torso, 0.02), hips, 0.02);
  // бомбер: манжета-резинка на поясе чуть шире; капюшон худи на спине даёт «воротник»
  if (coat < 0.5){
    body = min(body, sdRBox(q - vec2(0.0, 0.52), vec2(0.094, 0.022), 0.01));
    body = smin(body, sdEll(p - vec2(0.0, 0.83), vec2(0.07, 0.03)), 0.02);
  } else {
    // пальто до колен, А-силуэт, высокий воротник-стойка
    float coatS = sdTri(q, vec2(0.0, 0.81), vec2(0.122, 0.79), vec2(0.0, 0.2));
    coatS = min(coatS, sdTri(q, vec2(0.0, 0.79), vec2(0.105, 0.75), vec2(0.0, 0.0)) );
    coatS = max(min(coatS, sdBox(q - vec2(0.0, 0.52), vec2(0.105 + (0.52 - q.y) * 0.08, 0.27))), -(q.y - 0.24 - 0.01 * sin(q.x * 40.0)));
    body = min(body, coatS);
    body = min(body, sdRBox(q - vec2(0.0, 0.838), vec2(0.05, 0.03), 0.012));
    head = min(head, sdCircle(q - vec2(0.045, 0.922), 0.011));
  }
  // руки: маятник, ближняя рука ниже и шире
  float aL = s * 0.035, aR = -s * 0.035;
  float armL = sdLimb(p, vec2(-0.105, 0.79), vec2(-0.122, 0.62 + aL * 0.3), vec2(-0.115 + aL * 0.4, 0.47 + aL), 0.031, 0.026, 0.021);
  float armR = sdLimb(p, vec2(0.105, 0.79), vec2(0.122, 0.62 + aR * 0.3), vec2(0.115 - aR * 0.4, 0.47 + aR), 0.031, 0.026, 0.021);
  float handL = sdEll(p - vec2(-0.114 + aL * 0.4, 0.44 + aL), vec2(0.019, 0.033));
  float handR = sdEll(p - vec2(0.114 - aR * 0.4, 0.44 + aR), vec2(0.019, 0.033));
  float arms = min(min(armL, armR), min(handL, handR));
  // ноги: дальняя ступня выше на экране
  float fL = max(-s, 0.0) * 0.035, fR = max(s, 0.0) * 0.035;
  float legL = sdLimb(p, vec2(-0.045, 0.5), vec2(-0.05, 0.27 + fL * 0.6), vec2(-0.05, 0.045 + fL), 0.044, 0.033, 0.025);
  float legR = sdLimb(p, vec2(0.045, 0.5), vec2(0.05, 0.27 + fR * 0.6), vec2(0.05, 0.045 + fR), 0.044, 0.033, 0.025);
  float shoeL = sdEll(p - vec2(-0.052, 0.022 + fL), vec2(0.034, 0.024));
  float shoeR = sdEll(p - vec2(0.052, 0.022 + fR), vec2(0.034, 0.024));
  float legs = min(min(legL, legR), min(shoeL, shoeR));
  float d = smin(head, neck, 0.012);
  d = smin(d, body, 0.015);
  d = min(d, arms);
  d = min(d, legs);
  return d;
}
// профиль головы и плеч (смотрит вправо, +x). Размер головы ≈ 0.25 по высоте. Центр черепа в (0,0)
float sdProfile(vec2 p, float hood){
  float skull = sdEll(p - vec2(-0.01, 0.01), vec2(0.105, 0.12));
  float face = sdEll(p - vec2(0.05, -0.03), vec2(0.06, 0.1));
  float brow = sdEll(p - vec2(0.078, 0.035), vec2(0.03, 0.022));
  float nose = sdTri(p, vec2(0.09, 0.03), vec2(0.128, -0.035), vec2(0.088, -0.045));
  float lip = sdEll(p - vec2(0.095, -0.075), vec2(0.016, 0.022));
  float chin = sdEll(p - vec2(0.072, -0.115), vec2(0.03, 0.03));
  float jaw = sdTri(p, vec2(-0.06, -0.05), vec2(0.085, -0.12), vec2(0.0, -0.15));
  float neck = sdBox(p - vec2(-0.02, -0.2), vec2(0.055, 0.08));
  float sh = sdEll(p - vec2(-0.06, -0.38), vec2(0.2, 0.15));
  float hair = 0.0;
  // взъерошенные волосы: шумная корона
  float a = atan(p.y - 0.02, p.x + 0.01);
  float crown = sdEll(p - vec2(-0.025, 0.035), vec2(0.115, 0.12)) - 0.012 * vnoise(vec2(a * 9.0, 1.0)) * step(0.2, a) * step(a, 2.9);
  float d = smin(skull, face, 0.03);
  d = smin(d, brow, 0.01);
  d = min(d, nose); d = smin(d, lip, 0.006); d = smin(d, chin, 0.02); d = smin(d, jaw, 0.02);
  d = min(d, crown);
  d = smin(d, neck, 0.03); d = smin(d, sh, 0.05);
  // капюшон, лежащий на плечах (сзади)
  d = smin(d, sdEll(p - vec2(-0.11, -0.2), vec2(0.07, 0.09)), 0.04);
  return d;
}

// ------------------------------------------------------------ свет и оптика
// анаморфный блик: горизонтальная синеватая полоса + ядро
vec3 flare(vec2 p, vec2 c, vec3 col, float k){
  vec2 d = p - c;
  float core = exp(-dot(d, d) * 9000.0 / k);
  float halo = exp(-length(d) * 22.0 / k) * 0.35;
  float streak = exp(-abs(d.y) * 1500.0 / k) * exp(-abs(d.x) * 3.5) * 0.3;
  return col * (core + halo) + mix(col, vec3(0.45, 0.65, 1.0), 0.6) * streak;
}
// боке-кружок с мягким краем и светлой каймой
float bokeh(vec2 p, vec2 c, float r){ float d = length(p - c) - r; return (1.0 - ss(-0.004, 0.004, d)) * (0.65 + 0.35 * ss(-r * 0.4, 0.0, d)); }

// ------------------------------------------------------------ грейд: ACES-подобная кривая, тени в индиго, зерно, виньетка
vec3 grade(vec3 c, vec2 uv){
  c = c * (2.51 * c + 0.03) / (c * (2.43 * c + 0.59) + 0.14);
  c = clamp(c, 0.0, 1.0);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, c + INDIGO * 0.9, 1.0 - ss(0.0, 0.35, l));      // подъём теней в индиго
  vec2 v = uv - 0.5; v.x *= 0.75;
  c *= 1.0 - 0.75 * dot(v, v) * 1.6;                          // виньетка
  float g = h21(gl_FragCoord.xy + fract(uF * 0.6180339) * 917.0) - 0.5;
  c += g * 0.045 * (1.0 - 0.6 * l);                           // плёночное зерно
  return pow(clamp(c, 0.0, 1.0), vec3(0.98, 1.0, 1.03));
}
#define P0 ((gl_FragCoord.xy - 0.5 * uRes) / uRes.y)
#define UV (gl_FragCoord.xy / uRes)
#define PX (1.5 / uRes.y)
`;
