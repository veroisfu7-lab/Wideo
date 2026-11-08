// Сцена 5 «Перелом и выбор»: зажигалка раскрывается — внутри матрица; руки соединяют ключ и медальон; стена расходится.

export const ZIPPO = /* glsl */ `
uniform float uSeam;   // 0..1 подсветка шва под пальцем
uniform float uSplit;  // 0..1 раскрытие корпуса
uniform float uMat;    // 0..1 «пробуждение» матрицы
float caseD(vec2 p){ return sdRBox(p, vec2(0.16, 0.27), 0.05); }
vec3 brushed(vec2 p, vec3 base){
  float streak = vnoise(vec2(p.x * 900.0, p.y * 6.0)) * 0.5 + vnoise(vec2(p.x * 300.0, p.y * 2.0)) * 0.5;
  return base * (0.75 + 0.45 * streak);
}
void main(){
  vec2 p = P0 * (1.0 - 0.04 * uT / 6.0);
  vec2 c = vec2(0.0, 0.03);
  vec2 q = rot(0.08) * (p - c);
  vec3 col = vec3(0.006, 0.008, 0.012);
  col += vec3(0.25, 0.15, 0.08) * 0.05 * exp(-length(p - vec2(0.0, 0.4)) * 2.0);
  // половинки расходятся по шву y = -0.05
  float gap = uSplit * 0.13;
  vec2 qa = q - vec2(0.0, gap * 0.6), qb = q + vec2(0.0, gap * 0.4);
  float topH = max(caseD(qa), -(qa.y + 0.05));
  float botH = max(caseD(qb), qb.y + 0.05);
  // внутри: матрица кремний + обсидиан
  float inner = sdRBox(q - vec2(0.0, -0.05 + gap * 0.1), vec2(0.13, max(gap * 0.5, 0.001)), 0.01);
  if (uSplit > 0.01){
    vec2 m = q - vec2(0.0, -0.05 + gap * 0.1);
    vec3 obs = vec3(0.01, 0.01, 0.014) + vec3(0.3, 0.35, 0.45) * pow(sat(1.0 - abs(m.y / max(gap * 0.5, 0.001) + 0.3)), 6.0) * 0.12;
    vec2 g = m * vec2(1.0, 1.0) / 0.012; vec2 gi = floor(g); vec2 gf = fract(g) - 0.5;
    float cellD = sdBox(gf, vec2(0.36));
    float chip = step(abs(m.x), 0.1) * step(abs(m.y), gap * 0.42);
    vec3 si = vec3(0.07, 0.072, 0.08) * (0.7 + 0.3 * h21(gi));
    float on = step(0.6, h21(gi + floor(uT * 6.0) * 0.13)) * uMat;
    vec3 cell = mix(obs, si + AMBER * on * 0.9, fill(cellD, 0.08) * chip);
    // золотые дорожки между ячейками
    cell += AMBER * 0.25 * uMat * (1.0 - ss(0.0, 0.08, min(abs(gf.x), abs(gf.y)))) * chip * step(0.5, h21(gi * 1.7));
    col = mix(col, cell, fill(inner, PX));
    col += AMBER * 0.3 * uMat * exp(-max(inner, 0.0) * 40.0) * uSplit;
  }
  // корпус: латунь, щётка, гравировка (геометрический орнамент), блики сверху
  for (int i = 0; i < 2; i++){
    float d = i == 0 ? topH : botH;
    vec2 qq = i == 0 ? qa : qb;
    float m = fill(d, PX);
    vec3 brass = brushed(qq, vec3(0.42, 0.28, 0.12));
    float lit = 0.25 + 0.9 * ss(-0.16, 0.16, qq.x * 0.4 + 0.12) + 0.8 * exp(-abs(qq.x - 0.07) * 30.0);
    brass *= lit;
    // гравировка: ромбы и концентрические линии
    vec2 gq = qq - vec2(0.0, 0.08);
    float orn = stroke(abs(gq.x) + abs(gq.y) - 0.09, 0.0018, PX) + stroke(abs(gq.x) + abs(gq.y) - 0.065, 0.0012, PX);
    orn += stroke(length(gq) - 0.03, 0.0015, PX);
    brass *= 1.0 - 0.6 * sat(orn) * step(-0.05, qq.y);
    // кромка корпуса
    brass += vec3(1.0, 0.8, 0.5) * 0.25 * (1.0 - ss(0.0, 0.006, -d));
    col = mix(col, brass, m);
  }
  // шов: тонкая янтарная линия, когда палец ведёт по ней
  float seam = stroke(q.y + 0.05, 0.0012, PX) * step(abs(q.x), 0.16) * uSeam * (1.0 - uSplit);
  float run = exp(-abs(q.x - mix(-0.15, 0.15, fract(uT * 0.7))) * 25.0);
  col += AMBER * seam * (0.4 + 1.6 * run);
  // пальцы: большой слева прижимает донышко, указательный справа
  float th = sdCaps(p, vec2(-0.45, -0.55), vec2(-0.13, -0.3 + gap * 0.0), 0.085, 0.07);
  float ix = sdCaps(p, vec2(0.45, -0.1), vec2(0.17, 0.0), 0.07, 0.06);
  float fing = min(th, ix);
  float fm = fill(fing, PX * 2.0);
  vec3 skin = vec3(0.06, 0.035, 0.025) * (0.6 + 0.4 * fbm(p * 30.0)) * (0.5 + 0.5 * ss(-0.05, 0.0, fing + 0.03));
  skin += vec3(0.35, 0.22, 0.12) * 0.15 * exp(-abs(-fing - 0.02) * 60.0);
  col = mix(col, skin, fm);
  col += flare(p, c + vec2(0.06, 0.24), vec3(1.0, 0.85, 0.6) * 0.35, 0.4);
  col += AMBER * 0.6 * uMat * uSplit * exp(-length(p - c - vec2(0.0, -0.05)) * 9.0);
  outColor = vec4(grade(col * 1.2, UV), 1.0);
}`;

// Двое в профиль под аркой: Макс слева (вправо), Апокриф справа (влево). Руки сходятся, вспышка в точке контакта.
export const MEET = /* glsl */ `
uniform float uStep;   // 0..1 шаг Макса вперёд
uniform float uReach;  // 0..1 руки тянутся друг к другу
uniform float uFlash;  // 0..1 вспышка
float profileFig(vec2 p, float k, float collar){
  vec2 hp = p / k;
  float d = sdProfile(hp, 0.0);
  d = smin(d, sdEll(hp - vec2(-0.07, -0.6), vec2(0.21, 0.36)), 0.06);
  d = smin(d, sdBox(hp - vec2(-0.08, -1.4), vec2(0.19, 0.8)), 0.08);
  if (collar > 0.5) d = min(d, sdRBox(hp - vec2(-0.02, -0.19), vec2(0.075, 0.07), 0.02));
  return d * k;
}
void main(){
  vec2 p = P0;
  vec3 col = vec3(0.01, 0.012, 0.018);
  // фон: стена арки с цикадой, тусклая
  col += vec3(0.25, 0.32, 0.45) * 0.1 * (0.6 + 0.4 * fbm3(p * 4.0)) * ss(0.6, -0.2, abs(p.x));
  vec2 ep = (p - vec2(0.0, 0.2)) / 0.16;
  col += vec3(0.4, 0.3, 0.7) * 0.08 * emblem(ep, PX / 0.16);
  // Макс слева
  float mxp = mix(-0.23, -0.17, uStep);
  float K = 0.72;
  vec2 mc = vec2(mxp, 0.16);
  float dm = profileFig(p - mc, K, 0.0);
  // Апокриф справа, выше ростом, зеркально
  vec2 ac = vec2(0.19, 0.21);
  vec2 ap = p - ac; ap.x = -ap.x;
  float da = profileFig(ap, 0.76, 1.0);
  // руки к центру
  vec2 meet = vec2(0.0, -0.2);
  vec2 hm = mix(mc + vec2(0.07, -0.5), meet - vec2(0.03, 0.0), uReach);
  vec2 ha = mix(ac + vec2(-0.07, -0.52), meet + vec2(0.03, 0.0), uReach);
  float arm1 = sdCaps(p, mc + vec2(0.05, -0.36), hm, 0.034, 0.024);
  float arm2 = sdCaps(p, ac + vec2(-0.05, -0.38), ha, 0.036, 0.026);
  arm1 = min(arm1, sdEll(p - hm, vec2(0.03, 0.022)));
  arm2 = min(arm2, sdEll(p - ha, vec2(0.03, 0.022)));
  dm = min(dm, arm1); da = min(da, arm2);
  float d = min(dm, da);
  float m = fill(d, PX);
  col = mix(col, vec3(0.005, 0.006, 0.008), m);
  vec2 chipP = hm + vec2(0.028, 0.012);
  col = mix(col, vec3(0.03, 0.03, 0.035), fill(sdBox(chipP - p, vec2(0.012, 0.008)), PX));
  col += AMBER * 0.6 * stroke(sdBox(chipP - p, vec2(0.012, 0.008)), 0.0008, PX) * uReach;
  vec2 medP = ha - vec2(0.028, -0.012);
  col = mix(col, vec3(0.35, 0.22, 0.08), fill(sdCircle(p - medP, 0.014), PX));
  col += flare(p, medP + vec2(0.004, 0.005), AMBER * 0.5, 0.25);
  // контровой: холодный сзади-сверху + тёплый от вспышки по лицам
  vec2 e = vec2(0.002, 0.0);
  float rimC = m * (1.0 - ss(0.0, 0.004, -d));
  col += vec3(0.5, 0.65, 0.9) * rimC * 0.8 * ss(0.3, 0.6, p.y + 0.3);
  // глаза: у Макса — холодный блик, у Апокрифа — оправа
  col += vec3(0.7, 0.85, 1.0) * exp(-dot(p - mc - vec2(0.072, 0.008) * K, p - mc - vec2(0.072, 0.008) * K) * 60000.0) * 1.2;
  vec2 gp = p - ac - vec2(-0.057, 0.009);
  col += vec3(0.7, 0.8, 1.0) * stroke(sdRBox(gp, vec2(0.012, 0.007), 0.004), 0.001, PX) * 0.7;
  // вспышка в точке контакта
  float fl = uFlash;
  col += vec3(1.0, 0.75, 0.35) * fl * (exp(-length(p - meet) * 9.0) * 1.5 + exp(-length(p - meet) * 60.0) * 6.0);
  col += flare(p, meet, AMBER * fl * 2.0, 1.4);
  // тёплый свет по обращённым к центру краям силуэтов
  float warm = m * (1.0 - ss(0.0, 0.01, -d)) * exp(-length(p - meet) * 3.0) * fl;
  col += AMBER * warm * 3.0;
  col = mix(col, vec3(1.0, 0.9, 0.7), pow(fl, 3.0) * 0.35);
  outColor = vec4(grade(col * 1.15, UV), 1.0);
}`;

// Стена расходится: за ней — спуск, залитый тёплым светом. Силуэты двоих вырезаны светом.
export const OPEN = /* glsl */ `
uniform float uOpen;   // 0..1 раскрытие
uniform float uFlash;
float brickL(vec2 p){ vec2 b = vec2(p.x * 9.0 + step(0.5, fract(p.y * 18.0)) * 0.5, p.y * 18.0); vec2 f = fract(b); return min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y) * 0.5); }
void main(){
  vec2 p = P0;
  float half_ = uOpen * 0.2;
  // за стеной: лестница вниз, тёплый свет снизу, пыль в лучах
  vec2 s = p - vec2(0.0, -0.05);
  float stepY = fract((s.y + 0.6) * 9.0 / (1.0 + max(-s.y, 0.0) * 0.0));
  vec3 inside = vec3(1.0, 0.7, 0.38) * (0.25 + 1.2 * exp(-length(s - vec2(0.0, -0.1)) * 2.5));
  inside *= 0.75 + 0.25 * ss(0.0, 0.1, stepY) * step(s.y, 0.0);
  inside += vec3(1.0, 0.8, 0.5) * ss(0.92, 1.0, vnoise(p * 60.0 + vec2(0.0, uT * 0.6))) * 0.5;
  // стена: две половины уходят в стороны
  vec2 wl = p + vec2(half_, 0.0), wr = p - vec2(half_, 0.0);
  float inL = step(p.x, -half_), inR = step(half_, p.x);
  vec2 wp = inL > 0.5 ? wl : wr;
  float mortar = brickL(wp * 1.4);
  vec3 bc = mix(vec3(0.09, 0.045, 0.03), vec3(0.15, 0.075, 0.045), h21(floor(vec2(wp.x * 12.6 + step(0.5, fract(wp.y * 25.2)) * 0.5, wp.y * 25.2))));
  bc = mix(vec3(0.015), bc, ss(0.02, 0.06, mortar));
  // освещение стены: тёплый свет из щели + холодная ночь
  float gapD = abs(p.x) - half_;
  vec3 wall = bc * (0.12 + 2.5 * exp(-gapD * 12.0) * uOpen * vec3(1.0, 0.7, 0.4) + 1.5 * uFlash * exp(-length(p - vec2(0.0, -0.17)) * 4.0) * vec3(1.0, 0.75, 0.4));
  float isWall = max(inL, inR);
  vec3 col = mix(inside, wall, isWall);
  // кромки плит
  col += vec3(1.0, 0.75, 0.4) * (1.0 - ss(0.0, 0.004, gapD)) * step(0.0, gapD) * uOpen * 1.5;
  // объёмный свет из проёма
  col += vec3(1.0, 0.7, 0.35) * uOpen * 0.25 * exp(-max(gapD, 0.0) * 6.0) * (0.7 + 0.3 * fbm3(p * vec2(3.0, 8.0) + uT * 0.2));
  // пыль от сдвига плит
  col += vec3(0.8, 0.6, 0.4) * fbm(p * 8.0 + vec2(0.0, -uT * 0.5)) * 0.15 * uOpen * (1.0 - uOpen) * 4.0 * exp(-abs(gapD) * 8.0);
  // два силуэта спиной в нижней части кадра, вырезаны светом
  vec2 pm = (p - vec2(-0.1, -0.58)) / 0.6;
  vec2 pa = (p - vec2(0.12, -0.6)) / 0.66;
  float dm = sdPerson(pm, 0.0, 0.0, 0.0, 0.0) * 0.6;
  float da = sdPerson(pa, 0.0, 0.0, 1.0, 0.0) * 0.66;
  float d = min(dm, da);
  float m = fill(d, PX);
  col = mix(col, vec3(0.004, 0.004, 0.006), m);
  col += vec3(1.0, 0.72, 0.4) * m * (1.0 - ss(0.0, 0.004, -d)) * (0.4 + 1.5 * uOpen) * ss(0.4, -0.1, abs(p.x));
  // белая вспышка в начале
  col = mix(col, vec3(1.0, 0.88, 0.65), pow(uFlash, 2.0) * 0.85);
  outColor = vec4(grade(col, UV), 1.0);
}`;
