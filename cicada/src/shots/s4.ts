// Сцена 4 «Встреча в арке»: стена с афишами под кирпичным сводом, УФ-луч, Апокриф выходит из тени, медальон.

// общие куски: кирпич и слои афиш
const WALL_LIB = /* glsl */ `
vec3 brick(vec2 p, float sc){
  vec2 b = vec2(p.x * sc + step(0.5, fract(p.y * sc * 2.0)) * 0.5, p.y * sc * 2.0);
  vec2 f = fract(b);
  float mortar = min(min(f.x, 1.0 - f.x) * 1.0, min(f.y, 1.0 - f.y) * 0.5);
  float hb = h21(floor(b));
  vec3 c = mix(vec3(0.09, 0.04, 0.03), vec3(0.16, 0.08, 0.05), hb) * (0.75 + 0.5 * fbm3(p * sc * 4.0));
  c = mix(vec3(0.02, 0.02, 0.022), c, ss(0.02, 0.06, mortar));
  return c;
}
// афиши: прямоугольники с рваными краями, выцветшие; возвращает (цвет, маска)
vec4 posters(vec2 p){
  vec4 r = vec4(0.0);
  for (int i = 0; i < 9; i++){
    float fi = float(i);
    vec2 c = vec2(h11(fi * 3.3) - 0.5, h11(fi * 7.1) - 0.45) * vec2(0.7, 0.75);
    vec2 sz = vec2(0.09 + 0.08 * h11(fi * 2.1), 0.13 + 0.09 * h11(fi * 5.7));
    vec2 q = rot((h11(fi * 9.9) - 0.5) * 0.12) * (p - c);
    float torn = (fbm3(q * 30.0 + fi) - 0.5) * 0.04;
    float d = sdBox(q, sz) + torn;
    float m = 1.0 - ss(-0.002, 0.002, d);
    float k = h11(fi * 4.4);
    vec3 paper = k < 0.33 ? vec3(0.32, 0.27, 0.2) : (k < 0.66 ? vec3(0.3, 0.1, 0.08) : vec3(0.18, 0.2, 0.22));
    // типографика: полосы-строки и крупный заголовок
    vec2 u = q / sz;
    float lines = step(0.5, fract(u.y * 7.0)) * step(abs(u.x), 0.8) * step(u.y, 0.2) * (0.4 + 0.6 * step(0.3, h21(floor(vec2(u.x * 6.0, u.y * 7.0)) + fi)));
    float title = step(0.45, u.y) * step(u.y, 0.8) * step(abs(u.x), 0.85) * step(0.35, h21(floor(vec2(u.x * 5.0, 0.0)) + fi * 2.0));
    paper *= 1.0 - 0.55 * max(lines * 0.6, title);
    paper *= 0.7 + 0.5 * fbm3(q * 12.0 + fi);                      // разводы, сырость
    paper *= 1.0 - 0.5 * ss(-0.03, 0.0, d);                          // загнутые края
    r = mix(r, vec4(paper, 1.0), m);
  }
  return r;
}
`;

export const ARCH = /* glsl */ WALL_LIB + `
uniform float uStep;   // 0..1 Макс подходит к стене
float opening(vec2 p){ return min(sdBox(p - vec2(0.0, -0.3), vec2(0.235, 0.42)), sdCircle(p - vec2(0.0, 0.12), 0.235)); }
void main(){
  vec2 p = P0;
  // глухая стена, закрывающая арку
  vec2 wp = p * 1.45;
  vec3 br = brick(wp, 9.0);
  vec4 ps = posters(wp * vec2(1.25, 0.95) + vec2(0.0, 0.12));
  vec3 wall = mix(br, ps.rgb, ps.a * 0.95);
  // свод: изнанка кирпичной арки в перспективе — тёмный кирпич, ряды сходятся к стене
  float op = opening(p);
  vec2 vq = p - vec2(0.0, 0.12);
  float rr = length(vq);
  float ang = atan(vq.y, vq.x);
  vec3 vault = brick(vec2(ang * 0.45, log(max(rr, 0.01)) * 0.6), 10.0) * 0.5;
  vec3 pil = brick(vec2(p.x * 0.7 / max(abs(p.x), 0.05), p.y / max(abs(p.x) * 4.0, 0.2)), 9.0) * 0.5;
  vec3 frame = p.y > 0.12 ? vault : pil;
  float depth = sat(op * 6.0);
  frame *= 0.35 * (1.0 - 0.6 * depth);
  // кольцо клинчатого кирпича по кромке проёма
  float ring = 1.0 - ss(0.0, 0.004, abs(op - 0.016) - 0.016);
  vec3 col = mix(wall, frame, ss(-0.002, 0.002, op));
  col = mix(col, brick(vec2(ang * 0.6, rr), 16.0) * 0.8, ring * step(0.12, p.y));
  // свет: холодный прожектор с улицы (из-за спины справа) + тень Макса на стене
  float mx = mix(0.05, 0.0, uStep);
  float spot = exp(-length((p - vec2(0.06, -0.05)) * vec2(1.4, 1.0)) * 2.4);
  vec2 sp = (p - vec2(mx - 0.1, -0.5)) / 0.8;
  float shadow = 1.0 - ss(-0.01, 0.02, sdPerson(sp, 0.0, 0.0, 0.0, 0.0) * 0.8);
  float lit = (0.12 + 2.2 * spot * (1.0 - 0.8 * shadow * step(op, 0.0)));
  col *= lit * vec3(0.75, 0.88, 1.0);
  col += vec3(0.5, 0.65, 0.9) * 0.08 * ring * spot;
  // капли с кромки свода
  for (int i = 0; i < 7; i++){
    float fi = float(i);
    float a0 = mix(0.4, PI - 0.4, h11(fi * 1.7));
    vec2 s0 = vec2(0.0, 0.12) + vec2(cos(a0), sin(a0)) * 0.265;
    float tt = fract(uT * (0.45 + h11(fi) * 0.4) + h11(fi * 3.0));
    vec2 dp = s0 - vec2(0.0, tt * tt * 1.1);
    col += vec3(0.7, 0.8, 1.0) * exp(-length((p - dp) * vec2(1.0, 0.3)) * 700.0) * 0.8 * spot * 2.0;
  }
  // Макс со спины
  vec2 mp = (p - vec2(mx + 0.02, -0.56)) / 0.66;
  float md = sdPerson(mp, 0.0, 0.0, 0.0, 0.0) * 0.66;
  float mo = fill(md, PX);
  col = mix(col, vec3(0.006, 0.007, 0.009), mo);
  col += vec3(0.55, 0.7, 0.95) * mo * (1.0 - ss(0.0, 0.003, -md)) * 1.2 * ss(-0.05, 0.1, p.x - mx);
  // занавес дождя за спиной (на переднем плане, расфокус)
  float rain = 0.0;
  for (int k = 0; k < 2; k++){
    vec2 rp = p * (0.9 + float(k) * 0.6) + vec2(0.0, uT * (2.6 + float(k)));
    vec2 cell = floor(rp * vec2(30.0, 1.5)); vec2 f = fract(rp * vec2(30.0, 1.5));
    rain += step(0.8, h21(cell + float(k) * 9.0)) * (1.0 - ss(0.0, 0.25, abs(f.x - 0.5))) * ss(0.0, 0.4, f.y) * ss(1.0, 0.6, f.y) * 0.1;
  }
  col += vec3(0.55, 0.65, 0.8) * rain;
  outColor = vec4(grade(col * 1.2, UV), 1.0);
}`;

export const UVWALL = /* glsl */ WALL_LIB + `
uniform vec2 uBeam;    // центр пятна УФ
uniform float uUV;     // 0..1 включение
void main(){
  vec2 p = P0;
  vec2 wp = p * 0.75 + vec2(0.02, 0.0);
  vec3 br = brick(wp, 9.0);
  vec4 ps = posters(wp * vec2(1.0, 0.9) * 1.0 + vec2(0.02, 0.06));
  ps.a = max(ps.a, 1.0 - ss(0.28, 0.3, length(wp)));         // в центре — слой бумаги поверх резьбы
  vec3 paper = vec3(0.3, 0.27, 0.22) * (0.6 + 0.5 * fbm3(wp * 14.0));
  ps.rgb = mix(paper, ps.rgb, step(0.5, ps.a) * step(0.31, length(wp)));
  vec3 col = mix(br, ps.rgb, ps.a);
  col *= vec3(0.1, 0.12, 0.16) * 0.9;                           // почти темнота
  // УФ-пятно
  float beam = exp(-pow(length((p - uBeam) * vec2(1.0, 1.15)) / 0.2, 2.5)) * uUV;
  vec3 uv = vec3(0.45, 0.2, 1.0);
  col += col * uv * beam * 6.0 + uv * 0.04 * beam;
  // под бумагой — выбитая цикада и круглое углубление: флуоресцирует в УФ
  vec2 ep = (wp - vec2(0.0, 0.0)) / 0.25;
  float em = emblem(ep, PX * 0.75 / 0.25);
  float recess = stroke(length(ep - vec2(0.0, 0.18)) - 0.07, 0.012, PX * 3.0) + 0.6 * (1.0 - ss(0.06, 0.072, length(ep - vec2(0.0, 0.18))));
  float carv = max(em, recess * 0.8);
  vec3 fluo = vec3(0.55, 0.85, 1.0) * 1.6 + vec3(0.6, 0.3, 1.0) * 0.6;
  col += fluo * carv * beam * 1.4;
  col += vec3(0.4, 0.2, 0.9) * 0.12 * beam * (1.0 - ss(0.0, 0.55, length(ep)));
  // свет УФ виден в мороси
  vec2 led = vec2(0.08, -0.62);
  vec2 dir = normalize(uBeam - led);
  vec2 rel = p - led;
  float along = dot(rel, dir), across = abs(dot(rel, vec2(-dir.y, dir.x)));
  float cone = ss(0.0, 0.05, along) * exp(-across / (0.02 + along * 0.25) * 2.0) * exp(-along * 1.2);
  col += uv * cone * 0.25 * uUV * (0.7 + 0.3 * fbm3(p * 20.0 + uT));
  // рука с телефоном снизу
  float hand = sdRBox(rot(-0.3) * (p - vec2(0.12, -0.6)), vec2(0.07, 0.11), 0.03);
  hand = smin(hand, sdCaps(p, vec2(0.18, -0.68), vec2(0.32, -0.9), 0.06, 0.08), 0.03);
  float hm = fill(hand, PX * 2.0);
  col = mix(col, vec3(0.008, 0.008, 0.012), hm);
  col += uv * hm * (1.0 - ss(0.0, 0.006, -hand)) * 0.6 * uUV;
  col += flare(p, led, uv * uUV * 0.8, 0.6);
  outColor = vec4(grade(col * 1.2, UV), 1.0);
}`;

// Апокриф: выход из тени опоры, панорама снизу вверх, блеск оправы, пар дыхания.
export const APO = /* glsl */ `
uniform float uTilt;   // 0 — ботинки, 1 — лицо
uniform float uOut;    // 0..1 выход из тени
uniform float uBreath; // фаза пара
void main(){
  vec2 p = P0;
  float S = 2.2;                                    // рост фигуры в высотах кадра
  vec2 base = vec2(mix(-0.12, 0.0, uOut), -mix(0.45, 0.88, uTilt) * S);
  vec2 lp = (p - base) / S;
  float d = sdPerson(lp, 0.0, 0.0, 1.0, 0.0) * S;
  // фон: тень опоры слева, мокрый кирпич, дождевой контровой свет справа
  vec3 col = vec3(0.01, 0.012, 0.016);
  col += vec3(0.25, 0.32, 0.45) * 0.38 * ss(-0.15, 0.35, p.x) * (0.6 + 0.4 * fbm3(p * 5.0 + vec2(0.0, uT * 2.0))) * (0.7 + 0.3 * ss(-0.5, 0.5, p.y));
  float pillar = step(p.x, -0.12 + 0.02 * sin(p.y * 3.0));
  col *= 1.0 - 0.85 * pillar;
  // дождь за спиной: светлые штрихи в контровом
  vec2 rp = p * 1.4 + vec2(0.0, uT * 3.2);
  vec2 cell = floor(rp * vec2(40.0, 2.0)); vec2 f = fract(rp * vec2(40.0, 2.0));
  col += vec3(0.5, 0.6, 0.75) * step(0.82, h21(cell)) * (1.0 - ss(0.0, 0.2, abs(f.x - 0.5))) * ss(0.0, 0.4, f.y) * ss(1.0, 0.6, f.y) * 0.12 * (1.0 - pillar);
  float m = fill(d, PX);
  vec2 e = vec2(0.002, 0.0);
  vec2 n = normalize(vec2(sdPerson((p + e.xy - base) / S, 0.0, 0.0, 1.0, 0.0) - sdPerson((p - e.xy - base) / S, 0.0, 0.0, 1.0, 0.0),
                          sdPerson((p + e.yx - base) / S, 0.0, 0.0, 1.0, 0.0) - sdPerson((p - e.yx - base) / S, 0.0, 0.0, 1.0, 0.0)) + 1e-6);
  // пальто: графит, фактура шерсти, складки; контровой холодный по правому краю и сверху
  vec3 coat = vec3(0.016, 0.017, 0.019) * (0.8 + 0.4 * fbm(lp * 200.0));
  float fold = 0.5 + 0.5 * sin(lp.x * 140.0 + fbm3(lp * 20.0) * 3.0);
  coat *= 0.85 + 0.3 * fold * step(lp.y, 0.55) * step(0.25, lp.y);
  col = mix(col, coat, m);
  float rim = m * (1.0 - ss(0.0, 0.004, -d)) * (pow(sat(n.x), 2.0) + 0.35 * pow(sat(n.y), 3.0));
  col += vec3(0.55, 0.7, 0.95) * rim * 1.2;
  // кожаный блеск ботинок и перчаток
  vec2 shoe = vec2(0.052, 0.022);
  float glove = exp(-length((lp - vec2(0.114, 0.44)) * vec2(1.0, 0.6)) * 120.0);
  col += vec3(0.5, 0.6, 0.75) * glove * 0.25 * m;
  // в руке — латунный медальон, ловит свет прожектора
  vec2 mpos = base + vec2(0.118, 0.425) * S;
  float med = sdCircle(p - mpos, 0.022);
  col = mix(col, AMBER * 0.25, fill(med, PX));
  col += flare(p, mpos + vec2(0.006, 0.008), AMBER * 0.9, 0.35) * 0.6;
  // голова в глубокой тени козырька; холодный блеск оправы очков, пар дыхания
  vec2 hc = base + vec2(0.0, 0.93) * S;
  vec2 hp = p - hc;
  float gl = 0.0;
  for (int i = 0; i < 2; i++){
    vec2 c = vec2(i == 0 ? -0.042 : 0.042, 0.004);
    gl = max(gl, stroke(sdRBox(hp - c * 0.8, vec2(0.022, 0.012), 0.009), 0.0011, PX) * (i == 0 ? 0.45 : 1.0));
  }
  gl = max(gl, stroke(sdSeg(hp, vec2(-0.012, 0.006), vec2(0.012, 0.006)), 0.001, PX) * 0.6);
  gl *= ss(-0.06, 0.04, hp.x);
  float glint = 0.35 + 0.65 * pow(sat(sin(uT * 1.3 + 0.5)), 8.0);
  col += vec3(0.75, 0.85, 1.0) * gl * glint * 0.9;
  col += flare(p, hc + vec2(0.052, 0.012), vec3(0.6, 0.75, 1.0) * glint * 0.35, 0.2);
  vec2 bp = hp - vec2(0.02, -0.07);
  float puff = fract(uBreath);
  float br = fbm(bp * 18.0 - vec2(puff * 2.0, 0.0)) * exp(-length((bp - vec2(puff * 0.08, 0.0)) * vec2(1.0, 1.5)) * 18.0) * sin(puff * PI);
  col += vec3(0.4, 0.5, 0.65) * br * 0.5;
  outColor = vec4(grade(col * 1.2, UV), 1.0);
}`;

// Латунный медальон-цикада в пальцах перчатки, под тусклым прожектором.
export const MEDAL = /* glsl */ `
uniform float uTurn;
float hgt(vec2 ep){
  float body = 1.0 - ss(-0.012, 0.012, emblemFill(ep));
  float rim = 1.0 - ss(0.0, 0.03, abs(length(ep) - 0.52) - 0.03);
  float disc = 1.0 - ss(0.56, 0.58, length(ep));
  vec3 c = cicada(ep * 1.05 - vec2(0.0, 0.02));
  return disc * 0.3 + body * 0.5 - c.z * 0.08 * body + rim * 0.35;
}
void main(){
  vec2 p = P0;
  vec2 mc = vec2(0.0, 0.02);
  vec2 ep = rot(0.15 + uTurn * 0.15) * (p - mc) / 0.28;
  ep.x /= mix(1.0, 0.9, uTurn);
  float e = 0.004;
  float h = hgt(ep);
  vec2 g = vec2(hgt(ep + vec2(e, 0.0)) - hgt(ep - vec2(e, 0.0)), hgt(ep + vec2(0.0, e)) - hgt(ep - vec2(0.0, e))) / (2.0 * e);
  vec3 n = normalize(vec3(-g * 0.08, 1.0));
  vec3 L = normalize(vec3(-0.35 + uTurn * 0.3, 0.7, 0.6));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), V), 0.0), 40.0);
  vec3 brass = vec3(0.55, 0.36, 0.13) * (0.75 + 0.35 * fbm(ep * 30.0));
  vec3 med = brass * (0.12 + 0.9 * diff) + vec3(1.0, 0.85, 0.55) * spec * 1.5;
  med += AMBER * 0.15 * pow(1.0 - n.z, 2.0);
  float disc = 1.0 - ss(0.575, 0.585, length(ep));
  // фон: темнота, мокрая морось в луче прожектора сверху
  vec3 col = vec3(0.008, 0.01, 0.014);
  float beam = exp(-abs(p.x + p.y * 0.25 - 0.02) * 5.0) * ss(-0.6, 0.5, p.y);
  col += vec3(0.35, 0.42, 0.55) * beam * 0.12 * (0.6 + 0.4 * fbm3(p * vec2(10.0, 3.0) + vec2(0.0, uT)));
  // пальцы перчатки: большой снизу-слева, указательный сверху-справа
  float f1 = sdCaps(p, vec2(-0.4, -0.5), vec2(-0.1, -0.13), 0.075, 0.058);
  float f2 = sdCaps(p, vec2(0.42, 0.42), vec2(0.115, 0.12), 0.068, 0.054);
  float f3 = sdCaps(p, vec2(0.45, 0.2), vec2(0.15, 0.03), 0.064, 0.052);
  float palmG = sdEll(p - vec2(0.5, -0.25), vec2(0.3, 0.38));
  float glove = smin(min(f1, min(f2, f3)), palmG, 0.08);
  // медальон под пальцами частично перекрыт
  col = mix(col, med, disc);
  col *= 1.0 - 0.5 * (1.0 - ss(0.0, 0.05, glove)) * disc;   // тень от пальцев
  float gm = fill(glove, PX * 1.5);
  vec3 leather = vec3(0.02, 0.019, 0.021) * (0.7 + 0.6 * fbm(p * 90.0));
  float sheen = exp(-abs(-glove - 0.03) * 70.0) * 0.4;
  leather += vec3(0.45, 0.5, 0.6) * sheen * 0.14 * ss(-0.2, 0.3, p.y + 0.3);
  leather += vec3(0.35, 0.4, 0.5) * 0.06 * exp(-abs(-glove - 0.045) * 25.0);
  col = mix(col, leather, gm);
  // капли воды на коже перчатки
  vec2 dg = p * 28.0; vec2 di = floor(dg);
  float drop = (1.0 - ss(0.05, 0.12, length(fract(dg) - 0.5 - (h22(di) - 0.5) * 0.5))) * step(0.85, h21(di));
  col += vec3(0.7, 0.8, 1.0) * drop * gm * 0.25;
  col += flare(p, mc + vec2(-0.08, 0.12), vec3(1.0, 0.85, 0.6) * 0.5 * (0.6 + 0.4 * uTurn), 0.5);
  outColor = vec4(grade(col * 1.2, UV), 1.0);
}`;
