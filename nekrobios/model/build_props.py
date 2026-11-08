# Реквизит: бронзовая рама зеркала (змеи + лоза + гребень), разводной ключ, тряпка, сущность (Объект 02), рука-коготь со скелетом.
import numpy as np, time, json
from scipy.spatial import cKDTree
from sdflib import *

t0 = time.time()
def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# ------------------------------------------------------------------ рама
GX, GY0, GY1 = 0.42, 0.20, 1.95     # стекло: |x|<0.42, y∈[0.20,1.95], плоскость z=0
BAR = 0.105                          # ширина бруса рамы
ZF = 0.045                           # передняя грань

class Tubes:
    """Трубки по кривым: расстояние до плотно сэмплированных точек кривой минус радиус(t)."""
    def __init__(self): self.pts = []; self.rad = []; self.tag = []
    def add(self, P, R, tag=0):
        self.pts.append(np.asarray(P, f32)); self.rad.append(np.asarray(R, f32)); self.tag.append(np.full(len(P), tag, np.int32))
    def build(self):
        self.P = np.concatenate(self.pts); self.R = np.concatenate(self.rad); self.T = np.concatenate(self.tag)
        self.tree = cKDTree(self.P)
    def __call__(self, Q, k=6):
        d, i = self.tree.query(Q, k=k, distance_upper_bound=0.2)
        i = np.where(np.isfinite(d), i, 0)
        dd = np.where(np.isfinite(d), d - self.R[i], 1.0)
        return dd.min(axis=1).astype(f32)
    def tagof(self, Q):
        d, i = self.tree.query(Q, k=1); return self.T[i]

tubes = Tubes()
rng = np.random.default_rng(7)
# лоза: две спирали по боковым брусьям и по верхнему
def helix_side(sx, phase, r0=0.040, pitch=0.24, y0=0.12, y1=2.02):
    t = np.linspace(0, 1, 6000)
    y = y0 + (y1 - y0) * t
    a = (y - y0) / pitch * 2 * np.pi + phase
    x = sx * (GX + BAR * 0.5) + np.cos(a) * r0 * 1.15
    z = ZF * 0.55 + np.sin(a) * r0 * 0.75 + 0.012
    return np.stack([x, y, z], -1)
for sx in (1, -1):
    P = helix_side(sx, 0.0 if sx > 0 else np.pi)
    tubes.add(P, np.full(len(P), 0.0075), 1)
    P2 = helix_side(sx, 2.2, r0=0.044, pitch=0.31)
    tubes.add(P2, np.full(len(P2), 0.0055), 1)
# лоза по верху и низу
for yb, ph in ((GY1 + BAR * 0.5, 0.5), (GY0 - BAR * 0.5, 1.3)):
    t = np.linspace(0, 1, 4000); x = -GX - BAR * 0.4 + (2 * GX + BAR * 0.8) * t
    a = x / 0.22 * 2 * np.pi + ph
    P = np.stack([x, yb + np.cos(a) * 0.04, ZF * 0.55 + np.sin(a) * 0.03 + 0.012], -1)
    tubes.add(P, np.full(len(P), 0.0068), 1)
# змеи: обвивают боковые брусья в противофазе к лозе, головы встречаются на гребне
SNAKE_HEADS = []
for sx in (1, -1):
    t = np.linspace(0, 1, 9000)
    y = 0.14 + (GY1 + 0.10 - 0.14) * t
    a = (y - 0.14) / 0.42 * 2 * np.pi + (np.pi * 0.5 if sx > 0 else np.pi * 1.5)
    rr = 0.058
    x = sx * (GX + BAR * 0.5) + np.cos(a) * rr * 1.1
    z = ZF * 0.55 + np.sin(a) * rr * 0.85 + 0.02
    P = np.stack([x, y, z], -1)
    # над рамой: изгиб к центру гребня
    t2 = np.linspace(0, 1, 2500)
    p0 = P[-1]; p3 = np.array([sx * 0.10, GY1 + 0.30, 0.09], f32)
    c1 = p0 + np.array([0, 0.12, 0.03]); c2 = p3 + np.array([sx * 0.18, 0.05, 0.02])
    B = ((1 - t2) ** 3)[:, None] * p0 + (3 * (1 - t2) ** 2 * t2)[:, None] * c1 + (3 * (1 - t2) * t2 ** 2)[:, None] * c2 + (t2 ** 3)[:, None] * p3
    PP = np.concatenate([P, B])
    u = np.linspace(0, 1, len(PP))
    R = 0.0035 + 0.0145 * np.sin(np.clip(u, 0, 1) * np.pi * 0.5) ** 0.7
    R = np.where(u > 0.985, 0.012, R)
    tubes.add(PP, R, 2)
    SNAKE_HEADS.append((p3, (p3 - c2) / np.linalg.norm(p3 - c2), sx))
tubes.build()
print("tubes", len(tubes.P), round(time.time() - t0, 1))

def frame_sdf(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    # основная рама: прямоугольное кольцо с профилем
    cx = np.abs(x);
    outer = rbox(P, V(0, (GY0 + GY1) / 2, ZF * 0.3), (GX + BAR, (GY1 - GY0) / 2 + BAR, ZF * 0.5 + 0.03), 0.02)
    inner = rbox(P, V(0, (GY0 + GY1) / 2, 0), (GX, (GY1 - GY0) / 2, 0.3), 0.004)
    d = smax(outer, -inner, 0.006)
    # профиль: валик посередине бруса + бусина у стекла
    ring_d = np.maximum(np.abs(cx - (GX + BAR * 0.5)) - BAR * 0.5, np.abs(y - (GY0 + GY1) / 2) - ((GY1 - GY0) / 2 + BAR))
    ring_h = np.maximum(np.abs(y - (GY0 + GY1) / 2) - ((GY1 - GY0) / 2 + BAR * 0.5) - BAR * 0.5 * 0, 0)
    # валик по периметру — через расстояние до осевой линии прямоугольника
    def rect_line(P, hx, hy, cy):
        qx = np.abs(P[:, 0]) - hx; qy = np.abs(P[:, 1] - cy) - hy
        return np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0)
    cy = (GY0 + GY1) / 2; hy = (GY1 - GY0) / 2
    l_mid = np.abs(rect_line(P, GX + BAR * 0.5, hy + BAR * 0.5, cy))
    bead = np.sqrt(l_mid ** 2 + (z - ZF * 0.9) ** 2) - 0.026
    d = smin(d, bead, 0.012)
    l_in = np.abs(rect_line(P, GX + 0.008, hy + 0.008, cy))
    d = smin(d, np.sqrt(l_in ** 2 + (z - 0.012) ** 2) - 0.010, 0.004)
    # гребень сверху: арка + волюты + картуш
    arc = np.sqrt((x / 1.0) ** 2 + ((y - GY1 - BAR) / 0.62) ** 2)
    crest = np.maximum(np.abs(arc - 0.36) - 0.035, -(y - GY1 - BAR + 0.02))
    crest = np.maximum(crest, np.abs(z - ZF * 0.3) - 0.03)
    d = smin(d, crest, 0.02)
    for sx in (1, -1):
        vc = V(sx * 0.30, GY1 + BAR + 0.10, ZF * 0.4)
        q = P - vc; r = np.sqrt(q[:, 0] ** 2 + q[:, 1] ** 2); a = np.arctan2(q[:, 1], q[:, 0] * sx)
        spiral = np.abs(np.mod(r - 0.012 * (a + np.pi) / np.pi * 1.0, 0.03) - 0.015) - 0.006
        vol = np.maximum(np.maximum(spiral, r - 0.07), np.abs(q[:, 2]) - 0.022)
        d = smin(d, vol, 0.008)
    med = ell(P, V(0, GY1 + BAR + 0.22, ZF * 0.5), (0.085, 0.11, 0.03))
    d = smin(d, med, 0.02)
    d = smax(d, -ell(P, V(0, GY1 + BAR + 0.22, ZF * 0.5 + 0.03), (0.06, 0.085, 0.012)), 0.006)
    d = smin(d, sph(P, V(0, GY1 + BAR + 0.22, ZF * 0.5 + 0.005), 0.035), 0.01)
    # подставка и лапы
    d = smin(d, rbox(P, V(0, 0.05, 0.0), (GX + BAR + 0.03, 0.05, 0.11), 0.02), 0.02)
    for sx in (1, -1):
        d = smin(d, ell(P, V(sx * (GX + 0.05), 0.03, 0.10), (0.06, 0.04, 0.07)), 0.03)
        for k in (-1, 0, 1):
            d = smin(d, ell(P, V(sx * (GX + 0.05) + k * 0.03, 0.018, 0.16), (0.014, 0.018, 0.03)), 0.01)
    # задние подпорки
    for sx in (1, -1):
        d = smin(d, cap(P, V(sx * (GX + 0.03), 1.5, -0.04), V(sx * (GX + 0.08), 0.0, -0.42), 0.022), 0.02)
    # трубки (лоза, змеи)
    dt = tubes(P)
    d = smin(d, dt, 0.008)
    # листья виноградной лозы
    d = np.minimum(d, LEAVES(P))
    # головы змей
    for p3, dirv, sx in SNAKE_HEADS:
        q = P - p3
        fw = dirv / np.linalg.norm(dirv)
        up = np.array([0, 0, 1], f32); up = up - fw * np.dot(up, fw); up /= np.linalg.norm(up)
        sd = np.cross(fw, up)
        L = np.stack([q @ sd, q @ up, q @ fw], -1)
        hd = ell(L, V(0, 0, 0.02), (0.019, 0.013, 0.036))
        hd = smin(hd, ell(L, V(0, -0.004, 0.045), (0.014, 0.008, 0.02)), 0.008)
        hd = smax(hd, -np.maximum(np.abs(L[:, 1] + 0.003) - 0.0018, -(L[:, 2] - 0.035)), 0.002)  # пасть
        for e in (1, -1):
            hd = smin(hd, sph(L, V(e * 0.012, 0.007, 0.03), 0.0055), 0.003)
        d = smin(d, hd, 0.006)
    # фактура литья
    d = d + fbm(P, 90, 2, 31) * 0.0009
    return d

# листья: набор сплюснутых эллипсоидов вдоль лозы
leaf_c = []; leaf_R = []
for sx in (1, -1):
    for y in np.arange(0.18, 2.0, 0.085):
        a = (y - 0.12) / 0.24 * 2 * np.pi + (0 if sx > 0 else np.pi) + 1.1
        c = np.array([sx * (GX + BAR * 0.5) + np.cos(a) * 0.06, y + 0.01, ZF * 0.55 + abs(np.sin(a)) * 0.04 + 0.02], f32)
        n = np.array([np.cos(a) * 0.6, 0.3, 0.8], f32); n /= np.linalg.norm(n)
        leaf_c.append(c); leaf_R.append(n)
for x in np.arange(-0.45, 0.46, 0.09):
    for yb in (GY1 + BAR * 0.5, GY0 - BAR * 0.5):
        c = np.array([x + 0.02, yb + 0.03 * np.sin(x * 30), ZF + 0.012], f32)
        n = np.array([0.2 * np.sin(x * 9), 0.3, 0.9], f32); n /= np.linalg.norm(n)
        leaf_c.append(c); leaf_R.append(n)
leaf_c = np.array(leaf_c); leaf_R = np.array(leaf_R)
leaf_tree = cKDTree(leaf_c)
def LEAVES(P):
    d, i = leaf_tree.query(P, k=2, distance_upper_bound=0.08)
    out = np.full(len(P), 1.0, f32)
    for k in range(2):
        ok = np.isfinite(d[:, k]); idx = np.where(ok)[0]
        if len(idx) == 0: continue
        c = leaf_c[i[idx, k]]; n = leaf_R[i[idx, k]]
        q = P[idx] - c
        h = np.sum(q * n, axis=-1)
        t = q - h[:, None] * n
        r = length(t)
        # лист: диск с зубцами, чуть выгнутый
        ang = np.arctan2(t[:, 1], t[:, 0] + 1e-6)
        R = 0.028 * (0.8 + 0.2 * np.cos(ang * 5))
        dd = np.maximum(r - R, np.abs(h - r * r * 4) - 0.0025)
        out[idx] = np.minimum(out[idx], dd)
    return out

pk = Pack()
vf, ff, nf = mesh_from(frame_sdf, (-0.62, -0.01, -0.47), (0.62, 2.42, 0.14), 0.0026, target=160000, agg=5)
ao = ao_bake(frame_sdf, vf, nf, dists=(0.004, 0.01, 0.02, 0.04))
tag = tubes.tagof(vf)
dist_t = tubes(vf)
snake = ((tag == 2) & (dist_t < 0.006)).astype(f32)
pk.add("frame", vf, ff, nf, ao=ao, snake=snake)
print("frame", len(vf), round(time.time() - t0, 1))

# ------------------------------------------------------------------ разводной ключ (лежит вдоль x, ручка к -x), длина 0.42
def wrench_sdf(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    d = rbox(P, V(-0.10, 0, 0), (0.17, 0.0075, 0.016), 0.005)
    d = smin(d, rbox(P, V(-0.255, 0, 0), (0.025, 0.0085, 0.019), 0.006), 0.01)
    d = smax(d, -ell(P, V(-0.258, 0, 0), (0.012, 0.03, 0.006)), 0.002)  # отверстие для подвеса
    # головка
    hd = rbox(P, V(0.105, 0, 0.004), (0.045, 0.0105, 0.034), 0.008)
    d = smin(d, hd, 0.012)
    jaw1 = rbox(P, V(0.145, 0, 0.034), (0.018, 0.0105, 0.022), 0.004)
    d = smin(d, jaw1, 0.004)
    jaw2 = rbox(P, V(0.112, 0, 0.052), (0.012, 0.0095, 0.022), 0.003)  # подвижная губка
    d = np.minimum(d, jaw2)
    d = smax(d, -rbox(P, V(0.135, 0, 0.062), (0.017, 0.03, 0.016), 0.002), 0.002)  # зев
    worm = np.sqrt((y) ** 2 + (z + 0.012) ** 2) - 0.0075
    worm = np.maximum(worm, np.abs(x - 0.098) - 0.012)
    d = np.minimum(d, worm + 0.0009 * np.sin(x * 900))
    d = smax(d, -np.maximum(np.abs(x - 0.098) - 0.014, np.abs(z + 0.012) - 0.0105), 0.002) if False else d
    d = d + fbm(P, 220, 2, 41) * 0.00035
    return d
vw, fw_, nw = mesh_from(wrench_sdf, (-0.29, -0.02, -0.03), (0.17, 0.02, 0.085), 0.0007, target=24000)
pk.add("wrench", vw, fw_, nw, ao=ao_bake(wrench_sdf, vw, nw, dists=(0.002, 0.005, 0.01, 0.02)))
print("wrench", len(vw))

# ------------------------------------------------------------------ тряпка (скомканная)
def rag_sdf(P):
    d = ell(P, V(0, 0, 0), (0.07, 0.03, 0.055))
    d = smin(d, ell(P, V(0.05, -0.01, 0.03), (0.04, 0.02, 0.035)), 0.02)
    d = smin(d, ell(P, V(-0.06, -0.01, -0.02), (0.045, 0.015, 0.03)), 0.02)
    d = d + fbm(P, 40, 3, 51) * 0.012 + np.sin(P[:, 0] * 140 + fbm(P, 20, 2, 3) * 6) * 0.002
    return d
vr, fr, nr = mesh_from(rag_sdf, (-0.14, -0.06, -0.1), (0.13, 0.06, 0.1), 0.0012, target=12000)
pk.add("rag", vr, fr, nr, ao=ao_bake(rag_sdf, vr, nr, dists=(0.003, 0.008, 0.016, 0.03)))
print("rag", len(vr))

# ------------------------------------------------------------------ сущность: очень высокая, худая, в истлевшей мантии (2.7 м)
def entity_sdf(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    Q = P.copy(); Q[:, 0] = np.abs(Q[:, 0])
    # мантия: узкий конус от плеч до пола, рваный подол
    r_rob = 0.10 + 0.13 * ss(2.25, 0.0, y)
    rob = np.sqrt(x ** 2 + (z / 0.75) ** 2) - r_rob
    rob = np.maximum(rob, y - 2.30)
    tatters = fbm(P * np.array([6, 0.6, 6], f32), 3, 3, 61)
    rob = np.maximum(rob, -(y - 0.02 - 0.25 * tatters * ss(0.8, 0.0, y)))
    rob = rob + fbm(P, 12, 3, 62) * 0.012 + np.sin(np.arctan2(x, z) * 9 + y * 2) * 0.006
    d = rob
    # капюшон и вытянутая голова
    d = smin(d, ell(P, V(0, 2.48, 0.0), (0.085, 0.17, 0.10)), 0.04)
    d = smin(d, ell(P, V(0, 2.40, 0.02), (0.11, 0.2, 0.12)) + fbm(P, 15, 2, 63) * 0.01, 0.03)
    d = smax(d, -ell(P, V(0, 2.40, 0.11), (0.06, 0.12, 0.05)), 0.02)   # тёмный провал лица
    # плечи и длинные руки вдоль тела
    d = smin(d, cap(Q, V(0.0, 2.22, 0), V(0.16, 2.18, 0.0), 0.05), 0.04)
    d = smin(d, cap(Q, V(0.16, 2.18, 0.0), V(0.19, 1.55, 0.05), 0.035, 0.028), 0.02)
    d = smin(d, cap(Q, V(0.19, 1.55, 0.05), V(0.20, 0.98, 0.10), 0.024, 0.018), 0.012)
    # кисть и длинные суставчатые пальцы
    hc = V(0.20, 0.95, 0.10)
    d = smin(d, ell(Q, hc, (0.022, 0.045, 0.03)), 0.012)
    for k, ofs in enumerate((-0.022, -0.008, 0.008, 0.022)):
        a = hc + V(0.0, -0.03, ofs)
        b = a + V(0.012, -0.12, 0.01)
        c = b + V(0.004, -0.10, 0.025)
        e = c + V(-0.005, -0.08, 0.03)
        d = smin(d, cap(Q, a, b, 0.0075, 0.0062), 0.004)
        d = smin(d, cap(Q, b, c, 0.0058, 0.0048), 0.003)
        d = smin(d, cap(Q, c, e, 0.0045, 0.0018), 0.002)
        d = smin(d, sph(Q, b, 0.0085), 0.004); d = smin(d, sph(Q, c, 0.0068), 0.003)
    return d
ve, fe, ne = mesh_from(entity_sdf, (-0.36, -0.01, -0.3), (0.36, 2.72, 0.32), 0.004, target=40000)
pk.add("entity", ve, fe, ne, ao=ao_bake(entity_sdf, ve, ne, dists=(0.01, 0.025, 0.05, 0.1)))
print("entity", len(ve))

pk.save("../public/assets/props")
json.dump({"glass": [GX, GY0, GY1], "zf": ZF}, open("../public/assets/props_meta.json", "w"))
print("total", round(time.time() - t0, 1))
