// Сцена 1 «Тени в комнате»: дождь на стекле, Макс у монитора, телефон на дубовом столе, экран-гравюра, тень с крыльями.
export const RAIN = /* glsl */ `
uniform float uPush; // 0..1 наезд
// огни города: тёплые и холодные кружки боке за стеклом
vec3 city(vec2 p, float blur){
  vec3 c = mix(vec3(0.02,0.03,0.05), vec3(0.06,0.07,0.1), ss(0.3, -0.5, p.y));
  c += vec3(0.25, 0.12, 0.06) * exp(-pow((p.y + 0.18) * 4.0, 2.0)) * 0.35; // зарево над крышами
  for (int i = 0; i < 56; i++){
    float fi = float(i);
    vec2 c0 = vec2(h11(fi * 3.1) - 0.5, -0.5 + 0.75 * pow(h11(fi * 7.7), 1.25)) * vec2(0.75, 1.0);
    c0.x += sin(uT * 0.05 + fi) * 0.004;
    float r = mix(0.018, 0.055, h11(fi * 1.7)) * (0.7 + 0.6 * blur);
    float k = h11(fi * 9.3);
    vec3 col = k < 0.45 ? AMBER : (k < 0.62 ? CRIMSON * 1.4 : (k < 0.8 ? vec3(0.95, 0.85, 0.7) : CYAN * 0.8));
    float tw = 0.75 + 0.25 * sin(uT * (0.6 + h11(fi) * 1.4) + fi * 4.0);
    c += col * bokeh(p, c0, r) * 0.33 * tw * (0.5 + h11(fi * 5.1));
  }
  return c;
}
// капли (по мотивам классического «дождя на стекле»): стекающие капли со следом + статичная морось
vec3 N13(float p){ vec3 p3 = fract(vec3(p) * vec3(.1031, .11369, .13787)); p3 += dot(p3, p3.yzx + 19.19); return fract(vec3((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y, (p3.y + p3.z) * p3.x)); }
float Saw(float b, float t){ return ss(0.0, b, t) * ss(1.0, b, t); }
vec2 dropLayer(vec2 uv, float t){
  vec2 UVv = uv;
  uv.y += t * 0.75;
  vec2 a = vec2(6.0, 1.0); vec2 grid = a * 2.0;
  vec2 id = floor(uv * grid);
  uv.y += h11(id.x * 7.13);
  id = floor(uv * grid);
  vec3 n = N13(id.x * 35.2 + id.y * 2376.1);
  vec2 st = fract(uv * grid) - vec2(0.5, 0.0);
  float x = n.x - 0.5;
  float y = UVv.y * 20.0;
  x += sin(y + sin(y)) * (0.5 - abs(x)) * (n.z - 0.5);
  x *= 0.7;
  float ti = fract(t + n.z);
  y = (Saw(0.85, ti) - 0.5) * 0.9 + 0.5;
  float d = length((st - vec2(x, y)) * a.yx);
  float mainDrop = ss(0.4, 0.0, d);
  float r = sqrt(ss(1.0, y, st.y));
  float cd = abs(st.x - x);
  float trail = ss(0.23 * r, 0.15 * r * r, cd);
  float front = ss(-0.02, 0.02, st.y - y);
  trail *= front * r * r;
  float yy = fract(UVv.y * 10.0) + (st.y - 0.5);
  float droplets = ss(0.3, 0.0, length(st - vec2(x, yy)));
  return vec2(mainDrop + droplets * r * front, trail);
}
float staticDrops(vec2 uv, float t){
  uv *= 40.0; vec2 id = floor(uv); uv = fract(uv) - 0.5;
  vec3 n = N13(id.x * 107.45 + id.y * 3543.654);
  float d = length(uv - (n.xy - 0.5) * 0.7);
  return ss(0.3, 0.0, d) * fract(n.z * 10.0) * Saw(0.025, fract(t + n.z));
}
vec2 drops(vec2 uv, float t){
  float s = staticDrops(uv, t);
  vec2 m1 = dropLayer(uv, t), m2 = dropLayer(uv * 1.85, t);
  float c = ss(0.3, 1.0, s + m1.x + m2.x);
  return vec2(c, max(m1.y, m2.y));
}
void main(){
  vec2 p = P0;
  float z = mix(1.0, 1.3, uPush);
  vec2 q = p / z;
  float t = uT * 0.06;
  vec2 uv = q * 0.9 + vec2(0.0, 0.0);
  vec2 c = drops(uv, t);
  vec2 e = vec2(0.0015, 0.0);
  float cx = drops(uv + e, t).x, cy = drops(uv + e.yx, t).x;
  vec2 n = vec2(cx - c.x, cy - c.x);
  float wet = sat(c.x * 1.4 + c.y * 0.6);
  vec3 bg = city(q, 0.6 + 0.4 * uPush) ;
  vec3 sharp = city(q + n * 1.2, 0.25);        // в капле — резче и смещено (линза)
  vec3 col = mix(bg * (0.75 - 0.25 * c.y), sharp * 1.3, wet);
  col += vec3(0.7, 0.8, 1.0) * pow(sat(-n.y * 25.0), 2.0) * 0.12 * wet; // блик на верхнем краю капли
  col *= 0.92 + 0.08 * fbm3(q * 3.0 + uT * 0.02);
  col *= 1.0 - 0.25 * ss(0.15, 0.5, p.y);
  outColor = vec4(grade(col * 1.1, UV), 1.0);
}`;

// Макс у монитора: профиль вправо, половина лица — холодный циановый контур, комната в тени, полки за спиной.
export const ROOM = /* glsl */ `
uniform float uLamp;    // 0..1 настольная лампа
uniform float uWings;   // 0..1 тень крыльев на стене
uniform float uFlick;   // искра/пламя зажигалки 0..1
uniform float uZoom;    // крупность (1 — средний план, 0.75 — общий)
uniform float uWall;    // яркость стены
uniform float uHX;      // сдвиг Макса по x
float shelves(vec2 p){
  float row = floor(p.y / 0.16);
  float fy = fract(p.y / 0.16);
  float board = step(fy, 0.07);
  float id = floor((p.x + row * 0.37) / 0.022);
  float hgt = 0.55 + 0.4 * h11(id * 7.1 + row);
  float tilt = step(0.93, h11(id * 3.3 + row));
  float spine = step(fy, hgt) * step(0.07, fy) * (0.45 + 0.55 * h11(id + row * 3.0)) * (1.0 - tilt * 0.7);
  return max(board * 0.9, spine * 0.6);
}
// Макс: профиль, масштабированный; центр черепа в c, высота головы ≈ 0.25·k
float maxD(vec2 p, vec2 c, float k){
  vec2 hp = (p - c) / k;
  float d = sdProfile(hp, 0.0);
  d = smin(d, sdEll(hp - vec2(-0.05, -0.62), vec2(0.34, 0.36)), 0.08); // плечи и спина в худи
  return d * k;
}
void main(){
  vec2 p = P0 / uZoom;
  vec2 mon = vec2(0.5, 0.03);
  vec2 hc = vec2(0.05 + uHX, 0.02 - uHX * 0.3);
  float K = 1.55;
  vec3 col = vec3(0.0);
  // стена с полками
  float sh = shelves(p + vec2(0.3, 0.62));
  float fall = exp(-length((p - mon) * vec2(1.0, 0.8)) * 1.9);
  // тень Макса на полках: центральная проекция от монитора, увеличение S
  float S = 1.9;
  vec2 sp = mon + (p - mon) / S;
  vec2 sc = mon + (hc - mon) * S;            // центр головы тени
  float shd = maxD(sp, hc, K);
  if (uHX > 0.5){ sc = vec2(0.13, 0.13); shd = maxD(p, sc, 1.15); fall = 0.55 + 0.45 * fall; }
  float shadow = 1.0 - ss(-0.006, 0.012, shd);
  // крылья в тени: от лопаток тени — одно вверх-назад, другое вниз-назад; раскрываются с uWings
  vec2 root = sc + vec2(-0.12, -0.3) * (uHX > 0.5 ? 1.15 : K * S);
  float wing = 1e3, veins = 0.0;
  for (int i = 0; i < 2; i++){
    float ang = (i == 0 ? 2.05 : 3.55) + (i == 0 ? -0.35 : 0.3) * (1.0 - uWings);
    vec2 dir = vec2(cos(ang), sin(ang));
    float len = 0.42 * uWings + 0.001;
    vec2 cw = root + dir * len * 0.92;
    vec2 wl = vec2(dot(p - cw, vec2(-dir.y, dir.x)), dot(p - cw, dir));
    float d = sdEll(wl, vec2(0.075 + 0.02 * uWings, len));
    d -= 0.012 * (1.0 - ss(-len, -len * 0.4, wl.y)) * 0.0;
    wing = min(wing, d);
    float inside = step(d, -0.004);
    for (int j = -2; j <= 2; j++) veins = max(veins, (1.0 - ss(0.0, 0.0035, abs(wl.x - float(j) * 0.026 * (0.6 + 0.4 * wl.y / len)))) * inside);
    veins = max(veins, (1.0 - ss(0.0, 0.0035, abs(length(wl - vec2(0.0, len * 0.25)) - len * 0.55))) * inside);
    veins = max(veins, (1.0 - ss(0.0, 0.0035, abs(length(wl - vec2(0.0, len * 0.25)) - len * 0.3))) * inside);
  }
  float wingsh = (1.0 - ss(-0.006, 0.012, wing)) * step(0.01, uWings);
  float occl = max(shadow, wingsh * (1.0 - 0.6 * veins));
  float lit = fall * (1.0 - 0.92 * occl);
  vec3 wall = vec3(0.045, 0.05, 0.055) * (0.55 + 0.75 * sh);
  col += wall * (0.15 + uWall * lit) * mix(vec3(1.0), CYAN * 1.3, 0.8);
  col += wall * uLamp * vec3(1.0, 0.6, 0.28) * 2.2 * exp(-length(p - vec2(0.32, -0.45)) * 3.2);
  // Макс
  float d = uHX > 0.5 ? 1.0 : maxD(p, hc, K);
  float m = fill(d, PX);
  vec2 e = vec2(0.0015, 0.0);
  vec2 n = normalize(vec2(maxD(p + e.xy, hc, K) - maxD(p - e.xy, hc, K), maxD(p + e.yx, hc, K) - maxD(p - e.yx, hc, K)) + 1e-6);
  vec2 L = normalize(mon - p);
  float facing = sat(dot(n, L));
  float rim = (1.0 - ss(0.0, 0.006, -d)) * m * pow(facing, 1.2);
  vec2 hp = (p - hc) / K;
  float faceFill = m * ss(0.0, 0.09, hp.x + 0.05 * hp.y) * step(-0.17, hp.y) * 0.22;
  vec3 skin = vec3(0.008, 0.009, 0.012) + CYAN * faceFill * (0.5 + 0.5 * fbm3(hp * 30.0));
  // ткань худи: лёгкая фактура в отражённом свете
  skin += vec3(0.01, 0.012, 0.016) * m * step(hp.y, -0.2) * fbm3(p * 120.0);
  // тёплый контур лампы по спине снизу
  skin += uLamp * vec3(0.5, 0.25, 0.08) * m * (1.0 - ss(0.0, 0.01, -d)) * ss(0.05, -0.4, p.y) * step(p.x, hc.x - 0.05) * 0.6;
  col = mix(col, skin, m);
  col += CYAN * rim * 2.4;
  vec2 eye = hc + vec2(0.072, 0.008) * K;
  col += vec3(0.75, 0.92, 1.0) * exp(-dot(p - eye, p - eye) * 90000.0) * 1.6;
  // зажигалка у подбородка
  vec2 zp = p - (hc + vec2(0.11, -0.3) * K);
  zp = rot(0.15) * zp;
  float zb = sdRBox(zp, vec2(0.018, 0.027), 0.004);
  float fing = sdCaps(p, hc + vec2(0.0, -0.36) * K, hc + vec2(0.1, -0.33) * K, 0.022, 0.018);
  col = mix(col, vec3(0.006, 0.007, 0.009) + CYAN * 0.06 * ss(-0.02, 0.03, p.x - hc.x - 0.1), fill(fing, PX));
  col = mix(col, vec3(0.06, 0.04, 0.02) + CYAN * 0.12 * ss(-0.02, 0.02, zp.x), fill(zb, PX));
  col += CYAN * 1.2 * stroke(zb, 0.0007, PX) * ss(-0.01, 0.018, zp.x);
  vec2 fl = zp - vec2(0.004, 0.045);
  col += AMBER * uFlick * (exp(-length(fl * vec2(1.6, 0.8)) * 70.0) * 2.0 + exp(-length(fl) * 12.0) * 0.18);
  col += flare(p, mon + vec2(0.0, 0.08), CYAN * 0.55, 1.0) * 0.6 * step(uHX, 0.5);
  // пыль в луче
  vec2 dq = p * 34.0 + vec2(uT * 0.25, -uT * 0.12);
  col += CYAN * ss(0.94, 1.0, vnoise(dq)) * fall * 0.35;
  outColor = vec4(grade(col, UV), 1.0);
}`;

// Телефон на дубовой столешнице, по кромке бежит янтарная нить; вибрация.
export const DESK = /* glsl */ `
uniform float uBuzz;  // 0..1 вибрация
uniform float uPulse; // яркость нити
uniform float uLift;  // 0..1 рука поднимает телефон (наезд + уход)
float oak(vec2 p){
  vec2 q = p * vec2(1.0, 7.0);
  float w = fbm(q * vec2(3.0, 0.6) + vec2(0.0, fbm(p * 4.0) * 2.0));
  float rings = abs(fract(w * 9.0 + p.x * 0.4) - 0.5);
  return 0.55 + 0.45 * ss(0.0, 0.5, rings) * (0.7 + 0.3 * vnoise(p * vec2(80.0, 4.0)));
}
void main(){
  vec2 p = P0;
  float z = mix(1.0, 1.25, uLift);
  p = rot(0.25) * p / z;
  float jitter = uBuzz * (h11(floor(uF)) - 0.5) * 0.004;
  // стол: низкий скользящий свет монитора сверху справа
  vec3 wood = vec3(0.16, 0.085, 0.04) * oak(p * 1.3 + 3.0);
  float key = exp(-length(p - vec2(0.35, 0.45)) * 2.2);
  vec3 col = wood * (0.05 + 0.9 * key) * mix(vec3(1.0), CYAN * 1.1, 0.55);
  // лак — блик
  col += vec3(0.4, 0.6, 0.75) * pow(sat(1.0 - abs(p.x + p.y * 0.4 - 0.3) * 3.0), 6.0) * 0.08;
  // телефон
  vec2 q = p - vec2(jitter, 0.0);
  float ph = sdRBox(q, vec2(0.13, 0.27), 0.035);
  float shadow = 1.0 - ss(-0.03, 0.06, sdRBox(q - vec2(-0.02, -0.025), vec2(0.13, 0.27), 0.04));
  col *= 1.0 - 0.7 * shadow;
  float body = fill(ph, PX);
  vec3 glass = vec3(0.008, 0.01, 0.014) + vec3(0.25, 0.35, 0.45) * 0.06 * ss(0.3, -0.3, q.x + q.y);
  col = mix(col, glass, body);
  // нить по кромке: бегущий импульс по периметру
  float per = atan(q.y, q.x * 2.1);
  float run = fract(per / (2.0 * PI) - uT * 0.9);
  float pulse = pow(1.0 - run, 6.0) + 0.25 * (0.5 + 0.5 * sin(uT * 12.0));
  float edge = exp(-abs(ph) * 900.0);
  float glow = exp(-abs(ph) * 60.0) * 0.25;
  col += AMBER * (edge * 2.4 + glow) * pulse * uPulse;
  col += AMBER * 0.12 * exp(-max(ph, 0.0) * 18.0) * uPulse * pulse * (1.0 - body); // отсвет на дереве
  // камера-объектив, едва видна
  col += vec3(0.04) * fill(sdCircle(q - vec2(0.0, 0.235), 0.006), PX);
  outColor = vec4(grade(col, UV), 1.0);
}`;

// Экран телефона: шероховатая гравюра (штриховка), текст поверх рисуется в HTML.
export const SCREEN = /* glsl */ `
uniform float uOn;   // 0..1 «оживание» экрана
uniform float uHand; // наклон
void main(){
  vec2 p = P0;
  vec2 q = rot(-0.05 + uHand * 0.03) * (p * 0.92);
  float ph = sdRBox(q, vec2(0.25, 0.47), 0.05);
  float scr = sdRBox(q, vec2(0.235, 0.455), 0.04);
  // фон: руки и тьма комнаты
  vec3 col = vec3(0.01, 0.012, 0.016);
  float hand = fill(sdEll(q - vec2(0.24, -0.25), vec2(0.12, 0.3)), 0.01);
  col = mix(col, vec3(0.03, 0.022, 0.02), hand);
  col = mix(col, vec3(0.006), fill(ph, PX));
  // гравюра: бумага, штриховка по fbm, медальон цикады — тонко
  vec2 g = q * 1.0;
  float tone = fbm(g * 3.0 + 2.0) * 0.6 + 0.4 * ss(0.5, -0.3, g.y);
  float hatch = 0.5 + 0.5 * sin((g.x + g.y * 0.35) * 900.0);
  float hatch2 = 0.5 + 0.5 * sin((g.x * 0.3 - g.y) * 900.0);
  float ink = step(hatch, tone * 0.8) * 0.6 + step(hatch2, tone * 0.5 - 0.15) * 0.4;
  vec3 paper = vec3(0.78, 0.66, 0.46) * (0.85 + 0.15 * vnoise(g * 300.0));
  vec3 engr = mix(paper, vec3(0.16, 0.1, 0.05), ink * 0.55);
  float em = emblem((q - vec2(0.0, 0.25)) / 0.13, PX / 0.13);
  engr = mix(engr, vec3(0.12, 0.07, 0.03), em * 0.85);
  // рамка-виньетка гравюры
  float fr = stroke(sdRBox(q, vec2(0.205, 0.425), 0.01), 0.002, PX) + stroke(sdRBox(q, vec2(0.195, 0.415), 0.01), 0.0008, PX);
  engr = mix(engr, vec3(0.15, 0.09, 0.04), sat(fr));
  // «оживание»: проявляется построчно снизу-вверх полосой
  float rev = ss(-0.5 + uOn * 1.2 - 0.05, -0.5 + uOn * 1.2, -q.y * 0.0 + (0.5 - UV.y) * 0.0 + (q.y + 0.5) * -1.0 + 1.0);
  rev = ss(0.0, 0.08, uOn * 1.15 - (0.5 - q.y));
  vec3 s = mix(vec3(0.0), engr * 0.95, rev);
  s += AMBER * 0.4 * exp(-abs(uOn * 1.15 - (0.5 - q.y)) * 80.0) * step(uOn, 0.99);
  col = mix(col, s, fill(scr, PX));
  col += AMBER * 0.05 * exp(-max(scr, 0.0) * 30.0) * uOn;
  outColor = vec4(grade(col, UV), 1.0);
}`;
