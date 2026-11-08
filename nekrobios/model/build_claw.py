# Рука из зеркала: длинное пепельное предплечье, кисть с суставчатыми пальцами и чёрными когтями. Ось руки — +z (выходит из стекла).
import numpy as np, json, time
from sdflib import *

t0 = time.time()
def ss(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# кости в позе покоя: (имя, родитель, голова, хвост)
B = []
def bone(n, p, h, t): B.append((n, p, np.array(h, np.float32), np.array(t, np.float32)))
bone("arm", None, (0, 0, -0.42), (0, 0, -0.02))
bone("wrist", "arm", (0, 0, -0.02), (0, 0, 0.07))
# пальцы: основание у края ладони, длина ×1.5, ладонь вниз (-y), большой палец к -x
F = [("index", (0.026, 0.0), (0.065, 0.045, 0.038)), ("middle", (0.008, 0.0), (0.072, 0.05, 0.042)),
     ("ring", (-0.011, 0.0), (0.066, 0.046, 0.038)), ("pinky", (-0.028, -0.002), (0.052, 0.036, 0.032))]
FINGERS = []
for name, (x, y), L in F:
    p = np.array([x, y, 0.085], np.float32); par = "wrist"
    pts = [p.copy()]
    for k in range(3):
        q = p + np.array([x * 0.08, -0.004 * (k + 1), L[k]], np.float32)
        bone(f"{name}{k+1}", par, p, q); par = f"{name}{k+1}"; p = q; pts.append(p.copy())
    FINGERS.append((name, pts))
# большой палец
p = np.array([0.036, -0.012, 0.03], np.float32); par = "wrist"; pts = [p.copy()]
for k, d in enumerate([(0.022, -0.008, 0.03), (0.014, -0.004, 0.032), (0.008, -0.002, 0.028)]):
    q = p + np.array(d, np.float32); bone(f"thumb{k+1}", par, p, q); par = f"thumb{k+1}"; p = q; pts.append(p.copy())
FINGERS.append(("thumb", pts))
IDX = {b[0]: i for i, b in enumerate(B)}

def claw_sdf(P):
    # предплечье: худое, с выступающими сухожилиями
    d = cap(P, V(0, 0, -0.45), V(0, 0, -0.02), 0.026, 0.019)
    d = smin(d, cap(P, V(0.012, 0.010, -0.40), V(0.008, 0.008, -0.03), 0.009, 0.006), 0.01)
    d = smin(d, cap(P, V(-0.014, 0.006, -0.38), V(-0.01, 0.006, -0.05), 0.008, 0.005), 0.01)
    # ладонь узкая и длинная
    d = smin(d, rbox(P, V(0.002, -0.002, 0.045), (0.036, 0.009, 0.045), 0.008), 0.016)
    for name, pts in FINGERS:
        r0 = 0.0085 if name != "pinky" else 0.007
        fd = 1.0
        for k in range(3):
            seg = cap(P, pts[k], pts[k + 1], r0 * (1 - 0.18 * k), r0 * (1 - 0.18 * (k + 1)))
            fd = seg if k == 0 else smin(fd, seg, 0.003)
            fd = smin(fd, sph(P, pts[k + 1], r0 * (1.05 - 0.18 * (k + 1))), 0.004)  # узловатые суставы
        # коготь: изогнутый конус за последним суставом
        a = pts[3]; dirv = pts[3] - pts[2]; dirv = dirv / np.linalg.norm(dirv)
        b = a + dirv * 0.028 + np.array([0, -0.012, 0], np.float32)
        fd = smin(fd, cap(P, a - dirv * 0.004, b, r0 * 0.5, 0.0008), 0.002)
        d = smin(d, fd, 0.006)
    d = d + fbm(P, 160, 2, 71) * 0.0007
    return d

def claw_mask(P):
    m = np.zeros(len(P), np.float32)
    for name, pts in FINGERS:
        a = pts[3]; dirv = pts[3] - pts[2]; dirv = dirv / np.linalg.norm(dirv)
        t = (P - a) @ dirv
        m = np.maximum(m, ss(-0.006, 0.002, t) * (np.linalg.norm(P - a, axis=1) < 0.04))
    return m

v, f, n = mesh_from(claw_sdf, (-0.08, -0.06, -0.47), (0.09, 0.05, 0.26), 0.0009, target=30000)
ao = ao_bake(claw_sdf, v, n, dists=(0.002, 0.005, 0.01, 0.02))
# веса
def seg_dist(P, a, b):
    ba = b - a; t = np.clip(((P - a) @ ba) / max(float(ba @ ba), 1e-12), 0, 1)
    return np.sqrt(np.sum((P - (a + t[:, None] * ba)) ** 2, axis=-1))
D = np.stack([seg_dist(v, h, t) for _, _, h, t in B], -1)
dmin = D.min(1, keepdims=True); band = 0.012
W = np.where(D < dmin + band, 1.0 / np.maximum(D, 1e-3) ** 7, 0.0) * (1 - np.clip((D - dmin) / band, 0, 1)) ** 2
order = np.argsort(-W, 1)[:, :4]; Wt = np.take_along_axis(W, order, 1); Wt /= np.maximum(Wt.sum(1, keepdims=True), 1e-12)
pk = Pack()
pk.add("claw", v, f, n, ao=ao, skinIndex=order.astype(np.uint16), skinWeight=Wt.astype(np.float32), claw=claw_mask(v))
pk.save("../public/assets/claw")
json.dump({"bones": [{"name": a, "parent": p, "head": [float(x) for x in h], "tail": [float(x) for x in t]} for a, p, h, t in B]}, open("../public/assets/claw_rig.json", "w"))
print("claw", len(v), round(time.time() - t0, 1))
