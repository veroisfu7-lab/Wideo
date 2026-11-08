// Сцена 2 «Цифровой палимпсест»: монитор с фрактальным чертежом книги, ладонь с золотым оттиском, зрачок с отсчётом.

// Через плечо Макса: монитор, на нём разворачивается каркас рунической книги Liber Primus.
export const MONITOR = /* glsl */ `
uniform float uLamp;   // тёплый свет лампы до щелчка
uniform float uBuild;  // 0..1 скорость/полнота разворота чертежа
// проекция 3D-точки на экран монитора
vec2 proj(vec3 q, float a, float b){
  q.xz = rot(a) * q.xz; q.yz = rot(b) * q.yz;
  q.z += 3.2;
  return q.xy * 2.9 / q.z;
}
float seg3(vec2 p, vec3 a, vec3 b, float ra, float rb){ return sdSeg(p, proj(a, ra, rb), proj(b, ra, rb)); }
// руна из штрихов: 3–4 отрезка в ячейке по хешу
float rune(vec2 p, float id){
  float d = 1e3;
  vec2 top = vec2(0.0, 0.5), bot = vec2(0.0, -0.5);
  d = min(d, sdSeg(p, top, bot));
  for (int k = 0; k < 3; k++){
    float h = h11(id * 13.7 + float(k) * 3.1);
    if (h < 0.25) continue;
    float y0 = mix(-0.4, 0.45, h11(id + float(k) * 7.3));
    float sx = h11(id * 3.0 + float(k)) > 0.5 ? 1.0 : -1.0;
    float y1 = y0 + (h11(id * 5.0 + float(k)) - 0.5) * 0.7;
    d = min(d, sdSeg(p, vec2(0.0, y0), vec2(0.35 * sx, y1)));
  }
  return d;
}
float runeField(vec2 p, float sc, float t){
  vec2 g = p * sc; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
  float on = step(0.35, h21(id + floor(t * 3.0 + h21(id) * 5.0) * 0.17));
  return rune(f * vec2(1.6, 1.25), h21(id) * 100.0) / sc + (1.0 - on) * 1e3;
}
void main(){
  vec2 p = P0;
  // монитор: прямоугольник экрана с лёгкой перспективой
  vec2 m = p - vec2(0.05, 0.12);
  m.x *= 1.0 + m.y * 0.15;
  float scr = sdRBox(m, vec2(0.3, 0.2), 0.008);
  float bez = sdRBox(m, vec2(0.315, 0.215), 0.012);
  vec3 col = vec3(0.005, 0.007, 0.01);
  // комната: тёплая лампа гаснет
  col += uLamp * vec3(0.35, 0.18, 0.07) * exp(-length(p - vec2(-0.25, -0.35)) * 3.0) * 0.6;
  // стол/стена в отсвете экрана
  col += CYAN * 0.05 * exp(-max(bez, 0.0) * 9.0) * (0.6 + 0.4 * uBuild);
  col = mix(col, vec3(0.012, 0.014, 0.017), fill(bez, PX));
  // содержимое экрана
  vec2 s = m / 0.2;
  vec3 c = vec3(0.01, 0.025, 0.04);
  // сетка-синька
  vec2 gg = abs(fract(s * 6.0) - 0.5);
  c += CYAN * 0.12 * (1.0 - ss(0.0, 0.04, min(gg.x, gg.y))) * uBuild;
  // фрактал: вложенные повёрнутые квадраты — «чертёж» вокруг книги
  float fr = 1e3; vec2 z = s;
  for (int i = 0; i < 6; i++){
    z = rot(0.35 + uT * 0.08) * z * 1.45;
    fr = min(fr, abs(sdBox(z, vec2(0.9))) / pow(1.45, float(i + 1)));
  }
  c += AMBER * 0.5 * (1.0 - ss(0.0, 0.006, fr)) * uBuild;
  // книга: корешок вдоль y, страницы веером
  float ra = uT * 0.7 + 0.4, rb = 0.35 + 0.1 * sin(uT * 0.6);
  float d = 1e3;
  float npages = 3.0 + 13.0 * uBuild;
  for (int i = 0; i < 16; i++){
    float fi = float(i);
    if (fi > npages) break;
    float th = mix(-1.25, 1.25, fi / 15.0) * (0.3 + 0.7 * uBuild) + 0.08 * sin(uT * 1.3 + fi);
    vec3 dir = vec3(cos(th), 0.0, sin(th));
    vec3 a = vec3(0.0, -0.55, 0.0), b = vec3(0.0, 0.55, 0.0);
    vec3 a2 = a + dir * 0.8, b2 = b + dir * 0.8;
    d = min(d, seg3(s, a, a2, ra, rb)); d = min(d, seg3(s, b, b2, ra, rb)); d = min(d, seg3(s, a2, b2, ra, rb));
  }
  d = min(d, seg3(s, vec3(0.0, -0.55, 0.0), vec3(0.0, 0.55, 0.0), ra, rb));
  c += CYAN * 1.6 * (1.0 - ss(0.0, 0.012, d)) + CYAN * 0.25 * exp(-d * 30.0);
  // руны: колонки, мерцают и перебираются
  float rf = runeField(s + vec2(0.0, uT * 0.15), 9.0, uT);
  float side = ss(0.8, 0.95, abs(s.x)) ;
  c += AMBER * (1.0 - ss(0.0, 0.01, rf)) * 0.9 * side;
  // текст-заголовок: тонкая полоса «LIBER PRIMUS»-подобных рун сверху
  float rt = runeField(s * vec2(1.0, 1.0) - vec2(uT * 0.4, 0.0), 16.0, uT * 3.0);
  c += AMBER * (1.0 - ss(0.0, 0.008, rt)) * step(0.82, s.y) * step(s.y, 0.95) * 0.8;
  c *= 0.85 + 0.15 * sin(gl_FragCoord.y * 1.2);           // сканлайны
  col = mix(col, c, fill(scr, PX));
  col += CYAN * 0.2 * exp(-max(scr, 0.0) * 25.0) * fill(-bez, PX) * 0.0;
  // силуэт Макса на переднем плане слева: затылок и плечо, контур от экрана
  vec2 hp = (p - vec2(-0.25, -0.2)) / 1.35;
  float hd = sdProfile(vec2(-hp.x, hp.y) * rot(-0.35), 0.0) * 1.35;
  hd = smin(hd, sdEll(p - vec2(-0.22, -0.62), vec2(0.36, 0.26)), 0.06);
  float mk = fill(hd, PX * 2.0);
  vec2 e = vec2(0.002, 0.0);
  col = mix(col, vec3(0.004, 0.005, 0.007), mk);
  float rim = mk * (1.0 - ss(0.0, 0.008, -hd)) * ss(-0.2, 0.2, p.x + 0.1 + p.y * 0.3);
  col += CYAN * rim * 1.4 + AMBER * rim * 0.3 * uBuild;
  outColor = vec4(grade(col * 1.1, UV), 1.0);
}`;

// Ладонь: золотой оттиск цикады с микросеткой координат; полосы света сквозь жалюзи.
export const PALM = /* glsl */ `
uniform float uHeat;  // 0..1 проявление оттиска
float hand(vec2 p){
  float palm = sdRBox(p - vec2(0.0, -0.12), vec2(0.17, 0.2), 0.08);
  float d = palm;
  d = smin(d, sdCaps(p, vec2(-0.12, 0.06), vec2(-0.15, 0.3), 0.04, 0.034), 0.02);
  d = smin(d, sdCaps(p, vec2(-0.04, 0.08), vec2(-0.05, 0.4), 0.043, 0.036), 0.02);
  d = smin(d, sdCaps(p, vec2(0.045, 0.08), vec2(0.055, 0.38), 0.043, 0.036), 0.02);
  d = smin(d, sdCaps(p, vec2(0.12, 0.05), vec2(0.16, 0.27), 0.038, 0.032), 0.02);
  d = smin(d, sdCaps(p, vec2(0.15, -0.2), vec2(0.27, -0.03), 0.055, 0.04), 0.04); // большой палец
  d = smin(d, sdRBox(p - vec2(0.0, -0.5), vec2(0.13, 0.25), 0.08), 0.06);        // запястье
  return d;
}
void main(){
  vec2 p = P0 * (1.0 - 0.06 * uT / 5.0);
  vec2 q = rot(-0.12) * (p - vec2(0.0, -0.02));
  float d = hand(q);
  float m = fill(d, PX * 1.5);
  vec3 col = vec3(0.012, 0.018, 0.03);
  // жалюзи: диагональные полосы света
  float bl = ss(0.35, 0.5, abs(fract((p.y + p.x * 0.55) * 7.0 + 0.2) - 0.5) * 2.0);
  vec3 blind = vec3(0.2, 0.28, 0.4) * bl * 0.35;
  col += blind * 0.25;
  // кожа: подповерхностный тёплый тон, сгиб ладони, фактура
  float sh = ss(0.55, 0.0, length((q - vec2(0.0, -0.08)) * vec2(1.0, 0.75))) * (0.4 + 0.6 * ss(0.0, 0.035, -d));
  vec3 skin = vec3(0.2, 0.115, 0.08) * (0.55 + 0.45 * sh) * (0.8 + 0.3 * fbm(q * 9.0)) * (0.9 + 0.1 * fbm(q * 60.0));
  float crease = 0.0;
  crease = max(crease, 1.0 - ss(0.0, 0.004, abs(length(q - vec2(0.2, -0.32)) - 0.23)) * step(q.y, -0.02) * step(-0.28, q.y));
  crease = max(crease, 1.0 - ss(0.0, 0.004, abs(length(q - vec2(-0.05, -0.45)) - 0.36)) * step(-0.15, q.x) * step(q.x, 0.12));
  crease = max(crease, 1.0 - ss(0.0, 0.004, abs(q.y + 0.03 + 0.15 * q.x * q.x * 6.0)) * step(abs(q.x), 0.15));
  skin *= 1.0 - 0.45 * crease;
  skin *= 0.55 + blind * 2.6;
  skin += AMBER * 0.35 * uHeat * exp(-length(q - vec2(0.0, -0.12)) * 5.0) * vec3(1.0, 0.8, 0.6);
  col = mix(col, skin, m);
  // оттиск: эмблема с микросеткой; мерцает, раскаляется
  vec2 ep = (q - vec2(0.0, -0.12)) / 0.13;
  float em = emblem(ep, PX / 0.13);
  float heat = uHeat * (0.85 + 0.15 * sin(uT * 23.0) * sin(uT * 7.0));
  float grid = 0.0;
  vec2 gp = abs(fract(ep * 5.0) - 0.5);
  grid = (1.0 - ss(0.0, 0.03, min(gp.x, gp.y))) * ss(0.75, 0.3, length(ep));
  vec2 tk = abs(fract(ep * 25.0) - 0.5);
  grid += (1.0 - ss(0.0, 0.08, min(tk.x, tk.y))) * 0.25 * ss(0.75, 0.3, length(ep)) * step(abs(ep.y), 0.02 + 0.0);
  float scan = exp(-abs(fract(uT * 0.4) * 2.0 - 1.0 - ep.y * 0.5) * 12.0);
  vec3 gold = AMBER * 1.4;
  col += m * gold * (em * 1.6 + grid * 0.35 * (0.6 + 0.4 * scan)) * heat;
  col += m * gold * 0.2 * ss(0.58, 0.45, length(ep)) * heat;                // свечение кожи вокруг
  col += AMBER * 0.12 * exp(-length(ep) * 1.6) * heat;                                  // ореол в воздухе
  // контровой циановый по краю руки
  col += CYAN * 0.5 * m * (1.0 - ss(0.0, 0.01, -d)) * ss(-0.1, 0.3, q.x + q.y);
  outColor = vec4(grade(col * 1.15, UV), 1.0);
}`;

// Макро глаза: радужка карая, зрачок расширяется, в роговице — отражение отсчёта (текст — HTML-слой).
export const EYE = /* glsl */ `
uniform float uPupil;  // 0..1 расширение
uniform float uGlow;   // янтарное отражение
void main(){
  vec2 p = P0 * (1.0 - 0.05 * uT / 5.0);
  vec2 c = vec2(0.0, 0.02);
  vec2 q = p - c;
  float R = 0.2;
  // веки: миндалевидный разрез
  float up = 0.2 * (1.0 - pow(abs(q.x) / 0.5, 2.2)) + 0.02;
  float lo = -0.17 * (1.0 - pow(abs(q.x) / 0.5, 2.0)) + 0.0;
  float open = ss(lo - 0.004, lo + 0.004, q.y) * (1.0 - ss(up - 0.004, up + 0.004, q.y));
  vec3 col = vec3(0.0);
  // кожа век и под глазом
  vec3 skin = vec3(0.09, 0.06, 0.05) * (0.6 + 0.4 * fbm(p * 30.0)) * 0.35;
  float bl = ss(0.3, 0.5, abs(fract((p.y + p.x * 0.55) * 5.0) - 0.5) * 2.0);
  skin *= 0.5 + 1.2 * bl;
  skin += AMBER * 0.06 * uGlow * exp(-length(q) * 3.0);
  skin *= 1.0 - 0.5 * exp(-abs(q.y - up) * 40.0) * step(q.y, up + 0.05);
  col = skin;
  // склера
  vec3 scl = vec3(0.5, 0.46, 0.44) * (0.25 + 0.75 * ss(0.5, 0.12, abs(q.x))) * 0.28 * (0.9 + 0.1 * fbm(q * 25.0));
  scl = mix(scl, vec3(0.3, 0.08, 0.06) * 0.2, ss(0.6, 0.9, fbm(vec2(q.x * 6.0, q.y * 40.0))) * ss(0.22, 0.4, abs(q.x)) * 0.5);
  scl *= 1.0 - 0.4 * ss(0.0, 0.08, up - q.y < 0.06 ? 0.06 - (up - q.y) : 0.0);
  float r = length(q);
  float a = atan(q.y, q.x);
  // радужка
  float pr = mix(0.07, 0.135, uPupil) ;
  float fib = fbm(vec2(a * 18.0, r * 22.0)) * 0.6 + 0.4 * vnoise(vec2(a * 60.0, r * 5.0));
  float fib2 = fbm(vec2(a * 40.0, r * 9.0));
  vec3 iris = mix(vec3(0.02, 0.012, 0.007), vec3(0.15, 0.085, 0.045), fib * (0.6 + 0.6 * fib2));
  iris *= 0.7 + 0.5 * ss(R, pr, r);
  iris = mix(iris, vec3(0.35, 0.2, 0.08), ss(pr + 0.035, pr, r) * 0.3);              // кайма у зрачка
  iris *= mix(1.0, 0.25, ss(R - 0.03, R, r));                               // лимбальное кольцо
  vec3 eye = mix(scl, iris, 1.0 - ss(R - 0.004, R + 0.004, r));
  eye = mix(eye, vec3(0.003), 1.0 - ss(pr - 0.003, pr + 0.003, r));       // зрачок
  // тень верхнего века на глазу
  eye *= 0.35 + 0.65 * ss(0.0, 0.07, up - q.y);
  col = mix(col, eye, open);
  // отражение: окно-жалюзи и тёплый экран
  vec2 ref = q - vec2(-0.05, 0.06);
  float cres = ss(0.012, 0.0, abs(length(q - vec2(0.02, -0.02)) - 0.16)) * ss(0.0, 0.08, -(q.x + q.y * 0.4) - 0.03);
  col += vec3(0.6, 0.75, 0.95) * cres * 0.18 * open;
  col += vec3(0.9, 0.95, 1.0) * exp(-dot(q - vec2(-0.08, 0.07), q - vec2(-0.08, 0.07)) * 4000.0) * 0.8 * open;
  col += AMBER * 0.18 * uGlow * exp(-length(q - vec2(0.03, -0.03)) * 18.0) * open;
  // ресницы
  for (int i = 0; i < 28; i++){
    float fi = float(i) / 27.0;
    float x = mix(-0.42, 0.42, fi) + (h11(float(i)) - 0.5) * 0.02;
    float y = 0.2 * (1.0 - pow(abs(x) / 0.5, 2.2)) + 0.02;
    vec2 b = vec2(x, y), e = b + vec2(x * 0.2 + 0.02, 0.07 + 0.03 * h11(float(i) * 3.0));
    col *= 1.0 - 0.85 * (1.0 - ss(0.0, 0.0035, sdSeg(q, b, e)));
  }
  outColor = vec4(grade(col * 1.2, UV), 1.0);
}`;
