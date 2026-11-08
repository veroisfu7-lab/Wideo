// Сцена 3 «Неонуарный город»: переулок, псевдо-3D трассировка (пол-зеркало, стены с неоном, фонари, пар, дождь),
// силуэты Макса и прохожих с зонтами — 2D SDF в проекции.
export const ALLEY = /* glsl */ `
uniform float uMode;   // 0 — камера перед Максом (смотрит на него), 1 — за спиной, Макс уходит к арке
uniform vec3 uCam;     // позиция камеры
uniform float uMaxZ;   // z Макса
uniform float uWalk;   // фаза шага
uniform vec3 uLamp;    // 0..1 состояние трёх фонарей
uniform vec3 uSpark;   // время с момента гибели каждого фонаря (с), <0 — ещё жив
uniform float uPeople; // время для прохожих
const float W = 2.1;     // полуширина переулка
const float F = 0.95;    // фокус
uniform float uPitch;
#define PITCH uPitch
vec3 LP(int i){ return vec3(-1.35, 3.6, 18.0 + float(i) * 5.0); } // фонари на кронштейнах слева
vec3 fw(){ return vec3(0.0, sin(PITCH), cos(PITCH)); }
vec3 upv(){ return vec3(0.0, cos(PITCH), -sin(PITCH)); }
vec3 proj3(vec3 P){ vec3 d = P - uCam; float z = dot(d, fw()); return vec3(vec2(d.x, dot(d, upv())) * F / max(z, 0.01), z); }

// неоновые вывески на стенах: side, z, y, w, h
vec3 neonAt(vec3 h, float side){
  vec3 e = vec3(0.0);
  for (int i = 0; i < 7; i++){
    float fi = float(i);
    float sd = mod(fi, 2.0) < 1.0 ? -1.0 : 1.0;
    if (sd != side) continue;
    float z0 = 6.0 + fi * 4.3 + h11(fi * 3.7) * 2.0;
    float y0 = 2.2 + h11(fi * 5.3) * 1.6;
    vec2 wh = vec2(0.8 + h11(fi * 1.9) * 0.9, 0.25 + h11(fi * 8.1) * 0.3);
    vec2 q = vec2(h.z - z0, h.y - y0);
    float frame = abs(sdRBox(q, wh, 0.05));
    // «надпись»: ряд коротких штрихов-глифов
    vec2 g = q / vec2(wh.x, wh.y);
    float cell = floor(g.x * 4.0);
    float glyph = abs(fract(g.x * 4.0) - 0.5) < 0.32 ? abs(g.y - (h21(vec2(cell, fi)) - 0.5) * 0.6) : 1.0;
    glyph = min(glyph, abs(fract(g.x * 4.0) - 0.5) < 0.05 ? 0.0 : 1.0) ;
    float letters = step(abs(g.y), 0.55) * step(abs(g.x), 0.85) * (1.0 - ss(0.0, 0.08, glyph * wh.y));
    float k = h11(fi * 6.6);
    vec3 col = k < 0.5 ? CRIMSON * 1.6 : (k < 0.85 ? AMBER * 1.3 : CYAN);
    float fl = 1.0;
    if (h11(fi * 2.2) > 0.7) fl = step(0.25, vnoise(vec2(uT * 9.0, fi))) * 0.8 + 0.2;   // мигающая трубка
    e += col * fl * ((1.0 - ss(0.0, 0.018, frame)) * 2.4 + exp(-frame * 9.0) * 0.35 + letters * 1.4);
  }
  return e;
}
// стена: мокрый бетон, ставни лавок внизу, водосточные трубы
vec3 wallAlbedo(vec3 h, float side){
  float n = fbm(vec2(h.z * 0.6, h.y * 0.8) + side * 7.0);
  vec3 c = vec3(0.035, 0.038, 0.042) * (0.6 + 0.8 * n);
  float shop = step(h.y, 2.0) * step(0.3, fract(h.z / 6.0 + side * 0.3));
  float rib = 0.5 + 0.5 * sin(h.y * 60.0);
  c = mix(c, vec3(0.05, 0.052, 0.056) * (0.7 + 0.3 * rib), shop * 0.8);
  float pipe = 1.0 - ss(0.04, 0.06, abs(fract(h.z / 7.3) - 0.5) * 7.3);
  c = mix(c, vec3(0.02), pipe);
  float wet = ss(0.4, 0.8, fbm(vec2(h.z * 2.0, h.y * 0.3 - uT * 0.3)));     // потёки
  return c * (1.0 + wet * 0.5);
}
float lampOn(int i){ return i == 0 ? uLamp.x : (i == 1 ? uLamp.y : uLamp.z); }
float sparkT(int i){ return i == 0 ? uSpark.x : (i == 1 ? uSpark.y : uSpark.z); }
vec3 lampCol(){ return vec3(1.0, 0.72, 0.42); }
// освещение точки от фонарей (конус вниз) + дальнее зарево
vec3 lighting(vec3 h, vec3 n){
  vec3 L = vec3(0.0);
  for (int i = 0; i < 3; i++){
    vec3 d = LP(i) - h; float r = length(d);
    float cone = ss(0.35, 0.85, -d.y / r * -1.0 + 0.0);
    cone = ss(0.2, 0.75, dot(normalize(-d), vec3(0.0, -1.0, 0.0)));
    L += lampCol() * lampOn(i) * 9.0 * cone * max(dot(n, d / r), 0.0) / (1.0 + r * r);
  }
  // общий тёплый/багровый фон от вывесок
  L += vec3(0.25, 0.08, 0.08) * 0.08 + vec3(0.1, 0.1, 0.14) * 0.06;
  return L;
}
float inscat(vec3 ro, vec3 rd, vec3 L, float tm){
  vec3 q = ro - L; float b = dot(rd, q); float c = dot(q, q); float s = 1.0 / sqrt(max(c - b * b, 1e-4));
  return s * (atan((tm + b) * s) - atan(b * s));
}
// сцена по лучу (без силуэтов). Возвращает цвет; tHit — дистанция
vec3 trace(vec3 ro, vec3 rd, out float tHit, bool refl){
  float tf = rd.y < 0.0 ? -ro.y / rd.y : 1e4;
  float tw = rd.x > 0.0 ? (W - ro.x) / rd.x : (-W - ro.x) / rd.x;
  float tArch = uMode > 0.5 ? (34.0 - ro.z) / rd.z : 1e4;
  float t = min(min(tf, tw), tArch);
  tHit = t;
  vec3 h = ro + rd * t;
  vec3 col;
  if (t == tArch){
    // глухая кирпичная стена с аркой в конце переулка: тёмный проём
    vec2 q = vec2(h.x, h.y);
    float arch = min(sdBox(q - vec2(0.0, 1.0), vec2(1.1, 1.0)), sdCircle(q - vec2(0.0, 2.0), 1.1));
    vec2 b = vec2(h.x * 4.0 + step(0.5, fract(h.y * 6.0)) * 0.5, h.y * 6.0);
    float mortar = min(abs(fract(b.x) - 0.5), abs(fract(b.y) - 0.5) * 0.6);
    vec3 brick = vec3(0.08, 0.035, 0.025) * (0.6 + 0.6 * h21(floor(b))) * ss(0.02, 0.06, mortar);
    col = brick * (lighting(h, vec3(0.0, 0.0, -1.0)) * 1.5 + 0.06);
    col = mix(col, vec3(0.004), fill(arch, 0.03));
    col += AMBER * 0.04 * exp(-max(arch, 0.0) * 2.0);
  } else if (t == tw){
    float side = sign(rd.x);
    vec3 n = vec3(-side, 0.0, 0.0);
    col = wallAlbedo(h, side) * (lighting(h, n) * 4.0 + 0.5 + neonAt(h, side) * 0.0) + neonAt(h, side);
    col += wallAlbedo(h, side) * CRIMSON * 0.6 * exp(-abs(h.y - 3.0) * 0.6);
  } else {
    col = vec3(0.0);
  }
  return col;
}
float personD(vec2 p, vec3 foot, float walk, float amp, float coat, float hood, out float zc){
  vec3 a = proj3(foot), b = proj3(foot + vec3(0.0, 1.8, 0.0));
  zc = a.z;
  float H = b.y - a.y;
  if (a.z < 0.2) return 1e3;
  vec2 lp = (p - a.xy) / H;
  return sdPerson(lp, walk, amp, coat, hood) * H;
}
float umbrella(vec2 p, vec3 foot){
  vec3 a = proj3(foot), b = proj3(foot + vec3(0.0, 1.8, 0.0));
  float H = b.y - a.y; vec2 lp = (p - a.xy) / H;
  float dome = max(sdEll(lp - vec2(0.0, 1.0), vec2(0.36, 0.17)), -(lp.y - 1.0));
  dome = min(dome, sdSeg(lp, vec2(0.0, 1.0), vec2(0.03, 0.62)) - 0.008);
  return dome * H;
}
void main(){
  vec2 p = P0;
  vec3 ro = uCam;
  vec3 rd = normalize(vec3(p.x, 0.0, 0.0) + upv() * p.y + fw() * F);
  float tH;
  vec3 col = trace(ro, rd, tH, false);
  vec3 h = ro + rd * tH;
  bool floorHit = rd.y < 0.0 && abs(h.y) < 1e-3 + 0.01;
  if (rd.y < 0.0 && h.y < 0.01){
    // мокрый асфальт: лужи-зеркала + шероховатое отражение
    float pud = ss(0.45, 0.62, fbm(h.xz * 0.45));
    float rough = mix(0.06, 0.004, pud);
    vec2 jit = (vec2(vnoise(h.xz * 40.0), vnoise(h.xz * 40.0 + 9.0)) - 0.5) * rough * 2.0;
    vec3 rr = normalize(vec3(rd.x + jit.x, -rd.y, rd.z + jit.y));
    float t2; vec3 rc = trace(h + vec3(0.0, 0.001, 0.0), rr, t2, true);
    // отражения фонарей — вертикальные вытянутые пятна
    for (int i = 0; i < 3; i++){
      vec3 m = proj3(LP(i) * vec3(1.0, -1.0, 1.0));
      vec2 d = p - m.xy;
      rc += lampCol() * lampOn(i) * exp(-d.x * d.x * 9000.0 / (0.3 + rough * 30.0) - d.y * d.y * 70.0) * 1.4;
    }
    float fres = mix(0.25, 0.85, pud);
    vec3 asph = ASPHALT * 0.5 * (0.6 + 0.6 * vnoise(h.xz * 25.0)) * lighting(h, vec3(0.0, 1.0, 0.0)) * 3.0;
    // рябь от капель в лужах
    vec2 cell = floor(h.xz * 3.0); vec2 f = fract(h.xz * 3.0) - 0.5;
    float ph = fract(uT * 1.3 + h21(cell));
    float ring = (1.0 - ss(0.0, 0.03, abs(length(f) - ph * 0.45))) * (1.0 - ph) * pud;
    col = asph + rc * fres * (1.0 - 0.3 * ring) + ring * 0.03;
    // кромка у стен — темнее
    col *= ss(W, W - 0.4, abs(h.x)) * 0.6 + 0.4;
  }
  // небо — узкая щель над переулком
  if (rd.y > 0.0 && tH > 60.0) col = vec3(0.02, 0.025, 0.04) + vec3(0.2, 0.06, 0.05) * 0.1;
  // туман и рассеяние фонарей
  float fog = 1.0 - exp(-tH * 0.035);
  col = mix(col, INDIGO * 0.9 + vec3(0.06, 0.02, 0.02), fog);
  for (int i = 0; i < 3; i++){
    vec3 Lp = LP(i);
    col += lampCol() * lampOn(i) * inscat(ro, rd, Lp, tH) * 0.06;
    // сам фонарь: колпак и ядро
    vec3 s = proj3(Lp);
    if (s.z > 0.3){
      col += flare(p, s.xy, lampCol() * lampOn(i), 0.8 + 3.0 / s.z) * 0.9;
      col = mix(col, vec3(0.01), fill(sdBox(p - s.xy - vec2(0.0, 0.25 / s.z), vec2(0.18, 0.03) / s.z), PX) * 0.0);
    }
    // искры при гибели: падающие частицы со следом
    float st = sparkT(i);
    if (st > 0.0 && st < 1.6){
      for (int k = 0; k < 14; k++){
        float fk = float(k) + float(i) * 20.0;
        vec3 v = vec3(h11(fk) - 0.5, h11(fk * 1.3) * 0.8 + 0.2, h11(fk * 2.7) - 0.5) * vec3(3.0, 2.5, 3.0);
        float tt = st * (0.6 + 0.6 * h11(fk * 5.1));
        vec3 P = Lp + v * tt + vec3(0.0, -4.9, 0.0) * tt * tt;
        vec3 P2 = Lp + v * max(tt - 0.04, 0.0) + vec3(0.0, -4.9, 0.0) * max(tt - 0.04, 0.0) * max(tt - 0.04, 0.0);
        vec3 a = proj3(P), b = proj3(P2);
        if (a.z < 0.3 || P.y < 0.0) continue;
        float d = sdSeg(p, a.xy, b.xy);
        col += vec3(1.0, 0.7, 0.3) * (1.0 - ss(0.0, 0.0025, d)) * exp(-st * 2.0) * 3.0 + vec3(1.0, 0.6, 0.2) * exp(-d * 300.0) * exp(-st * 2.5) * 0.3;
      }
      // вспышка
      vec3 s2 = proj3(Lp);
      col += vec3(1.0, 0.85, 0.6) * exp(-st * 12.0) * exp(-length(p - s2.xy) * 6.0) * 2.0;
    }
  }
  // пар из-под решёток: объёмные клубы у земли
  float steam = 0.0;
  for (int k = 0; k < 6; k++){
    float tk = (float(k) + 0.5) / 6.0 * min(tH, 22.0);
    vec3 s = ro + rd * tk;
    float dens = ss(1.6, 0.0, s.y) * fbm3(vec2(s.x * 0.8 + uT * 0.15, s.y * 1.2 - uT * 0.6) + s.z * 0.3);
    dens *= ss(0.35, 0.75, dens + 0.25) ;
    steam += dens * 0.09;
  }
  vec3 steamCol = vec3(0.18, 0.12, 0.14) * 0.6 + lampCol() * 0.08 * (uLamp.x + uLamp.y + uLamp.z) / 3.0;
  col = mix(col, steamCol, sat(steam));
  // силуэты: прохожие с зонтами, затем Макс
  float zc;
  if (uMode < 0.5){
    for (int k = 0; k < 3; k++){
      float fk = float(k);
      float z = uCam.z + 1.5 + mod(uPeople * 1.1 + fk * 3.3, 10.0);
      float x = (fk == 1.0 ? 1.0 : -1.0) * (0.7 + 0.35 * fk * 0.5);
      vec3 foot = vec3(x, 0.0, z);
      float d = min(personD(p, foot, uPeople * 5.5 + fk, 1.0, 1.0, 0.0, zc), umbrella(p, foot));
      float occ = fill(d, PX * 1.5);
      if (zc < uMaxZ - uCam.z || true){
        float fogk = exp(-zc * 0.06);
        col = mix(col, mix(INDIGO * 0.9 + vec3(0.06, 0.02, 0.02), vec3(0.006, 0.007, 0.01), fogk), occ);
        col += CRIMSON * 0.5 * occ * (1.0 - ss(0.0, 0.003, -d)) * fogk;
      }
    }
  }
  vec3 mfoot = vec3(uMode > 0.5 ? 0.45 : 0.02 * sin(uWalk * 0.5), 0.0, uMaxZ);
  float md = personD(p, mfoot, uWalk, 1.0, 0.0, 0.0, zc);
  float mo = fill(md, PX * 1.2);
  vec2 e = vec2(0.002, 0.0);
  float mx1 = personD(p + e.xy, mfoot, uWalk, 1.0, 0.0, 0.0, zc), my1 = personD(p + e.yx, mfoot, uWalk, 1.0, 0.0, 0.0, zc);
  vec2 n = normalize(vec2(mx1 - md, my1 - md) + 1e-6);
  float edge = mo * (1.0 - ss(0.0, 0.0035, -md));
  vec3 body = vec3(0.006, 0.007, 0.009) + vec3(0.02, 0.02, 0.025) * fbm3(p * 80.0) * mo;
  col = mix(col, body, mo);
  // контровой свет: багровый слева, янтарный справа, сверху — фонари
  col += edge * (CRIMSON * 1.8 * pow(sat(-n.x), 2.0) + AMBER * 1.4 * pow(sat(n.x), 2.0) + lampCol() * 1.2 * pow(sat(n.y), 2.0) * (uLamp.x + uLamp.y + uLamp.z) / 3.0);
  col += mo * (CRIMSON * sat(-n.x) + AMBER * sat(n.x)) * 0.05 * exp(md * 60.0);
  // дождь: косые штрихи разных слоёв
  float rain = 0.0;
  for (int k = 0; k < 3; k++){
    float fk = float(k);
    vec2 rp = p * (1.6 + fk * 0.9) + vec2(uT * 0.25, uT * (5.0 + fk * 2.0));
    rp.x += rp.y * 0.08;
    vec2 cell = floor(rp * vec2(60.0, 3.0));
    vec2 f = fract(rp * vec2(60.0, 3.0));
    float hcell = h21(cell + fk * 17.0);
    float dr = step(0.86, hcell) * (1.0 - ss(0.0, 0.12, abs(f.x - 0.5))) * ss(0.0, 0.3, f.y) * ss(1.0, 0.6, f.y);
    rain += dr * (0.12 - fk * 0.03);
  }
  col += vec3(0.6, 0.65, 0.75) * rain;
  outColor = vec4(grade(col * 1.05, UV), 1.0);
}`;
