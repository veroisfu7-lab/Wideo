# Скелет героя в позе покоя (A-поза), мировые координаты, м. Общий для Python (веса) и TS (позинг) через rig.json.
import json, numpy as np
from sdflib import V, f32

def norm(v): v = np.asarray(v, dtype=np.float64); return v / np.linalg.norm(v)

BONES = []  # (name, parent, head, tail)
def B(name, parent, head, tail): BONES.append((name, parent, np.asarray(head, f32), np.asarray(tail, f32)))

B("root", None, (0, 0, 0), (0, 0.1, 0))
B("hips", "root", (0, 0.98, 0.0), (0, 1.10, 0.0))
B("spine", "hips", (0, 1.10, 0.0), (0, 1.28, 0.0))
B("chest", "spine", (0, 1.28, 0.0), (0, 1.47, -0.015))
B("neck", "chest", (0, 1.47, -0.015), (0, 1.575, 0.0))
B("head", "neck", (0, 1.575, 0.0), (0, 1.75, 0.0))

SH = np.array([0.185, 1.415, -0.02], f32)
EL = SH + 0.285 * norm([np.sin(np.radians(38)), -np.cos(np.radians(38)), -0.02]).astype(f32)
WR = EL + 0.255 * norm([np.sin(np.radians(30)), -np.cos(np.radians(30)), 0.03]).astype(f32)

def hand_frame(side):
    # левая рука (+x): X — вдоль пальцев, Z — к большому пальцу (вперёд), Y — тыльная сторона
    el = EL.copy(); wr = WR.copy()
    X = norm(wr - el)
    Z = norm(np.array([0, 0, 1.0]) - X * np.dot([0, 0, 1.0], X))
    Y = np.cross(Z, X)
    M = np.stack([X, Y, Z], axis=1).astype(f32)  # столбцы
    o = wr.copy()
    if side == "R":
        Mx = np.diag([-1, 1, 1]).astype(f32)
        return Mx @ M, Mx @ o
    return M, o

# раскладка пальцев в системе ладони (левая): (имя, [точки суставов], радиусы)
FINGERS = [
    ("thumb", [(0.018, -0.012, 0.022), (0.046, -0.022, 0.046), (0.072, -0.026, 0.060), (0.094, -0.026, 0.068)], (0.0118, 0.0105, 0.0095, 0.0085)),
    ("index", [(0.094, 0.000, 0.0265), (0.139, -0.003, 0.0285), (0.165, -0.006, 0.0290), (0.186, -0.009, 0.0290)], (0.0098, 0.0090, 0.0082, 0.0074)),
    ("middle", [(0.097, 0.001, 0.0085), (0.146, -0.002, 0.0090), (0.176, -0.006, 0.0090), (0.199, -0.010, 0.0090)], (0.0102, 0.0094, 0.0085, 0.0076)),
    ("ring", [(0.093, 0.000, -0.0095), (0.138, -0.003, -0.0105), (0.166, -0.007, -0.0110), (0.188, -0.010, -0.0110)], (0.0096, 0.0088, 0.0080, 0.0072)),
    ("pinky", [(0.084, -0.002, -0.0265), (0.119, -0.005, -0.0295), (0.140, -0.008, -0.0305), (0.158, -0.010, -0.0310)], (0.0086, 0.0078, 0.0070, 0.0064)),
]

for side, sx in (("L", 1), ("R", -1)):
    m = lambda p: p * np.array([sx, 1, 1], f32)
    B(f"shoulder.{side}", "chest", m(V(0.03, 1.42, -0.01)), m(SH))
    B(f"upperArm.{side}", f"shoulder.{side}", m(SH), m(EL))
    B(f"foreArm.{side}", f"upperArm.{side}", m(EL), m(WR))
    M, o = hand_frame(side)
    B(f"hand.{side}", f"foreArm.{side}", o, o + M @ V(0.09, 0, 0))
for side, sx in (("L", 1), ("R", -1)):
    m = lambda p: p * np.array([sx, 1, 1], f32)
    B(f"thigh.{side}", "hips", m(V(0.095, 0.93, 0.0)), m(V(0.100, 0.51, 0.012)))
    B(f"shin.{side}", f"thigh.{side}", m(V(0.100, 0.51, 0.012)), m(V(0.105, 0.088, -0.015)))
    B(f"foot.{side}", f"shin.{side}", m(V(0.105, 0.088, -0.015)), m(V(0.115, 0.022, 0.135)))
for side in ("L", "R"):
    M, o = hand_frame(side)
    for name, pts, rad in FINGERS:
        W = [o + M @ np.asarray(p, f32) for p in pts]
        par = f"hand.{side}"
        for k in range(3):
            B(f"{name}{k+1}.{side}", par, W[k], W[k + 1]); par = f"{name}{k+1}.{side}"

IDX = {b[0]: i for i, b in enumerate(BONES)}

def finger_world(side):
    M, o = hand_frame(side)
    return [(name, [o + M @ np.asarray(p, f32) for p in pts], rad) for name, pts, rad in FINGERS]

def to_local(P, side):
    M, o = hand_frame(side)
    return (P - o) @ M  # M ортонормирована (у правой — с отражением)

def save(path):
    out = []
    for name, par, h, t in BONES:
        out.append({"name": name, "parent": par, "head": [float(x) for x in h], "tail": [float(x) for x in t]})
    M, o = hand_frame("L")
    json.dump({"bones": out, "handFrameL": M.T.tolist(), "handFrameR": hand_frame("R")[0].T.tolist()}, open(path, "w"), indent=0)

def seg_dist(P, a, b):
    ba = b - a; t = np.clip(((P - a) @ ba) / max(float(ba @ ba), 1e-12), 0, 1)
    return np.sqrt(np.sum((P - (a + t[:, None] * ba)) ** 2, axis=-1))

def skin(P, bone_names, power=6.0, band=0.05, overrides=None):
    D = np.stack([seg_dist(P, BONES[IDX[n]][2], BONES[IDX[n]][3]) for n in bone_names], axis=-1)
    if overrides is not None: D = overrides(P, D, bone_names)
    dmin = D.min(axis=1, keepdims=True)
    W = np.where(D < dmin + band, 1.0 / np.maximum(D, 1e-3) ** power, 0.0)
    W = W * (1 - np.clip((D - dmin) / band, 0, 1)) ** 2
    order = np.argsort(-W, axis=1)[:, :4]
    Wt = np.take_along_axis(W, order, axis=1)
    Wt = Wt / np.maximum(Wt.sum(axis=1, keepdims=True), 1e-12)
    ids = np.array([IDX[n] for n in bone_names])[order]
    return ids.astype(np.uint16), Wt.astype(f32)
