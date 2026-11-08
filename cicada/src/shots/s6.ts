// Сцена 6 «Финальный клиффхэнгер»: подземный архив — ряды безымянных серверов, экран со строкой; уход в чёрное и титры.

// uMode 0 — из глубины тоннеля на проём наверху лестницы (двое в проёме); 1 — через их плечи на дальний экран.
export const SERVERS = /* glsl */ `
uniform float uMode;
uniform float uScreen;   // 0..1 экран зажёгся
uniform float uHood;     // 0..1 Макс натянул капюшон
uniform float uDown;     // 0..1 Макс спустился на несколько ступеней
uniform float uHum;      // общая «жизнь» стоек
const float W = 1.5, CEIL = 4.2;
vec3 ro_, fw_, up_, rt_;
vec3 proj3(vec3 P){ vec3 d = P - ro_; float z = dot(d, fw_); return vec3(vec2(dot(d, rt_), dot(d, up_)) / max(z, 0.01), z); }
// стойка: рамы каждые 0.65 м, в каждой — сетка диодов
vec3 rackFace(vec3 h, float side){
  float u = h.z / 0.65; float id = floor(u); float fu = fract(u);
  float frame = step(fu, 0.06) + step(0.94, fu);
  vec3 c = vec3(0.04, 0.04, 0.046) * (0.8 + 0.4 * vnoise(vec2(h.z * 3.0, h.y * 30.0)));
  // юниты: горизонтальные щели
  float unit = step(0.85, fract(h.y * 9.0));
  c *= 1.0 - 0.6 * unit;
  c = mix(c, vec3(0.008), sat(frame));
  // диоды
  vec2 g = vec2(fu * 6.0, h.y * 9.0); vec2 gi = floor(g) + vec2(id * 7.0, side * 31.0); vec2 gf = fract(g) - vec2(0.5, 0.3);
  float led = 1.0 - ss(0.03, 0.07, length(gf * vec2(1.0, 2.2)));
  float blink = step(0.55, h21(gi + floor(uT * (2.0 + 6.0 * h21(gi))) * 0.37));
  vec3 lc = h21(gi * 1.3) > 0.7 ? AMBER : CYAN * 0.9;
  c += lc * led * blink * uHum * 4.0 * step(h.y, CEIL - 0.6) * step(0.3, h.y) * (1.0 - sat(frame));
  return c;
}
vec3 shade(vec3 ro, vec3 rd, out float tH){
  float tw = rd.x > 0.0 ? (W - ro.x) / rd.x : (-W - ro.x) / rd.x;
  float tf = rd.y < 0.0 ? (0.0 - ro.y) / rd.y : 1e4;
  float tc = rd.y > 0.0 ? (CEIL + (uMode < 0.5 ? 0.0 : 0.0) - ro.y) / rd.y : 1e4;
  float tEnd = rd.z * (uMode < 0.5 ? -1.0 : 1.0) > 0.0 ? ((uMode < 0.5 ? -2.0 : 34.0) - ro.z) / rd.z : 1e4;
  float t = min(min(tw, tf), min(tc, tEnd));
  tH = t;
  vec3 h = ro + rd * t;
  vec3 col;
  if (t == tw){
    col = rackFace(h, sign(rd.x));
    col += vec3(1.0, 0.7, 0.4) * 0.05 * ss(CEIL, 0.0, h.y);
  } else if (t == tc){
    // тёплые линейные светильники по центру потолка
    float strip = (1.0 - ss(0.04, 0.08, abs(h.x))) * step(0.5, fract(h.z / 2.5));
    col = vec3(0.02, 0.018, 0.016) + vec3(1.0, 0.75, 0.45) * strip * 1.6;
  } else if (t == tf){
    // полированный тёмный пол: отражение стоек и светильников
    vec3 rr = vec3(rd.x, -rd.y, rd.z);
    float t2 = rr.x > 0.0 ? (W - h.x) / rr.x : (-W - h.x) / rr.x;
    float t3 = (CEIL - h.y) / max(rr.y, 1e-3);
    vec3 refl;
    if (t2 < t3){ vec3 h2 = h + rr * t2; refl = rackFace(h2, sign(rr.x)) * 0.6; }
    else { vec3 h3 = h + rr * t3; refl = vec3(1.0, 0.75, 0.45) * (1.0 - ss(0.04, 0.12, abs(h3.x + (vnoise(h.xz * 20.0) - 0.5) * 0.03))) * step(0.5, fract(h3.z / 2.5)) * 0.8; }
    col = vec3(0.012, 0.011, 0.012) + refl * 0.55;
    // ступени (только в режиме 0 — у дальнего конца, ближе к камере; лестница вверх к проёму)
  } else {
    // торцевая стена
    vec2 q = h.xy;
    if (uMode > 0.5){
      // экран: огромный, тёмный, со строкой (текст — HTML)
      float sc = sdBox(q - vec2(0.0, 2.2), vec2(1.3, 0.75));
      col = vec3(0.01) + mix(vec3(0.0), vec3(0.06, 0.04, 0.02) + AMBER * 0.04, uScreen) * fill(sc, 0.01);
      col += AMBER * 0.25 * uScreen * exp(-max(sc, 0.0) * 4.0);
    } else {
      col = vec3(0.01);
    }
  }
  return col;
}
void main(){
  vec2 p = P0;
  if (uMode < 0.5){ ro_ = vec3(0.0, 0.9, 7.0); fw_ = normalize(vec3(0.0, 0.2, -1.0)); }
  else { ro_ = vec3(0.0, 2.9, -1.0 + uT * 0.12); fw_ = normalize(vec3(0.0, -0.1, 1.0)); }
  rt_ = normalize(cross(vec3(0.0, 1.0, 0.0), fw_));
  up_ = cross(fw_, rt_);
  vec3 rd = normalize(rt_ * p.x + up_ * p.y + fw_);
  float tH;
  vec3 col = shade(ro_, rd, tH);
  // тёплая дымка
  col = mix(col, vec3(0.09, 0.06, 0.035), 1.0 - exp(-tH * 0.04));
  if (uMode < 0.5){
    // проём наверху лестницы в дальнем конце (z = -2): холодная ночь с дождём, на её фоне — двое
    vec3 a = proj3(vec3(-0.9, 2.2, -2.0)), b = proj3(vec3(0.9, 4.2, -2.0));
    vec2 c = (a.xy + b.xy) * 0.5, hs = abs(b.xy - a.xy) * 0.5;
    float door = sdBox(p - c, hs);
    vec3 night = vec3(0.05, 0.08, 0.13) * (0.8 + 0.4 * fbm3(p * 20.0 + vec2(0.0, uT * 3.0)));
    float rain = step(0.85, h21(floor((p + vec2(0.0, uT * 0.8)) * vec2(160.0, 8.0)))) * 0.15;
    col = mix(col, night + rain * vec3(0.5, 0.6, 0.8), fill(door, PX));
    // лестница: ступени от проёма вниз к камере (y 2.2 → 0, z −2 → 4)
    for (int i = 0; i < 12; i++){
      float fi = float(i);
      float zz = -2.0 + fi * 0.5, yy = 2.2 - fi * 0.2;
      vec3 l = proj3(vec3(-W, yy, zz)), r = proj3(vec3(W, yy, zz));
      float edge = abs(p.y - l.y) ;
      col += vec3(1.0, 0.75, 0.45) * 0.25 * (1.0 - ss(0.0, 0.0025, edge)) * step(l.x, p.x) * step(p.x, r.x) * step(p.y, a.y + 0.001) ;
    }
    // фигуры в проёме: Апокриф справа, Макс слева; Макс спускается
    float hgt = 1.8;
    vec3 fa = vec3(0.4, 2.2, -1.5);
    vec3 fm = mix(vec3(-0.35, 2.2, -1.5), vec3(-0.3, 1.4, 2.4), uDown);
    float dmin = 1e3;
    for (int k = 0; k < 2; k++){
      vec3 f = k == 0 ? fa : fm;
      vec3 A = proj3(f), B = proj3(f + vec3(0.0, hgt, 0.0));
      float H = B.y - A.y;
      vec2 lp = (p - A.xy) / H;
      float d = sdPerson(lp, k == 1 ? uDown * 9.0 : 0.0, k == 1 ? 0.6 * sat(uDown * 4.0) * (1.0 - uDown) : 0.0, k == 0 ? 1.0 : 0.0, k == 1 ? uHood : 0.0) * H;
      dmin = min(dmin, d);
    }
    float m = fill(dmin, PX);
    col = mix(col, vec3(0.006, 0.006, 0.008), m);
    col += vec3(1.0, 0.72, 0.42) * m * (1.0 - ss(0.0, 0.003, -dmin)) * 0.45 * ss(a.y + 0.25, a.y - 0.05, p.y);
    col += vec3(0.5, 0.65, 0.9) * m * (1.0 - ss(0.0, 0.002, -dmin)) * 0.25;
  } else {
    // через плечи: двое спиной в нижней части кадра
    vec2 pm = (p - vec2(-0.17, -0.95)) / 1.0;
    vec2 pa = (p - vec2(0.2, -1.0)) / 1.1;
    float d = min(sdPerson(pm, 0.0, 0.0, 0.0, 0.0) * 1.0, sdPerson(pa, 0.0, 0.0, 1.0, 0.0) * 1.1);
    float m = fill(d, PX);
    col = mix(col, vec3(0.005, 0.005, 0.007), m);
    col += vec3(1.0, 0.72, 0.42) * m * (1.0 - ss(0.0, 0.004, -d)) * 0.7;
  }
  outColor = vec4(grade(col * 1.1, UV), 1.0);
}`;

// Финал: золотая гравировка цикады на чёрном, блик пробегает по линиям.
export const END = /* glsl */ `
uniform float uOn;   // 0..1 появление эмблемы
void main(){
  vec2 p = P0;
  vec2 ep = (p - vec2(0.0, 0.14)) / 0.17;
  float em = emblem(ep, PX / 0.17);
  float reveal = ss(0.0, 0.25, uOn * 1.4 - (ep.y * 0.5 + 0.5) * 0.6 - 0.1 * (1.0 - length(ep)) );
  reveal = ss(0.0, 0.3, uOn * 1.3 - (0.6 - ep.y * 0.4));
  float sweep = exp(-abs(ep.x + ep.y * 0.6 - mix(-1.5, 1.5, fract(uT * 0.35))) * 6.0);
  vec3 gold = mix(vec3(0.55, 0.36, 0.12), vec3(1.0, 0.85, 0.5), sweep);
  vec3 col = gold * em * reveal * 1.3;
  col += AMBER * 0.05 * exp(-length(ep) * 2.0) * reveal;
  outColor = vec4(grade(col, UV), 1.0);
}`;
