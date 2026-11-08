# Тело Артёма: худи, штаны, кроссовки, кисти (со скелетом пальцев). Веса скиннинга по расстоянию до костей, AO из SDF.
import numpy as np, time, sys
from sdflib import *
from rig import BONES, IDX, SH, EL, WR, FINGERS, hand_frame, finger_world, skin, save, seg_dist

t0 = time.time()

def mx(P):
    Q = P.copy(); Q[:, 0] = np.abs(Q[:, 0]); return Q

def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# ------------------------------------------------------------------ кисть (локально, левая)
def hand_local(L):
    x, y, z = L[:, 0], L[:, 1], L[:, 2]
    # ладонь
    d = rbox(L, V(0.050, -0.001, -0.001), (0.047, 0.0125, 0.039), 0.011)
    d = smin(d, ell(L, V(0.036, -0.011, 0.020), (0.032, 0.012, 0.020)), 0.010)   # тенар
    d = smin(d, ell(L, V(0.045, -0.008, -0.026), (0.034, 0.010, 0.013)), 0.008)  # гипотенар
    # запястье (эллипс: шире поперёк)
    Lw = L * np.array([1, 1, 0.74], f32)
    d = smin(d, cap(Lw, V(-0.075, 0.0, 0.0), V(0.012, 0.0, 0.0), 0.0225, 0.0235), 0.014)
    for name, pts, rad in FINGERS:
        P0 = [np.asarray(p, f32) for p in pts]
        fd = 1e9
        for k in range(3):
            seg = cap(L, P0[k], P0[k + 1], rad[k], rad[k + 1])
            fd = seg if k == 0 else smin(fd, seg, 0.0035)
        # костяшка
        fd = smin(fd, sph(L, P0[0] + V(-0.004, 0.004, 0), rad[0] * 0.95), 0.004)
        if name == "thumb":
            d = smin(d, fd, 0.012)
        else:
            d = smin(d, fd, 0.006)
    # складки на суставах (тонкие)
    return d

def nail_local(L):
    m = np.zeros(len(L), f32)
    for name, pts, rad in FINGERS:
        a = np.asarray(pts[2], f32); b = np.asarray(pts[3], f32)
        c = a + (b - a) * 0.62 + V(0, rad[3] * 0.85, 0)
        dd = length((L - c) / np.array([0.0105, 0.0045, 0.0072], f32))
        m = np.maximum(m, 1 - ss(0.75, 1.0, dd))
    return m

def hand_sdf(side):
    M, o = hand_frame(side)
    return lambda P: hand_local((P - o) @ M)

# ------------------------------------------------------------------ худи
def hoodie(P):
    Q = mx(P)
    y = P[:, 1]
    d = ell(P, V(0, 1.30, -0.005), (0.188, 0.175, 0.122))
    d = smin(d, ell(P, V(0, 1.09, 0.0), (0.178, 0.215, 0.116)), 0.06)
    d = smin(d, ell(P, V(0, 0.905, 0.0), (0.182, 0.07, 0.118)), 0.04)
    # плечи
    d = smin(d, cap(Q, V(0.07, 1.405, -0.015), SH + V(0.0, 0.0, 0.0), 0.075, 0.072), 0.05)
    # рукава
    d = smin(d, cap(Q, SH, EL, 0.068, 0.059), 0.03)
    d = smin(d, cap(Q, EL, WR - (WR - EL) * 0.13, 0.057, 0.049), 0.02)
    # манжет
    cu0 = WR - (WR - EL) * 0.17; cu1 = WR + (WR - EL) * 0.01
    d = smin(d, cap(Q, cu0, cu1, 0.040, 0.037), 0.015)
    # обрез рукава у кисти + отверстие
    ax = (WR - EL) / np.linalg.norm(WR - EL)
    endp = (Q - (WR + ax * 0.012)) @ ax
    d = smax(d, endp, 0.004)
    hole = cap(Q, WR - ax * 0.05, WR + ax * 0.05, 0.026)
    d = smax(d, -np.where(endp > -0.03, hole, 1.0), 0.004)
    # капюшон, собранный за шеей
    d = smin(d, ell(P, V(0, 1.475, -0.095), (0.145, 0.08, 0.085)), 0.04)
    d = smin(d, ellR(Q, V(0.075, 1.47, -0.03), (0.035, 0.05, 0.085), rot([0, 0, 1], 0.5)), 0.03)
    # ворот: кольцо вокруг шеи
    r_xz = np.sqrt(P[:, 0] ** 2 + (P[:, 2] + 0.02) ** 2)
    tor = np.sqrt((r_xz - 0.085) ** 2 + ((y - 1.475) / 0.8) ** 2) - 0.022
    d = smin(d, tor, 0.02)
    # края капюшона спереди (V)
    d = smin(d, cap(Q, V(0.075, 1.50, 0.035), V(0.012, 1.375, 0.105), 0.016, 0.012), 0.015)
    # горловина
    neck = np.sqrt(P[:, 0] ** 2 + ((P[:, 2] + 0.018) / 1.05) ** 2) - 0.064
    d = smax(d, -np.where(y > 1.40, neck, 1.0), 0.01)
    # шнурки
    for s in (1, -1):
        a = V(0.034 * s, 1.385, 0.112); b = V(0.040 * s, 1.215, 0.128)
        d = smin(d, cap(P, a, b, 0.0042), 0.004)
        d = smin(d, cap(P, b, b + V(0, -0.025, 0.002), 0.0055), 0.002)
    # карман-кенгуру
    d = smin(d, rbox(P, V(0, 1.000, 0.108), (0.118, 0.072, 0.006), 0.005), 0.016)
    # подол снизу
    d = smax(d, -(y - 0.845), 0.01)
    # складки: крупный шум + рёбра на манжетах/подоле
    d = d + fbm(P, 9, 3, 11) * 0.0045
    elbow_w = np.exp(-np.sum((Q - EL) ** 2, axis=-1) / 0.006)
    d = d + elbow_w * np.sin(seg_t(Q, SH, WR) * 95 + fbm(P, 30, 2, 4) * 3) * 0.0011
    waist = ss(0.86, 0.9, y) * (1 - ss(0.97, 1.0, y))
    d = d + waist * np.sin(y * 210 + np.sin(P[:, 0] * 30) * 2 + fbm(P, 20, 2, 9) * 3) * 0.0008
    rib_hem = (1 - ss(0.87, 0.875, y))
    d = d - rib_hem * np.abs(np.sin(P[:, 0] * 380 + P[:, 2] * 380)) * 0.0009
    return d

def pants(P):
    Q = mx(P)
    y = P[:, 1]
    d = ell(P, V(0, 0.93, -0.005), (0.168, 0.12, 0.112))
    thL = BONES[IDX["thigh.L"]]; shL = BONES[IDX["shin.L"]]
    d = smin(d, cap(Q, thL[2], thL[3], 0.078, 0.059), 0.04)
    d = smin(d, cap(Q, shL[2], shL[3] + V(0, 0.02, 0), 0.057, 0.050), 0.02)
    # складки у щиколотки и колена
    d = d + fbm(P, 12, 3, 21) * 0.0035
    d = d + (1 - ss(0.12, 0.2, y)) * np.sin(y * 300) * 0.0015
    d = smax(d, -(y - 0.075), 0.006)
    d = smax(d, y - 1.0, 0.01)
    return d

def shoes(P):
    Q = mx(P)
    y = P[:, 1]
    an = BONES[IDX["foot.L"]][2]; to = BONES[IDX["foot.L"]][3]
    base = V(an[0], 0.0, an[2])
    d = ellR(Q, base + V(0.004, 0.055, 0.055), (0.050, 0.055, 0.135), rot([0, 1, 0], 0.06))
    d = smax(d, -(y - 0.0), 0.004)
    d = smin(d, cap(Q, an + V(0, 0.0, -0.01), an + V(0, 0.06, -0.02), 0.045), 0.03)   # голенище
    d = smax(d, y - 0.13, 0.01)
    d = smin(d, ellR(Q, base + V(0.004, 0.014, 0.056), (0.053, 0.016, 0.138), rot([0, 1, 0], 0.06)), 0.004)  # подошва
    return d

parts = {}
def build(name, fn, lo, hi, h, target, bones, power=6.0, band=0.05, attrs=None):
    t1 = time.time()
    v, f, n = mesh_from(fn, lo, hi, h, target=target)
    ao = ao_bake(fn, v, n, dists=(0.006, 0.014, 0.03, 0.06))
    si, sw = skin(v, bones, power, band)
    extra = {"ao": ao}
    if attrs: extra.update(attrs(v))
    parts[name] = (v, f, n, si, sw, extra)
    print(name, len(v), "verts", round(time.time() - t1, 1), "s")

ARM_L = ["shoulder.L", "upperArm.L", "foreArm.L", "hand.L"]
ARM_R = ["shoulder.R", "upperArm.R", "foreArm.R", "hand.R"]
build("hoodie", hoodie, (-0.62, 0.80, -0.22), (0.62, 1.60, 0.20), 0.0032, 60000,
      ["hips", "spine", "chest", "neck"] + ARM_L + ARM_R, power=5.0, band=0.06)
build("pants", pants, (-0.25, 0.06, -0.15), (0.25, 1.06, 0.15), 0.0035, 22000,
      ["hips", "thigh.L", "shin.L", "thigh.R", "shin.R"], power=5.0, band=0.05)
build("shoes", shoes, (-0.2, -0.01, -0.12), (0.2, 0.16, 0.24), 0.0022, 12000,
      ["shin.L", "foot.L", "shin.R", "foot.R"], power=4.0, band=0.05)
for side in ("L", "R"):
    M, o = hand_frame(side)
    fb = [f"hand.{side}", f"foreArm.{side}"] + [f"{n}{k}.{side}" for n, _, _ in FINGERS for k in (1, 2, 3)]
    cs = np.array([[x, y, z] for x in (-0.085, 0.215) for y in (-0.05, 0.04) for z in (-0.05, 0.09)], f32)
    W = o + cs @ M.T
    lo = W.min(axis=0); hi = W.max(axis=0)
    hs = hand_sdf(side)
    def nails(v, M=M, o=o): return {"nail": nail_local((v - o) @ M)}
    build(f"hand{side}", hs, lo, hi, 0.0009, 14000, fb, power=7.0, band=0.012, attrs=nails)

pk = Pack()
for name, (v, f, n, si, sw, extra) in parts.items():
    pk.add(name, v, f, n, skinIndex=si, skinWeight=sw, **extra)
pk.save("../public/assets/body")
save("../public/assets/rig.json")
print("total", round(time.time() - t0, 1))
